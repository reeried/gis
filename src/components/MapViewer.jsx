import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapUpdater({ bounds, skipUpdate = false }) {
  const map = useMap();
  
  useEffect(() => {
    // Skip update if a feature is selected (to prevent zooming out)
    if (skipUpdate) return;
    
    if (bounds && bounds.length >= 2) {
      try {
        // fitBounds expects [[south, west], [north, east]] format
        // or a LatLngBounds object
        if (Array.isArray(bounds[0]) && Array.isArray(bounds[1])) {
          // Already in correct format
          map.fitBounds(bounds, { padding: [50, 50] });
        } else if (bounds.length >= 2) {
          // Create bounds from coordinate array
          const latLngs = bounds.map(coord => L.latLng(coord[0], coord[1]));
          const boundsObj = L.latLngBounds(latLngs);
          map.fitBounds(boundsObj, { padding: [50, 50] });
        }
      } catch (error) {
        console.warn('Error fitting bounds:', error);
      }
    }
  }, [bounds, map, skipUpdate]);
  
  return null;
}

function FeatureZoom({ feature }) {
  const map = useMap();
  
  useEffect(() => {
    if (feature && feature.geometry) {
      try {
        // Create a temporary GeoJSON layer to get bounds
        const tempLayer = L.geoJSON(feature);
        const bounds = tempLayer.getBounds();
        
        if (bounds.isValid()) {
          // Zoom to feature with padding
          map.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 });
        }
      } catch (error) {
        console.warn('Error zooming to feature:', error);
      }
    }
  }, [feature, map]);
  
  return null;
}

function BasemapLayer({ basemap }) {
  const map = useMap();
  
  useEffect(() => {
    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    // Add new tile layer based on basemap selection
    if (basemap === 'satellite') {
      // Using Esri World Imagery as free alternative to Bing Satellite
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      });
      satelliteLayer.addTo(map);
    } else {
      // Street map (OpenStreetMap)
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });
      streetLayer.addTo(map);
    }
  }, [basemap, map]);
  
  return null;
}

