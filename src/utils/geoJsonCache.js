/**
 * IndexedDB utility for caching GeoJSON data
 * This allows GeoJSON to persist across page refreshes without re-downloading
 */

const DB_NAME = 'GIS2_GeoJSON_Cache';
const DB_VERSION = 1;
const STORE_NAME = 'geoJsonData';

let dbPromise = null;

/**
 * Initialize IndexedDB database
 */
function initDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
        // Create index for fileId lookup
        objectStore.createIndex('fileId', 'fileId', { unique: true });
      }
    };
  });

  return dbPromise;
}

/**
 * Check if a string is a valid data URL
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a valid data URL
 */
function isValidDataUrl(str) {
  if (typeof str !== 'string') return false;
  // Data URLs must start with "data:" and contain ";base64,"
  return str.startsWith('data:') && str.match(/^data:[\w\/]+;base64,/);
}

/**
 * Check if a string is a malformed data URL (starts with /base64, instead of data:)
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a malformed data URL
 */
function isMalformedDataUrl(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('/base64,') || 
         (str.startsWith('base64,') && !str.startsWith('data:')) ||
         (str.includes('://') && str.includes('/base64,')) ||
         (str.match(/^https?:\/\//) && str.includes('base64,'));
}

function isUrlMalformedForCaching(url) {
  if (typeof url !== 'string') return false;
  if (isMalformedDataUrl(url)) return true;
  if (url.startsWith('data:') && !isValidDataUrl(url)) return true;
  return false;
}

function extractUrlsFromDescription(description) {
  if (typeof description !== 'string') return [];
  const urls = [];

  const attributeMatches = description.matchAll(/(?:src|href)=["']([^"']+)["']/gi);
  for (const match of attributeMatches) {
    urls.push(match[1]);
  }

  const plainMatches = description.match(/(?:https?:\/\/|blob:|data:)[^\s"'<>]+/gi);
  if (plainMatches) {
    urls.push(...plainMatches);
  }

  return urls;
}

function hasBlobUrls(geoJson) {
  if (!geoJson || !geoJson.features) return false;
  
  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return str.includes('blob:');
  };
  
  for (const feature of geoJson.features) {
    if (!feature.properties) continue;
    
    // Check photo properties
    const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
    for (const key of photoKeys) {
      if (feature.properties[key] && checkString(feature.properties[key])) {
        return true;
      }
    }
    
    // Check description
    if (feature.properties.description && checkString(feature.properties.description)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if cached GeoJSON contains malformed data URLs that need to be fixed
 * @param {Object} geoJson - The GeoJSON to check
 * @returns {boolean} - True if malformed data URLs are found
 */
function hasMalformedDataUrls(geoJson) {
  if (!geoJson || !geoJson.features) return false;
  
  for (const feature of geoJson.features) {
    if (!feature.properties) continue;
    
    // Check photo properties
    const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
    for (const key of photoKeys) {
      if (feature.properties[key]) {
        const value = feature.properties[key];
        if (typeof value === 'string') {
          const paths = value.split(';').map(p => p.trim());
          for (const path of paths) {
            if (isUrlMalformedForCaching(path)) return true;
          }
        }
      }
    }
    
    // Check description
    if (feature.properties.description && typeof feature.properties.description === 'string') {
      const desc = feature.properties.description.trim();
      const urls = extractUrlsFromDescription(desc);
      if (urls.length > 0) {
        for (const url of urls) {
          if (isUrlMalformedForCaching(url)) return true;
        }
      } else if (isUrlMalformedForCaching(desc)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get cached GeoJSON for a file
 * @param {string} fileId - The file ID
 * @returns {Promise<Object|null>} - The cached GeoJSON or null if not found
 */
export async function getCachedGeoJson(fileId) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = async () => {
        const result = request.result;
        if (result && result.geoJson) {
          // Check if cached data contains blob URLs (from old cache before conversion fix)
          if (hasBlobUrls(result.geoJson)) {
            // Only log warning once per file per session to reduce console noise
            if (!window._cacheWarningsShown) {
              window._cacheWarningsShown = new Set();
            }
            if (!window._cacheWarningsShown.has(fileId)) {
              console.warn(`⚠️ Cached GeoJSON for file ${fileId} contains invalid blob URLs. Clearing cache and re-parsing...`);
              window._cacheWarningsShown.add(fileId);
            }
            // Automatically remove the invalid cache entry
            await removeCachedGeoJson(fileId);
            // Return null to force re-parsing and re-caching with base64 URLs
            resolve(null);
          } else if (hasMalformedDataUrls(result.geoJson)) {
            // Only log warning once per file per session
            if (!window._cacheWarningsShown) {
              window._cacheWarningsShown = new Set();
            }
            if (!window._cacheWarningsShown.has(fileId)) {
              console.warn(`⚠️ Cached GeoJSON for file ${fileId} contains malformed data URLs. Clearing cache and re-parsing...`);
              window._cacheWarningsShown.add(fileId);
            }
            // Automatically remove the invalid cache entry
            await removeCachedGeoJson(fileId);
            // Return null to force re-parsing and re-caching with properly formatted data URLs
            resolve(null);
          } else {
            console.log(`✅ Found cached GeoJSON for file ${fileId}`);
            resolve(result.geoJson);
          }
        } else {
          console.log(`ℹ️ No cached GeoJSON found for file ${fileId}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Error reading from IndexedDB:', request.error);
        resolve(null); // Return null on error, don't reject
      };
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return null; // Return null on error, allow fallback to download
  }
}

/**
 * Convert blob URL to base64 data URL
 * Limits conversion to images under 1MB to avoid 431 errors (Request Header Fields Too Large)
 * @param {string} blobUrl - The blob URL to convert
 * @returns {Promise<string>} - The base64 data URL, or null if conversion fails or image is too large
 */
async function blobUrlToDataUrl(blobUrl) {
  try {
    // Validate blob URL format before attempting fetch
    if (!blobUrl || typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
      console.warn(`Invalid blob URL format: ${blobUrl}`);
      return null;
    }
    
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob URL: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Limit base64 conversion to images under 1MB to avoid 431 errors
    // Base64 encoding increases size by ~33%, so 1MB blob = ~1.33MB base64 string
    // This is still manageable, but larger images can cause issues
    const MAX_SIZE = 1024 * 1024; // 1MB
    if (blob.size > MAX_SIZE) {
      console.warn(`Image too large for base64 conversion (${(blob.size / 1024 / 1024).toFixed(2)}MB). Skipping to avoid 431 errors.`);
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          // Validate that the result is a proper data URL
          if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
            // Additional validation: ensure it's a valid data URL format
            if (!isValidDataUrl(reader.result)) {
              console.warn('Invalid data URL format from FileReader (does not match expected pattern)');
              resolve(null);
              return;
            }
            
            // Check for malformed URLs (should never happen from FileReader, but be safe)
            if (isMalformedDataUrl(reader.result)) {
              console.warn('Malformed data URL detected from FileReader (unexpected)');
              resolve(null);
              return;
            }
            
            // Check if the data URL is not too long (safety check)
            // Some browsers have limits on URL length
            if (reader.result.length > 2 * 1024 * 1024) { // 2MB max
              console.warn('Base64 data URL too long, skipping to avoid issues');
              resolve(null);
            } else {
              resolve(reader.result);
            }
          } else {
            console.warn('Invalid data URL format from FileReader');
            resolve(null);
          }
        } else {
          reject(new Error('FileReader returned no result'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Failed to convert blob URL ${blobUrl} to data URL:`, error);
    // Return null instead of the invalid blob URL
    // This will cause the image to be skipped rather than cached with an invalid URL
    return null;
  }
}

/**
 * Convert all blob URLs in GeoJSON to base64 data URLs
 * This ensures images persist across page refreshes
 * @param {Object} geoJson - The GeoJSON object
 * @returns {Promise<Object>} - The GeoJSON with converted URLs
 */
async function convertBlobUrlsToDataUrls(geoJson) {
  if (!geoJson || !geoJson.features) return geoJson;
  
  const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
  const conversions = [];
  
  // Find all blob URLs that need conversion
  geoJson.features.forEach(feature => {
    if (!feature.properties) return;
    
    // Check photo properties
    photoKeys.forEach(key => {
      if (feature.properties[key]) {
        const value = feature.properties[key];
        if (typeof value === 'string') {
          const paths = value.split(';').map(p => p.trim());
          paths.forEach((path, index) => {
            if (path.startsWith('blob:')) {
              conversions.push({ feature, key, pathIndex: index, paths, blobUrl: path });
            }
          });
        }
      }
    });
    
    // Check description for blob URLs (in HTML img tags or plain text)
    if (feature.properties.description && typeof feature.properties.description === 'string') {
      const desc = feature.properties.description;
      // Match blob URLs in various contexts: src="blob:...", src='blob:...', or plain blob:...
      const blobUrlMatches = desc.match(/blob:[^\s"'>]+/g);
      if (blobUrlMatches) {
        // Use Set to avoid duplicate conversions
        const uniqueBlobUrls = [...new Set(blobUrlMatches)];
        uniqueBlobUrls.forEach(blobUrl => {
          conversions.push({ feature, key: 'description', blobUrl, isDescription: true });
        });
      }
    }
  });
  
  // Convert all blob URLs to data URLs
  for (const conversion of conversions) {
    try {
      const dataUrl = await blobUrlToDataUrl(conversion.blobUrl);
      
      // If conversion failed (dataUrl is null), remove the blob URL instead of keeping it
      // This prevents invalid blob URLs from being cached and causing errors on refresh
      if (!dataUrl) {
        console.warn(`Removing invalid blob URL (conversion failed): ${conversion.blobUrl}`);
        
        if (conversion.isDescription) {
          // Remove blob URL from description
          conversion.feature.properties.description = conversion.feature.properties.description.replace(
            new RegExp(conversion.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            ''
          );
        } else {
          // Remove blob URL from photo property array
          const paths = conversion.paths;
          paths.splice(conversion.pathIndex, 1);
          // Update the property, filtering out empty strings
          const filteredPaths = paths.filter(p => p && p.trim());
          if (filteredPaths.length > 0) {
            conversion.feature.properties[conversion.key] = filteredPaths.join(';');
          } else {
            // Remove the property entirely if no valid paths remain
            delete conversion.feature.properties[conversion.key];
          }
        }
        continue;
      }
      
      // Validate the data URL before using it
      if (!isValidDataUrl(dataUrl)) {
        console.warn(`Invalid data URL format from conversion, removing: ${dataUrl.substring(0, 100)}...`);
        // Remove instead of using invalid data URL
        if (conversion.isDescription) {
          conversion.feature.properties.description = conversion.feature.properties.description.replace(
            new RegExp(conversion.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            ''
          );
        } else {
          const paths = conversion.paths;
          paths.splice(conversion.pathIndex, 1);
          const filteredPaths = paths.filter(p => p && p.trim());
          if (filteredPaths.length > 0) {
            conversion.feature.properties[conversion.key] = filteredPaths.join(';');
          } else {
            delete conversion.feature.properties[conversion.key];
          }
        }
        continue;
      }
      
      if (conversion.isDescription) {
        // Replace in description (use global replace in case URL appears multiple times)
        conversion.feature.properties.description = conversion.feature.properties.description.replace(
          new RegExp(conversion.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          dataUrl
        );
      } else {
        // Replace in photo property
        const paths = conversion.paths;
        paths[conversion.pathIndex] = dataUrl;
        conversion.feature.properties[conversion.key] = paths.join(';');
      }
    } catch (error) {
      console.warn(`Failed to convert blob URL ${conversion.blobUrl}:`, error);
      // Remove the blob URL on error to prevent caching invalid URLs
      if (conversion.isDescription) {
        conversion.feature.properties.description = conversion.feature.properties.description.replace(
          new RegExp(conversion.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          ''
        );
      } else {
        const paths = conversion.paths;
        const index = paths.indexOf(conversion.blobUrl);
        if (index !== -1) {
          paths.splice(index, 1);
          const filteredPaths = paths.filter(p => p && p.trim());
          if (filteredPaths.length > 0) {
            conversion.feature.properties[conversion.key] = filteredPaths.join(';');
          } else {
            delete conversion.feature.properties[conversion.key];
          }
        }
      }
    }
  }
  
  // Final sanitization: remove any remaining malformed URLs that might have been created
  // This is a safety net to catch any edge cases
  geoJson.features.forEach(feature => {
    if (!feature.properties) return;
    
    // Sanitize photo properties
    photoKeys.forEach(key => {
      if (feature.properties[key]) {
        const value = feature.properties[key];
        if (typeof value === 'string') {
          const paths = value.split(';').map(p => p.trim()).filter(p => p);
          // Filter out malformed URLs
          const validPaths = paths.filter(path => {
            if (isUrlMalformedForCaching(path)) {
              console.warn(`Removing malformed URL from cached data: ${path.substring(0, 100)}...`);
              return false;
            }
            return true;
          });
          
          if (validPaths.length > 0) {
            feature.properties[key] = validPaths.join(';');
          } else {
            delete feature.properties[key];
          }
        }
      }
    });
    
    // Sanitize description
    if (feature.properties.description && typeof feature.properties.description === 'string') {
      let desc = feature.properties.description;
      const urls = extractUrlsFromDescription(desc);
      let mutated = false;

      urls.forEach(url => {
        if (isUrlMalformedForCaching(url)) {
          mutated = true;
          const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          desc = desc.replace(new RegExp(escapedUrl, 'g'), '');
        }
      });

      if (mutated) {
        if (!desc.trim()) {
          console.warn('Description contained only malformed URLs, clearing value.');
          feature.properties.description = '';
        } else {
          feature.properties.description = desc;
        }
      }
    }
  });
  
  return geoJson;
}

/**
 * Cache GeoJSON for a file
 * @param {string} fileId - The file ID
 * @param {Object} geoJson - The GeoJSON data to cache
 * @param {string} fileName - Optional file name for reference
 * @returns {Promise<void>}
 */
export async function cacheGeoJson(fileId, geoJson, fileName = null) {
  try {
    // Deep clone to avoid modifying original
    const geoJsonCopy = JSON.parse(JSON.stringify(geoJson));
    
    // Convert blob URLs to base64 data URLs before caching
    // This ensures images persist across page refreshes
    // Use a timeout to prevent blocking for too long on large files
    const conversionPromise = convertBlobUrlsToDataUrls(geoJsonCopy);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Conversion timeout')), 30000) // 30 second timeout
    );
    
    let geoJsonWithDataUrls;
    try {
      geoJsonWithDataUrls = await Promise.race([conversionPromise, timeoutPromise]);
    } catch (conversionError) {
      if (conversionError.message === 'Conversion timeout') {
        console.warn(`⚠️ Blob URL conversion timed out for file ${fileId}. Caching without conversion.`);
        // Cache without conversion if it takes too long (better than not caching at all)
        geoJsonWithDataUrls = geoJsonCopy;
      } else {
        throw conversionError;
      }
    }
    
    // Final validation: check for any blob URLs or malformed URLs before caching
    // This is a safety check to prevent caching corrupted data
    if (hasBlobUrls(geoJsonWithDataUrls)) {
      console.warn(`⚠️ GeoJSON still contains blob URLs after conversion. Not caching to prevent errors.`);
      // Don't cache if blob URLs are still present (they'll be invalid after page refresh)
      return;
    }
    if (hasMalformedDataUrls(geoJsonWithDataUrls)) {
      console.error(`⚠️ GeoJSON still contains malformed data URLs after conversion. Not caching to prevent errors.`);
      // Don't cache if malformed URLs are still present
      return;
    }
    
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const data = {
        fileId: fileId,
        geoJson: geoJsonWithDataUrls,
        fileName: fileName,
        cachedAt: new Date().toISOString(),
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`✅ Cached GeoJSON for file ${fileId}${fileName ? ` (${fileName})` : ''} (with converted image URLs)`);
        resolve();
      };

      request.onerror = () => {
        console.error('Error writing to IndexedDB:', request.error);
        // Don't reject, just log the error - caching is optional
        resolve();
      };
    });
  } catch (error) {
    console.error('Error caching GeoJSON:', error);
    // Don't throw - caching is optional, app should work without it
  }
}

/**
 * Remove cached GeoJSON for a file
 * @param {string} fileId - The file ID
 * @returns {Promise<void>}
 */
export async function removeCachedGeoJson(fileId) {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(fileId);

      request.onsuccess = () => {
        console.log(`🗑️ Removed cached GeoJSON for file ${fileId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting from IndexedDB:', request.error);
        resolve(); // Don't reject
      };
    });
  } catch (error) {
    console.error('Error removing cached GeoJSON:', error);
  }
}

/**
 * Clear all cached GeoJSON data
 * @returns {Promise<void>}
 */
export async function clearAllCachedGeoJson() {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Cleared all cached GeoJSON data');
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing IndexedDB:', request.error);
        resolve();
      };
    });
  } catch (error) {
    console.error('Error clearing cached GeoJSON:', error);
  }
}

