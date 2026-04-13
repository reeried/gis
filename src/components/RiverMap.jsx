import { useState, useEffect } from 'react';
import { getRiverMap } from '../services/riverData';

export default function RiverMap() {
  const [riverMapInfo, setRiverMapInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRiverMapData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getRiverMap();
        if (!isMounted) return;

        setRiverMapInfo(data);
      } catch (err) {
        console.error('Error loading river map data:', err);
        if (isMounted) {
          setError('Gagal memuat data Peta Sungai. Silakan coba lagi.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRiverMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedImageUrl) {
        setSelectedImageUrl(null);
      }
    };

    if (selectedImageUrl) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImageUrl]);

  return (
    <div className="w-full bg-white">
      <div className="p-6 shadow-sm border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Peta Sungai</h2>
        <p className="text-sm text-gray-600 mt-2">
          Peta menampilkan data sungai di wilayah Kota Kupang.
        </p>
        {riverMapInfo?.description && (
          <p className="text-sm text-gray-700 mt-3">{riverMapInfo.description}</p>
        )}
      </div>

      <div className="bg-white py-8 px-4 sm:px-8">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 text-sm p-4 rounded m-6">{error}</div>
        ) : (() => {
          // Get image URLs with backward compatibility - convert to array of objects
          let imageData = [];
          if (riverMapInfo?.map_image_urls && Array.isArray(riverMapInfo.map_image_urls)) {
            imageData = riverMapInfo.map_image_urls.map((item, index) => {
              if (typeof item === 'string') {
                // Old format: string URL
                return { url: item, name: `Peta ${index + 1}` };
              } else if (item && typeof item === 'object' && item.url) {
                // New format: object with url/thumb/original/name
                return { 
                  url: item.url, 
                  thumbUrl: item.thumbUrl,
                  originalUrl: item.originalUrl,
                  name: item.name || `Peta ${index + 1}` 
                };
              }
              return null;
            }).filter(Boolean);
          } else if (riverMapInfo?.map_image_url) {
            imageData = [{ url: riverMapInfo.map_image_url, name: 'Peta 1' }];
          }
          
          if (imageData.length === 0) {
            return (
              <div className="text-gray-600 text-sm h-full flex items-center justify-center">
                Gambar peta belum tersedia.
              </div>
            );
          }
          
          if (imageData.length === 1) {
            // Single image - display full width
            return (
              <div className="w-full flex justify-center items-start overflow-visible">
                <img
                  src={imageData[0].thumbUrl || imageData[0].url}
                  alt={imageData[0].name || riverMapInfo.title || 'Peta Sungai'}
                  className="w-full h-auto max-w-[1200px] max-h-[70vh] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                  decoding="async"
                  onClick={() => setSelectedImageUrl(imageData[0].originalUrl || imageData[0].url)}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            );
          }
          
          // Multiple images - display in grid
          return (
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {imageData.map((img, index) => (
                  <div key={index} className="flex flex-col items-center">
                      <div className="w-full flex justify-center items-start bg-gray-50 rounded-lg p-2 overflow-visible">
                      <img
                        src={img.thumbUrl || img.url}
                        alt={img.name || `${riverMapInfo.title || 'Peta Sungai'} - ${index + 1}`}
                          className="w-full h-auto max-h-[420px] object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                        decoding="async"
                        onClick={() => setSelectedImageUrl(img.originalUrl || img.url)}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-700">{img.name || `Peta ${index + 1}`}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={selectedImageUrl}
              alt={riverMapInfo?.title || 'Peta Sungai - Full Size'}
              className="max-w-full max-h-[95vh] w-auto h-auto object-contain rounded-lg"
              loading="lazy"
              decoding="async"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

