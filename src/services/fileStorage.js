/**
 * File Storage Service
 * Manages uploaded KML files using server-side storage
 */

// Use relative URL to work with Vite proxy, or absolute URL if VITE_API_URL is set
// In production (served from Express), relative URLs work fine
// In development with Vite, the proxy handles /api -> http://localhost:3001/api
let API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
// If we're running on localhost, force relative '/api' even if VITE_API_URL is set to a remote URL
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (isLocalHost && import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    console.warn('Overriding VITE_API_URL for local dev. Using Vite proxy at /api');
    API_BASE_URL = '/api';
  }
}

const VALID_LAYER_GROUPS = new Set(['district', 'river', 'photo', 'administrative', 'das', 'contour', 'sumur_bor', 'mata_air', 'bendung', 'reservoir', 'jaringan_air_bersih', 'sawah', 'jaringan_irigasi']);
const DEFAULT_LAYER_GROUP = 'district';

function normalizeLayerGroup(value) {
  if (!value || typeof value !== 'string') return DEFAULT_LAYER_GROUP;
  const normalized = value.toLowerCase();
  return VALID_LAYER_GROUPS.has(normalized) ? normalized : DEFAULT_LAYER_GROUP;
}

// Helper to get full URL for debugging
export function getApiUrl(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  // If it's a relative URL and we're in the browser, log the full URL
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    console.log(`API URL: ${window.location.origin}${url}`);
  }
  return url;
}

// Helper to get headers
function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  // Cloudflare Tunnel doesn't require special headers
  return headers;
}

/**
 * Test API connection by calling health endpoint
 * Returns { connected: boolean, error?: string, url?: string }
 */
export async function testApiConnection() {
  try {
    const url = getApiUrl('/health');
    const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
      ? `${window.location.origin}${url}`
      : url;
    
    console.log('Testing API connection to:', fullUrl);
    
    // Create timeout manually for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful:', data);
      return { connected: true, url: fullUrl };
    } else {
      console.warn('⚠️ API health check returned non-OK status:', response.status);
      return { 
        connected: false, 
        error: `Server returned ${response.status} ${response.statusText}`,
        url: fullUrl 
      };
    }
  } catch (error) {
    const url = getApiUrl('/health');
    const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
      ? `${window.location.origin}${url}`
      : url;
    
    console.error('❌ API connection test failed:', error);
    
    let errorMsg = 'Cannot connect to server';
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorMsg = 'Connection timeout - server may be down or unreachable';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMsg = 'Network error - cannot reach server';
    } else {
      errorMsg = error.message || 'Unknown connection error';
    }
    
    return { 
      connected: false, 
      error: errorMsg,
      url: fullUrl 
    };
  }
}

/**
 * Get all uploaded files
 */
