import React, { useEffect, useState } from 'react';
import { Film, Activity, Clock, ArrowLeft, Home, Compass, Ticket, BarChart2, MapPin } from 'lucide-react';
import axios from 'axios';
import { CinemaBranch } from './BranchSelectorModal';

interface NavbarProps {
  viewMode?: 'HOME' | 'CATALOG' | 'BOOKING';
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
  onOpenTickets?: () => void;
  onOpenTelemetry?: () => void;
  onOpenBranchModal?: () => void;
  selectedBranch?: CinemaBranch;
  ticketCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode = 'HOME',
  onNavigateHome,
  onNavigateCatalog,
  onOpenTickets,
  onOpenTelemetry,
  onOpenBranchModal,
  selectedBranch,
  ticketCount = 0
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
        {/* Brand Logo & Location Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
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

          {/* Location / Cinema Branch Switcher Button */}
          {onOpenBranchModal && selectedBranch && (
            <button
              onClick={onOpenBranchModal}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-dark-800/90 hover:bg-dark-700 text-gray-200 font-bold text-[11px] sm:text-xs border border-gray-700 flex items-center gap-1.5 transition shrink-0"
              title="Change Cinema Branch & City"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-extrabold text-amber-300 hidden sm:inline">{selectedBranch.city}:</span>
              <span className="truncate max-w-[110px] sm:max-w-[160px]">{selectedBranch.name}</span>
            </button>
          )}

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs">
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

        {/* Live Info, Ticket Wallet, Telemetry & Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Digital Ticket Wallet Button */}
          <button
            onClick={onOpenTickets}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center gap-1.5 transition transform hover:scale-105"
          >
            <Ticket className="w-4 h-4 text-amber-300" />
            <span className="hidden xs:inline">My Tickets</span>
            {ticketCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center ml-0.5">
                {ticketCount}
              </span>
            )}
          </button>

          {/* Telemetry Analytics Widget Button */}
          {onOpenTelemetry && (
            <button
              onClick={onOpenTelemetry}
              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-brand-300 font-bold text-xs border border-brand-500/30 flex items-center gap-1.5 transition shadow-sm"
              title="Open Live Concurrency Telemetry"
            >
              <BarChart2 className="w-4 h-4 text-brand-400 animate-pulse" />
              <span className="hidden sm:inline">Telemetry</span>
            </button>
          )}

          {viewMode === 'BOOKING' && (
            <button
              onClick={onNavigateCatalog}
              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Back to Movies</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 bg-dark-800/80 px-2.5 py-1.5 sm:px-3 rounded-lg border border-gray-800 text-[11px] sm:text-xs">
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-gray-400 hidden xl:inline">System Health:</span>
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
