/**
 * File Storage Service
 * Manages uploaded KML files using server-side storage
 */

// Use relative URL to work with Vite proxy, or absolute URL if VITE_API_URL is set
// In production (served from Express), relative URLs work fine
// In development with Vite, the proxy handles /api -> http://localhost:3001/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to get full URL for debugging
function getApiUrl(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  // If it's a relative URL and we're in the browser, log the full URL
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    console.log(`API URL: ${window.location.origin}${url}`);
  }
  return url;
}

/**
 * Get all uploaded files
 */
export async function getAllFiles() {
  try {
    const url = getApiUrl('/files');
    const response = await fetch(url);
    
    if (!response.ok) {
      // Log detailed error information
      console.error('Failed to fetch files:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        fullUrl: typeof window !== 'undefined' && url.startsWith('/') 
          ? `${window.location.origin}${url}`
          : url
      });
      
      // If 403, provide more specific error message
      if (response.status === 403) {
        throw new Error(`Access forbidden (403). The server may be blocking the request. Check server configuration and ensure the Node.js server is running.`);
      }
      
      throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 500));
      throw new Error('Server returned invalid response. Expected JSON but received: ' + contentType);
    }
    
    const files = await response.json();
    return files || [];
  } catch (error) {
    console.error('Error loading files:', error);
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

/**
 * Upload a file to the server
 */
export async function uploadFile(file, sourceUrl = null) {
  try {
    const uploadUrl = getApiUrl('/files/upload');
    console.log('Starting file upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      apiUrl: uploadUrl,
      baseUrl: API_BASE_URL,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'N/A'
    });
    
    const formData = new FormData();
    formData.append('file', file);
    if (sourceUrl) {
      formData.append('sourceUrl', sourceUrl);
    }

    console.log('Sending request to:', uploadUrl);
    console.log('FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `${v.name} (${v.size} bytes)` : v]));
    
    const response = await fetch(uploadUrl, {
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

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 500));
      throw new Error(`Server returned invalid response. This usually means the API endpoint is not available. Check if the server is running or if the API route is configured correctly.`);
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    return result.file;
  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      apiUrl: getApiUrl('/files/upload'),
      baseUrl: API_BASE_URL
    });
    
    // Provide more helpful error messages
    if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      const apiUrl = getApiUrl('/files/upload');
      const fullUrl = typeof window !== 'undefined' && apiUrl.startsWith('/') 
        ? `${window.location.origin}${apiUrl}`
        : apiUrl;
      throw new Error(`Cannot connect to server at ${fullUrl}. Please make sure the backend server is running.`);
    }
    if (error.message.includes('SyntaxError') || error.message.includes('Unexpected token')) {
      throw new Error('Server returned an invalid response. The API endpoint may not be configured correctly.');
    }
    throw error;
  }
}

/**
 * Upload a file from URL
 */
export async function uploadFileFromURL(url) {
  try {
    const apiUrl = getApiUrl('/files/upload-from-url');
    const response = await fetch(apiUrl, {
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
    const url = getApiUrl(`/files/${fileId}`);
    const response = await fetch(url, {
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
    const url = getApiUrl(`/files/${fileId}/visibility`);
    const response = await fetch(url, {
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
    const url = getApiUrl(`/files/${fileId}`);
    const response = await fetch(url);
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
    const url = getApiUrl(`/files/${fileId}/download`);
    const response = await fetch(url);
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

