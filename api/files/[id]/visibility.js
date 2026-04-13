import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMetadata, saveMetadata } from '../../storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = '/tmp/uploads';

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
    const metadata = await getMetadata();
    const file = metadata[id];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (req.body.visible !== undefined) {
      file.visible = req.body.visible;
    }
    if (req.body.layerGroup) {
      file.layerGroup = req.body.layerGroup;
    }
    metadata[id] = file;
    await saveMetadata(metadata);

    res.status(200).json({ success: true, file });
  } catch (error) {
    console.error('Error updating file visibility:', error);
    res.status(500).json({ error: 'Failed to update file visibility' });
  }
}

