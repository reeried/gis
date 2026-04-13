/**
 * Document Storage Service
 * Manages uploaded documents (PDF, DOC, JPEG, etc.)
 */

// Use relative URL to work with Vite proxy, or absolute URL if VITE_API_URL is set
let API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (isLocalHost && import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    console.warn('Overriding VITE_API_URL for local dev. Using Vite proxy at /api');
    API_BASE_URL = '/api';
  }
}

// Helper to get full URL
export function getApiUrl(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  return url;
}

// Helper to get headers
function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  return headers;
}

/**
 * Get all uploaded documents
 */
export async function getAllDocuments() {
  try {
    const url = getApiUrl('/documents');
    const response = await fetch(url, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
    }

    const documents = await response.json();
    return documents || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Upload a document to the server
 */
export async function uploadDocument(file, onProgress) {
  try {
    const uploadUrl = getApiUrl('/documents/upload');
    console.log('Starting document upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      apiUrl: uploadUrl
    });
    
    const formData = new FormData();
    formData.append('file', file);

    // Use XMLHttpRequest for progress tracking
    if (typeof XMLHttpRequest !== 'undefined' && onProgress) {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        xhr.responseType = 'text';
        
        // Set timeout (5 minutes for large files)
        xhr.timeout = 5 * 60 * 1000;

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress({ percent, loaded: event.loaded, total: event.total });
            } else {
              onProgress({ percent: null, loaded: event.loaded, total: event.total });
            }
          };
        }

        xhr.onerror = () => {
          reject(new Error('Network error occurred during upload.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timeout - server may be down or unreachable.'));
        };

        xhr.onload = () => {
          try {
            if (xhr.status < 200 || xhr.status >= 300) {
              let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
              try {
                const error = JSON.parse(xhr.responseText);
                errorMessage = error.error || errorMessage;
              } catch (e) {
                // Ignore parse error
              }
              reject(new Error(errorMessage));
              return;
            }

            const contentType = xhr.getResponseHeader('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              reject(new Error('Server returned invalid response. Expected JSON.'));
              return;
            }

            const result = JSON.parse(xhr.responseText);
            if (!result || !result.document) {
              reject(new Error('Server returned invalid response format.'));
              return;
            }

            resolve(result.document);
          } catch (err) {
            reject(err);
          }
        };

        xhr.send(formData);
      });
    } else {
      // Fallback to fetch if XMLHttpRequest is not available
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to upload document');
      }

      const result = await response.json();
      return result.document;
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId) {
  try {
    const url = getApiUrl(`/documents/${documentId}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Download document (returns URL for download)
 */
export async function downloadDocument(documentId) {
  try {
    const url = getApiUrl(`/documents/${documentId}/download`);
    return url;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
}

