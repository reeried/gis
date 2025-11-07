import toGeoJSON from 'togeojson';
import JSZip from 'jszip';

/**
 * Fix KML namespace issues before parsing
 */
function fixKMLNamespaces(kmlContent) {
  // Check if the content already has proper namespace declarations
  if (kmlContent.includes('xmlns:xsi=') || kmlContent.includes("xmlns:xsi=")) {
    return kmlContent;
  }
  
  // Find the <kml> or <Document> tag and add missing namespaces
  // Common KML namespace issues: xsi:schemaLocation without xmlns:xsi
  let fixed = kmlContent;
  
  // Add xsi namespace if schemaLocation is used but xsi namespace is missing
  if (fixed.includes('xsi:schemaLocation') && !fixed.includes('xmlns:xsi')) {
    // Try to add xmlns:xsi to the root element
    fixed = fixed.replace(
      /(<kml[^>]*)/i,
      '$1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    );
    
    // If no <kml> tag, try <Document>
    if (!fixed.includes('xmlns:xsi')) {
      fixed = fixed.replace(
        /(<Document[^>]*)/i,
        '$1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
      );
    }
  }
  
  // Add gx namespace if gx: elements are used
  if (fixed.includes('gx:') && !fixed.includes('xmlns:gx')) {
    fixed = fixed.replace(
      /(<kml[^>]*)/i,
      '$1 xmlns:gx="http://www.google.com/kml/ext/2.2"'
    );
  }
  
  return fixed;
}

/**
 * Parse KML file to GeoJSON
 */
export async function parseKML(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // Fix namespace issues before parsing
        let kmlContent = e.target.result;
        kmlContent = fixKMLNamespaces(kmlContent);
        
        const kml = new DOMParser().parseFromString(kmlContent, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = kml.querySelector('parsererror');
        if (parserError) {
          // Try a more lenient approach: remove problematic attributes
          const errorText = parserError.textContent;
          if (errorText.includes('Namespace prefix') || errorText.includes('schemaLocation')) {
            // Remove xsi:schemaLocation attributes that cause issues
            kmlContent = kmlContent.replace(/\s*xsi:schemaLocation\s*=\s*"[^"]*"/gi, '');
            kmlContent = kmlContent.replace(/\s*xsi:schemaLocation\s*=\s*'[^']*'/gi, '');
            
            // Try parsing again
            const retryKml = new DOMParser().parseFromString(kmlContent, 'text/xml');
            const retryError = retryKml.querySelector('parsererror');
            if (retryError) {
              reject(new Error('Invalid KML file format: ' + retryError.textContent));
              return;
            }
            // Use the retry result
            const geoJson = toGeoJSON.kml(retryKml);
            return processGeoJSON(geoJson, resolve, reject);
          }
          reject(new Error('Invalid KML file format: ' + errorText));
          return;
        }
        
        let geoJson = toGeoJSON.kml(kml);
        processGeoJSON(geoJson, resolve, reject, 'KML');
      } catch (error) {
        console.error('KML parsing error:', error);
        reject(new Error('Failed to parse KML file: ' + error.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Process and validate GeoJSON result
 */
function processGeoJSON(geoJson, resolve, reject, fileType = 'KML') {
  // Validate GeoJSON structure
  if (!geoJson) {
    reject(new Error('Failed to convert KML to GeoJSON'));
    return;
  }
  
  // Handle case where toGeoJSON returns a single Feature instead of FeatureCollection
  if (geoJson.type === 'Feature') {
    geoJson = {
      type: 'FeatureCollection',
      features: [geoJson]
    };
  }
  
  // Ensure it's a FeatureCollection
  if (geoJson.type !== 'FeatureCollection') {
    reject(new Error('Invalid GeoJSON structure: ' + geoJson.type));
    return;
  }
  
  // Check if there are any features
  if (!geoJson.features || geoJson.features.length === 0) {
    reject(new Error(`${fileType} file contains no geographic features`));
    return;
  }
  
  console.log(`${fileType} parsed successfully:`, {
    type: geoJson.type,
    featureCount: geoJson.features.length,
    features: geoJson.features.map(f => ({
      type: f.geometry?.type,
      hasProperties: !!f.properties
    }))
  });
  
  resolve(geoJson);
}

/**
 * Extract images from KMZ and create blob URLs
 */
async function extractKMZImages(zip, kmlContent) {
  const imageMap = new Map(); // Map of original path -> blob URL
  
  // Find all image references in KML (in href attributes, img tags, etc.)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const imagePatterns = [
    /<href[^>]*>([^<]+\.(jpg|jpeg|png|gif|bmp|webp))<\/href>/gi,
    /<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|gif|bmp|webp))["']/gi,
    /href=["']([^"']+\.(jpg|jpeg|png|gif|bmp|webp))["']/gi
  ];
  
  const foundImages = new Set();
  
  // Extract image paths from KML content
  imagePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(kmlContent)) !== null) {
      const imagePath = match[1] || match[0];
      // Normalize path (remove leading ./ or /)
      const normalizedPath = imagePath.replace(/^\.\//, '').replace(/^\//, '');
      foundImages.add(normalizedPath);
    }
  });
  
  // Also check all files in ZIP for image files
  Object.keys(zip.files).forEach(fileName => {
    const lowerName = fileName.toLowerCase();
    if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
      foundImages.add(fileName);
    }
  });
  
  // Extract images and create blob URLs
  for (const imagePath of foundImages) {
    try {
      // Try exact match first
      let zipFile = zip.files[imagePath];
      
      // If not found, try with different path variations
      if (!zipFile) {
        // Try without leading slash
        zipFile = zip.files[imagePath.replace(/^\//, '')];
      }
      if (!zipFile) {
        // Try with leading ./ 
        zipFile = zip.files['./' + imagePath];
      }
      if (!zipFile) {
        // Try finding by filename only
        const fileName = imagePath.split('/').pop();
        const matchingFile = Object.keys(zip.files).find(f => f.endsWith(fileName));
        if (matchingFile) {
          zipFile = zip.files[matchingFile];
        }
      }
      
      if (zipFile && !zipFile.dir) {
        try {
          const blob = await zipFile.async('blob');
          const blobUrl = URL.createObjectURL(blob);
          // Store both original path and normalized path
          imageMap.set(imagePath, blobUrl);
          imageMap.set(imagePath.replace(/^\.\//, '').replace(/^\//, ''), blobUrl);
          imageMap.set(zipFile.name, blobUrl);
        } catch (err) {
          console.warn(`Failed to extract image ${imagePath}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Error processing image ${imagePath}:`, err);
    }
  }
  
  return imageMap;
}

/**
 * Replace image paths in GeoJSON properties with blob URLs
 */
function replaceImagePaths(geoJson, imageMap) {
  if (!geoJson.features) return;
  
  geoJson.features.forEach(feature => {
    if (!feature.properties) return;
    
    // Check photo-related properties
    const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
    
    photoKeys.forEach(key => {
      if (feature.properties[key]) {
        const value = feature.properties[key];
        
        // Handle string with semicolons
        if (typeof value === 'string') {
          const paths = value.split(';').map(p => p.trim());
          const replacedPaths = paths.map(path => {
            // Try to find matching blob URL
            for (const [originalPath, blobUrl] of imageMap.entries()) {
              if (path.includes(originalPath) || originalPath.includes(path)) {
                return blobUrl;
              }
              // Check by filename
              const pathFileName = path.split('/').pop();
              const originalFileName = originalPath.split('/').pop();
              if (pathFileName === originalFileName) {
                return blobUrl;
              }
            }
            return path; // Return original if no match found
          });
          feature.properties[key] = replacedPaths.join(';');
        }
      }
    });
    
    // Also check description for image references
    if (feature.properties.description && typeof feature.properties.description === 'string') {
      let desc = feature.properties.description;
      imageMap.forEach((blobUrl, originalPath) => {
        // Replace image paths in description
        const fileName = originalPath.split('/').pop();
        desc = desc.replace(new RegExp(originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), blobUrl);
        desc = desc.replace(new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), blobUrl);
      });
      feature.properties.description = desc;
    }
  });
}

/**
 * Parse KMZ file (ZIP containing KML) to GeoJSON
 */
export async function parseKMZ(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const zip = await JSZip.loadAsync(e.target.result);
        const kmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.kml'));
        
        if (kmlFiles.length === 0) {
          reject(new Error('No KML file found in KMZ archive'));
          return;
        }
        
        // Get the first KML file (most KMZ files contain one)
        let kmlContent = await zip.files[kmlFiles[0]].async('string');
        
        // Extract images from KMZ
        const imageMap = await extractKMZImages(zip, kmlContent);
        console.log(`Extracted ${imageMap.size} images from KMZ`);
        
        // Fix namespace issues before parsing
        kmlContent = fixKMLNamespaces(kmlContent);
        
        const kml = new DOMParser().parseFromString(kmlContent, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = kml.querySelector('parsererror');
        if (parserError) {
          // Try a more lenient approach: remove problematic attributes
          const errorText = parserError.textContent;
          if (errorText.includes('Namespace prefix') || errorText.includes('schemaLocation')) {
            // Remove xsi:schemaLocation attributes that cause issues
            kmlContent = kmlContent.replace(/\s*xsi:schemaLocation\s*=\s*"[^"]*"/gi, '');
            kmlContent = kmlContent.replace(/\s*xsi:schemaLocation\s*=\s*'[^']*'/gi, '');
            
            // Try parsing again
            const retryKml = new DOMParser().parseFromString(kmlContent, 'text/xml');
            const retryError = retryKml.querySelector('parsererror');
            if (retryError) {
              reject(new Error('Invalid KML file format in KMZ: ' + retryError.textContent));
              return;
            }
            // Use the retry result
            const geoJson = toGeoJSON.kml(retryKml);
            // Replace image paths with blob URLs
            replaceImagePaths(geoJson, imageMap);
            return processGeoJSON(geoJson, resolve, reject, 'KMZ');
          }
          reject(new Error('Invalid KML file format in KMZ: ' + errorText));
          return;
        }
        
        let geoJson = toGeoJSON.kml(kml);
        // Replace image paths with blob URLs
        replaceImagePaths(geoJson, imageMap);
        processGeoJSON(geoJson, resolve, reject, 'KMZ');
      } catch (error) {
        console.error('KMZ parsing error:', error);
        reject(new Error('Failed to parse KMZ file: ' + error.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse KML from URL (online mode)
 */
export async function parseKMLFromURL(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        reject(new Error(`Failed to fetch KML from URL: ${response.status} ${response.statusText}`));
        return;
      }
      
      const contentType = response.headers.get('content-type') || '';
      const urlLower = url.toLowerCase();
      
      // Check if it's a KMZ file (ZIP)
      if (urlLower.endsWith('.kmz') || contentType.includes('application/zip') || contentType.includes('application/vnd.google-earth.kmz')) {
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/zip' });
        const file = new File([blob], url.split('/').pop() || 'file.kmz', { type: 'application/zip' });
        try {
          const geoJson = await parseKMZ(file);
          resolve(geoJson);
        } catch (err) {
          reject(err);
        }
      } else {
        // It's a KML file
        const kmlContent = await response.text();
        const fixedContent = fixKMLNamespaces(kmlContent);
        const kml = new DOMParser().parseFromString(fixedContent, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = kml.querySelector('parsererror');
        if (parserError) {
          const errorText = parserError.textContent;
          if (errorText.includes('Namespace prefix') || errorText.includes('schemaLocation')) {
            // Remove xsi:schemaLocation attributes that cause issues
            const retryContent = fixedContent.replace(/\s*xsi:schemaLocation\s*=\s*"[^"]*"/gi, '');
            const retryKml = new DOMParser().parseFromString(retryContent, 'text/xml');
            const retryError = retryKml.querySelector('parsererror');
            if (retryError) {
              reject(new Error('Invalid KML file format: ' + retryError.textContent));
              return;
            }
            const geoJson = toGeoJSON.kml(retryKml);
            processGeoJSON(geoJson, resolve, reject, 'KML');
            return;
          }
          reject(new Error('Invalid KML file format: ' + errorText));
          return;
        }
        
        const geoJson = toGeoJSON.kml(kml);
        processGeoJSON(geoJson, resolve, reject, 'KML');
      }
    } catch (error) {
      console.error('Error loading KML from URL:', error);
      reject(new Error(`Failed to load KML from URL: ${error.message}`));
    }
  });
}

/**
 * Parse either KML or KMZ file
 */
export async function parseKMLFile(file) {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.kmz')) {
    return await parseKMZ(file);
  } else if (fileName.endsWith('.kml')) {
    return await parseKML(file);
  } else {
    throw new Error('Unsupported file type. Please upload a .kml or .kmz file.');
  }
}

