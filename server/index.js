import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { initializeDatabase, testConnection, closePool, isDatabaseAvailable, getPool } from './db.js';

// Helper function to get sharp (lazy load)
let sharpCache = null;
async function getSharp() {
  if (sharpCache !== null) {
    return sharpCache;
  }
  try {
    const sharpModule = await import('sharp');
    sharpCache = sharpModule.default;
    console.log('✅ Sharp image processing library loaded');
    return sharpCache;
  } catch (error) {
    console.warn('⚠️  Sharp not available - image optimization will be disabled');
    console.warn('   To enable image optimization, run: npm install sharp');
    sharpCache = false; // Cache false to avoid repeated import attempts
    return null;
  }
}
import { 
  getMetadata, 
  getFileById, 
  saveFile, 
  updateFileOptions,
  deleteFile 
} from './dbStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory (one level up from server/)
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create uploads directory if it doesn't exist (in project root for persistence)
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const RIVER_MAP_UPLOADS_DIR = path.join(UPLOADS_DIR, 'river-map');
if (!fs.existsSync(RIVER_MAP_UPLOADS_DIR)) {
  fs.mkdirSync(RIVER_MAP_UPLOADS_DIR, { recursive: true });
}
const CONDITION_PHOTO_UPLOADS_DIR = path.join(UPLOADS_DIR, 'condition-photos');
if (!fs.existsSync(CONDITION_PHOTO_UPLOADS_DIR)) {
  fs.mkdirSync(CONDITION_PHOTO_UPLOADS_DIR, { recursive: true });
}
const DOCUMENTS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'documents');
if (!fs.existsSync(DOCUMENTS_UPLOADS_DIR)) {
  fs.mkdirSync(DOCUMENTS_UPLOADS_DIR, { recursive: true });
}

// Middleware
// CORS configuration - allow all origins
// In production, frontend and API are on same domain, but CORS helps with any edge cases
// In development, this allows Vite dev server to connect and Cloudflare Tunnel
app.use(cors({
  origin: true, // Allow all origins (including Cloudflare Tunnel)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '500mb' })); // Increase body parser limit for large files
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Block malformed data URLs early to prevent ERR_CONNECTION_CLOSED errors
// These URLs appear as /base64,... or https://domain.com/base64,... and are invalid
// This middleware must run before static file serving to prevent connection errors
app.use((req, res, next) => {
  const path = req.path || '';
  const url = req.url || '';
  
  // Check if the request path contains malformed base64 URLs
  // Pattern: /base64, or any path containing /base64, anywhere
  if (path.includes('/base64,') || url.includes('/base64,')) {
    console.warn(`Blocked malformed data URL request: ${req.method} ${path}`);
    return res.status(400).json({ 
      error: 'Invalid URL format',
      message: 'Malformed data URL detected. Data URLs must start with "data:" prefix.'
    });
  }
  
  // Also check for HTTP/HTTPS URLs containing base64, (from tunnel sources)
  const fullUrl = `${req.protocol}://${req.get('host')}${url}`;
  if (fullUrl.match(/^https?:\/\//) && fullUrl.includes('base64,')) {
    console.warn(`Blocked malformed HTTP URL with base64: ${req.method} ${path}`);
    return res.status(400).json({ 
      error: 'Invalid URL format',
      message: 'Malformed data URL detected. Data URLs must start with "data:" prefix.'
    });
  }
  
  next();
});

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  next();
});

// Utility: simple sleep
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: check allowed GIS extensions
function isAllowedGisFile(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return ext === '.kml' || ext === '.kmz';
}

// Background: ingest a single file from uploads if it's new
async function ingestSingleFileIfNew(filename) {
  try {
    if (!filename || !isAllowedGisFile(filename)) {
      return;
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return;
    }

    // Ensure file finished writing by waiting for size to stabilize
    let lastSize = -1;
    for (let i = 0; i < 5; i += 1) {
      const { size } = fs.statSync(filePath);
      if (size > 0 && size === lastSize) {
        break;
      }
      lastSize = size;
      await wait(400);
    }

    const existingMeta = await getMetadata();
    const exists = Object.values(existingMeta || {}).some(f => f.filename === filename);
    if (exists) {
      return;
    }

    const stats = fs.statSync(filePath);
    const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileData = {
      id: fileId,
      name: filename,
      filename,
      path: `/uploads/${filename}`,
      size: stats.size,
      uploadedAt: new Date().toISOString(),
      visible: true,
      sourceUrl: null
    };

    await saveFile(fileData);
    console.log('Auto-ingested new file:', { id: fileId, filename });
  } catch (e) {
    console.error('Auto-ingest error for file:', filename, e);
  }
}

// Serve static files from dist folder (for both production and development with Cloudflare Tunnel)
const distPath = path.join(PROJECT_ROOT, 'dist');
if (fs.existsSync(distPath)) {
  // Add cache-control headers to prevent Cloudflare from caching static assets
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      // Don't cache HTML files - always get fresh version
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Don't cache JS/CSS files - they might have new content
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    }
  }));
  console.log('Serving static files from:', distPath);
} else if (NODE_ENV === 'production') {
  console.warn('Warning: dist folder not found. Run "npm run build" first.');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File size limit: 500MB (configurable via environment variable)
// Hostinger typically supports much larger files than Vercel's 4.5MB limit
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '500') * 1024 * 1024; // Default 500MB

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.kml' || ext === '.kmz') {
      cb(null, true);
    } else {
      cb(new Error('Only .kml and .kmz files are allowed'));
    }
  }
});

// Configure multer for river map image uploads
const riverMapImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RIVER_MAP_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const MAX_IMAGE_FILE_SIZE = parseInt(process.env.MAX_IMAGE_FILE_SIZE || '40') * 1024 * 1024; // default 20MB

