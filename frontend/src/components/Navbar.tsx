import React, { useEffect, useState } from 'react';
import { Film, Activity, Clock, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface NavbarProps {
  viewMode?: 'CATALOG' | 'BOOKING';
  onBackToCatalog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ viewMode = 'CATALOG', onBackToCatalog }) => {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Back Button */}
        <div className="flex items-center gap-4">
          {viewMode === 'BOOKING' && onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4 text-brand-400" />
              <span>Back to Movies</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/30">
              <Film className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-brand-400 bg-clip-text text-transparent font-sans">
                  CinemaSeat
                </span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  Phase 2
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">When Everyone Wants the Same Seat</p>
            </div>
          </div>
        </div>

        {/* Live Info & Health Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>8:00 PM Premiere</span>
          </div>

          <div className="flex items-center gap-2 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-gray-400 hidden xs:inline">System Health:</span>
            {healthStatus === 'UP' ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
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
