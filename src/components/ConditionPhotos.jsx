import { useState, useEffect } from 'react';
import { getAllConditionPhotos } from '../services/riverData';

export default function ConditionPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await getAllConditionPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Error loading condition photos:', error);
      // Fallback to empty array on error
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique locations from photos
  const locations = ['all', ...new Set(photos.map(photo => photo.location).filter(Boolean))];

  const filteredPhotos = photos.filter(photo => {
    const matchesStatus = statusFilter === 'all' || photo.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || photo.location === locationFilter;
    return matchesStatus && matchesLocation;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal':
        return 'bg-green-100 text-green-800';
      case 'Perlu Perhatian':
        return 'bg-yellow-100 text-yellow-800';
      case 'Kritis':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Foto Kondisi Sungai</h2>
        <p className="text-gray-600">
          Dokumentasi foto kondisi sungai di wilayah Kota Kupang
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Berdasarkan Status:</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('Normal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Normal' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setStatusFilter('Perlu Perhatian')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Perlu Perhatian' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Perlu Perhatian
            </button>
            <button
              onClick={() => setStatusFilter('Kritis')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Kritis' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kritis
            </button>
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Berdasarkan Lokasi:</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocationFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Semua Lokasi
            </button>
            <button
              onClick={() => setLocationFilter('Liliba')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Liliba' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Liliba
            </button>
            <button
              onClick={() => setLocationFilter('Alak')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Alak' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Alak
            </button>
            <button
              onClick={() => setLocationFilter('Dendeng')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Dendeng' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Dendeng
            </button>
            <button
              onClick={() => setLocationFilter('Lasiana')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Lasiana' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Lasiana
            </button>
            <button
              onClick={() => setLocationFilter('Merdeka')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Merdeka' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Merdeka
            </button>
            <button
              onClick={() => setLocationFilter('Oesapa Kecil')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Oesapa Kecil' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Oesapa Kecil
            </button>
            <button
              onClick={() => setLocationFilter('Oeba')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Oeba' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Oeba
            </button>
            <button
              onClick={() => setLocationFilter('Nunbaun Sabu')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Nunbaun Sabu' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Nunbaun Sabu
            </button>
            <button
              onClick={() => setLocationFilter('Nunbaun Delha')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Nunbaun Delha' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Nunbaun Delha
            </button>
            <button
              onClick={() => setLocationFilter('Namosain (Osmok)')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === 'Namosain (Osmok)' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Namosain (Osmok)
            </button>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Memuat foto...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPhotos.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">
              Tidak ada foto ditemukan
            </div>
          ) : (
            filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={photo.image_url || '/placeholder-river.jpg'}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EPlaceholder%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(photo.status)}`}>
                      {photo.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-1">{photo.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{photo.location}</p>
                  <p className="text-xs text-gray-500">{photo.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedPhoto.title}</h3>
                  <p className="text-gray-600 mb-1">{selectedPhoto.location}</p>
                  <p className="text-sm text-gray-500">{selectedPhoto.date}</p>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="mb-4">
                <img
                  src={selectedPhoto.image_url || '/placeholder-river.jpg'}
                  alt={selectedPhoto.title}
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EPlaceholder Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className="mb-2">
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(selectedPhoto.status)}`}>
                  {selectedPhoto.status}
                </span>
              </div>
              <p className="text-gray-700">{selectedPhoto.description || 'No description available'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

