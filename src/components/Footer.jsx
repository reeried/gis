export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6 border-t border-gray-700">
      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-[1200px]">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-sm">Gistaru Kupang</div>
              <div className="text-xs text-gray-400">Sistem Informasi Tata Ruang Kota Kupang</div>
            </div>
          </div>

          {/* Middle: Contact Info */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Kontak Kami</h3>
            <p className="text-xs text-gray-300">
              Alamat: Jl. [Alamat Lengkap], Kota Kupang, NTT
            </p>
          </div>

          {/* Right: Privacy and Visitor Count */}
          <div className="text-right">
            <div className="mb-2">
              <a href="#" className="text-xs text-gray-300 hover:text-white">
                Kebijakan Privasi
              </a>
            </div>
            <div className="text-xs text-gray-400">
              Total Pengunjung : <span className="font-semibold text-white">0</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
}

