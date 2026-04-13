import { useState, useEffect } from 'react';
import { getAllDocuments, getApiUrl } from '../services/documentStorage';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await getAllDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };


  const handleDownload = async (document) => {
    try {
      const url = getApiUrl(`/documents/${document.id}/download`);
      const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
        ? `${window.location.origin}${url}`
        : url;
      
      // Open in new tab for download
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Gagal mengunduh dokumen');
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

  const isImageFile = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['jpeg', 'jpg', 'png'].includes(ext);
  };

  const getImageUrl = (document) => {
    const url = getApiUrl(`/documents/${document.id}/download`);
    const fullUrl = typeof window !== 'undefined' && url.startsWith('/') 
      ? `${window.location.origin}${url}`
      : url;
    return fullUrl;
  };

  const handleImageClick = (document) => {
    if (isImageFile(document.name)) {
      setSelectedImage(document);
    } else {
      handleDownload(document);
    }
  };

  const filteredDocuments = category === 'all' 
    ? documents 
    : documents.filter(doc => {
        const ext = doc.name.split('.').pop().toLowerCase();
        if (category === 'pdf') return ext === 'pdf';
        if (category === 'image') return ['jpeg', 'jpg', 'png'].includes(ext);
        return true;
      });

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dokumen</h2>
        <p className="text-gray-600">
          Lihat dan unduh dokumen seperti Peraturan Pemerintah, dokumen resmi, dan file lainnya
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            category === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setCategory('pdf')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            category === 'pdf' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          PDF
        </button>
        <button
          onClick={() => setCategory('image')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            category === 'image' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Gambar
        </button>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Memuat dokumen...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">
              Tidak ada dokumen ditemukan
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isImage = isImageFile(doc.name);
              return (
                <div
                  key={doc.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                    isImage ? 'cursor-pointer' : ''
                  }`}
                  onClick={isImage ? () => handleImageClick(doc) : undefined}
                >
                  {isImage ? (
                    // Image Preview Layout
                    <>
                      <div className="relative h-48 bg-gray-200">
                        <img
                          src={getImageUrl(doc)}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      <div className="p-4">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          className="mt-3 w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          Unduh
                        </button>
                      </div>
                    </>
                  ) : (
                    // Non-Image Layout (PDF, DOC, etc.)
                    <div className="p-4">
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
                      <div className="mt-4">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          Unduh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedImage.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedImage.uploaded_at || selectedImage.uploadedAt 
                      ? new Date(selectedImage.uploaded_at || selectedImage.uploadedAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '-'}
                  </p>
                  {selectedImage.size && (
                    <p className="text-sm text-gray-500">
                      Ukuran: {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(selectedImage);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    Unduh
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <img
                  src={getImageUrl(selectedImage)}
                  alt={selectedImage.name}
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage tidak tersedia%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

