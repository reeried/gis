import { useAuth } from '../contexts/AuthContext';

export default function Header({ activePage = 'BERANDA', onAdminClick, isAuthenticated, onPageChange }) {
  const { logout } = useAuth();
  const navItems = ['BERANDA', 'PETA SUNGAI', 'DATA SUNGAI', 'FOTO KONDISI', 'DOKUMEN'];
  
  const handleAdminClick = () => {
    if (isAuthenticated) {
      // If already authenticated, go to admin dashboard
      if (onAdminClick) onAdminClick();
    } else {
      // If not authenticated, show login
      if (onAdminClick) onAdminClick();
    }
  };

  const handleLogout = () => {
    logout();
  };
  
  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="w-full flex justify-center px-4 py-3">
        <div className="w-full max-w-[1200px]">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Organization Name */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-lg">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800 leading-tight">
                Dinas Pekerjaan Umum dan Penataan Ruang Kota Kupang
              </h1>
              <p className="text-xs font-medium text-gray-600 mt-1">
                DATABASE SUNGAI KOTA KUPANG
              </p>
            </div>
          </div>

          {/* Right: Navigation */}
          <nav className="flex items-center gap-2 flex-wrap">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => onPageChange && onPageChange(item)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activePage === item
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item}
              </button>
            ))}
            {isAuthenticated ? (
              <>
                <button
                  onClick={handleAdminClick}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Admin Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleAdminClick}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-700 text-white hover:bg-gray-800 transition-colors"
              >
                Admin Login
              </button>
            )}
          </nav>
        </div>
        </div>
      </div>
    </header>
  );
}

