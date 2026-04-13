import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import busboy from 'busboy';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for serverless functions (ephemeral storage)
const DOCUMENTS_DIR = '/tmp/documents';
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gis_files',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool = null;

function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      console.log('MySQL connection pool created for documents upload');
    } catch (error) {
      console.error('Failed to create MySQL connection pool:', error);
      throw error;
    }
  }
  return pool;
}

async function isDatabaseAvailable() {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database not available:', error.message);
    return false;
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

    // Check content-type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Check content-length if available (50MB limit for documents)
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`Request content-length: ${sizeInMB.toFixed(2)}MB`);
      if (sizeInMB > 50) {
        console.warn('WARNING: File size exceeds 50MB limit.');
        return res.status(413).json({ error: `File size (${sizeInMB.toFixed(2)}MB) exceeds 50MB limit.` });
      }
    }

    return new Promise((resolve, reject) => {
      let uploadedFile = null;
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

      const bb = busboy({ 
        headers: req.headers, 
        limits: { 
          fileSize: 50 * 1024 * 1024, // 50MB
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

        originalFilename = info.filename || 'upload';
        const ext = path.extname(originalFilename).toLowerCase();
        
        // Validate file extension
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpeg', '.jpg', '.png'];
        if (!allowedExtensions.includes(ext)) {
          file.resume();
          return sendError(400, 'Only PDF, DOC, DOCX, JPEG, JPG, and PNG files are allowed');
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const nameWithoutExt = path.basename(originalFilename, ext);
        const newFilename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
        const filePath = path.join(DOCUMENTS_DIR, newFilename);

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

      bb.on('finish', async () => {
        if (hasError) return;

        if (!uploadedFile) {
          return sendError(400, 'No file uploaded');
        }

        // Wait for file stream to finish
        if (fileStream && !fileStream.destroyed) {
          fileStream.on('close', async () => {
            try {
              const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
              const ext = path.extname(originalFilename).toLowerCase();
              
              // Determine file type
              let fileType = 'other';
              if (ext === '.pdf') fileType = 'pdf';
              else if (['.doc', '.docx'].includes(ext)) fileType = 'word';
              else if (['.jpeg', '.jpg', '.png'].includes(ext)) fileType = 'image';

              const documentData = {
                id: fileId,
                name: originalFilename,
                filename: uploadedFile.filename,
                path: `/uploads/documents/${uploadedFile.filename}`,
                size: fileSize,
                file_type: fileType,
                uploaded_at: new Date().toISOString()
              };

              // Save to database if available
              const dbAvailable = await isDatabaseAvailable();
              if (dbAvailable) {
                try {
                  const pool = getPool();
                  await pool.execute(
                    'INSERT INTO documents (id, name, filename, path, size, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [documentData.id, documentData.name, documentData.filename, documentData.path, documentData.size, documentData.file_type, documentData.uploaded_at]
                  );
                  console.log('Document saved to database:', documentData.id);
                } catch (dbError) {
                  console.error('Error saving document to database:', dbError);
                  // Continue even if database save fails
                }
              }

              res.status(200).json({
                success: true,
                document: documentData
              });
              resolve();
            } catch (error) {
              console.error('Error saving document metadata:', error);
              cleanup();
              res.status(500).json({ error: 'Failed to save document metadata' });
              resolve();
            }
          });
        } else {
          // File stream already closed
          try {
            const fileId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const ext = path.extname(originalFilename).toLowerCase();
            
            let fileType = 'other';
            if (ext === '.pdf') fileType = 'pdf';
            else if (['.doc', '.docx'].includes(ext)) fileType = 'word';
            else if (['.jpeg', '.jpg', '.png'].includes(ext)) fileType = 'image';

            const documentData = {
              id: fileId,
              name: originalFilename,
              filename: uploadedFile.filename,
              path: `/uploads/documents/${uploadedFile.filename}`,
              size: fileSize,
              file_type: fileType,
              uploaded_at: new Date().toISOString()
            };

            const dbAvailable = await isDatabaseAvailable();
            if (dbAvailable) {
              try {
                const pool = getPool();
                await pool.execute(
                  'INSERT INTO documents (id, name, filename, path, size, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [documentData.id, documentData.name, documentData.filename, documentData.path, documentData.size, documentData.file_type, documentData.uploaded_at]
                );
              } catch (dbError) {
                console.error('Error saving document to database:', dbError);
              }
            }

            res.status(200).json({
              success: true,
              document: documentData
            });
            resolve();
          } catch (error) {
            console.error('Error saving document metadata:', error);
            cleanup();
            res.status(500).json({ error: 'Failed to save document metadata' });
            resolve();
          }
        }
      });

      bb.on('error', (error) => {
        if (hasError) {
          console.warn('Busboy error after already handling error:', error.message);
          return;
        }
        
        console.error('Busboy error:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
          sendError(413, 'File size exceeds 50MB limit.');
        } else {
          sendError(500, error.message || 'Failed to parse form data');
        }
      });

      req.on('error', (err) => {
        console.error('Request stream error:', err);
        if (!hasError) {
          sendError(500, 'Request stream error: ' + (err.message || 'Unknown error'));
        }
      });

      req.pipe(bb);
    });
  } catch (error) {
    console.error('Handler wrapper error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

