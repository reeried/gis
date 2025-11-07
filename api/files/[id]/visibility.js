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
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const metadata = getMetadata();
    const file = metadata[id];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    file.visible = req.body.visible !== undefined ? req.body.visible : file.visible;
    metadata[id] = file;
    saveMetadata(metadata);

    res.status(200).json({ success: true, file });
  } catch (error) {
    console.error('Error updating file visibility:', error);
    res.status(500).json({ error: 'Failed to update file visibility' });
  }
}

