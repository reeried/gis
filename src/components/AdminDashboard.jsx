import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getAllFiles, deleteFile, updateFileVisibility, updateFileOptions, getFileMetadata, downloadFile, saveFileMetadata, testApiConnection } from '../services/fileStorage';
import { parseKMLFile } from '../utils/kmlParser';
import { getCachedGeoJson, cacheGeoJson, removeCachedGeoJson } from '../utils/geoJsonCache';
import { LAYER_GROUP_OPTIONS, LAYER_GROUP_LABELS } from '../constants/layerGroups';
import {
  getAllRiverData, createRiverData, updateRiverData, deleteRiverData,
  getRiverMap, saveRiverMap,
  getAllConditionPhotos, createConditionPhoto, updateConditionPhoto, deleteConditionPhoto,
  uploadRiverMapImage, uploadConditionPhotoImage,
  getGoogleSheetsUrl, saveGoogleSheetsUrl,
  getBlogContent, saveBlogContent
} from '../services/riverData';
import { uploadDocument, getAllDocuments, deleteDocument } from '../services/documentStorage';

export default function AdminDashboard({ onBackToHome }) {
  const { logout, user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'river-map', 'river-data', 'condition-photos', 'documents'
  
  // River data states
  const [riverDataList, setRiverDataList] = useState([]);
  const [editingRiverData, setEditingRiverData] = useState(null);
  const [riverMapData, setRiverMapData] = useState(null);
  const [conditionPhotosList, setConditionPhotosList] = useState([]);
  const [editingPhoto, setEditingPhoto] = useState(null);
  
  // Google Sheets configuration states
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [isSavingSheetsUrl, setIsSavingSheetsUrl] = useState(false);
  
  // Documents states
  const [documentsList, setDocumentsList] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Blog content states
  const [blogContent, setBlogContent] = useState({ background: '', profile: '' });
  const [isLoadingBlog, setIsLoadingBlog] = useState(false);
  const [isSavingBlog, setIsSavingBlog] = useState(false);

  // React Quill configuration (memoized to prevent re-creation)
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  }), []);

  const quillFormats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background'
  ], []);

  useEffect(() => {
    loadFiles();
    if (activeTab === 'river-data') {
      loadRiverData();
      loadGoogleSheetsUrl();
    } else if (activeTab === 'river-map') {
      loadRiverMap();
    } else if (activeTab === 'condition-photos') {
      loadConditionPhotos();
    } else if (activeTab === 'documents') {
      loadDocuments();
    } else if (activeTab === 'blog-content') {
      loadBlogContent();
    }
  }, [activeTab]);

  // Keep selectedFile in sync with uploadedFiles
  useEffect(() => {
    if (selectedFile) {
      const updatedFile = uploadedFiles.find(f => f.id === selectedFile.id);
      if (updatedFile && updatedFile !== selectedFile) {
        setSelectedFile(updatedFile);
      }
    }
  }, [uploadedFiles, selectedFile]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 AdminDashboard: Starting to load files from server...');
      // Get all files from server (just metadata, no parsing)
      const serverFiles = await getAllFiles();
      console.log(`📦 AdminDashboard: Received ${serverFiles.length} files from server:`, serverFiles.map(f => ({ id: f.id, name: f.name })));
      
      if (serverFiles.length === 0) {
        console.warn('⚠️ AdminDashboard: No files returned from server');
        setUploadedFiles([]);
        setIsLoading(false);
        return;
      }
      
      // Load files with metadata and check IndexedDB cache for GeoJSON
      // This ensures cached GeoJSON is available immediately after page refresh
      // Preserve existing GeoJSON from state to avoid re-downloading
      const existingFilesMap = new Map(
        uploadedFiles.map(f => [f.id, { geoJson: f.geoJson, isLoading: f.isLoading }])
      );
      
      // Check IndexedDB cache for all files in parallel
      const filesWithMetadata = await Promise.all(
        serverFiles.map(async (file) => {
          // Save lightweight metadata for future reference
          saveFileMetadata({
            id: file.id,
            name: file.name,
            visible: file.visible,
            uploadedAt: file.uploadedAt,
            sourceUrl: file.sourceUrl || null,
            layerGroup: file.layerGroup,
          });
          
          // Preserve existing GeoJSON if it exists in state
          const existing = existingFilesMap.get(file.id);
          
          // If not in state, check IndexedDB cache
          let geoJson = existing?.geoJson || null;
          if (!geoJson) {
            try {
              geoJson = await getCachedGeoJson(file.id);
              if (geoJson) {
                console.log(`✅ AdminDashboard: Loaded cached GeoJSON for file ${file.id} (${file.name})`);
              }
            } catch (err) {
              console.warn(`⚠️ AdminDashboard: Error loading cache for file ${file.id}:`, err);
              // Continue without cached GeoJSON
            }
          }
          
          return {
            ...file,
            geoJson: geoJson, // Use cached GeoJSON if available
            isLoading: existing?.isLoading || false, // Preserve loading state
          };
        })
      );
      
      console.log(`✅ AdminDashboard: Successfully loaded ${filesWithMetadata.length} files (with cached GeoJSON where available)`);
      console.log('📋 AdminDashboard: Setting uploadedFiles state:', filesWithMetadata.map(f => ({ 
        id: f.id, 
        name: f.name,
        hasGeoJson: !!f.geoJson
      })));
      setUploadedFiles(filesWithMetadata);
      console.log('✅ AdminDashboard: State updated, files should now be visible');
    } catch (error) {
      console.error('❌ AdminDashboard: Error loading files:', error);
      console.error('❌ AdminDashboard: Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setUploadedFiles([]);
      
      // Test connection to provide better diagnostics
      try {
        const connectionTest = await testApiConnection();
        let errorMsg = error.message || 'Failed to load files';
        
        if (!connectionTest.connected) {
          errorMsg += `\n\n⚠️ Server Connection Issue:\n${connectionTest.error || 'Cannot reach server'}\n\n`;
          errorMsg += `Attempted URL: ${connectionTest.url || 'unknown'}\n\n`;
          
          const apiUrl = import.meta.env.VITE_API_URL;
          if (apiUrl && (apiUrl.includes('trycloudflare.com') || apiUrl.includes('cfargotunnel.com'))) {
            errorMsg += '🔧 Troubleshooting Steps:\n';
            errorMsg += '1. Check if Cloudflare Tunnel is running\n';
            errorMsg += '2. Verify the tunnel URL in .env file\n';
            errorMsg += '3. Start a new tunnel if the current one expired\n';
            errorMsg += '4. Or remove VITE_API_URL from .env to use local development mode\n';
          } else {
            errorMsg += '🔧 Troubleshooting Steps:\n';
            errorMsg += '1. Make sure the backend server is running (npm run dev:server)\n';
            errorMsg += '2. Check if the server is accessible at http://localhost:3001/api/health\n';
            errorMsg += '3. Check browser console for more details\n';
          }
        }
        
        alert(`Failed to load files:\n\n${errorMsg}`);
      } catch (testError) {
        console.error('❌ Failed to test connection:', testError);
        alert(`Failed to load files: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      console.log('🏁 AdminDashboard: loadFiles() completed, isLoading set to false');
    }
  };
  
  // Load GeoJSON for a specific file on-demand
  const loadFileGeoJson = async (fileId) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file || file.geoJson || file.isLoading) {
      return; // Already loaded or loading
    }
    
    // Mark as loading
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isLoading: true } : f
    ));
    
    try {
      // First, check IndexedDB cache
      console.log(`🔍 Checking cache for file ${fileId} (${file.name})...`);
      let geoJson = await getCachedGeoJson(fileId);
      
      if (geoJson) {
        // Found in cache, use it
        console.log(`✅ Using cached GeoJSON for file ${fileId} (${file.name})`);
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, geoJson, isLoading: false } : f
        ));
        return geoJson;
      }
      
      // Not in cache, download and parse
      console.log(`📥 Downloading file ${fileId} (${file.name})...`);
      const blob = await downloadFile(fileId);
      const fileObj = new File([blob], file.name, { type: blob.type });
      geoJson = await parseKMLFile(fileObj);
      
      console.log(`✅ File ${fileId} parsed successfully with ${geoJson.features?.length || 0} features`);
      
      // Cache the parsed GeoJSON for future use
      await cacheGeoJson(fileId, geoJson, file.name);
      
      // Update file with GeoJSON
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, geoJson, isLoading: false } : f
      ));
      
      return geoJson;
    } catch (err) {
      console.error(`Error loading GeoJSON for file ${fileId} (${file.name}):`, err);
      // Mark as failed
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, geoJson: null, isLoading: false } : f
      ));
      
      // Test connection to provide better diagnostics
      const connectionTest = await testApiConnection();
      
      // Show user-friendly error message with connection status
      let errorMsg = err.message || 'Failed to load file';
      
      if (!connectionTest.connected) {
        errorMsg += `\n\n⚠️ Server Connection Issue:\n${connectionTest.error || 'Cannot reach server'}\n\n`;
        errorMsg += `Attempted URL: ${connectionTest.url || 'unknown'}\n\n`;
        
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl && (apiUrl.includes('trycloudflare.com') || apiUrl.includes('cfargotunnel.com'))) {
          errorMsg += '🔧 Troubleshooting Steps:\n';
          errorMsg += '1. Check if Cloudflare Tunnel is running\n';
          errorMsg += '2. Verify the tunnel URL in .env file\n';
          errorMsg += '3. Start a new tunnel if the current one expired\n';
          errorMsg += '4. Or remove VITE_API_URL from .env to use local development mode\n';
        } else {
          errorMsg += '🔧 Troubleshooting Steps:\n';
          errorMsg += '1. Make sure the backend server is running (npm run dev:server)\n';
          errorMsg += '2. Check if the server is accessible at http://localhost:3001/api/health\n';
          errorMsg += '3. Check browser console for more details\n';
        }
      }
      
      alert(`Error loading file "${file.name}":\n\n${errorMsg}`);
      
      throw err;
    }
  };

  const handleFileUpload = (newLayer) => {
    console.log('File upload completed, reloading file list...', newLayer);
    // File is already saved to server and metadata is saved
    // Just reload the list
    // Add a small delay to ensure database transaction is committed
    setTimeout(() => {
      loadFiles();
    }, 500);
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      const success = await deleteFile(fileId);
      if (success) {
        // Clear cached GeoJSON for this file
        await removeCachedGeoJson(fileId);
        loadFiles();
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
        }
      } else {
        alert('Failed to delete file');
      }
    }
  };

  const handleToggleVisibility = async (fileId, currentVisible) => {
    const success = await updateFileOptions(fileId, { visible: !currentVisible });
    if (success) {
      loadFiles();
    } else {
      alert('Failed to update file visibility');
    }
  };

  const handleLayerGroupChange = async (fileId, newGroup) => {
    const success = await updateFileOptions(fileId, { layerGroup: newGroup });
    if (success) {
      loadFiles();
    } else {
      alert('Failed to update layer destination');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.reload();
    }
  };

  // River Data functions
  const loadRiverData = async () => {
    try {
      const data = await getAllRiverData();
      setRiverDataList(data);
    } catch (error) {
      console.error('Error loading river data:', error);
      alert('Failed to load river data');
    }
  };

  const handleSaveRiverData = async (data) => {
    try {
      if (editingRiverData && editingRiverData.id != null) {
        await updateRiverData(editingRiverData.id, data);
      } else {
        await createRiverData(data);
      }
      setEditingRiverData(null);
      loadRiverData();
    } catch (error) {
      console.error('Error saving river data:', error);
      alert('Failed to save river data');
    }
  };

  const handleDeleteRiverData = async (id) => {
    if (window.confirm('Are you sure you want to delete this river data?')) {
      try {
        await deleteRiverData(id);
        loadRiverData();
      } catch (error) {
        console.error('Error deleting river data:', error);
        alert('Failed to delete river data');
      }
    }
  };

  // River Map functions
  const loadRiverMap = async () => {
    try {
      const data = await getRiverMap();
      setRiverMapData(data);
    } catch (error) {
      console.error('Error loading river map:', error);
    }
  };

  const handleSaveRiverMap = async (data) => {
    try {
      await saveRiverMap(data);
      loadRiverMap();
      alert('River map saved successfully');
    } catch (error) {
      console.error('Error saving river map:', error);
      alert('Failed to save river map');
    }
  };

  // Condition Photos functions
  const loadConditionPhotos = async () => {
    try {
      const data = await getAllConditionPhotos();
      setConditionPhotosList(data);
    } catch (error) {
      console.error('Error loading condition photos:', error);
      alert('Failed to load condition photos');
    }
  };

  const handleSaveConditionPhoto = async (data) => {
    try {
      if (editingPhoto && editingPhoto.id) {
        await updateConditionPhoto(editingPhoto.id, data);
      } else {
        await createConditionPhoto(data);
      }
      setEditingPhoto(null);
      loadConditionPhotos();
    } catch (error) {
      console.error('Error saving condition photo:', error);
      alert('Failed to save condition photo');
    }
  };

  const handleDeleteConditionPhoto = async (id) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await deleteConditionPhoto(id);
        loadConditionPhotos();
      } catch (error) {
        console.error('Error deleting condition photo:', error);
        alert('Failed to delete condition photo');
      }
    }
  };

  // Google Sheets URL functions
  const loadGoogleSheetsUrl = async () => {
    try {
      const url = await getGoogleSheetsUrl();
      setGoogleSheetsUrl(url || '');
    } catch (error) {
      console.error('Error loading Google Sheets URL:', error);
    }
  };

  const handleSaveGoogleSheetsUrl = async () => {
    setIsSavingSheetsUrl(true);
    try {
      await saveGoogleSheetsUrl(googleSheetsUrl);
      alert('Google Sheets URL saved successfully');
      await loadGoogleSheetsUrl();
    } catch (error) {
      console.error('Error saving Google Sheets URL:', error);
      alert('Failed to save Google Sheets URL');
    } finally {
      setIsSavingSheetsUrl(false);
    }
  };

  // Extract Sheet ID from URL or use direct ID
  const getSheetId = () => {
    if (!googleSheetsUrl) return null;
    
    // Check if it's already just an ID (no slashes or special chars)
    if (!googleSheetsUrl.includes('/') && !googleSheetsUrl.includes('http')) {
      return googleSheetsUrl;
    }
    
    // Extract Sheet ID from URL
    // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
    const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    return null;
  };

  const sheetId = getSheetId();
  const embedUrl = sheetId 
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview`
    : null;

  // Documents functions
  const loadDocuments = async () => {
    try {
      const data = await getAllDocuments();
      setDocumentsList(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      alert('Failed to load documents');
    }
  };

  // Blog content functions
  const loadBlogContent = async () => {
    setIsLoadingBlog(true);
    try {
      const data = await getBlogContent();
      setBlogContent({
        background: data?.background || '',
        profile: data?.profile || '',
      });
    } catch (error) {
      console.error('Error loading blog content:', error);
      alert('Gagal memuat konten blog');
    } finally {
      setIsLoadingBlog(false);
    }
  };

  const handleSaveBlogContent = async () => {
    setIsSavingBlog(true);
    try {
      const saved = await saveBlogContent(blogContent);
      setBlogContent({
        background: saved?.background || '',
        profile: saved?.profile || '',
      });
      alert('Konten berhasil disimpan');
    } catch (error) {
      console.error('Error saving blog content:', error);
      alert('Gagal menyimpan konten');
    } finally {
      setIsSavingBlog(false);
    }
  };

  // Handlers for blog content editors (using useCallback to prevent re-renders)
  const handleBackgroundChange = useCallback((val) => {
    setBlogContent(prev => ({ ...prev, background: val }));
  }, []);

  const handleProfileChange = useCallback((val) => {
    setBlogContent(prev => ({ ...prev, profile: val }));
  }, []);

  const handleUploadDocument = async (file) => {
    // Validate file type
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpeg', '.jpg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Format file tidak didukung. Gunakan PDF, DOC, DOCX, JPEG, JPG, atau PNG.');
      return;
    }

    // Check file size (50MB limit)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      alert(`Ukuran file (${fileSizeMB.toFixed(2)}MB) melebihi batas maksimal 50MB.`);
      return;
    }

    setUploadingDocument(true);
    setUploadProgress(0);

    try {
      await uploadDocument(
        file,
        ({ percent }) => {
          if (percent !== null && percent !== undefined) {
            setUploadProgress(percent);
          }
        }
      );
      
      await loadDocuments();
      setUploadProgress(null);
      alert('Dokumen berhasil diupload');
    } catch (err) {
      console.error('Error uploading document:', err);
      alert(err.message || 'Gagal mengupload dokumen');
    } finally {
      setUploadingDocument(false);
      setTimeout(() => {
        setUploadProgress(null);
      }, 1000);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      return;
    }

    try {
      await deleteDocument(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Gagal menghapus dokumen');
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) {
      return '📄';
    } else if (['doc', 'docx'].includes(ext)) {
      return '📝';
    } else if (['jpeg', 'jpg', 'png'].includes(ext)) {
      return '🖼️';
    }
    return '📎';
  };

  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Word';
    if (['jpeg', 'jpg', 'png'].includes(ext)) return 'Image';
    return 'Document';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-700 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Manage Content & Files</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, <span className="font-semibold">{user?.username}</span></span>
              <button
                onClick={handleBackToHome}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Back to Home
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'files'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              KML Files
            </button>
            <button
              onClick={() => setActiveTab('river-map')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'river-map'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Peta Sungai
            </button>
            <button
              onClick={() => setActiveTab('river-data')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'river-data'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Data Sungai
            </button>
            <button
              onClick={() => setActiveTab('condition-photos')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'condition-photos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Foto Kondisi
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dokumen
            </button>
        <button
          onClick={() => setActiveTab('blog-content')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'blog-content'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Blog
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Upload KML File</h2>
              <FileUpload onFileUpload={handleFileUpload} />
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Files</span>
                  <span className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Visible Files</span>
                  <span className="text-2xl font-bold text-green-600">
                    {uploadedFiles.filter(f => f.visible).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hidden Files</span>
                  <span className="text-2xl font-bold text-gray-600">
                    {uploadedFiles.filter(f => !f.visible).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: File List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Uploaded Files</h2>
                <button
                  onClick={loadFiles}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Refresh
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading files...</p>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-600 text-lg">No files uploaded yet</p>
                  <p className="text-gray-500 text-sm mt-2">Upload a KML file to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`border rounded-lg p-4 transition-all ${
                        selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            <svg
                              className="w-8 h-8 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">
                              {file.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Features: {file.geoJson?.features?.length || 0}
                            </p>
                            <div className="mt-3">
                              <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                Kontrol Toggle
                              </label>
                              <select
                                value={file.layerGroup || 'district'}
                                onChange={(e) => handleLayerGroupChange(file.id, e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              >
                                {LAYER_GROUP_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-gray-500 mt-1">
                                Pilih tombol map yang akan menampilkan layer ini.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleVisibility(file.id, file.visible)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              file.visible
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={file.visible ? 'Hide on map' : 'Show on map'}
                          >
                            {file.visible ? 'Visible' : 'Hidden'}
                          </button>
                          <button
                            onClick={async () => {
                              // Get the latest file from state to ensure we have cached GeoJSON if available
                              const latestFile = uploadedFiles.find(f => f.id === file.id) || file;
                              setSelectedFile(latestFile);
                              // Load GeoJSON if not already loaded
                              if (!latestFile.geoJson && !latestFile.isLoading) {
                                try {
                                  await loadFileGeoJson(file.id);
                                  // Update selectedFile with loaded GeoJSON from state
                                  setSelectedFile(prev => {
                                    const updatedFile = uploadedFiles.find(f => f.id === prev?.id);
                                    return updatedFile || prev;
                                  });
                                } catch (err) {
                                  console.error('Failed to load GeoJSON:', err);
                                }
                              }
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Details */}
            {selectedFile && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">File Details</h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Name:</span>
                    <span className="ml-2 text-gray-600">{selectedFile.name}</span>
                  </div>
                  {selectedFile.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-gray-600">Loading file data...</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-semibold text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-600">{selectedFile.geoJson?.type || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Features:</span>
                        <span className="ml-2 text-gray-600">{selectedFile.geoJson?.features?.length || 0}</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span className={`ml-2 ${selectedFile.visible ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedFile.visible ? 'Visible on map' : 'Hidden from map'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Kontrol Toggle:</span>
                    <span className="ml-2 text-gray-600">
                      {LAYER_GROUP_LABELS[selectedFile.layerGroup || 'district'] || 'Kecamatan'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Uploaded:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(selectedFile.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* River Map Editor */}
        {activeTab === 'river-map' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Peta Sungai</h2>
            <RiverMapEditor
              data={riverMapData}
              onSave={handleSaveRiverMap}
            />
          </div>
        )}

        {/* River Data Editor */}
        {activeTab === 'river-data' && (
          <div className="space-y-6">
            {/* Google Sheets Configuration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Konfigurasi Google Sheets</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Sheets URL atau Sheet ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1ABC123xyz456/edit atau 1ABC123xyz456"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveGoogleSheetsUrl}
                      disabled={isSavingSheetsUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingSheetsUrl ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Masukkan URL lengkap Google Sheets atau hanya Sheet ID. Pastikan Google Sheets sudah dipublikasikan ke web.
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded Google Sheets */}
            {embedUrl ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Preview Data Sungai</h2>
                <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    title="Data Sungai - Google Sheets"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : googleSheetsUrl ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">URL Google Sheets tidak valid</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Pastikan URL atau Sheet ID sudah benar. Format yang didukung:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                  <li>URL lengkap: https://docs.google.com/spreadsheets/d/SHEET_ID/edit</li>
                  <li>Sheet ID saja: SHEET_ID</li>
                </ul>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-600 text-lg">Google Sheets belum dikonfigurasi</p>
                <p className="text-gray-500 text-sm mt-2">
                  Masukkan URL atau Sheet ID di atas untuk menampilkan Google Sheets
                </p>
              </div>
            )}
          </div>
        )}

        {/* Condition Photos Editor */}
        {activeTab === 'condition-photos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Foto Kondisi</h2>
              <button
                onClick={() => setEditingPhoto({})}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                + Add New
              </button>
            </div>
            {editingPhoto !== null ? (
              <ConditionPhotoEditor
                data={editingPhoto}
                onSave={handleSaveConditionPhoto}
                onCancel={() => setEditingPhoto(null)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {conditionPhotosList.map((photo) => (
                  <div key={photo.id} className="border rounded-lg p-4">
                    <img
                      src={photo.image_url || '/placeholder-river.jpg'}
                      alt={photo.title}
                      className="w-full h-48 object-cover rounded mb-2"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EPlaceholder%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <h3 className="font-semibold text-gray-800 mb-1">{photo.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{photo.location}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPhoto(photo)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteConditionPhoto(photo.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents Management */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Dokumen</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadDocument(file);
                    }
                    e.target.value = ''; // Reset input
                  }}
                  className="hidden"
                  id="document-upload-input"
                  disabled={uploadingDocument}
                />
                
                {uploadingDocument ? (
                  <div className="flex flex-col items-center w-full max-w-sm mx-auto gap-3">
                    <div className="w-full">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Mengupload dokumen...</span>
                        {typeof uploadProgress === 'number' && (
                          <span>{Math.round(uploadProgress)}%</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-500 h-3 transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(uploadProgress ?? 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-4"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-gray-600 mb-2">
                      Pilih file untuk diupload
                    </p>
                    <label
                      htmlFor="document-upload-input"
                      className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      Pilih File
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      Format yang didukung: PDF, DOC, DOCX, JPEG, JPG, PNG (Maks. 50MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Daftar Dokumen</h2>
                <button
                  onClick={loadDocuments}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentsList.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    Tidak ada dokumen ditemukan
                  </div>
                ) : (
                  documentsList.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-gray-50 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-4xl">{getFileIcon(doc.name)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 mb-1 truncate" title={doc.name}>
                            {doc.name}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">{getFileType(doc.name)}</p>
                          <p className="text-xs text-gray-400">
                            {doc.uploaded_at || doc.uploadedAt 
                              ? new Date(doc.uploaded_at || doc.uploadedAt).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : '-'}
                          </p>
                          {doc.size && (
                            <p className="text-xs text-gray-400">
                              {(doc.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors text-center"
                        >
                          Unduh
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Blog Content Management */}
        {activeTab === 'blog-content' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Konten Blog</h2>
                <p className="text-gray-600 text-sm">
                  Ubah tulisan Latar Belakang dan Profil Sungai Kota Kupang yang tampil di bawah peta.
                </p>
              </div>
              <button
                onClick={loadBlogContent}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Muat Ulang
              </button>
            </div>

            {isLoadingBlog ? (
              <div className="flex justify-center items-center h-40 text-gray-500">
                Memuat konten...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latar Belakang</label>
                  <ReactQuill
                    theme="snow"
                    value={blogContent.background}
                    onChange={handleBackgroundChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Tuliskan latar belakang..."
                    style={{ minHeight: '200px', marginBottom: '50px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profil Sungai Kota Kupang</label>
                  <ReactQuill
                    theme="snow"
                    value={blogContent.profile}
                    onChange={handleProfileChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Tuliskan profil singkat sungai kota Kupang..."
                    style={{ minHeight: '200px', marginBottom: '50px' }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBlogContent}
                    disabled={isSavingBlog}
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      isSavingBlog
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSavingBlog ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    onClick={loadBlogContent}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset Perubahan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// River Map Editor Component
function RiverMapEditor({ data, onSave }) {
  // Initialize map_image_urls from data, with backward compatibility
  // Convert to array of objects: [{url: "...", name: "..."}, ...]
  const getInitialImageUrls = () => {
    if (data?.map_image_urls && Array.isArray(data.map_image_urls)) {
      // Check if it's already array of objects or array of strings
      return data.map_image_urls.map((item, index) => {
        if (typeof item === 'string') {
          // Old format: array of strings
          return { url: item, name: `Peta ${index + 1}` };
        } else if (item && typeof item === 'object' && item.url) {
          // New format: array of objects (may include thumb/original)
          return { 
            url: item.url, 
            thumbUrl: item.thumbUrl,
            originalUrl: item.originalUrl,
            name: item.name || `Peta ${index + 1}` 
          };
        }
        return { url: '', name: `Peta ${index + 1}` };
      });
    } else if (data?.map_image_url) {
      return [{ url: data.map_image_url, name: 'Peta 1' }];
    }
    return [];
  };

  const [formData, setFormData] = useState({
    map_image_urls: getInitialImageUrls(),
    visible: data?.visible !== undefined ? data.visible : true,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const initialUrls = data?.map_image_urls && Array.isArray(data.map_image_urls)
      ? data.map_image_urls.map((item, index) => {
          if (typeof item === 'string') {
            return { url: item, name: `Peta ${index + 1}` };
          } else if (item && typeof item === 'object' && item.url) {
            return { 
              url: item.url, 
              thumbUrl: item.thumbUrl,
              originalUrl: item.originalUrl,
              name: item.name || `Peta ${index + 1}` 
            };
          }
          return { url: '', name: `Peta ${index + 1}` };
        })
      : data?.map_image_url
      ? [{ url: data.map_image_url, name: 'Peta 1' }]
      : [];
    
    setFormData({
      map_image_urls: initialUrls,
      visible: data?.visible !== undefined ? data.visible : true,
    });
  }, [data]);

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadPromises = imageFiles.map(file => uploadRiverMapImage(file));
      const results = await Promise.all(uploadPromises);
      const newImages = results
        .filter(result => result?.url)
        .map((result, index) => ({
          url: result.url, // optimized display url
          thumbUrl: result.thumbUrl || result.url,
          originalUrl: result.originalUrl || result.url,
          name: imageFiles[index]?.name?.replace(/\.[^/.]+$/, '') || `Peta ${formData.map_image_urls.length + index + 1}`
        }));
      
      if (newImages.length > 0) {
        setFormData((prev) => ({
          ...prev,
          map_image_urls: [...prev.map_image_urls, ...newImages],
        }));
      }
    } catch (error) {
      console.error('Failed to upload river map images:', error);
      alert(error.message || 'Gagal mengunggah foto peta.');
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      map_image_urls: prev.map_image_urls.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleImageNameChange = (index, newName) => {
    setFormData((prev) => ({
      ...prev,
      map_image_urls: prev.map_image_urls.map((img, i) => 
        i === index ? { ...img, name: newName } : img
      ),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
      const submitData = {
        ...formData,
      geo_json: null,
      map_image_urls: formData.map_image_urls
        .filter(img => img && img.url && img.url.trim())
        .map(img => ({
          url: img.url,
          thumbUrl: img.thumbUrl,
          originalUrl: img.originalUrl,
          name: img.name || 'Peta'
        })),
      };
      onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Map Images (JPG/PNG/WebP)</label>
        <div className="flex gap-2 mb-2">
          <label className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-200">
            {isUploadingImage ? 'Uploading...' : 'Upload Images'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
              multiple
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3">Anda dapat mengunggah beberapa foto peta sekaligus dari komputer Anda.</p>
        {formData.map_image_urls && formData.map_image_urls.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.map_image_urls.map((img, index) => {
                const imageUrl = typeof img === 'string' ? img : img?.url || '';
                const imageName = typeof img === 'string' ? `Peta ${index + 1}` : (img?.name || `Peta ${index + 1}`);
                return (
                <div key={index} className="relative group">
                  <img
                        src={imageUrl}
                        alt={`Preview ${imageName}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        loading="lazy"
                        decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                    title="Hapus Foto"
                  >
                    ×
                  </button>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={imageName}
                        onChange={(e) => handleImageNameChange(index, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Nama foto"
                      />
                </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.visible}
          onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
          className="mr-2"
        />
        <label className="text-sm font-medium text-gray-700">Visible</label>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Save
      </button>
    </form>
  );
}

// River Data Editor Component
function RiverDataEditor({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    location: data?.location || '',
    length: data?.length || '',
    width: data?.width || '',
    depth: data?.depth || '',
    status: data?.status || 'Normal',
    last_update: data?.last_update || '',
    notes: data?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      alert('Name and location are required');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sungai *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Panjang</label>
          <input
            type="text"
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lebar</label>
          <input
            type="text"
            value={formData.width}
            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kedalaman</label>
          <input
            type="text"
            value={formData.depth}
            onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Normal">Normal</option>
            <option value="Perlu Perhatian">Perlu Perhatian</option>
            <option value="Kritis">Kritis</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Update Terakhir</label>
          <input
            type="date"
            value={formData.last_update}
            onChange={(e) => setFormData({ ...formData, last_update: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Condition Photo Editor Component
function ConditionPhotoEditor({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: data?.title || '',
    location: data?.location || '',
    date: data?.date || '',
    status: data?.status || 'Normal',
    image_url: data?.image_url || '',
    description: data?.description || '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      title: data?.title || '',
      location: data?.location || '',
      date: data?.date || '',
      status: data?.status || 'Normal',
      image_url: data?.image_url || '',
      description: data?.description || '',
    });
  }, [data]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await uploadConditionPhotoImage(file);
      if (result?.url) {
        setFormData((prev) => ({
          ...prev,
          image_url: result.url,
        }));
      }
    } catch (error) {
      console.error('Failed to upload condition photo image:', error);
      alert(error.message || 'Gagal mengunggah foto kondisi.');
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.location || !formData.date) {
      alert('Title, location, and date are required');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
          <select
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pilih Lokasi</option>
            <option value="Liliba">Liliba</option>
            <option value="Alak">Alak</option>
            <option value="Dendeng">Dendeng</option>
            <option value="Lasiana">Lasiana</option>
            <option value="Merdeka">Merdeka</option>
            <option value="Oesapa Kecil">Oesapa Kecil</option>
            <option value="Oeba">Oeba</option>
            <option value="Nunbaun Sabu">Nunbaun Sabu</option>
            <option value="Nunbaun Delha">Nunbaun Delha</option>
            <option value="Namosain (Osmok)">Namosain (Osmok)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Normal">Normal</option>
            <option value="Perlu Perhatian">Perlu Perhatian</option>
            <option value="Kritis">Kritis</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image (JPG/PNG/WebP)</label>
        <div className="flex gap-2">
          <label className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-200">
            {isUploadingImage ? 'Uploading...' : 'Upload Image'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">Unggah foto kondisi dari komputer Anda.</p>
        {formData.image_url && (
          <div className="mt-3">
            <img
              src={formData.image_url}
              alt="Condition photo preview"
              className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setFormData({ ...formData, image_url: '' })}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Remove Image
            </button>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

