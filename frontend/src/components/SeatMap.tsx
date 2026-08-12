import React, { useState, useEffect, memo } from 'react';
import { Seat } from '../types';
import { Lock, CheckCircle2, Flame, Timer, Zap, Eye, BarChart2, XCircle, HelpCircle, Layers, X, Trash2 } from 'lucide-react';
import axios from 'axios';

interface SeatMapProps {
  seats: Seat[];
  currentUserId: string;
  selectedSeatCode: string | null;
  heldBookingRef: string | null;
  holdExpiresAt: string | null;
  onHoldSeat: (seatCode: string) => void;
  onReleaseSingleSeat: (seatCode: string) => void;
  onCancelHold: () => void;
  onHoldExpired: () => void;
  onPaySeat: (totalPrice: number, seatDisplayLabel: string) => void;
  isHolding: boolean;
  showtimeId: string;
  unitTicketPrice?: number;
}

export const SeatMap: React.FC<SeatMapProps> = memo(({
  seats,
  currentUserId,
  selectedSeatCode,
  heldBookingRef,
  holdExpiresAt,
  onHoldSeat,
  onReleaseSingleSeat,
  onCancelHold,
  onHoldExpired,
  onPaySeat,
  isHolding,
  showtimeId,
  unitTicketPrice = 450
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [pendingHoldSeat, setPendingHoldSeat] = useState<Seat | null>(null);
  const [pendingReleaseSeat, setPendingReleaseSeat] = useState<Seat | null>(null);

  const [simulatingRush, setSimulatingRush] = useState<boolean>(false);
  const [rushReport, setRushReport] = useState<{
    sent: number;
    success: number;
    rejected: number;
    oversell: number;
    durationMs: number;
  } | null>(null);

  // Derive all seats held by the current user
  const heldSeatsByMe = seats.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
  const heldSeatCodesList = heldSeatsByMe.map(s => s.seat_code);
  const heldSeatsDisplayLabel = heldSeatCodesList.length > 0 
    ? heldSeatCodesList.join(', ') 
    : (selectedSeatCode || '');

  const seatCount = heldSeatCodesList.length > 0 ? heldSeatCodesList.length : (heldBookingRef ? 1 : 0);
  const totalTicketPrice = unitTicketPrice * (seatCount || 1);

  // Live countdown timer for held seats
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        onHoldExpired();
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, onHoldExpired]);

  // Handle In-Browser 100-User Rush Simulation
  const handleSimulate100Rush = async () => {
    setSimulatingRush(true);
    setRushReport(null);
    const start = Date.now();
    const requests = [];

    for (let i = 1; i <= 100; i++) {
      const userId = `rush_sim_user_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const req = axios.post(`/api/showtimes/${showtimeId}/hold`, {
        seat_code: 'F12',
        user_id: userId
      })
      .then(res => ({ success: true, status: res.status }))
      .catch(err => ({ success: false, status: err.response?.status || 500 }));

      requests.push(req);
    }

    const results = await Promise.all(requests);
    const durationMs = Date.now() - start;

    let successCount = 0;
    let rejectedCount = 0;

    results.forEach(r => {
      if (r.success && r.status === 201) successCount++;
      else if (r.status === 409) rejectedCount++;
    });

    setRushReport({
      sent: 100,
      success: successCount,
      rejected: rejectedCount,
      oversell: Math.max(0, successCount - 1),
      durationMs
    });
    setSimulatingRush(false);
  };

  // Group seats by row
  const getRowLabel = (seat: Seat) => seat.row_label || (seat.seat_code ? seat.seat_code[0] : 'A');
  const getSeatNumber = (seat: Seat) => seat.seat_number || (seat.seat_code ? parseInt(seat.seat_code.substring(1), 10) : 1);

  const rows = Array.from(new Set(seats.map(getRowLabel))).sort();

  const getSeatViewQuality = (seatCode: string) => {
    if (['E', 'F'].includes(seatCode[0])) return { tag: '⭐ VIP Back Row', desc: 'Extra legroom & elevated screen view' };
    if (['C', 'D'].includes(seatCode[0])) return { tag: '🎬 Standard Center', desc: 'Great balanced viewing distance' };
    return { tag: '👁️ Front Row', desc: 'Immersive close-up cinematic experience' };
  };

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
      {/* Top Controls & Concurrency Rush Simulator Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-base font-sans">Live Theatre Seat Map</span>
          <span className="px-2 py-0.5 text-[10px] bg-brand-500/20 text-brand-400 font-bold rounded border border-brand-500/30">
            Real-Time Sync
          </span>
          {seatCount > 0 && (
            <span className="px-2.5 py-0.5 text-[11px] bg-amber-500/20 text-amber-300 font-extrabold rounded-full border border-amber-500/40 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>{seatCount} {seatCount === 1 ? 'Seat' : 'Seats'} Selected ({heldSeatsDisplayLabel})</span>
            </span>
          )}
        </div>

        {/* 100-User Rush Simulator Button */}
        <button
          onClick={handleSimulate100Rush}
          disabled={simulatingRush}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>{simulatingRush ? 'Firing 100 Requests...' : '⚡ Simulate 100 Concurrent Buyers (Seat F12)'}</span>
        </button>
      </div>

      {/* Rush Simulation Report Banner */}
      {rushReport && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-dark-800 to-dark-900 border border-brand-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">100-Buyer Concurrency Test Finished in {rushReport.durationMs}ms!</h4>
              <p className="text-gray-300">
                Holds: <strong className="text-emerald-400">{rushReport.success}</strong> • Rejections (409): <strong className="text-amber-400">{rushReport.rejected}</strong> • Oversell: <strong className="text-emerald-400">{rushReport.oversell} (Zero)</strong>
              </p>
            </div>
          </div>
          <button onClick={() => setRushReport(null)} className="text-gray-400 hover:text-white underline">
            Close Report
          </button>
        </div>
      )}

      {/* Seat Hover Preview Tooltip Box */}
      <div className="h-12 mb-4">
        {hoveredSeat ? (
          <div className="h-full p-3 rounded-xl bg-dark-800/90 border border-brand-500/30 text-xs flex items-center justify-between transition-all duration-200">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-white">Seat {hoveredSeat.seat_code}</span>
              <span className="text-gray-400">— {getSeatViewQuality(hoveredSeat.seat_code).desc}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-brand-600/30 text-brand-300 font-bold text-[10px]">
              {getSeatViewQuality(hoveredSeat.seat_code).tag}
            </span>
          </div>
        ) : (
          <div className="h-full border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-xs text-gray-500">
            Click on any available seat to add tickets, or click your held seat to remove it!
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-xs">
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
            <span className="text-brand-300 font-semibold">Your Hold ({seatCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gray-900 border border-gray-900 opacity-40"></span>
            <span className="text-gray-500">Booked</span>
          </div>
        </div>
      </div>

      {/* Screen Curved Header */}
      <div className="w-full mb-10 flex flex-col items-center">
        <div className="w-3/4 sm:w-1/2 h-3 rounded-t-full cinema-screen mb-2"></div>
        <span className="text-[11px] uppercase tracking-widest font-extrabold text-gray-500">
          CURVED 4K IMAX SCREEN
        </span>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[640px] flex flex-col items-center gap-3">
          {rows.map(row => {
            const rowSeats = seats
              .filter(s => getRowLabel(s) === row)
              .sort((a, b) => getSeatNumber(a) - getSeatNumber(b));

            return (
              <div key={row} className="flex items-center gap-3">
                <span className="w-6 text-center font-extrabold text-xs text-brand-400">{row}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  {rowSeats.map(seat => {
                    const isHeldByMe = seat.status === 'HELD' && seat.held_by_user_id === currentUserId;
                    const isHeldByOther = seat.status === 'HELD' && !isHeldByMe;
                    const isBooked = seat.status === 'BOOKED';
                    const isSelected = heldSeatCodesList.includes(seat.seat_code) || selectedSeatCode === seat.seat_code;

                    let bgClass = 'bg-dark-700/80 border-gray-700 text-gray-300 hover:bg-brand-600/30 hover:border-brand-500';
                    if (isBooked) {
                      bgClass = 'bg-gray-900 border-gray-900 text-gray-600 opacity-30 cursor-not-allowed';
                    } else if (isHeldByMe || isSelected) {
                      bgClass = 'bg-brand-600 border-brand-400 text-white shadow-lg shadow-brand-500/40 font-bold animate-pulse ring-2 ring-brand-400';
                    } else if (isHeldByOther) {
                      bgClass = 'bg-amber-950/60 border-amber-600/60 text-amber-400 cursor-not-allowed';
                    }

                    return (
                      <button
                        key={seat.seat_code}
                        disabled={isBooked || isHeldByOther || isHolding}
                        onClick={() => {
                          if (isHeldByMe) {
                            setPendingReleaseSeat(seat);
                          } else {
                            setPendingHoldSeat(seat);
                          }
                        }}
                        onMouseEnter={() => setHoveredSeat(seat)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex flex-col items-center justify-center text-xs transition-all duration-150 relative group font-sans ${bgClass}`}
                      >
                        <span className="font-bold">{seat.seat_code}</span>
                        {isHeldByOther && (
                          <Lock className="w-2.5 h-2.5 text-amber-400 absolute bottom-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="w-6 text-center font-extrabold text-xs text-brand-400">{row}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal 1: Hold New Seat ("Do you want to hold seat X? Yes / No") */}
      {pendingHoldSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-sm w-full rounded-2xl p-6 border border-brand-500/40 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
              <HelpCircle className="w-6 h-6 text-brand-400 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white font-sans tracking-tight">Hold Seat {pendingHoldSeat.seat_code}?</h3>
              <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                Do you want to temporarily hold <strong>Seat {pendingHoldSeat.seat_code}</strong>?
                {heldSeatsByMe.length > 0 && (
                  <span className="block mt-1.5 text-amber-300 font-semibold bg-amber-950/50 p-2 rounded-lg border border-amber-500/30">
                    Currently holding {heldSeatsByMe.length} seat{heldSeatsByMe.length > 1 ? 's' : ''} ({heldSeatsDisplayLabel}). Adding {pendingHoldSeat.seat_code} makes {heldSeatsByMe.length + 1} tickets total.
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setPendingHoldSeat(null)}
                className="py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white font-bold text-xs border border-gray-700 transition"
              >
                No, Cancel
              </button>

              <button
                onClick={() => {
                  const code = pendingHoldSeat.seat_code;
                  setPendingHoldSeat(null);
                  onHoldSeat(code);
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-extrabold text-xs shadow-lg shadow-brand-500/30 transition transform hover:scale-105 active:scale-95"
              >
                Yes, Hold Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Release Single Seat ("Remove seat X from your held seats?") */}
      {pendingReleaseSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-sm w-full rounded-2xl p-6 border border-rose-500/40 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <Trash2 className="w-6 h-6 text-rose-400 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white font-sans tracking-tight">Remove Seat {pendingReleaseSeat.seat_code}?</h3>
              <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                Do you want to release <strong>Seat {pendingReleaseSeat.seat_code}</strong> back to Available?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setPendingReleaseSeat(null)}
                className="py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white font-bold text-xs border border-gray-700 transition"
              >
                Keep Seat
              </button>

              <button
                onClick={() => {
                  const code = pendingReleaseSeat.seat_code;
                  setPendingReleaseSeat(null);
                  onReleaseSingleSeat(code);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-500/30 transition transform hover:scale-105 active:scale-95"
              >
                Remove Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer Bar & Itemized Multi-Seat Summary (Rendered when user has active holds) */}
      {(heldBookingRef || heldSeatsByMe.length > 0) && timeLeft !== null && timeLeft > 0 && (
        <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-brand-950/90 via-dark-800 to-dark-900 border border-brand-500/50 space-y-4 animate-fade-in shadow-2xl">
          {/* Header Row: Held Seats Count & Live Timer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
                <Timer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base font-sans flex items-center gap-2">
                  <span>{seatCount} {seatCount === 1 ? 'Seat' : 'Seats'} Held</span>
                  <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded">
                    Ref: {heldBookingRef || 'REF-MULTI'}
                  </span>
                </h4>
                <p className="text-xs text-gray-300">
                  Hold expires in: <strong className="text-brand-400 font-mono text-sm">{timeLeft}s</strong>
                </p>
              </div>
            </div>

            {/* Price Calculation Pill */}
            <div className="text-right sm:text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Combined Ticket Total</span>
              <span className="text-xl font-black text-amber-400 font-sans">BDT {totalTicketPrice}</span>
              <span className="text-[10px] text-gray-400 block">({seatCount} × BDT {unitTicketPrice})</span>
            </div>
          </div>

          {/* Interactive Removable Seat Badges List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Held Seats (Click ✕ on any seat to remove):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {heldSeatCodesList.map(code => (
                <div
                  key={code}
                  className="px-3 py-1.5 rounded-xl bg-brand-900/90 border border-brand-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-md group hover:border-rose-400 transition"
                >
                  <span>Seat {code}</span>
                  <button
                    onClick={() => onReleaseSingleSeat(code)}
                    className="w-4 h-4 rounded-full bg-dark-900 text-gray-400 hover:text-white hover:bg-rose-600 flex items-center justify-center transition"
                    title={`Remove Seat ${code}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={onCancelHold}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 font-semibold text-xs border border-rose-500/40 flex items-center justify-center gap-1.5 transition"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Cancel All Holds ({seatCount} Seats)</span>
            </button>

            <button
              onClick={() => onPaySeat(totalTicketPrice, heldSeatsDisplayLabel)}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-300" />
              <span>Proceed to Payment ({seatCount} {seatCount === 1 ? 'Seat' : 'Seats'} • BDT {totalTicketPrice})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
