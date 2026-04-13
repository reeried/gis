import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMetadata, saveMetadata } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = '/tmp/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

    const metadata = await getMetadata();
    const fileId = Date.now().toString();
    
    const fileData = {
      id: fileId,
      name: fileName,
      filename: savedFileName,
      path: `/api/files/${fileId}/download`,
      size: buffer.byteLength,
      uploadedAt: new Date().toISOString(),
      visible: true,
      sourceUrl: url,
      layerGroup: layerGroup || 'district'
    };

    metadata[fileId] = fileData;
    await saveMetadata(metadata);

    res.status(200).json({
      success: true,
      file: fileData
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file from URL' });
  }
}

