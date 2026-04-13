/**
 * Database Storage Helper for MySQL
 * Replaces file-based metadata storage with MySQL database
 * Falls back to file-based storage if database is not available (for local development)
 */

import { getPool, isDatabaseAvailable } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'server', 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

const VALID_LAYER_GROUPS = new Set(['district', 'river', 'photo', 'administrative', 'das', 'contour', 'sumur_bor', 'mata_air', 'bendung', 'reservoir', 'jaringan_air_bersih', 'sawah', 'jaringan_irigasi']);
const DEFAULT_LAYER_GROUP = 'district';

function normalizeLayerGroup(layerGroup) {
  if (!layerGroup || typeof layerGroup !== 'string') return DEFAULT_LAYER_GROUP;
  const value = layerGroup.toLowerCase();
  return VALID_LAYER_GROUPS.has(value) ? value : DEFAULT_LAYER_GROUP;
}

function ensureLayerGroup(fileData = {}) {
  return { ...fileData, layerGroup: normalizeLayerGroup(fileData.layerGroup) };
}

function normalizeMetadataEntries(metadata = {}) {
  const normalized = {};
  Object.entries(metadata).forEach(([id, data]) => {
    normalized[id] = ensureLayerGroup({ id, ...data });
  });
  return normalized;
}

// File-based storage fallback functions
function getFileMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return normalizeMetadataEntries(parsed);
    }
  } catch (error) {
    console.error('Error reading metadata file:', error);
  }
  return {};
}

function saveFileMetadata(metadata) {
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const normalized = normalizeMetadataEntries(metadata);
    fs.writeFileSync(METADATA_FILE, JSON.stringify(normalized, null, 2));
  } catch (error) {
    console.error('Error saving metadata file:', error);
    throw error;
  }
}

/**
 * Get all files from database (or file-based storage fallback)
 */
export async function getMetadata() {
  // Use file-based storage if database is not available
  if (!isDatabaseAvailable()) {
    console.log('Using file-based storage (database not available)');
    const fileMetadata = getFileMetadata();
    const fileCount = Object.keys(fileMetadata).length;
    console.log(`File-based storage: Found ${fileCount} files`);
    return fileMetadata;
  }

  try {
    console.log('Using database storage');
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files ORDER BY uploaded_at DESC'
    );
    
    console.log(`Database query returned ${rows.length} rows`);
    
    // Convert database rows to metadata object format
    const metadata = {};
    rows.forEach(row => {
      metadata[row.id] = ensureLayerGroup({
        id: row.id,
        name: row.name,
        filename: row.filename,
        path: row.path,
        size: row.size,
        uploadedAt: row.uploaded_at.toISOString(),
        visible: row.visible === 1 || row.visible === true,
        sourceUrl: row.source_url || null,
        layerGroup: row.layer_group || DEFAULT_LAYER_GROUP
      });
    });
    
    console.log(`Converted to metadata object with ${Object.keys(metadata).length} files`);
    return metadata;
  } catch (error) {
    console.error('Error getting metadata from database, falling back to file storage:', error);
    console.error('Error details:', error.message, error.stack);
    const fileMetadata = getFileMetadata();
    const fileCount = Object.keys(fileMetadata).length;
    console.log(`Fallback file storage: Found ${fileCount} files`);
    return fileMetadata;
  }
}

/**
 * Get a single file by ID (or file-based storage fallback)
 */
export async function getFileById(id) {
  // Use file-based storage if database is not available
  if (!isDatabaseAvailable()) {
    const metadata = getFileMetadata();
    return metadata[id] || null;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      // Fallback to file storage
      const metadata = getFileMetadata();
      return metadata[id] || null;
    }
    
    const row = rows[0];
    return ensureLayerGroup({
      id: row.id,
      name: row.name,
      filename: row.filename,
      path: row.path,
      size: row.size,
      uploadedAt: row.uploaded_at.toISOString(),
      visible: row.visible === 1 || row.visible === true,
      sourceUrl: row.source_url || null,
      layerGroup: row.layer_group || DEFAULT_LAYER_GROUP
    });
  } catch (error) {
    console.error('Error getting file from database, falling back to file storage:', error);
    const metadata = getFileMetadata();
    return metadata[id] || null;
  }
}

/**
 * Save file metadata to database (or file-based storage fallback)
 */
