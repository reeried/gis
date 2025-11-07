import { useState, useRef } from 'react';
import { parseKMLFile } from '../utils/kmlParser';
import { uploadFile, uploadFileFromURL, saveFileMetadata } from '../services/fileStorage';

export default function FileUpload({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.kml') && !file.name.toLowerCase().endsWith('.kmz')) {
      setError('Please upload a .kml or .kmz file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Upload file to server
      console.log('Step 1: Uploading file to server...');
      const serverFile = await uploadFile(file);
      console.log('File uploaded to server:', serverFile);

      // Step 2: Parse the file to get GeoJSON
      console.log('Step 2: Parsing file to GeoJSON...');
      let geoJson;
      try {
        geoJson = await parseKMLFile(file);
        console.log('File parsed successfully:', {
          fileName: file.name,
          geoJsonType: geoJson.type,
          featureCount: geoJson.features?.length || 0
        });
      } catch (parseError) {
        console.error('Error parsing file:', parseError);
        throw new Error(`Failed to parse KML file: ${parseError.message}`);
      }
      
      // Step 3: Save lightweight metadata (without GeoJSON to avoid quota issues)
      console.log('Step 3: Saving file metadata...');
      const fileData = {
        id: serverFile.id,
        name: serverFile.name,
        geoJson: geoJson,
        visible: true,
        uploadedAt: serverFile.uploadedAt,
        sourceUrl: serverFile.sourceUrl || null,
      };
      
      // Save only lightweight metadata (GeoJSON is not stored in localStorage)
      try {
        saveFileMetadata({
          id: serverFile.id,
          name: serverFile.name,
          visible: true,
          uploadedAt: serverFile.uploadedAt,
          sourceUrl: serverFile.sourceUrl || null,
        });
        console.log('Metadata saved successfully');
      } catch (metadataError) {
        console.warn('Warning: Failed to save metadata to localStorage:', metadataError);
        // Continue even if metadata save fails
      }
      
      // Step 4: Notify parent component (with GeoJSON for immediate use)
      console.log('Step 4: Notifying parent component...');
      onFileUpload(fileData);
      console.log('File upload process completed successfully');
    } catch (err) {
      console.error('File upload error:', err);
      // Provide more user-friendly error messages
      let errorMessage = err.message || 'Failed to upload file';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend server is running.';
      } else if (errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com/file.kml)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Upload file from URL to server
      const serverFile = await uploadFileFromURL(urlInput);
      console.log('File uploaded from URL to server:', serverFile);

      // Step 2: Download and parse the file to get GeoJSON
      // We need to fetch the file from the server to parse it
      // Use relative URL in production, or absolute if VITE_API_URL is set
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/files/${serverFile.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download file from server');
      }
      
      const blob = await response.blob();
      const fileName = serverFile.name;
      const file = new File([blob], fileName, { type: blob.type });
      
      const geoJson = await parseKMLFile(file);
      
      console.log('KML loaded from URL successfully:', {
        url: urlInput,
        fileName: fileName,
        geoJsonType: geoJson.type,
        featureCount: geoJson.features?.length || 0
      });
      
      // Step 3: Save lightweight metadata (without GeoJSON to avoid quota issues)
      const fileData = {
        id: serverFile.id,
        name: serverFile.name,
        geoJson: geoJson,
        visible: true,
        uploadedAt: serverFile.uploadedAt,
        sourceUrl: urlInput,
      };
      
      // Save only lightweight metadata (GeoJSON is not stored in localStorage)
      saveFileMetadata({
        id: serverFile.id,
        name: serverFile.name,
        visible: true,
        uploadedAt: serverFile.uploadedAt,
        sourceUrl: urlInput,
      });
      
      // Step 4: Notify parent component (with GeoJSON for immediate use)
      onFileUpload(fileData);
      
      // Clear URL input after successful load
      setUrlInput('');
    } catch (err) {
      console.error('URL load error:', err);
      setError(err.message || 'Failed to load KML from URL');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Upload KML/KMZ File</h3>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => {
            setUploadMode('file');
            setError(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            uploadMode === 'file'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => {
            setUploadMode('url');
            setError(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            uploadMode === 'url'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Load from URL (Online)
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.kmz"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Processing file...</p>
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
                Drag and drop a KML or KMZ file here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Browse Files
              </button>
              <p className="text-sm text-gray-500 mt-2">Supports .kml and .kmz files</p>
            </>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading KML from URL...</p>
            </div>
          ) : (
            <form onSubmit={handleURLSubmit} className="space-y-4">
              <div>
                <label htmlFor="kml-url" className="block text-sm font-medium text-gray-700 mb-2">
                  KML/KMZ URL
                </label>
                <input
                  id="kml-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/path/to/file.kml"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter a URL to a KML or KMZ file. The file will be permanently saved to your browser storage.
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
              >
                Load from URL
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