const riverMapImageUpload = multer({
  storage: riverMapImageStorage,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (.jpg, .jpeg, .png, .webp) are allowed for river map photos'));
    }
  }
});

// Database will be initialized on server start
// All metadata operations now use MySQL database

// API Routes

// Upload KML file
app.post('/api/files/upload', (req, res, next) => {
  console.log('POST /api/files/upload route hit', {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    origin: req.headers['origin'],
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      // Handle multer errors (file size, file type, etc.)
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
          return res.status(400).json({ error: `File size exceeds ${maxSizeMB}MB limit` });
        }
        console.error('Multer error code:', err.code, 'Message:', err.message);
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      // Handle other errors (like fileFilter errors)
      console.error('File filter or other error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  // Set a timeout for the entire upload handler (5 minutes max)
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Upload handler timeout after 5 minutes');
      res.status(504).json({ error: 'Upload timeout - the operation took too long. Please try again with a smaller file or check your connection.' });
    }
  }, timeoutMs);
  
  try {
    console.log('Upload request received:', { 
      hasFile: !!req.file, 
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      filename: req.file?.filename,
      body: req.body 
    });
    
    if (!req.file) {
      console.error('No file in request - checking if multer processed it');
      return res.status(400).json({ error: 'No file uploaded. Please ensure you are sending a file with the field name "file".' });
    }

    // Verify file was actually saved
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Uploaded file not found at path: ${filePath}`);
      return res.status(500).json({ error: 'File was not saved correctly' });
    }

    // Use timestamp + random to avoid collisions
    const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    
    const fileData = {
      id: fileId,
      name: req.file.originalname,
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      visible: true,
      sourceUrl: req.body.sourceUrl || null,
      layerGroup: req.body.layerGroup || 'district'
    };

    // Save to database
    try {
      await saveFile(fileData);
      console.log('File saved to database:', { id: fileData.id, filename: fileData.filename });
    } catch (dbError) {
      console.error('Error saving file to database:', dbError);
      // File is already saved to disk, so we can still return success
      // but log the database error
      console.warn('File saved to disk but database save failed. File will still be available.');
    }

    console.log('File uploaded successfully:', {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      path: fileData.path
    });
    
    // Ensure Content-Type is set explicitly
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Send response
    const responseData = {
      success: true,
      file: fileData
    };
    
    console.log('Sending response:', JSON.stringify(responseData).substring(0, 200));
    clearTimeout(timeoutId);
    res.json(responseData);
    console.log('Response sent successfully');
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
});

// Upload KML from URL (server downloads and saves it)
app.post('/api/files/upload-from-url', async (req, res) => {
  try {
    const { url, layerGroup } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Fetch the file from URL
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch file from URL: ${response.statusText}` });
    }

    const buffer = await response.arrayBuffer();
    const fileName = url.split('/').pop() || `kml-${Date.now()}.kml`;
    const ext = path.extname(fileName).toLowerCase();
    
    if (ext !== '.kml' && ext !== '.kmz') {
      return res.status(400).json({ error: 'URL must point to a .kml or .kmz file' });
    }

    // Save file to disk
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const name = path.basename(fileName, ext);
    const savedFileName = `${name}-${uniqueSuffix}${ext}`;
    const filePath = path.join(UPLOADS_DIR, savedFileName);
    
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // Use timestamp + random to avoid collisions
    const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    
    const fileData = {
      id: fileId,
      name: fileName,
      filename: savedFileName,
      path: `/uploads/${savedFileName}`,
      size: buffer.byteLength,
      uploadedAt: new Date().toISOString(),
      visible: true,
      sourceUrl: url,
      layerGroup: layerGroup || 'district'
    };

    // Save to database
    await saveFile(fileData);

    res.json({
      success: true,
      file: fileData
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file from URL' });
  }
});

// Get all files (handle both with and without trailing slash)
app.get('/api/files', async (req, res) => {
  try {
    console.log('GET /api/files - Fetching all files');
    const metadata = await getMetadata();
    const files = Object.values(metadata);
    console.log(`GET /api/files - Found ${files.length} files:`, files.map(f => ({ id: f.id, name: f.name })));
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get files', details: error.message });
  }
});

// Also handle trailing slash to prevent 403 from web server
app.get('/api/files/', async (req, res) => {
  try {
    console.log('GET /api/files/ - Fetching all files');
    const metadata = await getMetadata();
    const files = Object.values(metadata);
    console.log(`GET /api/files/ - Found ${files.length} files:`, files.map(f => ({ id: f.id, name: f.name })));
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get files', details: error.message });
  }
});

// Get file by ID
app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Download file
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const file = await getFileById(req.params.id);
    
    if (!file) {
      console.error(`File not found in database: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found on disk: ${filePath} (filename: ${file.filename})`);
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Get file stats for Content-Length header
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Determine content type based on file extension
    const ext = path.extname(file.name).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.kml') {
      contentType = 'application/vnd.google-earth.kml+xml';
    } else if (ext === '.kmz') {
      contentType = 'application/vnd.google-earth.kmz';
    }
    
    // Set headers explicitly
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
});

