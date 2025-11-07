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

  return new Promise((resolve, reject) => {
    try {
      const bb = busboy({ headers: req.headers, limits: { fileSize: 200 * 1024 * 1024 } });
      let uploadedFile = null;
      let sourceUrl = null;
      let fileStream = null;
      let originalFilename = null;
      let fileSize = 0;

      bb.on('file', (name, file, info) => {
        if (name !== 'file') {
          file.resume();
          return;
        }

        originalFilename = info.filename;
        const ext = path.extname(originalFilename).toLowerCase();
        
        // Validate file extension
        if (ext !== '.kml' && ext !== '.kmz') {
          file.resume();
          return reject(new Error('Only .kml and .kmz files are allowed'));
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const nameWithoutExt = path.basename(originalFilename, ext);
        const newFilename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
        const filePath = path.join(UPLOADS_DIR, newFilename);

        fileStream = fs.createWriteStream(filePath);
        uploadedFile = { filename: newFilename, path: filePath };

        file.on('data', (data) => {
          fileSize += data.length;
        });

        file.pipe(fileStream);

        file.on('end', () => {
          fileStream.end();
        });
      });

      bb.on('field', (name, value) => {
        if (name === 'sourceUrl') {
          sourceUrl = value;
        }
      });

      bb.on('finish', () => {
        if (!uploadedFile) {
          return reject(new Error('No file uploaded'));
        }

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
          // Clean up uploaded file on error
          if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
          }
          reject(error);
        }
      });

      bb.on('error', (error) => {
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        reject(error);
      });

      // Handle Vercel's request format
      if (req.on && typeof req.on === 'function') {
        // Standard Node.js stream
        req.pipe(bb);
      } else {
        // Vercel might pass the body differently - try to read it
        const chunks = [];
        if (req.body) {
          // If body is already parsed, we need to reconstruct the stream
          // This shouldn't happen with multipart, but handle it anyway
          return reject(new Error('Request body already parsed. Ensure bodyParser is disabled.'));
        }
        // Try to read as stream
        if (typeof req[Symbol.asyncIterator] === 'function') {
          (async () => {
            try {
              for await (const chunk of req) {
                bb.write(chunk);
              }
              bb.end();
            } catch (err) {
              reject(err);
            }
          })();
        } else {
          return reject(new Error('Unable to read request as stream'));
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 200MB limit' });
      } else {
        res.status(500).json({ error: error.message || 'Failed to upload file' });
      }
      resolve();
    }
  });
}

