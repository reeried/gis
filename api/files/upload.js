import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import busboy from 'busboy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for Vercel serverless functions (ephemeral storage)
// NOTE: Vercel has a 4.5MB limit for serverless function request bodies
// For larger files, consider using Vercel Blob Storage
const UPLOADS_DIR = '/tmp/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

export default async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log request info for debugging
    console.log('Upload request received:', {
      method: req.method,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasBody: !!req.body,
      isStream: typeof req.on === 'function',
    });

    return new Promise((resolve, reject) => {
    let uploadedFile = null;
    let sourceUrl = null;
    let fileStream = null;
    let originalFilename = null;
    let fileSize = 0;
    let hasError = false;

    const cleanup = () => {
      if (fileStream && !fileStream.destroyed) {
        try {
          fileStream.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (uploadedFile && fs.existsSync(uploadedFile.path)) {
        try {
          fs.unlinkSync(uploadedFile.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };

    const sendError = (status, message) => {
      if (hasError) return;
      hasError = true;
      cleanup();
      res.status(status).json({ error: message });
      resolve();
    };

    try {
      // Check content-type
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return sendError(400, 'Content-Type must be multipart/form-data');
      }

      // Check content-length if available
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        console.log(`Request content-length: ${sizeInMB.toFixed(2)}MB`);
        if (sizeInMB > 4.5) {
          console.warn('WARNING: File size exceeds Vercel 4.5MB limit. Upload may fail.');
        }
      }

      const bb = busboy({ 
        headers: req.headers, 
        limits: { 
          fileSize: 200 * 1024 * 1024, // 200MB (but Vercel limits to 4.5MB)
          files: 1,
          fieldSize: 1024 * 1024, // 1MB for fields
        } 
      });

      bb.on('file', (name, file, info) => {
        if (hasError) {
          file.resume();
          return;
        }

        if (name !== 'file') {
          file.resume();
          return;
        }

        originalFilename = info.filename || 'upload.kml';
        const ext = path.extname(originalFilename).toLowerCase();
        
        // Validate file extension
        if (ext !== '.kml' && ext !== '.kmz') {
          file.resume();
          return sendError(400, 'Only .kml and .kmz files are allowed');
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const nameWithoutExt = path.basename(originalFilename, ext);
        const newFilename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
        const filePath = path.join(UPLOADS_DIR, newFilename);

        try {
          fileStream = fs.createWriteStream(filePath);
          uploadedFile = { filename: newFilename, path: filePath };

          fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            sendError(500, 'Failed to write file');
          });

          file.on('data', (data) => {
            if (!hasError) {
              fileSize += data.length;
            }
          });

          file.on('error', (err) => {
            console.error('File read error:', err);
            sendError(500, 'Failed to read file');
          });

          file.pipe(fileStream);

          file.on('end', () => {
            if (fileStream && !fileStream.destroyed) {
              fileStream.end();
            }
          });
        } catch (err) {
          console.error('Error setting up file stream:', err);
          file.resume();
          sendError(500, 'Failed to process file');
        }
      });

      bb.on('field', (name, value) => {
        if (name === 'sourceUrl') {
          sourceUrl = value;
        }
      });

      bb.on('finish', () => {
        if (hasError) return;

        if (!uploadedFile) {
          return sendError(400, 'No file uploaded');
        }

        // Wait for file stream to finish
        if (fileStream && !fileStream.destroyed) {
          fileStream.on('close', () => {
            try {
              const metadata = getMetadata();
              const fileId = Date.now().toString();
              
              const fileData = {
                id: fileId,
                name: originalFilename,
                filename: uploadedFile.filename,
                path: `/api/files/${fileId}/download`,
                size: fileSize,
                uploadedAt: new Date().toISOString(),
                visible: true,
                sourceUrl: sourceUrl || null
              };

              metadata[fileId] = fileData;
              saveMetadata(metadata);

              res.status(200).json({
                success: true,
                file: fileData
              });
              resolve();
            } catch (error) {
              console.error('Error saving metadata:', error);
              cleanup();
              res.status(500).json({ error: 'Failed to save file metadata' });
              resolve();
            }
          });
        } else {
          // File stream already closed
          try {
            const metadata = getMetadata();
            const fileId = Date.now().toString();
            
            const fileData = {
              id: fileId,
              name: originalFilename,
              filename: uploadedFile.filename,
              path: `/api/files/${fileId}/download`,
              size: fileSize,
              uploadedAt: new Date().toISOString(),
              visible: true,
              sourceUrl: sourceUrl || null
            };

            metadata[fileId] = fileData;
            saveMetadata(metadata);

            res.status(200).json({
              success: true,
              file: fileData
            });
            resolve();
          } catch (error) {
            console.error('Error saving metadata:', error);
            cleanup();
            res.status(500).json({ error: 'Failed to save file metadata' });
            resolve();
          }
        }
      });

      bb.on('error', (error) => {
        // Only log and handle if we haven't already sent an error
        if (hasError) {
          console.warn('Busboy error after already handling error:', error.message);
          return;
        }
        
        console.error('Busboy error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        if (error.message.includes('Unexpected end of form') || 
            error.message.includes('Malformed')) {
          // This usually means the request was truncated or incomplete
          console.error('Form data incomplete. Possible causes:');
          console.error('- Request body was truncated');
          console.error('- File size exceeds Vercel limit (4.5MB)');
          console.error('- Network interruption');
          console.error('- Request timeout');
          sendError(400, 'Invalid or incomplete form data. Please check file size (must be < 4.5MB for Vercel) and try again.');
        } else if (error.code === 'LIMIT_FILE_SIZE') {
          sendError(400, 'File size exceeds 200MB limit');
        } else {
          sendError(500, error.message || 'Failed to parse form data');
        }
      });

      // Handle Vercel's request format
      // In Vercel serverless functions, req is a readable stream
      // We need to pipe it to busboy, but handle errors carefully
      
      let requestEnded = false;
      
      // Handle request stream errors
      req.on('error', (err) => {
        console.error('Request stream error:', err);
        if (!hasError) {
          sendError(500, 'Request stream error');
        }
      });
      
      // Handle request end/close
      req.on('end', () => {
        requestEnded = true;
      });
      
      req.on('close', () => {
        requestEnded = true;
      });
      
      // Pipe request to busboy
      // This is the standard way to handle multipart/form-data
      req.pipe(bb);
      
      // Ensure busboy gets properly closed if request ends prematurely
      req.on('aborted', () => {
        console.warn('Request aborted by client');
        if (!hasError) {
          sendError(400, 'Request was aborted');
        }
      });
    } catch (error) {
      console.error('Upload handler error:', error);
      sendError(500, error.message || 'Failed to process upload');
    }
  });
  } catch (error) {
    console.error('Handler wrapper error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