// Ingest files from uploads directory into database (admin-only)
app.post('/api/files/ingest', async (req, res) => {
  try {
    // Admin guard: require header to match ADMIN_SECRET in production; allow in dev if not set
    const adminSecret = process.env.ADMIN_SECRET || '';
    const requestSecret = req.headers['x-admin-secret'] || req.headers['x-adminsecret'];
    const isDev = NODE_ENV !== 'production';

    if (adminSecret) {
      if (!requestSecret || requestSecret !== adminSecret) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (!isDev) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.json({ created: 0, skipped: 0, files: [], message: 'Uploads directory does not exist' });
    }

    // Get existing metadata and build a set of known filenames
    const existingMeta = await getMetadata();
    const existingByFilename = new Set(
      Object.values(existingMeta || {}).map(f => f.filename)
    );

    // Scan directory for .kml/.kmz
    const entries = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });
    const candidates = entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => {
        const ext = path.extname(name).toLowerCase();
        return ext === '.kml' || ext === '.kmz';
      });

    const created = [];
    let skipped = 0;

    for (const filename of candidates) {
      if (existingByFilename.has(filename)) {
        skipped += 1;
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, filename);
      let stats;
      try {
        stats = fs.statSync(filePath);
      } catch {
        // Skip files that cannot be stat'ed
        skipped += 1;
        continue;
      }

      const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileData = {
        id: fileId,
        name: filename,
        filename,
        path: `/uploads/${filename}`,
        size: stats.size,
        uploadedAt: new Date().toISOString(),
        visible: true,
        sourceUrl: null
      };

      try {
        await saveFile(fileData);
        created.push({ id: fileId, name: filename });
      } catch (e) {
        // If DB save fails and file-storage fallback is active, saveFile handles it.
        // Count as created if no exception thrown further.
      }
    }

    res.json({
      created: created.length,
      skipped,
      files: created
    });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: 'Failed to ingest files' });
  }
});

