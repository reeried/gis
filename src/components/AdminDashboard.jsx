import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import { getAllFiles, deleteFile, updateFileVisibility, getFileMetadata, downloadFile } from '../services/fileStorage';
import { parseKMLFile } from '../utils/kmlParser';

export default function AdminDashboard({ onBackToHome }) {
  const { logout, user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      // Get all files from server
      const serverFiles = await getAllFiles();
      
      // Load metadata for each file
      const filesWithMetadata = await Promise.all(
        serverFiles.map(async (file) => {
          // Try to get metadata from localStorage first
          let metadata = getFileMetadata(file.id);
          
          // If no metadata, download and parse the file
          if (!metadata || !metadata.geoJson) {
            try {
              const blob = await downloadFile(file.id);
              const fileObj = new File([blob], file.name, { type: blob.type });
              const geoJson = await parseKMLFile(fileObj);
              
              // Save metadata for future use
              const { saveFileMetadata } = await import('../services/fileStorage');
              metadata = {
                id: file.id,
                name: file.name,
                geoJson: geoJson,
                visible: file.visible,
                uploadedAt: file.uploadedAt,
                sourceUrl: file.sourceUrl || null,
              };
              
              saveFileMetadata(metadata);
            } catch (err) {
              console.error(`Error loading file ${file.id}:`, err);
              // Return file without GeoJSON if parsing fails
              return {
                ...file,
                geoJson: null,
              };
            }
          }
          
          return {
            ...file,
            geoJson: metadata?.geoJson || null,
          };
        })
      );
      
      setUploadedFiles(filesWithMetadata);
    } catch (error) {
      console.error('Error loading files:', error);
      setUploadedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (newLayer) => {
    // File is already saved to server and metadata is saved
    // Just reload the list
    loadFiles();
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      const success = await deleteFile(fileId);
      if (success) {
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
    const success = await updateFileVisibility(fileId, !currentVisible);
    if (success) {
      loadFiles();
    } else {
      alert('Failed to update file visibility');
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
                <p className="text-sm text-gray-600">Manage KML Files</p>
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
                            onClick={() => setSelectedFile(file)}
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
                  <div>
                    <span className="font-semibold text-gray-700">Type:</span>
                    <span className="ml-2 text-gray-600">{selectedFile.geoJson?.type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Features:</span>
                    <span className="ml-2 text-gray-600">{selectedFile.geoJson?.features?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span className={`ml-2 ${selectedFile.visible ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedFile.visible ? 'Visible on map' : 'Hidden from map'}
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
      </div>
    </div>
  );
}

