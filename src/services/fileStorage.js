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
    const formData = new FormData();
    formData.append('file', file);
    if (sourceUrl) {
      formData.append('sourceUrl', sourceUrl);
    }

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      } else {
        // If not JSON, read as text to see what we got
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const result = await response.json();
    return result.file;
  } catch (error) {
    console.error('Error uploading file:', error);
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
 * Save file metadata (after parsing to GeoJSON)
 * Note: The file is already saved on server, this just stores the GeoJSON in localStorage
 * for quick access. The actual file remains on the server.
 */
export function saveFileMetadata(fileData) {
  try {
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    metadata[fileData.id] = {
      id: fileData.id,
      name: fileData.name,
      geoJson: fileData.geoJson,
      visible: fileData.visible !== undefined ? fileData.visible : true,
      uploadedAt: fileData.uploadedAt || new Date().toISOString(),
      sourceUrl: fileData.sourceUrl || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
    return metadata[fileData.id];
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
}

/**
 * Get file metadata (GeoJSON) from localStorage
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
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete metadata[fileId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));

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
    const STORAGE_KEY = 'kmlFileMetadata';
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (metadata[fileId]) {
      metadata[fileId].visible = visible;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
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

