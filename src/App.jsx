import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import MapViewer from './components/MapViewer';
import BasemapSelector from './components/BasemapSelector';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import RiverMap from './components/RiverMap';
import RiverData from './components/RiverData';
import ConditionPhotos from './components/ConditionPhotos';
import Documents from './components/Documents';
import BlogSection from './components/BlogSection';
import { getAllFiles, getFileMetadata, downloadFile, migrateFileMetadata, saveFileMetadata } from './services/fileStorage';
import { parseKMLFile } from './utils/kmlParser';
import { getCachedGeoJson, cacheGeoJson } from './utils/geoJsonCache';

function App() {
  const { isAuthenticated } = useAuth();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [layers, setLayers] = useState([]);
  const [basemap, setBasemap] = useState('street');
  const [showDistrictBoundaries, setShowDistrictBoundaries] = useState(false);
  const [showRiverLayers, setShowRiverLayers] = useState(false);
  const [showPhotoLayers, setShowPhotoLayers] = useState(false);
  const [showAdministrativeBoundaries, setShowAdministrativeBoundaries] = useState(false);
  const [showDasLayers, setShowDasLayers] = useState(false);
  const [showContourLayers, setShowContourLayers] = useState(false);
  const [showSumurBorLayers, setShowSumurBorLayers] = useState(false);
  const [showMataAirLayers, setShowMataAirLayers] = useState(false);
  const [showBendungLayers, setShowBendungLayers] = useState(false);
  const [showReservoirLayers, setShowReservoirLayers] = useState(false);
  const [showJaringanAirBersihLayers, setShowJaringanAirBersihLayers] = useState(false);
  const [showSawahLayers, setShowSawahLayers] = useState(false);
  const [showJaringanIrigasiLayers, setShowJaringanIrigasiLayers] = useState(false);
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
      console.log('🔄 App: Starting to load files from server...');
      // Get all files from server
      const serverFiles = await getAllFiles();
      console.log(`📦 App: Received ${serverFiles.length} files from server`);
      
      const visibleFiles = serverFiles.filter(file => file.visible);
      
      // First, load all cached files immediately (fast)
      const cachedLayers = await Promise.all(
        visibleFiles.map(async (file) => {
            try {
            const geoJson = await getCachedGeoJson(file.id);
              if (geoJson) {
                console.log(`✅ App: Using cached GeoJSON for file ${file.id} (${file.name})`);
              // Save lightweight metadata
              saveFileMetadata({
                id: file.id,
                name: file.name,
                visible: file.visible,
                uploadedAt: file.uploadedAt,
                sourceUrl: file.sourceUrl || null,
                layerGroup: file.layerGroup,
              });
              return {
                id: file.id,
                name: file.name,
                geoJson: geoJson,
                visible: file.visible,
                layerGroup: file.layerGroup || 'district',
              };
            }
            return null; // Not in cache
            } catch (err) {
            console.warn(`⚠️ App: Error loading cache for file ${file.id}:`, err);
              return null;
            }
          })
      );
      
      // Show cached layers immediately (fast initial render)
      const validCachedLayers = cachedLayers.filter(layer => layer !== null);
      if (validCachedLayers.length > 0) {
        setLayers(validCachedLayers);
        console.log(`✅ App: Loaded ${validCachedLayers.length} cached layers immediately`);
      }
      
      // Then, load missing files in background (slower, but non-blocking)
      const missingFiles = visibleFiles.filter((file, index) => !cachedLayers[index]);
      if (missingFiles.length > 0) {
        console.log(`📥 App: Loading ${missingFiles.length} files from server (background)...`);
        
        // Load files one by one to avoid blocking, and update UI progressively
        for (const file of missingFiles) {
          try {
            console.log(`📥 App: Downloading file ${file.id} (${file.name})...`);
            const blob = await downloadFile(file.id);
            const fileObj = new File([blob], file.name, { type: blob.type });
            const geoJson = await parseKMLFile(fileObj);
            
            // Cache in background (don't wait for blob-to-base64 conversion)
            cacheGeoJson(file.id, geoJson, file.name).catch(err => {
              console.warn(`⚠️ App: Failed to cache file ${file.id}:`, err);
            });
            
            // Save lightweight metadata
            saveFileMetadata({
              id: file.id,
              name: file.name,
              visible: file.visible,
              uploadedAt: file.uploadedAt,
              sourceUrl: file.sourceUrl || null,
              layerGroup: file.layerGroup,
            });
            
            // Add layer to map immediately (progressive loading)
            setLayers(prev => {
              // Avoid duplicates
              if (prev.some(l => l.id === file.id)) {
                return prev;
              }
              return [...prev, {
                id: file.id,
                name: file.name,
                geoJson: geoJson,
                visible: file.visible,
                layerGroup: file.layerGroup || 'district',
              }];
            });
            
            console.log(`✅ App: Loaded and cached file ${file.id} (${file.name})`);
          } catch (err) {
            console.error(`❌ App: Error loading file ${file.id}:`, err);
          }
        }
      }
      
      console.log(`✅ App: Finished loading all files`);
    } catch (error) {
      console.error('❌ App: Error loading stored files:', error);
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
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const bodyPreview = (await response.text()).slice(0, 120);
            throw new Error(`Unexpected content-type (${contentType || 'unknown'}) when loading district boundaries. Response preview: ${bodyPreview}`);
          }

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

  const handleToggleRiverLayers = (e) => {
    setShowRiverLayers(e.target.checked);
  };

  const handleTogglePhotoLayers = (e) => {
    setShowPhotoLayers(e.target.checked);
  };

  const handleToggleAdministrativeBoundaries = (e) => {
    setShowAdministrativeBoundaries(e.target.checked);
  };

  const handleToggleDasLayers = (e) => {
    setShowDasLayers(e.target.checked);
  };

  const handleToggleContourLayers = (e) => {
    setShowContourLayers(e.target.checked);
  };

  const handleToggleSumurBorLayers = (e) => {
    setShowSumurBorLayers(e.target.checked);
  };

  const handleToggleMataAirLayers = (e) => {
    setShowMataAirLayers(e.target.checked);
  };

  const handleToggleBendungLayers = (e) => {
    setShowBendungLayers(e.target.checked);
  };

  const handleToggleReservoirLayers = (e) => {
    setShowReservoirLayers(e.target.checked);
  };

  const handleToggleJaringanAirBersihLayers = (e) => {
    setShowJaringanAirBersihLayers(e.target.checked);
  };

  const handleToggleSawahLayers = (e) => {
    setShowSawahLayers(e.target.checked);
  };

  const handleToggleJaringanIrigasiLayers = (e) => {
    setShowJaringanIrigasiLayers(e.target.checked);
  };

  // Show login page if not authenticated and trying to access admin
  if (!isAuthenticated && showAdminDashboard) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show admin dashboard if authenticated and admin dashboard is active
  if (isAuthenticated && showAdminDashboard) {
    return <AdminDashboard onBackToHome={handleBackFromAdmin} />;
  }

  // Blog hanya ditampilkan di beranda; workspace mode hanya untuk beranda
  const showBlogSection = activePage === 'BERANDA';
  const isMapWorkspace = activePage === 'BERANDA';

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
        <div
          className={`w-full max-w-[1200px] bg-white rounded-lg shadow-lg ${
            isMapWorkspace ? 'overflow-hidden' : ''
          }`}
          style={isMapWorkspace ? { height: 'calc(100vh - 200px)', minHeight: '600px' } : { minHeight: '600px' }}
        >
          {activePage === 'PETA SUNGAI' ? (
            <RiverMap />
          ) : activePage === 'DATA SUNGAI' ? (
            <RiverData />
          ) : activePage === 'FOTO KONDISI' ? (
            <ConditionPhotos />
          ) : activePage === 'DOKUMEN' ? (
            <Documents />
          ) : (
            <div className="w-full flex gap-4" style={{ height: '100%' }}>
              {/* Left Sidebar */}
              <aside className="w-80 bg-gray-100 p-4 overflow-y-auto flex flex-col gap-4">
                <BasemapSelector
                  basemap={basemap}
                  onBasemapChange={handleBasemapChange}
                  showDistrictBoundaries={showDistrictBoundaries}
                  onToggleDistrictBoundaries={handleToggleDistrictBoundaries}
                  showRiverLayers={showRiverLayers}
                  onToggleRiverLayers={handleToggleRiverLayers}
                  showPhotoLayers={showPhotoLayers}
                  onTogglePhotoLayers={handleTogglePhotoLayers}
                  showAdministrativeBoundaries={showAdministrativeBoundaries}
                  onToggleAdministrativeBoundaries={handleToggleAdministrativeBoundaries}
                  showDasLayers={showDasLayers}
                  onToggleDasLayers={handleToggleDasLayers}
                  showContourLayers={showContourLayers}
                  onToggleContourLayers={handleToggleContourLayers}
                  showSumurBorLayers={showSumurBorLayers}
                  onToggleSumurBorLayers={handleToggleSumurBorLayers}
                  showMataAirLayers={showMataAirLayers}
                  onToggleMataAirLayers={handleToggleMataAirLayers}
                  showBendungLayers={showBendungLayers}
                  onToggleBendungLayers={handleToggleBendungLayers}
                  showReservoirLayers={showReservoirLayers}
                  onToggleReservoirLayers={handleToggleReservoirLayers}
                  showJaringanAirBersihLayers={showJaringanAirBersihLayers}
                  onToggleJaringanAirBersihLayers={handleToggleJaringanAirBersihLayers}
                  showSawahLayers={showSawahLayers}
                  onToggleSawahLayers={handleToggleSawahLayers}
                  showJaringanIrigasiLayers={showJaringanIrigasiLayers}
                  onToggleJaringanIrigasiLayers={handleToggleJaringanIrigasiLayers}
                />
                
              </aside>

              {/* Map */}
              <main className="flex-1 relative flex flex-col">
                {/* Map Container */}
                <div className="flex-1 relative">
                  <MapViewer
                    layers={layers}
                    basemap={basemap}
                    showDistrictBoundaries={showDistrictBoundaries}
                    showRiverLayers={showRiverLayers}
                    showPhotoLayers={showPhotoLayers}
                    showAdministrativeBoundaries={showAdministrativeBoundaries}
                    showDasLayers={showDasLayers}
                    showContourLayers={showContourLayers}
                    showSumurBorLayers={showSumurBorLayers}
                    showMataAirLayers={showMataAirLayers}
                    showBendungLayers={showBendungLayers}
                    showReservoirLayers={showReservoirLayers}
                    showJaringanAirBersihLayers={showJaringanAirBersihLayers}
                    showSawahLayers={showSawahLayers}
                    showJaringanIrigasiLayers={showJaringanIrigasiLayers}
                    districtBoundariesData={districtBoundariesData}
                  />
                </div>
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Blog section below map (homepage only) */}
      {showBlogSection && (
        <div className="w-full flex justify-center px-4 pb-10">
          <div className="w-full max-w-[1200px]">
            <BlogSection />
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;