export async function saveFile(fileData) {
  const normalizedFile = ensureLayerGroup(fileData);
  // Use file-based storage if database is not available
  if (!isDatabaseAvailable()) {
    console.log('Saving file to file-based storage (database not available):', normalizedFile.id);
    const metadata = getFileMetadata();
    metadata[normalizedFile.id] = normalizedFile;
    saveFileMetadata(metadata);
    console.log('File saved to file storage');
    return normalizedFile;
  }

  try {
    console.log('Saving file to database:', normalizedFile.id, normalizedFile.name);
    const pool = getPool();
    const result = await pool.execute(
      `INSERT INTO files (id, name, filename, path, size, uploaded_at, visible, source_url, layer_group)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         filename = VALUES(filename),
         path = VALUES(path),
         size = VALUES(size),
         visible = VALUES(visible),
         source_url = VALUES(source_url),
         layer_group = VALUES(layer_group)`,
      [
        normalizedFile.id,
        normalizedFile.name,
        normalizedFile.filename,
        normalizedFile.path,
        normalizedFile.size,
        new Date(normalizedFile.uploadedAt),
        normalizedFile.visible !== undefined ? normalizedFile.visible : true,
        normalizedFile.sourceUrl || null,
        normalizedFile.layerGroup
      ]
    );
    
    console.log('File saved to database successfully:', {
      id: normalizedFile.id,
      name: normalizedFile.name,
      affectedRows: result[0].affectedRows
    });
    return normalizedFile;
  } catch (error) {
    console.error('Error saving file to database, falling back to file storage:', error);
    console.error('Error details:', error.message, error.stack);
    const metadata = getFileMetadata();
    metadata[normalizedFile.id] = normalizedFile;
    saveFileMetadata(metadata);
    console.log('File saved to file storage as fallback');
    return normalizedFile;
  }
}

/**
 * Update file visibility (or file-based storage fallback)
 */
export async function updateFileOptions(id, options = {}) {
  const { visible, layerGroup } = options;
  // Use file-based storage if database is not available
  if (!isDatabaseAvailable()) {
    const metadata = getFileMetadata();
    if (metadata[id]) {
      if (typeof visible === 'boolean') {
        metadata[id].visible = visible;
      }
      if (layerGroup) {
        metadata[id].layerGroup = normalizeLayerGroup(layerGroup);
      }
      saveFileMetadata(metadata);
      return metadata[id];
    }
    return null;
  }

  try {
    const pool = getPool();
    const updates = [];
    const values = [];

    if (typeof visible === 'boolean') {
      updates.push('visible = ?');
      values.push(visible ? 1 : 0);
    }

    if (layerGroup) {
      updates.push('layer_group = ?');
      values.push(normalizeLayerGroup(layerGroup));
    }

    if (updates.length === 0) {
      return await getFileById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    return await getFileById(id);
  } catch (error) {
    console.error('Error updating file visibility, falling back to file storage:', error);
    const metadata = getFileMetadata();
    if (metadata[id]) {
      if (typeof visible === 'boolean') {
        metadata[id].visible = visible;
      }
      if (layerGroup) {
        metadata[id].layerGroup = normalizeLayerGroup(layerGroup);
      }
      saveFileMetadata(metadata);
      return metadata[id];
    }
    return null;
  }
}

export async function updateFileVisibility(id, visible) {
  return updateFileOptions(id, { visible });
}

/**
 * Delete file from database (or file-based storage fallback)
 */
export async function deleteFile(id) {
  // Use file-based storage if database is not available
  if (!isDatabaseAvailable()) {
    const metadata = getFileMetadata();
    if (metadata[id]) {
      delete metadata[id];
      saveFileMetadata(metadata);
      return true;
    }
    return false;
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM files WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting file from database, falling back to file storage:', error);
    const metadata = getFileMetadata();
    if (metadata[id]) {
      delete metadata[id];
      saveFileMetadata(metadata);
      return true;
    }
    return false;
  }
}

/**
 * Get all visible files
 */
export async function getVisibleFiles() {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE visible = TRUE ORDER BY uploaded_at DESC'
    );
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      filename: row.filename,
      path: row.path,
      size: row.size,
      uploadedAt: row.uploaded_at.toISOString(),
      visible: true,
      sourceUrl: row.source_url || null,
      layerGroup: row.layer_group || DEFAULT_LAYER_GROUP
    }));
  } catch (error) {
    console.error('Error getting visible files:', error);
    throw error;
  }
}

