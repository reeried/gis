/**
 * File Storage Service
 * Manages uploaded KML files using server-side storage
 */

// Use relative URL to work with Vite proxy, or absolute URL if VITE_API_URL is set
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get all uploaded files
 */
export async function getAllFiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/files`);
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    const files = await response.json();
    return files || [];
  } catch (error) {
    console.error('Error loading files:', error);
    // Fallback to empty array if server is not available
    return [];
  }
}

/**
 * Upload a file to the server
 */
export async function uploadFile(file, sourceUrl = null) {
  try {
    console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, apiUrl: `${API_BASE_URL}/files/upload` });
    
    const formData = new FormData();
    formData.append('file', file);
    if (sourceUrl) {
      formData.append('sourceUrl', sourceUrl);
    }

    console.log('Sending request to:', `${API_BASE_URL}/files/upload`);
    
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    });

    console.log('Response received:', { status: response.status, statusText: response.statusText, ok: response.ok });

    if (!response.ok) {
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.error('Upload failed:', { status: response.status, statusText: response.statusText, contentType });
      
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        console.error('Error response JSON:', error);
        throw new Error(error.error || 'Failed to upload file');
      } else {
        // If not JSON, read as text to see what we got
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}. ${text.substring(0, 200)}`);
      }
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    return result.file;
  } catch (error) {
    console.error('Error uploading file:', error);
    // Provide more helpful error messages
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please make sure the server is running on port 3001.');
    }
    throw error;
  }
}

/**
 * Upload a file from URL
 */
export async function uploadFileFromURL(url) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/upload-from-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file from URL');
    }

    const result = await response.json();
    return result.file;
  } catch (error) {
    console.error('Error uploading file from URL:', error);
    throw error;
  }
}

/**
 * Save file metadata (lightweight, without GeoJSON)
 * Note: GeoJSON is NOT stored in localStorage to avoid quota issues.
 * Files are fetched and parsed from the server when needed.
 */
export function saveFileMetadata(fileData) {
  try {
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // Only store lightweight metadata, NOT the GeoJSON
    metadata[fileData.id] = {
      id: fileData.id,
      name: fileData.name,
      visible: fileData.visible !== undefined ? fileData.visible : true,
      uploadedAt: fileData.uploadedAt || new Date().toISOString(),
      sourceUrl: fileData.sourceUrl || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
    return metadata[fileData.id];
  } catch (error) {
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
      console.warn('localStorage quota exceeded. Clearing old entries...');
      // Try to clear old entries and retry
      clearOldMetadata();
      try {
        const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        metadata[fileData.id] = {
          id: fileData.id,
          name: fileData.name,
          visible: fileData.visible !== undefined ? fileData.visible : true,
          uploadedAt: fileData.uploadedAt || new Date().toISOString(),
          sourceUrl: fileData.sourceUrl || null,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
        return metadata[fileData.id];
      } catch (retryError) {
        console.error('Error saving file metadata after cleanup:', retryError);
        // If still failing, just return the data without saving
        return {
          id: fileData.id,
          name: fileData.name,
          visible: fileData.visible !== undefined ? fileData.visible : true,
          uploadedAt: fileData.uploadedAt || new Date().toISOString(),
          sourceUrl: fileData.sourceUrl || null,
        };
      }
    }
    console.error('Error saving file metadata:', error);
    throw error;
  }
}

/**
 * Clear old metadata entries to free up space
 */
function clearOldMetadata() {
  try {
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Sort by uploadedAt and keep only the 50 most recent entries
    const entries = Object.entries(metadata);
    entries.sort((a, b) => {
      const dateA = new Date(a[1].uploadedAt || 0);
      const dateB = new Date(b[1].uploadedAt || 0);
      return dateB - dateA;
    });
    
    const recentEntries = entries.slice(0, 50);
    const cleanedMetadata = Object.fromEntries(recentEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedMetadata));
  } catch (error) {
    console.error('Error clearing old metadata:', error);
    // If cleanup fails, clear everything
    try {
      localStorage.removeItem('kmlFileMetadata');
    } catch (e) {
      console.error('Error removing metadata:', e);
    }
  }
}

/**
 * Get file metadata (lightweight, without GeoJSON) from localStorage
 * Note: GeoJSON is NOT stored in localStorage. Use downloadFile and parseKMLFile
 * to get the GeoJSON when needed.
 */
export function getFileMetadata(fileId) {
  try {
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return metadata[fileId] || null;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

/**
 * Delete a file by ID
 */
export async function deleteFile(fileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    // Also remove from localStorage metadata
    try {
      const STORAGE_KEY = 'kmlFileMetadata';
      const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      delete metadata[fileId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      // Ignore localStorage errors during deletion
      console.warn('Error removing metadata from localStorage:', error);
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Update file visibility
 */
export async function updateFileVisibility(fileId, visible) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visible }),
    });

    if (!response.ok) {
      throw new Error('Failed to update file visibility');
    }

    // Also update localStorage metadata
    try {
      const STORAGE_KEY = 'kmlFileMetadata';
      const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (metadata[fileId]) {
        metadata[fileId].visible = visible;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      // Ignore localStorage errors during update
      console.warn('Error updating metadata in localStorage:', error);
    }

    return true;
  } catch (error) {
    console.error('Error updating file visibility:', error);
    return false;
  }
}

/**
 * Get a file by ID
 */
export async function getFileById(fileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

/**
 * Download file content (for parsing)
 */
export async function downloadFile(fileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return await response.blob();
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Clear all file metadata from localStorage
 * Useful for fixing quota exceeded errors
 */
export function clearAllFileMetadata() {
  try {
    localStorage.removeItem('kmlFileMetadata');
    console.log('All file metadata cleared from localStorage');
    return true;
  } catch (error) {
    console.error('Error clearing file metadata:', error);
    return false;
  }
}

/**
 * Migrate existing localStorage data to remove GeoJSON
 * This should be called once on app startup to clean up old data
 */
export function migrateFileMetadata() {
  try {
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let hasChanges = false;
    
    // Remove GeoJSON from all entries
    for (const [fileId, fileData] of Object.entries(metadata)) {
      if (fileData && fileData.geoJson) {
        // Keep only lightweight metadata
        metadata[fileId] = {
          id: fileData.id,
          name: fileData.name,
          visible: fileData.visible !== undefined ? fileData.visible : true,
          uploadedAt: fileData.uploadedAt || new Date().toISOString(),
          sourceUrl: fileData.sourceUrl || null,
        };
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      console.log('Migrated file metadata: removed GeoJSON from localStorage');
    }
    
    return hasChanges;
  } catch (error) {
    console.error('Error migrating file metadata:', error);
    // If migration fails, try to clear everything
    try {
      localStorage.removeItem('kmlFileMetadata');
    } catch (e) {
      console.error('Error removing metadata during migration:', e);
    }
    return false;
  }
}