export async function getAllFiles() {
  try {
    const url = getApiUrl('/files');
    const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
      ? `${window.location.origin}${url}`
      : url;
    
    console.log('🔍 getAllFiles() - Fetching files from:', fullUrl);
    console.log('🔍 API_BASE_URL:', API_BASE_URL);
    console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏱️ Request timeout after 10 seconds');
      controller.abort();
    }, 10000);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Response received in ${duration}ms:`, {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      ok: response.ok
    });
    
    if (!response.ok) {
      // Log detailed error information
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('❌ Failed to fetch files:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        fullUrl: fullUrl,
        errorBody: errorText.substring(0, 500)
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
      console.error('❌ Non-JSON response received:', {
        contentType: contentType,
        bodyPreview: text.substring(0, 500)
      });
      throw new Error('Server returned invalid response. Expected JSON but received: ' + contentType);
    }
    
    const files = await response.json();
    const normalizedFiles = (files || []).map(file => ({
      ...file,
      layerGroup: normalizeLayerGroup(file.layerGroup || file.layer_group)
    }));
    console.log(`✅ getAllFiles() - Successfully received ${normalizedFiles?.length || 0} files`);
    if (normalizedFiles && normalizedFiles.length > 0) {
      console.log('📁 Files received:', normalizedFiles.map(f => ({ id: f.id, name: f.name, visible: f.visible, layerGroup: f.layerGroup })));
    } else {
      console.warn('⚠️ getAllFiles() - Received empty array or null');
    }
    
    return normalizedFiles;
  } catch (error) {
    console.error('❌ Error in getAllFiles():', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // If it's an abort error (timeout), provide helpful message
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server may be down or unreachable. Check if the backend server is running.');
    }
    
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

/**
 * Upload a file to the server
 */
export async function uploadFile(file, options = {}, onProgress) {
  try {
    const { sourceUrl = null, layerGroup = DEFAULT_LAYER_GROUP } = options;
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
    formData.append('layerGroup', normalizeLayerGroup(layerGroup));

    console.log('Sending request to:', uploadUrl);
    console.log('FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `${v.name} (${v.size} bytes)` : v]));
    
    const performUploadWithFetch = async () => {
      // Calculate timeout based on file size (minimum 30 seconds, +10 seconds per MB)
      const fileSizeMB = file.size / (1024 * 1024);
      const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 10000)); // Min 30s, +10s per MB
      const maxTimeout = 5 * 60 * 1000; // Cap at 5 minutes
      const actualTimeout = Math.min(timeoutMs, maxTimeout);
      
      console.log(`Setting upload timeout to ${actualTimeout / 1000}s for file size ${fileSizeMB.toFixed(2)}MB`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error(`⏱️ Upload timeout after ${actualTimeout / 1000} seconds`);
        controller.abort();
      }, actualTimeout);
      
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: getHeaders(),
          body: formData,
          signal: controller.signal,
          // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        });
        
        clearTimeout(timeoutId);
  
        console.log('Response received:', { status: response.status, statusText: response.statusText, ok: response.ok });
  
        if (!response.ok) {
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          console.error('Upload failed:', { status: response.status, statusText: response.statusText, contentType });
          
          // Handle 413 (Payload Too Large) - Vercel's 4.5MB limit
          if (response.status === 413) {
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              throw new Error(error.error || 'File size exceeds Vercel\'s 4.5MB limit. Please use a smaller file or deploy to Hostinger for larger file support.');
            } else {
              const text = await response.text();
              throw new Error(`File size exceeds Vercel's 4.5MB limit. ${text.substring(0, 200)}`);
            }
          }
          
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
        console.log('Response Content-Type:', contentType);
        
        // Read response as text first for debugging
        const text = await response.text();
        console.log('Response body (raw, first 500 chars):', text.substring(0, 500));
        console.log('Response body length:', text.length);
        
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', {
            contentType,
            status: response.status,
            statusText: response.statusText,
            bodyLength: text.length,
            body: text.substring(0, 500)
          });
          throw new Error(`Server returned invalid response (${contentType}). This usually means the API endpoint is not available. Check if the server is running or if the API route is configured correctly.`);
        }
        
        if (!text || text.trim().length === 0) {
          console.error('Empty response body received');
          throw new Error('Server returned empty response. The upload may have failed silently.');
        }
        
        let result;
        try {
          result = JSON.parse(text);
          console.log('Upload successful, parsed result:', result);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          console.error('Response text that failed to parse:', text);
          throw new Error(`Failed to parse server response as JSON: ${parseError.message}. Response: ${text.substring(0, 200)}`);
        }
        
        if (!result || !result.file) {
          console.error('Invalid response format:', result);
          throw new Error('Server returned invalid response format. Expected { success: true, file: {...} }');
        }
        
        return result.file;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Upload timeout after ${actualTimeout / 1000} seconds. The file may be too large or the server may be slow. Please try again or use a smaller file.`);
        }
        throw error;
      }
    };

    const parseUploadResult = (status, statusText, responseText, contentType) => {
      if (status === 0 && (responseText === null || responseText === undefined)) {
        throw new Error('Network error occurred during upload.');
      }

      if (status < 200 || status >= 300) {
        console.error('Upload failed:', { status, statusText, contentType });
        if (status === 413) {
          throw new Error('File size exceeds Vercel\'s 4.5MB limit. Please use a smaller file or deploy to Hostinger for larger file support.');
        }
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = JSON.parse(responseText);
            throw new Error(error.error || 'Failed to upload file');
          } catch (parseErr) {
            throw new Error(`Upload failed: ${status} ${statusText}.`);
          }
        }
        throw new Error(`Upload failed: ${status} ${statusText}. ${responseText ? responseText.substring(0, 200) : ''}`);
      }

      console.log('Response Content-Type:', contentType);
      console.log('Response body (raw, first 500 chars):', responseText?.substring(0, 500));

      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', {
          contentType,
          status,
          statusText,
          bodyLength: responseText?.length || 0,
          body: responseText?.substring(0, 500)
        });
        throw new Error(`Server returned invalid response (${contentType}). This usually means the API endpoint is not available. Check if the server is running or if the API route is configured correctly.`);
      }

      if (!responseText || responseText.trim().length === 0) {
        console.error('Empty response body received');
        throw new Error('Server returned empty response. The upload may have failed silently.');
      }

      let parsed;
      try {
        parsed = JSON.parse(responseText);
        console.log('Upload successful, parsed result:', parsed);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error(`Failed to parse server response as JSON: ${parseError.message}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!parsed || !parsed.file) {
        console.error('Invalid response format:', parsed);
        throw new Error('Server returned invalid response format. Expected { success: true, file: {...} }');
      }

      return parsed.file;
    };

    if (typeof XMLHttpRequest === 'undefined') {
      console.warn('XMLHttpRequest is not available. Falling back to fetch without progress reporting.');
      return await performUploadWithFetch();
    }

    return await new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        xhr.responseType = 'text';
        
        // Calculate timeout based on file size (minimum 30 seconds, +10 seconds per MB)
        const fileSizeMB = file.size / (1024 * 1024);
        const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 10000)); // Min 30s, +10s per MB
        const maxTimeout = 5 * 60 * 1000; // Cap at 5 minutes
        const actualTimeout = Math.min(timeoutMs, maxTimeout);
        xhr.timeout = actualTimeout;
        
        console.log(`Setting XHR upload timeout to ${actualTimeout / 1000}s for file size ${fileSizeMB.toFixed(2)}MB`);

        const headers = getHeaders();
        Object.entries(headers).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            xhr.setRequestHeader(key, value);
          }
        });

        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress({
                percent,
                loaded: event.loaded,
                total: event.total
              });
            } else {
              onProgress({
                percent: null,
                loaded: event.loaded,
                total: event.total
              });
            }
          };
        }

        xhr.onerror = () => {
          console.error('Upload network error detected');
          reject(new Error('Network error occurred during upload.'));
        };

        xhr.ontimeout = () => {
          console.error('Upload request timed out');
          reject(new Error('Request timeout - server may be down or unreachable. Check if the backend server is running.'));
        };

        xhr.onabort = () => {
          console.warn('Upload aborted by the client');
          reject(new Error('Upload aborted.'));
        };

        xhr.onload = () => {
          try {
            const contentType = xhr.getResponseHeader('content-type');
            const result = parseUploadResult(xhr.status, xhr.statusText, xhr.responseText, contentType);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };

        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
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
export async function uploadFileFromURL(url, layerGroup = DEFAULT_LAYER_GROUP) {
  try {
    const apiUrl = getApiUrl('/files/upload-from-url');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ url, layerGroup: normalizeLayerGroup(layerGroup) }),
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
      layerGroup: normalizeLayerGroup(fileData.layerGroup)
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
          layerGroup: normalizeLayerGroup(fileData.layerGroup)
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
          layerGroup: normalizeLayerGroup(fileData.layerGroup)
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
    if (!metadata[fileId]) {
      return null;
    }
    return {
      ...metadata[fileId],
      layerGroup: normalizeLayerGroup(metadata[fileId].layerGroup)
    };
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
      headers: getHeaders()
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
 * Update file options such as visibility or layer group
 */
export async function updateFileOptions(fileId, options = {}) {
  try {
    const payload = {};
    if (options.visible !== undefined) {
      payload.visible = options.visible;
    }
    if (options.layerGroup) {
      payload.layerGroup = normalizeLayerGroup(options.layerGroup);
    }

    if (Object.keys(payload).length === 0) {
      return true;
    }

    const url = getApiUrl(`/files/${fileId}/visibility`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to update file options');
    }

    // Also update localStorage metadata
    try {
      const STORAGE_KEY = 'kmlFileMetadata';
      const metadata = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (metadata[fileId]) {
        if (payload.visible !== undefined) {
          metadata[fileId].visible = payload.visible;
        }
        if (payload.layerGroup) {
          metadata[fileId].layerGroup = payload.layerGroup;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      // Ignore localStorage errors during update
      console.warn('Error updating metadata in localStorage:', error);
    }

    return true;
  } catch (error) {
    console.error('Error updating file options:', error);
    return false;
  }
}

export async function updateFileVisibility(fileId, visible) {
  return updateFileOptions(fileId, { visible });
}

/**
 * Get a file by ID
 */
export async function getFileById(fileId) {
  try {
    const url = getApiUrl(`/files/${fileId}`);
    const response = await fetch(url, {
      headers: getHeaders()
    });
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
    const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
      ? `${window.location.origin}${url}`
      : url;
    
    console.log(`Downloading file ${fileId} from:`, fullUrl);
    
    const response = await fetch(url, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Download failed:', {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
        error: errorText
      });
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`File ${fileId} downloaded successfully (${blob.size} bytes)`);
    return blob;
  } catch (error) {
    console.error('Error downloading file:', error);
    
    // Provide more helpful error messages
    if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      const apiUrl = getApiUrl(`/files/${fileId}/download`);
      const fullUrl = typeof window !== 'undefined' && apiUrl.startsWith('/') 
        ? `${window.location.origin}${apiUrl}`
        : apiUrl;
      
      const baseUrl = API_BASE_URL;
      let errorMsg = `Cannot connect to server at ${fullUrl}. `;
      
      if (baseUrl.includes('trycloudflare.com') || baseUrl.includes('cfargotunnel.com')) {
        errorMsg += 'The Cloudflare Tunnel may be down or expired. Please check:\n';
        errorMsg += '1. Is the Cloudflare Tunnel running?\n';
        errorMsg += '2. Has the tunnel URL expired? (Temporary tunnels expire)\n';
        errorMsg += '3. Is the backend server running on localhost:3001?';
      } else if (baseUrl.startsWith('/')) {
        errorMsg += 'Please check:\n';
        errorMsg += '1. Is the backend server running?\n';
        errorMsg += '2. Is the Vite proxy configured correctly?';
      } else {
        errorMsg += 'Please check if the server is running and accessible.';
      }
      
      throw new Error(errorMsg);
    }
    
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
          layerGroup: normalizeLayerGroup(fileData.layerGroup)
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

