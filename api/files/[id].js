import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMetadata, saveMetadata } from '../storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = '/tmp/uploads';

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
      const metadata = await getMetadata();
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
      const metadata = await getMetadata();
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
      await saveMetadata(metadata);

      res.status(200).json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const metadata = await getMetadata();
      const file = metadata[id];

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const updatedFile = {
        ...file,
        ...(req.body.visible !== undefined ? { visible: req.body.visible } : {}),
        ...(req.body.layerGroup ? { layerGroup: req.body.layerGroup } : {})
      };

      metadata[id] = updatedFile;
      await saveMetadata(metadata);

      res.status(200).json({ success: true, file: updatedFile });
    } catch (error) {
      console.error('Error updating file options:', error);
      res.status(500).json({ error: 'Failed to update file options' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

