/**
 * Storage helper for Vercel serverless functions
 * 
 * Uses Vercel KV (Redis) for persistent metadata storage.
 * Falls back to file system for local development.
 */

import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const UPLOADS_DIR = '/tmp/uploads';
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');
const METADATA_KEY = 'files:metadata';

const VALID_LAYER_GROUPS = new Set(['district', 'river', 'photo', 'administrative', 'das', 'contour', 'sumur_bor', 'mata_air', 'bendung', 'reservoir', 'jaringan_air_bersih', 'sawah', 'jaringan_irigasi']);
const DEFAULT_LAYER_GROUP = 'district';

function normalizeLayerGroup(value) {
  if (!value || typeof value !== 'string') return DEFAULT_LAYER_GROUP;
  const normalized = value.toLowerCase();
  return VALID_LAYER_GROUPS.has(normalized) ? normalized : DEFAULT_LAYER_GROUP;
}

function ensureLayerGroup(fileData = {}) {
  return { ...fileData, layerGroup: normalizeLayerGroup(fileData.layerGroup) };
}

function normalizeMetadata(metadata = {}) {
  const normalized = {};
  Object.entries(metadata).forEach(([id, data]) => {
    normalized[id] = ensureLayerGroup({ id, ...data });
  });
  return normalized;
}

// Ensure uploads directory exists (for local development)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable() {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

/**
 * Get metadata from storage
 * Uses Vercel KV if available, falls back to file system for local development
 */
export async function getMetadata() {
  // Use Vercel KV if available
  if (isKVAvailable()) {
    try {
      const metadata = await kv.get(METADATA_KEY);
      return normalizeMetadata(metadata || {});
    } catch (error) {
      console.error('Error reading metadata from KV:', error);
      // Fall back to file system on error
    }
  }
  
  // Fallback to file system for local development
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8');
      return normalizeMetadata(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error reading metadata from file system:', error);
  }
  return {};
}

/**
 * Save metadata to storage
 * Uses Vercel KV if available, falls back to file system for local development
 */
export async function saveMetadata(metadata) {
  const normalized = normalizeMetadata(metadata);
  // Use Vercel KV if available
  if (isKVAvailable()) {
    try {
      await kv.set(METADATA_KEY, normalized);
      return;
    } catch (error) {
      console.error('Error saving metadata to KV:', error);
      throw error;
    }
  }
  
  // Fallback to file system for local development
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(normalized, null, 2));
  } catch (error) {
    console.error('Error saving metadata to file system:', error);
    throw error;
  }
}

/**
 * Check if we're running on Vercel
 */
export function isVercel() {
  return !!process.env.VERCEL;
}

/**
 * Get storage info for debugging
 */
export function getStorageInfo() {
  const kvAvailable = isKVAvailable();
  return {
    isVercel: isVercel(),
    kvAvailable,
    storageType: kvAvailable ? 'Vercel KV' : 'File System',
    uploadsDir: UPLOADS_DIR,
    metadataFile: METADATA_FILE,
    metadataExists: fs.existsSync(METADATA_FILE),
    warning: isVercel() && !kvAvailable
      ? 'WARNING: On Vercel, /tmp is ephemeral. Vercel KV is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.'
      : null
  };
}

