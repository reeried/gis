import { getMetadata, getStorageInfo } from './storage.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Prevent caching - Vercel serverless functions have ephemeral storage
  // Each function invocation has a fresh /tmp directory
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Log storage info for debugging
      const storageInfo = getStorageInfo();
      console.log('Storage info:', storageInfo);
      
      const metadata = await getMetadata();
      const files = Object.values(metadata);
      
      console.log('Metadata keys:', Object.keys(metadata));
      console.log('Files count:', files.length);
      
      // Warn if on Vercel but KV is not configured
      if (storageInfo.isVercel && !storageInfo.kvAvailable && storageInfo.warning) {
        console.warn(storageInfo.warning);
      }
      
      res.status(200).json(files);
    } catch (error) {
      console.error('Error getting files:', error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

