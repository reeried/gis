import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import MapViewer from './components/MapViewer';
import BasemapSelector from './components/BasemapSelector';
import Header from './components/Header';
import Footer from './components/Footer';
import SpatialPlanningPanel from './components/SpatialPlanningPanel';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import RiverMap from './components/RiverMap';
import RiverData from './components/RiverData';
import ConditionPhotos from './components/ConditionPhotos';
import { getAllFiles, getFileMetadata, downloadFile, migrateFileMetadata } from './services/fileStorage';
import { parseKMLFile } from './utils/kmlParser';

function App() {
  const { isAuthenticated } = useAuth();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [layers, setLayers] = useState([]);
  const [basemap, setBasemap] = useState('street');
  const [showDistrictBoundaries, setShowDistrictBoundaries] = useState(false);
  const [districtBoundariesData, setDistrictBoundariesData] = useState(null);
  const [activePage, setActivePage] = useState('BERANDA');

  // Migrate localStorage data on mount (remove GeoJSON to fix quota issues)
  useEffect(() => {
    migrateFileMetadata();
  }, []);

  // Load uploaded files from storage on mount
  useEffect(() => {
    loadStoredFiles();
  }, []);

  // Listen for storage changes (cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'kmlFileMetadata' && !showAdminDashboard) {
        loadStoredFiles();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showAdminDashboard]);

  const loadStoredFiles = async () => {
    try {
      // Get all files from server
      const serverFiles = await getAllFiles();
      
      // Load layers with GeoJSON data
      // Note: GeoJSON is NOT stored in localStorage to avoid quota issues
      // We always fetch and parse files from the server when needed
      const loadedLayers = await Promise.all(
        serverFiles
          .filter(file => file.visible) // Only load visible files
          .map(async (file) => {
            try {
              // Always download and parse the file from server
              const blob = await downloadFile(file.id);
              const fileObj = new File([blob], file.name, { type: blob.type });
              const geoJson = await parseKMLFile(fileObj);
              
              // Save lightweight metadata (without GeoJSON) for future reference
              const { saveFileMetadata } = await import('./services/fileStorage');
              saveFileMetadata({
                id: file.id,
                name: file.name,
                visible: file.visible,
                uploadedAt: file.uploadedAt,
                sourceUrl: file.sourceUrl || null,
              });
              
              return {
                id: file.id,
                name: file.name,
                geoJson: geoJson,
                visible: file.visible,
              };
            } catch (err) {
              console.error(`Error loading file ${file.id}:`, err);
              return null;
            }
          })
      );
      
      // Filter out null values
      const validLayers = loadedLayers.filter(layer => layer !== null);
      setLayers(validLayers);
    } catch (error) {
      console.error('Error loading stored files:', error);
      // Fallback to empty layers if server is unavailable
      setLayers([]);
    }
  };

  const handleLoginSuccess = () => {
    setShowAdminDashboard(true);
  };

  const handleBackFromAdmin = () => {
    setShowAdminDashboard(false);
  };

  // Reload files when admin dashboard is closed
  useEffect(() => {
    if (!showAdminDashboard) {
      loadStoredFiles();
    }
  }, [showAdminDashboard]);

  const handleBasemapChange = (newBasemap) => {
    setBasemap(newBasemap);
  };

  const handleToggleDistrictBoundaries = async (e) => {
    const checked = e.target.checked;
    setShowDistrictBoundaries(checked);
    
    // Load district boundaries data if not already loaded
    if (checked && !districtBoundariesData) {
      try {
        // Try to load from public folder
        const response = await fetch('/kecamatan-boundaries.geojson');
        
        if (response.ok) {
          const geoJson = await response.json();
          
          // Validate GeoJSON structure
          if (geoJson && geoJson.type === 'FeatureCollection' && geoJson.features) {
            setDistrictBoundariesData(geoJson);
            console.log('District boundaries loaded successfully:', {
              featureCount: geoJson.features.length
            });
          } else {
            throw new Error('Invalid GeoJSON structure');
          }
        } else {
          // If file doesn't exist, create empty structure
          console.warn('District boundaries file not found. Please add kecamatan-boundaries.geojson to the public folder.');
          setDistrictBoundariesData({
            type: 'FeatureCollection',
            features: []
          });
        }
      } catch (error) {
        console.error('Error loading district boundaries:', error);
        // Set empty structure on error
        setDistrictBoundariesData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }
  };

  // Show login page if not authenticated and trying to access admin
  if (!isAuthenticated && showAdminDashboard) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show admin dashboard if authenticated and admin dashboard is active
  if (isAuthenticated && showAdminDashboard) {
    return <AdminDashboard onBackToHome={handleBackFromAdmin} />;
  }

  // Show homepage
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        activePage={activePage} 
        onAdminClick={() => setShowAdminDashboard(true)}
        isAuthenticated={isAuthenticated}
        onPageChange={setActivePage}
      />

      {/* Main Content Container */}
      <div className="w-full flex justify-center px-4 py-6">
        <div className="w-full max-w-[1200px] bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
          {activePage === 'PETA SUNGAI' ? (
            <RiverMap />
          ) : activePage === 'DATA SUNGAI' ? (
            <RiverData />
          ) : activePage === 'FOTO KONDISI' ? (
            <ConditionPhotos />
          ) : (
            <div className="w-full flex gap-4" style={{ height: '100%' }}>
              {/* Left Sidebar */}
              <aside className="w-80 bg-gray-100 p-4 overflow-y-auto flex flex-col gap-4">
                <BasemapSelector
                  basemap={basemap}
                  onBasemapChange={handleBasemapChange}
                  showDistrictBoundaries={showDistrictBoundaries}
                  onToggleDistrictBoundaries={handleToggleDistrictBoundaries}
                />
                
                <SpatialPlanningPanel />
              </aside>

              {/* Map */}
              <main className="flex-1 relative flex flex-col">
                {/* Map Container */}
                <div className="flex-1 relative">
                  <MapViewer
                    layers={layers}
                    basemap={basemap}
                    showDistrictBoundaries={showDistrictBoundaries}
                    districtBoundariesData={districtBoundariesData}
                  />
                </div>
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;

