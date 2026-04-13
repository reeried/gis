/**
 * Service functions for River Data API calls
 */

// Use relative URL to work with Vite proxy, or absolute URL if VITE_API_URL is set
const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/$/, '')) || '';

function buildUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!API_BASE_URL) {
    return normalizedEndpoint;
  }

  const combinedEndpoint =
    API_BASE_URL.endsWith('/api') && normalizedEndpoint.startsWith('/api')
      ? normalizedEndpoint.replace(/^\/api/, '') || '/' // Ensure at least root slash
      : normalizedEndpoint;

  return `${API_BASE_URL}${combinedEndpoint}`;
}

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const url = buildUrl(endpoint);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// ==================== River Data API ====================

export async function getAllRiverData() {
  // Check if Google Sheets should be used
  const useGoogleSheets = import.meta.env.VITE_USE_GOOGLE_SHEETS === 'true';
  const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
  const googleSheetsId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
  
  if (useGoogleSheets && (googleSheetsUrl || googleSheetsId)) {
    // Use Google Sheets endpoint
    const params = new URLSearchParams();
    if (googleSheetsUrl) params.append('url', googleSheetsUrl);
    if (googleSheetsId) params.append('sheetId', googleSheetsId);
    
    return apiCall(`/api/google-sheets/river-data?${params.toString()}`);
  }
  
  // Default: use regular API (which may also use Google Sheets if configured on backend)
  return apiCall('/api/river-data');
}

export async function getRiverDataById(id) {
  return apiCall(`/api/river-data/${id}`);
}

export async function createRiverData(data) {
  return apiCall('/api/river-data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRiverData(id, data) {
  return apiCall(`/api/river-data/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRiverData(id) {
  return apiCall(`/api/river-data/${id}`, {
    method: 'DELETE',
  });
}

// ==================== River Map API ====================

export async function getRiverMap() {
  const data = await apiCall('/api/river-map');
  // Return first item or null
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function getRiverMapById(id) {
  return apiCall(`/api/river-map/${id}`);
}

export async function saveRiverMap(data) {
  return apiCall('/api/river-map', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uploadRiverMapImage(file) {
  try {
    const endpoint = buildUrl('/api/river-map/upload-image');
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload image' }));
      throw new Error(error.error || 'Failed to upload image');
    }

    return await response.json();
  } catch (error) {
    console.error('uploadRiverMapImage failed:', error);
    throw error;
  }
}

export async function uploadConditionPhotoImage(file) {
  try {
    const endpoint = buildUrl('/api/condition-photos/upload-image');
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload image' }));
      throw new Error(error.error || 'Failed to upload image');
    }

    return await response.json();
  } catch (error) {
    console.error('uploadConditionPhotoImage failed:', error);
    throw error;
  }
}

export async function updateRiverMap(id, data) {
  return apiCall(`/api/river-map/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==================== Condition Photos API ====================

export async function getAllConditionPhotos() {
  return apiCall('/api/condition-photos');
}

export async function getConditionPhotoById(id) {
  return apiCall(`/api/condition-photos/${id}`);
}

export async function createConditionPhoto(data) {
  return apiCall('/api/condition-photos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateConditionPhoto(id, data) {
  return apiCall(`/api/condition-photos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteConditionPhoto(id) {
  return apiCall(`/api/condition-photos/${id}`, {
    method: 'DELETE',
  });
}

// ==================== App Settings API ====================

export async function getGoogleSheetsUrl() {
  const data = await apiCall('/api/app-settings/google-sheets-url');
  return data.setting_value || null;
}

export async function saveGoogleSheetsUrl(url) {
  return apiCall('/api/app-settings/google-sheets-url', {
    method: 'POST',
    body: JSON.stringify({ setting_value: url }),
  });
}

// Blog content (Latar Belakang & Profil Sungai)
export async function getBlogContent() {
  return apiCall('/api/app-settings/blog-content');
}

export async function saveBlogContent(content) {
  return apiCall('/api/app-settings/blog-content', {
    method: 'POST',
    body: JSON.stringify({
      background: content?.background || '',
      profile: content?.profile || '',
    }),
  });
}

