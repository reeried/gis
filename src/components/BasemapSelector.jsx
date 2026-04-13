export default function BasemapSelector({ 
  basemap, 
  onBasemapChange, 
  showDistrictBoundaries = false, 
  onToggleDistrictBoundaries,
  showRiverLayers = false,
  onToggleRiverLayers,
  showPhotoLayers = false,
  onTogglePhotoLayers,
  showAdministrativeBoundaries = false,
  onToggleAdministrativeBoundaries,
  showDasLayers = false,
  onToggleDasLayers,
  showContourLayers = false,
  onToggleContourLayers,
  showSumurBorLayers = false,
  onToggleSumurBorLayers,
  showMataAirLayers = false,
  onToggleMataAirLayers,
  showBendungLayers = false,
  onToggleBendungLayers,
  showReservoirLayers = false,
  onToggleReservoirLayers,
  showJaringanAirBersihLayers = false,
  onToggleJaringanAirBersihLayers,
  showSawahLayers = false,
  onToggleSawahLayers,
  showJaringanIrigasiLayers = false,
  onToggleJaringanIrigasiLayers
}) {
  const createToggleHandler = (handler, label) => (e) => {
    if (handler) {
      handler(e);
    } else {
      console.warn(`${label} toggle handler is not provided`);
    }
  };

  const layerToggles = [
    {
      id: 'district',
      label: 'Kecamatan',
      checked: showDistrictBoundaries,
      handler: onToggleDistrictBoundaries,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'river',
      label: 'Sungai',
      checked: showRiverLayers,
      handler: onToggleRiverLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18c2 0 4-2 6-2s4 2 6 2 4-2 6-2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12c2 0 4-2 6-2s4 2 6 2 4-2 6-2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6c2 0 4-2 6-2s4 2 6 2 4-2 6-2" />
        </svg>
      )
    },
    {
      id: 'photo',
      label: 'Foto Kondisi',
      checked: showPhotoLayers,
      handler: onTogglePhotoLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2-3h6l2 3h4v12H3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )
    },
    {
      id: 'administrative',
      label: 'Batas Administrasi',
      checked: showAdministrativeBoundaries,
      handler: onToggleAdministrativeBoundaries,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      id: 'das',
      label: 'DAS',
      checked: showDasLayers,
      handler: onToggleDasLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'contour',
      label: 'Kontur',
      checked: showContourLayers,
      handler: onToggleContourLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      id: 'sumur_bor',
      label: 'Sumur Bor',
      checked: showSumurBorLayers,
      handler: onToggleSumurBorLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'mata_air',
      label: 'Mata Air',
      checked: showMataAirLayers,
      handler: onToggleMataAirLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      id: 'bendung',
      label: 'Bendung',
      checked: showBendungLayers,
      handler: onToggleBendungLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'reservoir',
      label: 'Reservoir',
      checked: showReservoirLayers,
      handler: onToggleReservoirLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'jaringan_air_bersih',
      label: 'Jaringan Air Bersih',
      checked: showJaringanAirBersihLayers,
      handler: onToggleJaringanAirBersihLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      id: 'sawah',
      label: 'Sawah',
      checked: showSawahLayers,
      handler: onToggleSawahLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'jaringan_irigasi',
      label: 'Jaringan Irigasi',
      checked: showJaringanIrigasiLayers,
      handler: onToggleJaringanIrigasiLayers,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    }
  ];
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

        {layerToggles.map((toggle, index) => (
          <div
            key={toggle.id}
            className={`border-t border-gray-200 ${index === 0 ? 'pt-4 mt-4' : 'pt-3 mt-3'} pb-3`}
          >
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                {toggle.icon}
                {toggle.label}
              </span>
              <div className="relative inline-block w-14 h-7 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={toggle.checked || false}
                  onChange={createToggleHandler(toggle.handler, toggle.label)}
                  className="sr-only peer"
                />
                <div className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out ${
                  toggle.checked ? 'bg-blue-600' : 'bg-gray-300'
                } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                    toggle.checked ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

