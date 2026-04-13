import { useState, useEffect } from 'react';
import { getGoogleSheetsUrl } from '../services/riverData';

export default function RiverData() {
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoogleSheetsUrl();
  }, []);

  const loadGoogleSheetsUrl = async () => {
    setIsLoading(true);
    try {
      const url = await getGoogleSheetsUrl();
      setGoogleSheetsUrl(url);
    } catch (error) {
      console.error('Error loading Google Sheets URL:', error);
      setGoogleSheetsUrl(null);
    } finally {
      setIsLoading(false);
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
  
  // Generate embed URL - using preview mode for better embedding
  const embedUrl = sheetId 
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview`
    : null;

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Sungai</h2>
          <p className="text-gray-600">
            Informasi lengkap mengenai data sungai di wilayah Kota Kupang
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="w-full h-full p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Sungai</h2>
          <p className="text-gray-600">
            Informasi lengkap mengenai data sungai di wilayah Kota Kupang
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="font-medium">Google Sheets belum dikonfigurasi</p>
          <p className="text-sm mt-1">
            Silakan konfigurasi Google Sheets URL di Admin Dashboard → Data Sungai
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Sungai</h2>
        <p className="text-gray-600">
          Informasi lengkap mengenai data sungai di wilayah Kota Kupang
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title="Data Sungai - Google Sheets"
          allowFullScreen
        />
      </div>
    </div>
  );
}