export default function MapViewer({ layers, basemap = 'street', showDistrictBoundaries = false, districtBoundariesData = null }) {
  const mapRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [hasInteractedWithFeature, setHasInteractedWithFeature] = useState(false);

  const getBoundsForLayer = (geoJson) => {
    if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
      return null;
    }

    try {
      // Use Leaflet's GeoJSON layer to calculate bounds accurately
      const tempLayer = L.geoJSON(geoJson);
      const bounds = tempLayer.getBounds();
      
      if (bounds.isValid()) {
        // Return in format: [[south, west], [north, east]]
        return [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()]
        ];
      }
    } catch (error) {
      console.warn('Error calculating bounds with Leaflet:', error);
    }

    // Fallback: manual calculation - collect all coordinates
    const allCoords = [];
    geoJson.features.forEach(feature => {
      if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
          allCoords.push([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
        } else if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach(coord => {
            allCoords.push([coord[1], coord[0]]);
          });
        } else if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => {
            allCoords.push([coord[1], coord[0]]);
          });
        } else if (feature.geometry.type === 'MultiPoint' || feature.geometry.type === 'MultiLineString' || feature.geometry.type === 'MultiPolygon') {
          // Handle multi geometries
          const coords = feature.geometry.coordinates.flat(2);
          coords.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              allCoords.push([coord[1], coord[0]]);
            }
          });
        }
      }
    });

    if (allCoords.length === 0) {
      return null;
    }

    // Calculate min/max bounds from all coordinates
    const lats = allCoords.map(coord => coord[0]);
    const lngs = allCoords.map(coord => coord[1]);
    
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
  };

  // Collect all bounds from visible layers and merge them (only if toggle is ON)
  const allBounds = showDistrictBoundaries ? layers
    .filter(layer => layer.visible && layer.geoJson)
    .map(layer => getBoundsForLayer(layer.geoJson))
    .filter(b => b !== null) : [];
  
  // Also include district boundaries bounds if enabled
  if (showDistrictBoundaries && districtBoundariesData) {
    const districtBounds = getBoundsForLayer(districtBoundariesData);
    if (districtBounds) {
      allBounds.push(districtBounds);
    }
  }

  // Merge all bounds into a single bounding box
  const mergedBounds = allBounds.length > 0 ? (() => {
    const allLats = [];
    const allLngs = [];
    
    allBounds.forEach(bound => {
      allLats.push(bound[0][0], bound[1][0]); // south, north
      allLngs.push(bound[0][1], bound[1][1]); // west, east
    });
    
    return [
      [Math.min(...allLats), Math.min(...allLngs)],
      [Math.max(...allLats), Math.max(...allLngs)]
    ];
  })() : null;

  const getStyle = (feature) => {
    const defaultStyle = {
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3,
    };

    // Try to get style from KML if available
    if (feature.properties && feature.properties.stroke) {
      return {
        color: feature.properties.stroke || defaultStyle.color,
        weight: feature.properties['stroke-width'] || defaultStyle.weight,
        opacity: feature.properties['stroke-opacity'] || defaultStyle.opacity,
        fillColor: feature.properties.fill || defaultStyle.color,
        fillOpacity: feature.properties['fill-opacity'] || defaultStyle.fillOpacity,
      };
    }

    return defaultStyle;
  };

  // Helper function to render images from photo paths
  const renderPhotoImages = (photoPaths) => {
    if (!photoPaths) return '';
    
    // Handle different formats: string with semicolons, array, or single path
    let paths = [];
    if (typeof photoPaths === 'string') {
      // Split by semicolon if it's a delimited string
      paths = photoPaths.split(';').map(p => p.trim()).filter(p => p);
    } else if (Array.isArray(photoPaths)) {
      paths = photoPaths;
    } else {
      paths = [photoPaths];
    }
    
    if (paths.length === 0) return '';
    
    // Render images
    return paths.map((path, index) => {
      // Handle relative paths (from KMZ) - convert to blob URL if needed
      // For now, try to load as-is (could be absolute URL or relative path)
      const imageUrl = path.trim();
      
      // Skip if path is empty or invalid
      if (!imageUrl || imageUrl === 'None' || imageUrl === 'null') return '';
      
      return `
        <div style="margin: 5px 0;">
          <img 
            src="${imageUrl}" 
            alt="Photo ${index + 1}"
            style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; display: block; margin: 5px 0;"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <div style="display: none; color: #999; font-size: 12px;">Image ${index + 1} tidak dapat dimuat</div>
        </div>
      `;
    }).join('');
  };

  // Helper function to parse and render HTML description with images
  const parseDescription = (description) => {
    if (!description) return '';
    
    // Check if description contains HTML (like <img> tags)
    if (description.includes('<img') || description.includes('<IMG')) {
      // Return as-is if it's already HTML
      return description;
    }
    
    // Otherwise return as plain text
    return description;
  };

  const onEachFeature = (feature, layer) => {
    // Add hover effects to highlight borders
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 5,
          color: '#00bfff', // Light blue highlight color
          opacity: 1,
          fillOpacity: 0.2,
        });
        
        // Change cursor to pointer
        if (layer._path) {
          layer._path.style.cursor = 'pointer';
        }
        
        // Bring to front on hover
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      },
      mouseout: (e) => {
        // Reset to original style
        const layer = e.target;
        const geoJsonLayer = layer.feature;
        if (geoJsonLayer) {
          const originalStyle = getStyle(geoJsonLayer);
          layer.setStyle(originalStyle);
        }
        
        // Reset cursor
        if (layer._path) {
          layer._path.style.cursor = '';
        }
      }
    });

    if (feature.properties) {
      // Filter out style and stroke related properties
      const styleKeysToHide = ['styleUrl', 'styleHash', 'stroke', 'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];
      
      // Photo-related keys to handle specially
      const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
      
      let popupContent = '';
      const contentParts = [];
      
      // Handle name/title
      if (feature.properties.name) {
        contentParts.push(`<div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">${feature.properties.name}</div>`);
      }
      
      // Handle description (may contain HTML with images)
      if (feature.properties.description) {
        const parsedDesc = parseDescription(feature.properties.description);
        contentParts.push(`<div style="margin-bottom: 10px;"><strong>Description:</strong><br/>${parsedDesc}</div>`);
      }
      
      // Handle photo properties
      let hasPhotos = false;
      for (const key of photoKeys) {
        if (feature.properties[key]) {
          const photoImages = renderPhotoImages(feature.properties[key]);
          if (photoImages) {
            contentParts.push(`<div style="margin-top: 10px;"><strong>Photos:</strong>${photoImages}</div>`);
            hasPhotos = true;
            break; // Only show first photo property found
          }
        }
      }
      
      // Show other properties (except style and photo-related ones)
      if (!hasPhotos || !feature.properties.description) {
        const otherProperties = Object.keys(feature.properties)
          .filter(key => 
            !key.startsWith('_') && 
            feature.properties[key] &&
            !styleKeysToHide.includes(key) &&
            !photoKeys.includes(key.toLowerCase()) &&
            key !== 'name' &&
            key !== 'description'
          )
          .map(key => {
            const value = feature.properties[key];
            // Format the value nicely
            let formattedValue = value;
            if (typeof value === 'string' && value.length > 100) {
              formattedValue = value.substring(0, 100) + '...';
            }
            return `<div style="margin: 3px 0;"><strong>${key}:</strong> ${formattedValue}</div>`;
          });
        
        if (otherProperties.length > 0) {
          contentParts.push(`<div style="margin-top: 10px; font-size: 12px; color: #666;">${otherProperties.join('')}</div>`);
        }
      }
      
      // Add click handler to open modal instead of popup
      layer.on('click', () => {
        setSelectedFeature(feature);
        setHasInteractedWithFeature(true);
      });
    }
  };

  const getDistrictBoundariesStyle = () => {
    return {
      color: '#ff0000',
      weight: 2,
      opacity: 0.8,
      fillColor: '#ff0000',
      fillOpacity: 0.1,
    };
  };

  const onEachDistrictBoundary = (feature, layer) => {
    // Add hover effects to highlight district boundaries
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 5,
          color: '#00bfff', // Light blue highlight color
          opacity: 1,
          fillOpacity: 0.2,
        });
        
        // Change cursor to pointer
        if (layer._path) {
          layer._path.style.cursor = 'pointer';
        }
        
        // Bring to front on hover
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      },
      mouseout: (e) => {
        // Reset to original style
        const layer = e.target;
        layer.setStyle(getDistrictBoundariesStyle());
        
        // Reset cursor
        if (layer._path) {
          layer._path.style.cursor = '';
        }
      }
    });

    if (feature.properties) {
      // Filter out style and stroke related properties
      const styleKeysToHide = ['styleUrl', 'styleHash', 'stroke', 'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];
      
      // Get description property if it exists, otherwise show other non-style properties
      let popupContent = '';
      
      if (feature.properties.description) {
        // If description exists, show it
        popupContent = `<div><strong>Description:</strong><br/>${feature.properties.description}</div>`;
      } else {
        // Otherwise, show other properties except style-related ones
        const dataProperties = Object.keys(feature.properties)
          .filter(key => 
            !key.startsWith('_') && 
            feature.properties[key] &&
            !styleKeysToHide.includes(key)
          )
          .map(key => `<strong>${key}:</strong> ${feature.properties[key]}`)
          .join('<br/>');
        
        if (dataProperties) {
          popupContent = `<div><strong>Description:</strong><br/>${dataProperties}</div>`;
        }
      }
      
      // Add click handler to open modal instead of popup
      layer.on('click', () => {
        setSelectedFeature(feature);
        setHasInteractedWithFeature(true);
      });
    }
  };

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[-10.1833, 123.5833]} // Default to Kupang, NTT (Pulau Timor)
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <BasemapLayer basemap={basemap} />
        
        {showDistrictBoundaries && (
          <>
            {districtBoundariesData && (
              <GeoJSON
                key="district-boundaries"
                data={districtBoundariesData}
                style={getDistrictBoundariesStyle}
                onEachFeature={onEachDistrictBoundary}
              />
            )}
            
            {layers.map((layer, index) => {
              if (!layer.visible || !layer.geoJson) {
                return null;
              }
              
              // Validate GeoJSON before rendering
              if (!layer.geoJson.features || layer.geoJson.features.length === 0) {
                console.warn(`Layer ${layer.name} has no features to display`);
                return null;
              }
              
              console.log(`Rendering layer ${layer.name}:`, {
                featureCount: layer.geoJson.features.length,
                bounds: getBoundsForLayer(layer.geoJson)
              });
              
              return (
                <GeoJSON
                  key={layer.id}
                  data={layer.geoJson}
                  style={getStyle}
                  onEachFeature={onEachFeature}
                />
              );
            })}
          </>
        )}
        
        <MapUpdater bounds={mergedBounds} skipUpdate={hasInteractedWithFeature} />
        {selectedFeature && <FeatureZoom feature={selectedFeature} />}
      </MapContainer>
      
      {/* Feature Details Modal */}
      {selectedFeature && (
        <FeatureDetailsModal 
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          renderPhotoImages={renderPhotoImages}
        />
      )}
    </div>
  );
}

