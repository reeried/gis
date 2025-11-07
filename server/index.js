import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

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

// Middleware
// CORS configuration - allow all origins
// In production, frontend and API are on same domain, but CORS helps with any edge cases
// In development, this allows Vite dev server to connect
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '500mb' })); // Increase body parser limit for large files
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

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

// Serve static files from dist folder in production
if (NODE_ENV === 'production') {
  const distPath = path.join(PROJECT_ROOT, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('Serving static files from:', distPath);
  } else {
    console.warn('Warning: dist folder not found. Run "npm run build" first.');
  }
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

// Metadata file to store file information (in uploads directory)
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

function getMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading metadata:', error);
  }
  return {};
}

function saveMetadata(metadata) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error;
  }
}

// API Routes

// Upload KML file
app.post('/api/files/upload', (req, res, next) => {
  console.log('POST /api/files/upload route hit');
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Handle multer errors (file size, file type, etc.)
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
          return res.status(400).json({ error: `File size exceeds ${maxSizeMB}MB limit` });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      // Handle other errors (like fileFilter errors)
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, (req, res) => {
  try {
    console.log('Upload request received:', { 
      hasFile: !!req.file, 
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      body: req.body 
    });
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const metadata = getMetadata();
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
      sourceUrl: req.body.sourceUrl || null
    };

    metadata[fileId] = fileData;
    saveMetadata(metadata);

    console.log('File uploaded successfully:', fileData);
    
    res.json({
      success: true,
      file: fileData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// Upload KML from URL (server downloads and saves it)
app.post('/api/files/upload-from-url', async (req, res) => {
  try {
    const { url } = req.body;
    
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

    const metadata = getMetadata();
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
      sourceUrl: url
    };

    metadata[fileId] = fileData;
    saveMetadata(metadata);

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
app.get('/api/files', (req, res) => {
  try {
    const metadata = getMetadata();
    const files = Object.values(metadata);
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Also handle trailing slash to prevent 403 from web server
app.get('/api/files/', (req, res) => {
  try {
    const metadata = getMetadata();
    const files = Object.values(metadata);
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Get file by ID
app.get('/api/files/:id', (req, res) => {
  try {
    const metadata = getMetadata();
    const file = metadata[req.params.id];
    
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
app.get('/api/files/:id/download', (req, res) => {
  try {
    const metadata = getMetadata();
    const file = metadata[req.params.id];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, file.name);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Update file visibility
app.patch('/api/files/:id/visibility', (req, res) => {
  try {
    const metadata = getMetadata();
    const file = metadata[req.params.id];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    file.visible = req.body.visible !== undefined ? req.body.visible : file.visible;
    metadata[req.params.id] = file;
    saveMetadata(metadata);

    res.json({ success: true, file });
  } catch (error) {
    console.error('Error updating file visibility:', error);
    res.status(500).json({ error: 'Failed to update file visibility' });
  }
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  try {
    const metadata = getMetadata();
    const file = metadata[req.params.id];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    const filePath = path.join(UPLOADS_DIR, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from metadata
    delete metadata[req.params.id];
    saveMetadata(metadata);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
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
if (NODE_ENV === 'production') {
  const distPath = path.join(PROJECT_ROOT, 'dist');
  if (fs.existsSync(distPath)) {
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Listen on 0.0.0.0 to accept connections from any network interface (required for Hostinger)
// In production, Hostinger may assign a specific host, so we listen on all interfaces
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
  console.log(`Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  if (NODE_ENV === 'production') {
    console.log('Production mode: Serving built frontend from dist/');
  }
});

