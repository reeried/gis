export default function BasemapSelector({ 
  basemap, 
  onBasemapChange, 
  showDistrictBoundaries = false, 
  onToggleDistrictBoundaries 
}) {
  // Ensure we have a handler function
  const handleToggle = (e) => {
    if (onToggleDistrictBoundaries) {
      onToggleDistrictBoundaries(e);
    } else {
      console.warn('onToggleDistrictBoundaries handler is not provided');
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl flex-shrink-0">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Basemap
        </h3>
      </div>
      
      <div className="p-5 pb-10">
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
            Pilih Maps
          </h4>
          <div className="space-y-2">
            <label className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
              basemap === 'street' 
                ? 'bg-blue-50 border-blue-500 shadow-sm' 
                : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}>
              <div className="relative mr-3">
                <input
                  type="radio"
                  name="basemap"
                  value="street"
                  checked={basemap === 'street'}
                  onChange={(e) => onBasemapChange(e.target.value)}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  basemap === 'street' 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-400 bg-white'
                }`}>
                  {basemap === 'street' && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
              <span className={`text-sm font-medium transition-colors ${
                basemap === 'street' ? 'text-blue-700' : 'text-gray-700'
              }`}>Street Map</span>
            </label>
            <label className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
              basemap === 'satellite' 
                ? 'bg-blue-50 border-blue-500 shadow-sm' 
                : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}>
              <div className="relative mr-3">
                <input
                  type="radio"
                  name="basemap"
                  value="satellite"
                  checked={basemap === 'satellite'}
                  onChange={(e) => onBasemapChange(e.target.value)}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  basemap === 'satellite' 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-400 bg-white'
                }`}>
                  {basemap === 'satellite' && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
              <span className={`text-sm font-medium transition-colors ${
                basemap === 'satellite' ? 'text-blue-700' : 'text-gray-700'
              }`}>Bing Satelit</span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4 pb-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Batas Kecamatan
            </span>
            <div className="relative inline-block w-14 h-7 flex-shrink-0">
              <input
                type="checkbox"
                checked={showDistrictBoundaries || false}
                onChange={handleToggle}
                className="sr-only peer"
              />
              <div className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out ${
                showDistrictBoundaries ? 'bg-blue-600' : 'bg-gray-300'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                  showDistrictBoundaries ? 'translate-x-7' : 'translate-x-0'
                }`}></div>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