// Update file visibility
app.patch('/api/files/:id/visibility', async (req, res) => {
  try {
    const file = await getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const payload = {};
    if (req.body.visible !== undefined) {
      payload.visible = req.body.visible;
    }
    if (req.body.layerGroup) {
      payload.layerGroup = req.body.layerGroup;
    }

    const updatedFile = Object.keys(payload).length > 0
      ? await updateFileOptions(req.params.id, payload)
      : file;

    res.json({ success: true, file: updatedFile });
  } catch (error) {
    console.error('Error updating file visibility:', error);
    res.status(500).json({ error: 'Failed to update file visibility' });
  }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = await getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    const filePath = path.join(UPLOADS_DIR, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    await deleteFile(req.params.id);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ==================== Google Sheets API Endpoints ====================

// Helper function to parse CSV (handles quoted fields with commas)
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
    if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Get river data from Google Sheets
app.get('/api/google-sheets/river-data', async (req, res) => {
  try {
    const sheetUrl = process.env.GOOGLE_SHEETS_URL || req.query.url;
    const sheetId = process.env.GOOGLE_SHEETS_ID || req.query.sheetId;
    const gid = req.query.gid || '0'; // Default to first sheet
    
    if (!sheetUrl && !sheetId) {
      return res.status(400).json({ 
        error: 'Google Sheets URL or Sheet ID is required. Set GOOGLE_SHEETS_URL or GOOGLE_SHEETS_ID environment variable, or provide url/sheetId query parameter.' 
      });
    }
    
    let csvUrl;
    if (sheetId) {
      // Use Sheet ID directly
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } else if (sheetUrl) {
      // Extract Sheet ID from URL
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid Google Sheets URL format' });
      }
      const extractedSheetId = match[1];
      csvUrl = `https://docs.google.com/spreadsheets/d/${extractedSheetId}/export?format=csv&gid=${gid}`;
    }
    
    // Fetch CSV from Google Sheets
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(400).json({ 
        error: `Failed to fetch Google Sheet. Make sure the sheet is published to the web. Status: ${response.status}` 
      });
    }
    
    const csvText = await response.text();
    const data = parseCSV(csvText);
    
    // Transform data to match expected format (normalize column names)
    const transformedData = data.map((row, index) => {
      // Try to map common column names
      const name = row['Nama Sungai'] || row['Nama'] || row['name'] || row['Name'] || '';
      const location = row['Lokasi'] || row['Location'] || row['location'] || '';
      const length = row['Panjang'] || row['Length'] || row['length'] || '';
      const width = row['Lebar'] || row['Width'] || row['width'] || '';
      const depth = row['Kedalaman'] || row['Depth'] || row['depth'] || '';
      const status = row['Status'] || row['status'] || 'Normal';
      const lastUpdate = row['Update Terakhir'] || row['Last Update'] || row['last_update'] || row['Updated At'] || '';
      const notes = row['Catatan'] || row['Notes'] || row['notes'] || '';
      
      return {
        id: `sheet-${index}`,
        name,
        location,
        length,
        width,
        depth,
        status,
        last_update: lastUpdate,
        notes
      };
    }).filter(row => row.name); // Filter out rows without a name
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    res.status(500).json({ error: 'Failed to fetch Google Sheets data', details: error.message });
  }
});

// ==================== River Data API Endpoints ====================

// Get all river data (now supports both database and Google Sheets)
app.get('/api/river-data', async (req, res) => {
  try {
    // Check if Google Sheets is configured
    const useGoogleSheets = process.env.USE_GOOGLE_SHEETS === 'true' || req.query.useGoogleSheets === 'true';
    
    if (useGoogleSheets) {
      // Fetch from Google Sheets instead
      const sheetUrl = process.env.GOOGLE_SHEETS_URL || req.query.url;
      const sheetId = process.env.GOOGLE_SHEETS_ID || req.query.sheetId;
      const gid = req.query.gid || '0';
      
      if (!sheetUrl && !sheetId) {
        return res.status(400).json({ 
          error: 'Google Sheets URL or Sheet ID is required when USE_GOOGLE_SHEETS is enabled' 
        });
      }
      
      let csvUrl;
      if (sheetId) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      } else if (sheetUrl) {
        const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
          return res.status(400).json({ error: 'Invalid Google Sheets URL format' });
        }
        const extractedSheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${extractedSheetId}/export?format=csv&gid=${gid}`;
      }
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        return res.status(400).json({ 
          error: `Failed to fetch Google Sheet. Make sure the sheet is published to the web. Status: ${response.status}` 
        });
      }
      
      const csvText = await response.text();
      const data = parseCSV(csvText);
      
      const transformedData = data.map((row, index) => {
        const name = row['Nama Sungai'] || row['Nama'] || row['name'] || row['Name'] || '';
        const location = row['Lokasi'] || row['Location'] || row['location'] || '';
        const length = row['Panjang'] || row['Length'] || row['length'] || '';
        const width = row['Lebar'] || row['Width'] || row['width'] || '';
        const depth = row['Kedalaman'] || row['Depth'] || row['depth'] || '';
        const status = row['Status'] || row['status'] || 'Normal';
        const lastUpdate = row['Update Terakhir'] || row['Last Update'] || row['last_update'] || row['Updated At'] || '';
        const notes = row['Catatan'] || row['Notes'] || row['notes'] || '';
        
        return {
          id: `sheet-${index}`,
          name,
          location,
          length,
          width,
          depth,
          status,
          last_update: lastUpdate,
          notes
        };
      }).filter(row => row.name);
      
      return res.json(transformedData);
    }
    
    // Default: fetch from database
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM river_data ORDER BY updated_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching river data:', error);
    res.status(500).json({ error: 'Failed to fetch river data' });
  }
});

// Get single river data by ID
app.get('/api/river-data/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM river_data WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'River data not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching river data:', error);
    res.status(500).json({ error: 'Failed to fetch river data' });
  }
});

// Create new river data
app.post('/api/river-data', async (req, res) => {
  try {
    const { name, location, length, width, depth, status, last_update, notes } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }
    
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO river_data (name, location, length, width, depth, status, last_update, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, location, length || null, width || null, depth || null, status || 'Normal', last_update || null, notes || null]
    );
    
    const [newRow] = await pool.execute('SELECT * FROM river_data WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error creating river data:', error);
    res.status(500).json({ error: 'Failed to create river data' });
  }
});

// Update river data
app.put('/api/river-data/:id', async (req, res) => {
  try {
    const { name, location, length, width, depth, status, last_update, notes } = req.body;
    const pool = getPool();
    
    // Check if exists
    const [existing] = await pool.execute('SELECT * FROM river_data WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'River data not found' });
    }
    
    await pool.execute(
      'UPDATE river_data SET name = ?, location = ?, length = ?, width = ?, depth = ?, status = ?, last_update = ?, notes = ? WHERE id = ?',
      [name, location, length || null, width || null, depth || null, status || 'Normal', last_update || null, notes || null, req.params.id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM river_data WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating river data:', error);
    res.status(500).json({ error: 'Failed to update river data' });
  }
});

// Delete river data
app.delete('/api/river-data/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM river_data WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'River data not found' });
    }
    res.json({ success: true, message: 'River data deleted successfully' });
  } catch (error) {
    console.error('Error deleting river data:', error);
    res.status(500).json({ error: 'Failed to delete river data' });
  }
});

// Upload river map image (JPEG/PNG/WebP)
app.post('/api/river-map/upload-image', (req, res) => {
  riverMapImageUpload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('River map image upload error:', err);
      return res.status(400).json({ error: err.message || 'Failed to upload image' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded. Please attach a JPEG/PNG/WebP file.' });
    }
    
    try {
      const inputPath = path.join(RIVER_MAP_UPLOADS_DIR, req.file.filename);
      const baseName = path.parse(req.file.filename).name;
      const publicPath = `/uploads/river-map/${req.file.filename}`;

      // If sharp is available, generate optimized versions
      const sharp = await getSharp();
      if (sharp) {
        try {
          // Generate optimized (max width 1600px) WebP
          const optimizedFilename = `${baseName}-opt.webp`;
          const optimizedPath = path.join(RIVER_MAP_UPLOADS_DIR, optimizedFilename);
          await sharp(inputPath)
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(optimizedPath);

          // Generate thumbnail (max width 480px) WebP
          const thumbFilename = `${baseName}-thumb.webp`;
          const thumbPath = path.join(RIVER_MAP_UPLOADS_DIR, thumbFilename);
          await sharp(inputPath)
            .resize({ width: 480, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(thumbPath);

          const optimizedUrl = `/uploads/river-map/${optimizedFilename}`;
          const thumbUrl = `/uploads/river-map/${thumbFilename}`;

          return res.json({
            success: true,
            url: optimizedUrl,           // use optimized as primary display URL
            originalUrl: publicPath,     // keep original if ever needed
            thumbUrl,
            filename: req.file.filename,
            size: req.file.size,
            mimeType: req.file.mimetype
          });
        } catch (sharpError) {
          console.warn('Sharp processing failed, using original image:', sharpError.message);
          // Fall through to return original image
        }
      }

      // Fallback: return original image if sharp is not available or processing failed
      res.json({
        success: true,
        url: publicPath,
        originalUrl: publicPath,
        thumbUrl: publicPath,  // Use same image as thumbnail fallback
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (processingError) {
      console.error('Error processing river map image:', processingError);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  });
});

// Configure multer for condition photo image uploads
const conditionPhotoImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CONDITION_PHOTO_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const conditionPhotoImageUpload = multer({
  storage: conditionPhotoImageStorage,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Configure multer for document uploads (PDF, DOC, JPEG, etc.)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const MAX_DOCUMENT_FILE_SIZE = parseInt(process.env.MAX_DOCUMENT_FILE_SIZE || '50') * 1024 * 1024; // Default 50MB

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.jpeg', '.jpg', '.png'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPEG, JPG, and PNG files are allowed'));
    }
  }
});

// Upload condition photo image (JPEG/PNG/WebP)
app.post('/api/condition-photos/upload-image', (req, res) => {
  conditionPhotoImageUpload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Condition photo image upload error:', err);
      return res.status(400).json({ error: err.message || 'Failed to upload image' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded. Please attach a JPEG/PNG/WebP file.' });
    }

    const publicPath = `/uploads/condition-photos/${req.file.filename}`;
    res.json({
      success: true,
      url: publicPath,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  });
});

// ==================== River Map API Endpoints ====================

// Get all river maps
app.get('/api/river-map', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM river_map ORDER BY updated_at DESC');
    // Parse map_image_urls JSON and ensure backward compatibility
    const processedRows = rows.map(row => {
      let imageUrls = [];
      if (row.map_image_urls) {
        try {
          const parsed = JSON.parse(row.map_image_urls);
          // Convert to array of objects format
          imageUrls = Array.isArray(parsed) ? parsed.map((item, index) => {
            if (typeof item === 'string') {
              return { url: item, name: `Peta ${index + 1}` };
            } else if (item && typeof item === 'object' && item.url) {
              return { url: item.url, name: item.name || `Peta ${index + 1}` };
            }
            return null;
          }).filter(Boolean) : [];
        } catch (e) {
          console.warn('Failed to parse map_image_urls:', e);
        }
      }
      // Backward compatibility: if map_image_url exists and not in array, add it
      if (row.map_image_url) {
        const urlExists = imageUrls.some(img => 
          (typeof img === 'string' ? img : img?.url) === row.map_image_url
        );
        if (!urlExists) {
          imageUrls.unshift({ url: row.map_image_url, name: 'Peta 1' });
        }
      }
      return {
        ...row,
        map_image_urls: imageUrls,
        map_image_url: (imageUrls[0] && (typeof imageUrls[0] === 'string' ? imageUrls[0] : imageUrls[0].url)) || row.map_image_url || null // Keep for backward compatibility
      };
    });
    res.json(processedRows);
  } catch (error) {
    console.error('Error fetching river map:', error);
    res.status(500).json({ error: 'Failed to fetch river map' });
  }
});

// Get single river map by ID
app.get('/api/river-map/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM river_map WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'River map not found' });
    }
    const row = rows[0];
    // Parse map_image_urls JSON and ensure backward compatibility
    let imageUrls = [];
    if (row.map_image_urls) {
      try {
        const parsed = JSON.parse(row.map_image_urls);
        imageUrls = Array.isArray(parsed) ? parsed.map((item, index) => {
          if (typeof item === 'string') {
            return { url: item, name: `Peta ${index + 1}` };
          } else if (item && typeof item === 'object' && item.url) {
            return { url: item.url, name: item.name || `Peta ${index + 1}` };
          }
          return null;
        }).filter(Boolean) : [];
      } catch (e) {
        console.warn('Failed to parse map_image_urls:', e);
      }
    }
    // Backward compatibility: if map_image_url exists and not in array, add it
    if (row.map_image_url) {
      const urlExists = imageUrls.some(img => 
        (typeof img === 'string' ? img : img?.url) === row.map_image_url
      );
      if (!urlExists) {
        imageUrls.unshift({ url: row.map_image_url, name: 'Peta 1' });
      }
    }
    res.json({
      ...row,
      map_image_urls: imageUrls,
      map_image_url: (imageUrls[0] && (typeof imageUrls[0] === 'string' ? imageUrls[0] : imageUrls[0].url)) || row.map_image_url || null // Keep for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching river map:', error);
    res.status(500).json({ error: 'Failed to fetch river map' });
  }
});

// Create or update river map (only one map entry)
app.post('/api/river-map', async (req, res) => {
  try {
    const { title, description, geo_json, map_image_url, map_image_urls, kml_file_id, visible } = req.body;
    const pool = getPool();
    let geoJsonPayload = null;
    if (geo_json) {
      if (typeof geo_json === 'string') {
        geoJsonPayload = geo_json;
      } else {
        try {
          geoJsonPayload = JSON.stringify(geo_json);
        } catch (err) {
          console.warn('Failed to stringify geo_json payload:', err);
          geoJsonPayload = null;
        }
      }
    }
    
    // Handle multiple image URLs - support both old format (array of strings) and new format (array of objects)
    let imageUrlsArray = [];
    if (map_image_urls && Array.isArray(map_image_urls)) {
      // Convert to array of objects format
      imageUrlsArray = map_image_urls
        .map((item, index) => {
          if (typeof item === 'string') {
            // Old format: string URL
            return { url: item.trim(), name: `Peta ${index + 1}` };
          } else if (item && typeof item === 'object' && item.url) {
            // New format: object with url and name
            return { url: item.url.trim(), name: item.name || `Peta ${index + 1}` };
          }
          return null;
        })
        .filter(item => item && item.url);
    } else if (map_image_url) {
      // Backward compatibility: convert single URL to array
      imageUrlsArray = [{ url: map_image_url, name: 'Peta 1' }];
    }
    const imageUrlsJson = imageUrlsArray.length > 0 ? JSON.stringify(imageUrlsArray) : null;
    const firstImageUrl = imageUrlsArray.length > 0 ? imageUrlsArray[0].url : null;
    
    // Check if map already exists
    const [existing] = await pool.execute('SELECT * FROM river_map LIMIT 1');
    
    if (existing.length > 0) {
      // Update existing
      await pool.execute(
        'UPDATE river_map SET title = ?, description = ?, geo_json = ?, map_image_url = ?, map_image_urls = ?, kml_file_id = ?, visible = ? WHERE id = ?',
        [title || null, description || null, geoJsonPayload, firstImageUrl, imageUrlsJson, kml_file_id || null, visible !== undefined ? visible : true, existing[0].id]
      );
      const [updated] = await pool.execute('SELECT * FROM river_map WHERE id = ?', [existing[0].id]);
      // Parse and return with map_image_urls array
      const row = updated[0];
      let parsedUrls = [];
      if (row.map_image_urls) {
        try {
          const parsed = JSON.parse(row.map_image_urls);
          parsedUrls = Array.isArray(parsed) ? parsed.map((item, index) => {
            if (typeof item === 'string') {
              return { url: item, name: `Peta ${index + 1}` };
            } else if (item && typeof item === 'object' && item.url) {
              return { url: item.url, name: item.name || `Peta ${index + 1}` };
            }
            return null;
          }).filter(Boolean) : [];
        } catch (e) {
          console.warn('Failed to parse map_image_urls:', e);
        }
      }
      res.json({
        ...row,
        map_image_urls: parsedUrls,
        map_image_url: (parsedUrls[0] && (typeof parsedUrls[0] === 'string' ? parsedUrls[0] : parsedUrls[0].url)) || row.map_image_url || null
      });
    } else {
      // Create new
      const [result] = await pool.execute(
        'INSERT INTO river_map (title, description, geo_json, map_image_url, map_image_urls, kml_file_id, visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title || null, description || null, geoJsonPayload, firstImageUrl, imageUrlsJson, kml_file_id || null, visible !== undefined ? visible : true]
      );
      const [newRow] = await pool.execute('SELECT * FROM river_map WHERE id = ?', [result.insertId]);
      // Parse and return with map_image_urls array
      const row = newRow[0];
      let parsedUrls = [];
      if (row.map_image_urls) {
        try {
          const parsed = JSON.parse(row.map_image_urls);
          parsedUrls = Array.isArray(parsed) ? parsed.map((item, index) => {
            if (typeof item === 'string') {
              return { url: item, name: `Peta ${index + 1}` };
            } else if (item && typeof item === 'object' && item.url) {
              return { url: item.url, name: item.name || `Peta ${index + 1}` };
            }
            return null;
          }).filter(Boolean) : [];
        } catch (e) {
          console.warn('Failed to parse map_image_urls:', e);
        }
      }
      res.status(201).json({
        ...row,
        map_image_urls: parsedUrls,
        map_image_url: (parsedUrls[0] && (typeof parsedUrls[0] === 'string' ? parsedUrls[0] : parsedUrls[0].url)) || row.map_image_url || null
      });
    }
  } catch (error) {
    console.error('Error saving river map:', error);
    res.status(500).json({ error: 'Failed to save river map' });
  }
});

// Update river map
app.put('/api/river-map/:id', async (req, res) => {
  try {
    const { title, description, geo_json, map_image_url, map_image_urls, kml_file_id, visible } = req.body;
    const pool = getPool();
    let geoJsonPayload = null;
    if (geo_json) {
      if (typeof geo_json === 'string') {
        geoJsonPayload = geo_json;
      } else {
        try {
          geoJsonPayload = JSON.stringify(geo_json);
        } catch (err) {
          console.warn('Failed to stringify geo_json payload:', err);
          geoJsonPayload = null;
        }
      }
    }
    
    // Handle multiple image URLs - support both old format (array of strings) and new format (array of objects)
    let imageUrlsArray = [];
    if (map_image_urls && Array.isArray(map_image_urls)) {
      // Convert to array of objects format
      imageUrlsArray = map_image_urls
        .map((item, index) => {
          if (typeof item === 'string') {
            // Old format: string URL
            return { url: item.trim(), name: `Peta ${index + 1}` };
          } else if (item && typeof item === 'object' && item.url) {
            // New format: object with url and name
            return { url: item.url.trim(), name: item.name || `Peta ${index + 1}` };
          }
          return null;
        })
        .filter(item => item && item.url);
    } else if (map_image_url) {
      // Backward compatibility: convert single URL to array
      imageUrlsArray = [{ url: map_image_url, name: 'Peta 1' }];
    }
    const imageUrlsJson = imageUrlsArray.length > 0 ? JSON.stringify(imageUrlsArray) : null;
    const firstImageUrl = imageUrlsArray.length > 0 ? imageUrlsArray[0].url : null;
    
    const [existing] = await pool.execute('SELECT * FROM river_map WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'River map not found' });
    }
    
    await pool.execute(
      'UPDATE river_map SET title = ?, description = ?, geo_json = ?, map_image_url = ?, map_image_urls = ?, kml_file_id = ?, visible = ? WHERE id = ?',
      [title || null, description || null, geoJsonPayload, firstImageUrl, imageUrlsJson, kml_file_id || null, visible !== undefined ? visible : true, req.params.id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM river_map WHERE id = ?', [req.params.id]);
    // Parse and return with map_image_urls array
    const row = updated[0];
    let parsedUrls = [];
    if (row.map_image_urls) {
      try {
        const parsed = JSON.parse(row.map_image_urls);
        parsedUrls = Array.isArray(parsed) ? parsed.map((item, index) => {
          if (typeof item === 'string') {
            return { url: item, name: `Peta ${index + 1}` };
          } else if (item && typeof item === 'object' && item.url) {
            return { url: item.url, name: item.name || `Peta ${index + 1}` };
          }
          return null;
        }).filter(Boolean) : [];
      } catch (e) {
        console.warn('Failed to parse map_image_urls:', e);
      }
    }
    res.json({
      ...row,
      map_image_urls: parsedUrls,
      map_image_url: (parsedUrls[0] && (typeof parsedUrls[0] === 'string' ? parsedUrls[0] : parsedUrls[0].url)) || row.map_image_url || null
    });
  } catch (error) {
    console.error('Error updating river map:', error);
    res.status(500).json({ error: 'Failed to update river map' });
  }
});

// ==================== Condition Photos API Endpoints ====================

// Get all condition photos
app.get('/api/condition-photos', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM condition_photos ORDER BY date DESC, updated_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching condition photos:', error);
    res.status(500).json({ error: 'Failed to fetch condition photos' });
  }
});

// Get single condition photo by ID
app.get('/api/condition-photos/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM condition_photos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Condition photo not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching condition photo:', error);
    res.status(500).json({ error: 'Failed to fetch condition photo' });
  }
});

// Create new condition photo
app.post('/api/condition-photos', async (req, res) => {
  try {
    const { title, location, date, status, image_url, description } = req.body;
    if (!title || !location || !date) {
      return res.status(400).json({ error: 'Title, location, and date are required' });
    }
    
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO condition_photos (title, location, date, status, image_url, description) VALUES (?, ?, ?, ?, ?, ?)',
      [title, location, date, status || 'Normal', image_url || null, description || null]
    );
    
    const [newRow] = await pool.execute('SELECT * FROM condition_photos WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error creating condition photo:', error);
    res.status(500).json({ error: 'Failed to create condition photo' });
  }
});

// Update condition photo
app.put('/api/condition-photos/:id', async (req, res) => {
  try {
    const { title, location, date, status, image_url, description } = req.body;
    const pool = getPool();
    
    const [existing] = await pool.execute('SELECT * FROM condition_photos WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Condition photo not found' });
    }
    
    await pool.execute(
      'UPDATE condition_photos SET title = ?, location = ?, date = ?, status = ?, image_url = ?, description = ? WHERE id = ?',
      [title, location, date, status || 'Normal', image_url || null, description || null, req.params.id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM condition_photos WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating condition photo:', error);
    res.status(500).json({ error: 'Failed to update condition photo' });
  }
});

// Delete condition photo
app.delete('/api/condition-photos/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM condition_photos WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Condition photo not found' });
    }
    res.json({ success: true, message: 'Condition photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting condition photo:', error);
    res.status(500).json({ error: 'Failed to delete condition photo' });
  }
});

// ==================== Documents API Endpoints ====================

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.json([]);
    }
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM documents ORDER BY uploaded_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Upload document
app.post('/api/documents/upload', (req, res) => {
  documentUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Document upload error:', err);
      return res.status(400).json({ error: err.message || 'Failed to upload document' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      // Determine file type
      let fileType = 'other';
      if (ext === '.pdf') fileType = 'pdf';
      else if (['.doc', '.docx'].includes(ext)) fileType = 'word';
      else if (['.jpeg', '.jpg', '.png'].includes(ext)) fileType = 'image';

      const documentData = {
        id: fileId,
        name: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/documents/${req.file.filename}`,
        size: req.file.size,
        file_type: fileType,
        uploaded_at: new Date().toISOString()
      };

      // Save to database if available
      if (isDatabaseAvailable()) {
        const pool = getPool();
        await pool.execute(
          'INSERT INTO documents (id, name, filename, path, size, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [documentData.id, documentData.name, documentData.filename, documentData.path, documentData.size, documentData.file_type, documentData.uploaded_at]
        );
      }

      res.json({
        success: true,
        document: documentData
      });
    } catch (error) {
      console.error('Error saving document:', error);
      res.status(500).json({ error: 'Failed to save document' });
    }
  });
});

