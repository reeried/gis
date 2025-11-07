/**
 * File Storage Service
 * Manages uploaded KML files using localStorage
 */

const STORAGE_KEY = 'uploadedKMLFiles';

/**
 * Get all uploaded files
 */
export function getAllFiles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading files:', error);
    return [];
  }
}

/**
 * Save a new file
 */
export function saveFile(fileData) {
  try {
    const files = getAllFiles();
    const newFile = {
      id: fileData.id || Date.now(),
      name: fileData.name,
      geoJson: fileData.geoJson,
      visible: fileData.visible !== undefined ? fileData.visible : true,
      uploadedAt: fileData.uploadedAt || new Date().toISOString(),
    };
    
    files.push(newFile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    return newFile;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

/**
 * Delete a file by ID
 */
export function deleteFile(fileId) {
  try {
    const files = getAllFiles();
    const filtered = files.filter(file => file.id !== fileId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Update file visibility
 */
export function updateFileVisibility(fileId, visible) {
  try {
    const files = getAllFiles();
    const updated = files.map(file =>
      file.id === fileId ? { ...file, visible } : file
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error updating file visibility:', error);
    return false;
  }
}

/**
 * Get a file by ID
 */
export function getFileById(fileId) {
  const files = getAllFiles();
  return files.find(file => file.id === fileId);
}

/**
 * Clear all files
 */
export function clearAllFiles() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing files:', error);
    return false;
  }
}

