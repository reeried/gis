import { useState, useEffect } from 'react';
import MapViewer from './MapViewer';
import BasemapSelector from './BasemapSelector';

export default function RiverMap() {
  const [basemap, setBasemap] = useState('street');
  const [showDistrictBoundaries, setShowDistrictBoundaries] = useState(false);
  const [districtBoundariesData, setDistrictBoundariesData] = useState(null);
  const [riverLayers, setRiverLayers] = useState([]);

  useEffect(() => {
    // Load river data from storage or API
    // For now, this is a placeholder - you can load river KML/GeoJSON data here
    setRiverLayers([]);
  }, []);

  const handleToggleDistrictBoundaries = async (e) => {
    const checked = e.target.checked;
    setShowDistrictBoundaries(checked);
    
    if (checked && !districtBoundariesData) {
      try {
        const response = await fetch('/kecamatan-boundaries.geojson');
        if (response.ok) {
          const geoJson = await response.json();
          if (geoJson && geoJson.type === 'FeatureCollection' && geoJson.features) {
            setDistrictBoundariesData(geoJson);
          } else {
            setDistrictBoundariesData({ type: 'FeatureCollection', features: [] });
          }
        } else {
          setDistrictBoundariesData({ type: 'FeatureCollection', features: [] });
        }
      } catch (error) {
        console.error('Error loading district boundaries:', error);
        setDistrictBoundariesData({ type: 'FeatureCollection', features: [] });
      }
    }
  };

  return (
    <div className="w-full h-full flex gap-4">
      {/* Left Sidebar */}
      <aside className="w-80 bg-gray-100 p-4 overflow-y-auto flex flex-col gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Peta Sungai</h2>
          <p className="text-sm text-gray-600 mb-4">
            Peta interaktif menampilkan data sungai di wilayah Kota Kupang.
          </p>
        </div>
        
        <BasemapSelector
          basemap={basemap}
          onBasemapChange={setBasemap}
          showDistrictBoundaries={showDistrictBoundaries}
          onToggleDistrictBoundaries={handleToggleDistrictBoundaries}
        />
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        <MapViewer
          layers={riverLayers}
          basemap={basemap}
          showDistrictBoundaries={showDistrictBoundaries}
          districtBoundariesData={districtBoundariesData}
        />
      </main>
    </div>
  );
}