// Download document
app.get('/api/documents/:id/download', async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = rows[0];
    const filePath = path.join(DOCUMENTS_UPLOADS_DIR, doc.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Determine content type
    const ext = path.extname(doc.name).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming document:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream document' });
      }
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
});

// Delete document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = rows[0];
    
    // Delete physical file
    const filePath = path.join(DOCUMENTS_UPLOADS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    await pool.execute('DELETE FROM documents WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ==================== App Settings API Endpoints ====================

// Get Google Sheets URL setting
app.get('/api/app-settings/google-sheets-url', async (req, res) => {
  console.log('GET /api/app-settings/google-sheets-url - Request received');
  try {
    if (!isDatabaseAvailable()) {
      // Fallback to environment variable if database is not available
      const url = process.env.GOOGLE_SHEETS_URL || process.env.VITE_GOOGLE_SHEETS_URL || '';
      const id = process.env.GOOGLE_SHEETS_ID || process.env.VITE_GOOGLE_SHEETS_ID || '';
      return res.json({ 
        setting_key: 'google_sheets_url',
        setting_value: url || id || null,
        source: 'environment'
      });
    }
    
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM app_settings WHERE setting_key = ?',
      ['google_sheets_url']
    );
    
    if (rows.length === 0) {
      // Return null if not set, but check environment as fallback
      const url = process.env.GOOGLE_SHEETS_URL || process.env.VITE_GOOGLE_SHEETS_URL || '';
      const id = process.env.GOOGLE_SHEETS_ID || process.env.VITE_GOOGLE_SHEETS_ID || '';
      return res.json({ 
        setting_key: 'google_sheets_url',
        setting_value: url || id || null,
        source: 'environment'
      });
    }
    
    res.json({
      setting_key: rows[0].setting_key,
      setting_value: rows[0].setting_value,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching Google Sheets URL:', error);
    res.status(500).json({ error: 'Failed to fetch Google Sheets URL' });
  }
});

// Save Google Sheets URL setting
app.post('/api/app-settings/google-sheets-url', async (req, res) => {
  console.log('POST /api/app-settings/google-sheets-url - Request received', { body: req.body });
  try {
    const { setting_value } = req.body;
    
    if (!isDatabaseAvailable()) {
      return res.status(503).json({ 
        error: 'Database not available. Please configure database connection.' 
      });
    }
    
    const pool = getPool();
    
    // Check if setting exists
    const [existing] = await pool.execute(
      'SELECT * FROM app_settings WHERE setting_key = ?',
      ['google_sheets_url']
    );
    
    if (existing.length > 0) {
      // Update existing setting
      await pool.execute(
        'UPDATE app_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [setting_value || null, 'google_sheets_url']
      );
    } else {
      // Insert new setting
      await pool.execute(
        'INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
        ['google_sheets_url', setting_value || null, 'Google Sheets URL or Sheet ID for Data Sungai']
      );
    }
    
    // Return updated setting
    const [updated] = await pool.execute(
      'SELECT * FROM app_settings WHERE setting_key = ?',
      ['google_sheets_url']
    );
    
    res.json({
      setting_key: updated[0].setting_key,
      setting_value: updated[0].setting_value,
      source: 'database'
    });
  } catch (error) {
    console.error('Error saving Google Sheets URL:', error);
    res.status(500).json({ error: 'Failed to save Google Sheets URL' });
  }
});

// Get blog content (Latar Belakang & Profil Sungai)
app.get('/api/app-settings/blog-content', async (req, res) => {
  console.log('GET /api/app-settings/blog-content - Request received');
  try {
    if (!isDatabaseAvailable()) {
      // Return empty content instead of error for better UX
      console.log('Database not available, returning empty blog content');
      return res.json({
        background: '',
        profile: ''
      });
    }

    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?)',
      ['blog_background', 'blog_profile']
    );

    const settingsMap = new Map(rows.map(row => [row.setting_key, row.setting_value]));
    res.json({
      background: settingsMap.get('blog_background') || '',
      profile: settingsMap.get('blog_profile') || ''
    });
  } catch (error) {
    console.error('Error fetching blog content:', error);
    // Return empty content on error instead of 500
    res.json({
      background: '',
      profile: ''
    });
  }
});

// Save blog content (Latar Belakang & Profil Sungai)
app.post('/api/app-settings/blog-content', async (req, res) => {
  console.log('POST /api/app-settings/blog-content - Request received', { body: req.body });
  try {
    if (!isDatabaseAvailable()) {
      console.warn('Database not available, cannot save blog content');
      return res.status(503).json({
        error: 'Database not available. Please configure database connection.'
      });
    }

    const { background, profile } = req.body || {};
    const pool = getPool();

    const upsertSetting = async (key, value, description) => {
      const [existing] = await pool.execute(
        'SELECT * FROM app_settings WHERE setting_key = ?',
        [key]
      );

      if (existing.length > 0) {
        await pool.execute(
          'UPDATE app_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
          [value || '', key]
        );
      } else {
        await pool.execute(
          'INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [key, value || '', description]
        );
      }
    };

    await upsertSetting('blog_background', background, 'Latar Belakang untuk section blog di halaman peta');
    await upsertSetting('blog_profile', profile, 'Profil Sungai Kota Kupang untuk section blog di halaman peta');

    const [updated] = await pool.execute(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?)',
      ['blog_background', 'blog_profile']
    );
    const settingsMap = new Map(updated.map(row => [row.setting_key, row.setting_value]));

    res.json({
      background: settingsMap.get('blog_background') || '',
      profile: settingsMap.get('blog_profile') || ''
    });
  } catch (error) {
    console.error('Error saving blog content:', error);
    res.status(500).json({ error: 'Failed to save blog content' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Return JSON error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve React app for all non-API routes (SPA fallback)
// IMPORTANT: This only handles GET requests, so POST/PUT/DELETE API routes are safe
// Works in both production and development (for Cloudflare Tunnel)
if (fs.existsSync(distPath)) {
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Set no-cache headers to prevent Cloudflare from caching index.html
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection and create tables
    console.log('Initializing database...');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️  Warning: Database initialization failed in production mode.');
        console.error('Please check your database configuration in environment variables.');
      } else {
        console.log('ℹ️  Database not available - using file-based storage for local development');
        console.log('   To use MySQL, set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME environment variables');
      }
    } else {
      // Test database connection
      const connectionOk = await testConnection();
      if (connectionOk) {
        console.log('✅ Database connection successful');
      } else {
        console.error('⚠️  Database connection test failed. Please check your database credentials.');
        console.log('   Falling back to file-based storage');
      }
    }
    
    // Listen on 0.0.0.0 to accept connections from any network interface (required for Hostinger)
    // In production, Hostinger may assign a specific host, so we listen on all interfaces
    const HOST = process.env.HOST || '0.0.0.0';

    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Uploads directory: ${UPLOADS_DIR}`);
      console.log(`Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      if (NODE_ENV === 'production') {
        console.log('Production mode: Serving built frontend from dist/');
      }
    });

    // Increase timeouts to better support large uploads over slow connections
    // Defaults can be too low when going through proxies/tunnels
    try {
      server.headersTimeout = 600000;   // 10 minutes
      server.requestTimeout = 600000;   // 10 minutes
      server.keepAliveTimeout = 600000; // 10 minutes
      console.log('HTTP timeouts increased for large uploads (10m)');
    } catch (e) {
      console.warn('Could not set HTTP server timeouts:', e?.message);
    }

    // Start uploads directory watcher to auto-ingest new files
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const debounceTimers = new Map();
      fs.watch(UPLOADS_DIR, { persistent: true }, (eventType, fname) => {
        if (!fname) return;
        if (!isAllowedGisFile(fname)) return;

        // Debounce per filename to avoid duplicate events
        const key = fname.toString();
        if (debounceTimers.has(key)) {
          clearTimeout(debounceTimers.get(key));
        }
        debounceTimers.set(key, setTimeout(() => {
          debounceTimers.delete(key);
          ingestSingleFileIfNew(key);
        }, 800));
      });
      console.log('Uploads folder watcher active for auto-ingest');
    } catch (e) {
      console.warn('Could not start uploads folder watcher:', e?.message);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connections...');
  await closePool();
  process.exit(0);
});

// Start the server
startServer();
module.exports = app;