// Feature Details Modal Component
function FeatureDetailsModal({ feature, onClose, renderPhotoImages }) {
  if (!feature || !feature.properties) return null;

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Filter out style and stroke related properties
  const styleKeysToHide = ['styleUrl', 'styleHash', 'stroke', 'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];
  const photoKeys = ['pdfmaps_photos', 'photos', 'photo', 'image', 'images', 'href'];
  
  // Get feature title (name or first property)
  const title = feature.properties.name || 
                feature.properties.Name || 
                feature.properties.NAME ||
                Object.keys(feature.properties)
                  .filter(key => !styleKeysToHide.includes(key) && !photoKeys.includes(key.toLowerCase()))
                  .find(key => feature.properties[key]) || 
                'Feature Details';
  
  // Get description if exists
  const description = feature.properties.description || feature.properties.Description;
  
  // Get photos
  let photos = null;
  for (const key of photoKeys) {
    if (feature.properties[key]) {
      photos = feature.properties[key];
      break;
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Description */}
          {description && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
              <div 
                className="text-sm text-gray-800 border border-gray-300 rounded p-3 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}
          
          {/* Photos */}
          {photos && (
            <div className={description ? "mt-6" : ""}>
              <label className="text-sm font-medium text-gray-700 block mb-3">Photos</label>
              <div 
                className="w-full"
                dangerouslySetInnerHTML={{ __html: renderPhotoImages(photos) }}
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

