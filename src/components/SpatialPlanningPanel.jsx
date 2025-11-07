import { useState } from 'react';

export default function SpatialPlanningPanel() {
  const [expandedSections, setExpandedSections] = useState({
    settlement: false,
    transportation: false,
    energy: false,
    telecommunication: false
  });

  const [transportationSubItems, setTransportationSubItems] = useState({
    jalanNasional: false,
    jalanProvinsi: false,
    jalanKota: false,
    jalanLokal: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleTransportationSubItem = (item) => {
    setTransportationSubItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const SectionItem = ({ label, checked = false, onToggle }) => (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-blue-50 rounded-lg transition-all duration-200 group border border-transparent hover:border-blue-200">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            checked 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-gray-300 group-hover:border-blue-400'
          }`}>
            {checked && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className={`text-sm transition-colors ${checked ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 hover:bg-blue-100 rounded-md transition-colors" title="Details">
          <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        <button className="p-1.5 hover:bg-blue-100 rounded-md transition-colors" title="Visibility">
          <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Rencana Struktur Ruang
        </h3>
      </div>
      
      <div className="p-5">
      
      {/* Sistem Pusat Permukiman */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('settlement')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
            expandedSections.settlement 
              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
              : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50/50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white transition-all duration-200 peer-hover:border-blue-400"></div>
            </div>
            <span className="text-sm font-semibold text-gray-800">Sistem Pusat Permukiman</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${expandedSections.settlement ? 'rotate-180 text-blue-600' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.settlement && (
          <div className="mt-3 ml-7 border-l-2 border-blue-300 pl-4 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <SectionItem label="Pusat Kegiatan Nasional (PKN)" />
            <SectionItem label="Pusat Kegiatan Wilayah (PKW)" />
            <SectionItem label="Pusat Kegiatan Lokal (PKL)" />
          </div>
        )}
      </div>

      {/* Sistem Jaringan Transportasi */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('transportation')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
            expandedSections.transportation 
              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
              : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50/50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white transition-all duration-200 peer-hover:border-blue-400"></div>
            </div>
            <span className="text-sm font-semibold text-gray-800">Sistem Jaringan Transportasi</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${expandedSections.transportation ? 'rotate-180 text-blue-600' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.transportation && (
          <div className="mt-3 ml-7 border-l-2 border-blue-300 pl-4 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <div className="mb-2">
              <div className="flex items-center justify-between py-2.5 px-3 hover:bg-blue-50 rounded-lg transition-all duration-200 group border border-transparent hover:border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={transportationSubItems.jalanNasional}
                      onChange={() => toggleTransportationSubItem('jalanNasional')}
                      className="sr-only peer"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      transportationSubItems.jalanNasional 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {transportationSubItems.jalanNasional && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm transition-colors ${transportationSubItems.jalanNasional ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>Jalan Nasional</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="50"
                    className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <button className="p-1.5 hover:bg-blue-100 rounded-md transition-colors" title="Details">
                    <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button className="p-1.5 hover:bg-blue-100 rounded-md transition-colors" title="Visibility">
                    <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <SectionItem label="Jalan Provinsi" />
            <SectionItem label="Jalan Kota" />
            <SectionItem label="Jalan Lokal" />
          </div>
        )}
      </div>

      {/* Sistem Jaringan Energi */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('energy')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
            expandedSections.energy 
              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
              : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50/50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white transition-all duration-200 peer-hover:border-blue-400"></div>
            </div>
            <span className="text-sm font-semibold text-gray-800">Sistem Jaringan Energi</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${expandedSections.energy ? 'rotate-180 text-blue-600' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.energy && (
          <div className="mt-3 ml-7 border-l-2 border-blue-300 pl-4 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <SectionItem label="Jaringan Listrik" />
            <SectionItem label="Jaringan Gas" />
          </div>
        )}
      </div>

      {/* Sistem Jaringan Telekomunikasi */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('telecommunication')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
            expandedSections.telecommunication 
              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
              : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50/50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white transition-all duration-200 peer-hover:border-blue-400"></div>
            </div>
            <span className="text-sm font-semibold text-gray-800">Sistem Jaringan Telekomunikasi</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${expandedSections.telecommunication ? 'rotate-180 text-blue-600' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections.telecommunication && (
          <div className="mt-3 ml-7 border-l-2 border-blue-300 pl-4 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <SectionItem label="Jaringan Telepon" />
            <SectionItem label="Jaringan Internet" />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

