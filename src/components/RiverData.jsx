import { useState, useEffect } from 'react';

export default function RiverData() {
  const [riverData, setRiverData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load river data - placeholder for now
    // In production, this would fetch from an API
    setLoading(true);
    setTimeout(() => {
      // Sample data structure
      setRiverData([
        {
          id: 1,
          name: 'Sungai Benain',
          location: 'Kecamatan Oebobo',
          length: '12.5 km',
          width: '15 m',
          depth: '3 m',
          status: 'Normal',
          lastUpdate: '2024-01-15'
        },
        {
          id: 2,
          name: 'Sungai Noel',
          location: 'Kecamatan Kelapa Lima',
          length: '8.3 km',
          width: '12 m',
          depth: '2.5 m',
          status: 'Normal',
          lastUpdate: '2024-01-14'
        },
        {
          id: 3,
          name: 'Sungai Oesapa',
          location: 'Kecamatan Alak',
          length: '6.7 km',
          width: '10 m',
          depth: '2 m',
          status: 'Perlu Perhatian',
          lastUpdate: '2024-01-13'
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredData = riverData.filter(river =>
    river.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    river.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Sungai</h2>
        <p className="text-gray-600">
          Informasi lengkap mengenai data sungai di wilayah Kota Kupang
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari sungai atau lokasi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Memuat data...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Sungai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lokasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Panjang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lebar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kedalaman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Update Terakhir
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      Tidak ada data ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredData.map((river) => (
                    <tr key={river.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {river.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {river.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {river.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {river.width}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {river.depth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(river.status)}`}>
                          {river.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {river.lastUpdate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

