import React, { useEffect, useState } from 'react';
import { Ticket, CheckCircle2, Download, QrCode, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { Booking } from '../types';

interface TicketReceiptModalProps {
  bookingRef: string;
  onClose: () => void;
}

export const TicketReceiptModal: React.FC<TicketReceiptModalProps> = ({ bookingRef, onClose }) => {
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const fetchBooking = async () => {
      try {
        const res = await axios.get(`/api/bookings/${bookingRef}`);
        setBooking(res.data);
      } catch (err) {
        console.error('Failed to load ticket:', err);
      }
    };

    fetchBooking();
  }, [bookingRef]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-sm w-full rounded-3xl p-6 sm:p-8 border border-brand-500/40 relative shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-brand-500/20 rounded-full blur-2xl"></div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">Booking Confirmed!</h3>
          <p className="text-xs text-brand-400 font-medium">Your movie ticket is ready</p>
        </div>

        {booking ? (
          <div className="space-y-4">
            {/* Ticket Card */}
            <div className="bg-dark-800/90 rounded-2xl p-5 border border-gray-700/60 relative">
              <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-3">
                <div>
                  <h4 className="font-bold text-white text-base">{booking.movie_title || 'Spider-Man: Brand New Day'}</h4>
                  <p className="text-xs text-gray-400">{booking.screen_name || 'Hall 1 (IMAX)'}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-black bg-brand-600 text-white rounded-lg">
                  Seat {booking.seat_code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Booking Ref</span>
                  <span className="font-mono text-gray-200 font-semibold">{booking.booking_ref}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Amount Paid</span>
                  <span className="text-emerald-400 font-bold">BDT {booking.amount}</span>
                </div>
              </div>

              {/* QR Mock */}
              <div className="mt-4 pt-4 border-t border-dashed border-gray-700 flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl shadow-inner mb-2">
                  <QrCode className="w-24 h-24 text-dark-900" />
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Scan at Entrance
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Done & Close</span>
            </button>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-sm">
            Loading ticket details...
          </div>
        )}
      </div>
    </div>
  );
};
