import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = '/tmp/uploads';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const metadata = getMetadata();
      const file = metadata[id];
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.status(200).json(file);
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ error: 'Failed to get file' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const metadata = getMetadata();
      const file = metadata[id];
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete physical file
      const filePath = path.join(UPLOADS_DIR, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from metadata
      delete metadata[id];
      saveMetadata(metadata);

      res.status(200).json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

