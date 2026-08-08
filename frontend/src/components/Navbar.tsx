import React, { useEffect, useState } from 'react';
import { Film, Activity, Clock, ArrowLeft, Home, Compass } from 'lucide-react';
import axios from 'axios';

interface NavbarProps {
  viewMode?: 'HOME' | 'CATALOG' | 'BOOKING';
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode = 'HOME',
  onNavigateHome,
  onNavigateCatalog
}) => {
  const [healthStatus, setHealthStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get('/health', { timeout: 2000 });
        if (res.data.status === 'UP') {
          setHealthStatus('UP');
        } else {
          setHealthStatus('DOWN');
        }
      } catch {
        setHealthStatus('DOWN');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/30">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-brand-400 bg-clip-text text-transparent font-sans">
                  CinemaSeat
                </span>
                <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  Phase 2
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium hidden xs:block">When Everyone Wants the Same Seat</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1 text-xs">
            <button
              onClick={onNavigateHome}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                viewMode === 'HOME'
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={onNavigateCatalog}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                viewMode === 'CATALOG'
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Movies</span>
            </button>
          </nav>
        </div>

        {/* Live Info & Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {viewMode === 'BOOKING' && (
            <button
              onClick={onNavigateCatalog}
              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-400" />
              <span>Back to Movies</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 bg-dark-800/80 px-2.5 py-1.5 sm:px-3 rounded-lg border border-gray-800 text-[11px] sm:text-xs">
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-gray-400 hidden md:inline">System Health:</span>
            {healthStatus === 'UP' ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                200 OK
              </span>
            ) : healthStatus === 'DOWN' ? (
              <span className="font-semibold text-rose-400">Degraded</span>
            ) : (
              <span className="text-gray-400">Checking...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
