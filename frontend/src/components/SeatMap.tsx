import React, { useState, useEffect } from 'react';
import { Seat } from '../types';
import { Lock, CheckCircle2, Flame, ShieldAlert, Timer } from 'lucide-react';

interface SeatMapProps {
  seats: Seat[];
  currentUserId: string;
  selectedSeatCode: string | null;
  heldBookingRef: string | null;
  holdExpiresAt: string | null;
  onHoldSeat: (seatCode: string) => void;
  onPaySeat: () => void;
  isHolding: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  currentUserId,
  selectedSeatCode,
  heldBookingRef,
  holdExpiresAt,
  onHoldSeat,
  onPaySeat,
  isHolding
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Live countdown timer for held seat
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // Group seats by row
  const rows = Array.from(new Set(seats.map(s => s.row_label))).sort();

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-dark-700 border border-gray-600"></span>
            <span className="text-gray-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500"></span>
            <span className="text-amber-400">Held (Others)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-brand-600 shadow-md shadow-brand-500/50 border border-brand-400"></span>
            <span className="text-brand-300 font-semibold">Your Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gray-800 border border-gray-900 opacity-40"></span>
            <span className="text-gray-500">Booked</span>
          </div>
        </div>

        {/* F12 Highlight info */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Seat <strong>F12</strong> is the Prime Premiere Seat!</span>
        </div>
      </div>

      {/* Screen Curved Header */}
      <div className="w-full mb-12 flex flex-col items-center">
        <div className="w-3/4 sm:w-1/2 h-3 rounded-t-full cinema-screen mb-2"></div>
        <span className="text-[11px] uppercase tracking-widest font-extrabold text-gray-500">
          SCREEN THIS WAY
        </span>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[680px] flex flex-col items-center gap-3">
          {rows.map(row => {
            const rowSeats = seats
              .filter(s => s.row_label === row)
              .sort((a, b) => a.seat_number - b.seat_number);

            return (
              <div key={row} className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-xs text-gray-500">{row}</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowSeats.map(seat => {
                    const isF12 = seat.seat_code === 'F12';
                    const isHeldByMe = seat.status === 'HELD' && seat.held_by_user_id === currentUserId;
                    const isHeldByOther = seat.status === 'HELD' && !isHeldByMe;
                    const isBooked = seat.status === 'BOOKED';
                    const isSelected = selectedSeatCode === seat.seat_code;

                    let bgClass = 'bg-dark-700/80 border-gray-700 text-gray-300 hover:bg-brand-600/30 hover:border-brand-500';
                    if (isBooked) {
                      bgClass = 'bg-gray-900 border-gray-900 text-gray-600 opacity-30 cursor-not-allowed';
                    } else if (isHeldByMe) {
                      bgClass = 'bg-brand-600 border-brand-400 text-white shadow-lg shadow-brand-500/40 animate-pulse font-bold';
                    } else if (isHeldByOther) {
                      bgClass = 'bg-amber-950/60 border-amber-600/60 text-amber-400 cursor-not-allowed';
                    } else if (isSelected) {
                      bgClass = 'bg-brand-500 border-white text-white shadow-md shadow-brand-500/50';
                    }

                    return (
                      <button
                        key={seat.seat_code}
                        disabled={isBooked || isHeldByOther || isHolding}
                        onClick={() => onHoldSeat(seat.seat_code)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex flex-col items-center justify-center text-xs transition-all duration-200 relative group ${bgClass}`}
                        title={`Seat ${seat.seat_code} (${seat.status})`}
                      >
                        <span className="font-semibold">{seat.seat_code}</span>
                        {isF12 && !isBooked && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                        )}
                        {isHeldByOther && (
                          <Lock className="w-2.5 h-2.5 text-amber-400 absolute bottom-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="w-6 text-center font-bold text-xs text-gray-500">{row}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer Bar */}
      {heldBookingRef && (
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-brand-950/80 to-dark-800 border border-brand-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Timer className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Seat {selectedSeatCode} Held!</span>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded">
                  Ref: {heldBookingRef}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Hold expires in: <strong className="text-brand-400">{timeLeft !== null ? `${timeLeft}s` : '...'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onPaySeat}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Proceed to Payment (BDT 450)</span>
          </button>
        </div>
      )}
    </div>
  );
};
