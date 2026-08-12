import React from 'react';
import { Ticket, X, CheckCircle2, Download, Smartphone, ShoppingBag, Trash2, Calendar, MapPin } from 'lucide-react';
import { Booking, Movie } from '../types';

interface MyTicketsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Booking[];
  movies?: Movie[];
  onCancelTicket?: (bookingRef: string) => void;
}

export const MyTicketsDrawer: React.FC<MyTicketsDrawerProps> = ({
  isOpen,
  onClose,
  tickets,
  movies = [],
  onCancelTicket
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel border-l border-white/10 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="bg-gradient-to-r from-dark-800 to-dark-900 p-5 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight font-sans">
                  Digital Ticket Wallet
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  {tickets.length} Active Digital Movie Pass{tickets.length === 1 ? '' : 'es'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar">
            {tickets.length > 0 ? (
              tickets.map((ticket, idx) => {
                const matchedMovie = movies.find(m => m.title.toLowerCase().trim() === (ticket.movie_title || '').toLowerCase().trim());
                const posterUrl = ticket.poster_url || matchedMovie?.poster_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80';

                const qrData = encodeURIComponent(`CINEMASEAT-TICKET|REF:${ticket.booking_ref}|SEAT:${ticket.seat_code || 'C6'}|STATUS:CONFIRMED`);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}&color=0f172a&bgcolor=ffffff`;

                return (
                  <div 
                    key={ticket.booking_ref || idx}
                    className="glass-card rounded-2xl p-5 border border-brand-500/30 relative shadow-xl space-y-4"
                  >
                    {/* Ticket Header */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                          CONFIRMED TICKET
                        </span>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-black bg-brand-600 text-white rounded-lg">
                        Seats {ticket.seat_code || 'C6'}
                      </span>
                    </div>

                    {/* Movie Information */}
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-700 bg-dark-800">
                        <img 
                          src={posterUrl} 
                          alt={ticket.movie_title || 'Movie Poster'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-sm line-clamp-1">
                          {ticket.movie_title || 'Spider-Man: Brand New Day'}
                        </h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                          <span>{ticket.screen_name || 'Grand Hall IMAX 1'}</span>
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-brand-400 shrink-0" />
                          <span>Ref: {ticket.booking_ref}</span>
                        </p>
                      </div>
                    </div>

                    {/* Price & Concessions Badge */}
                    <div className="bg-dark-900/80 p-3 rounded-xl border border-gray-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Total Amount Paid</span>
                        <span className="text-emerald-400 font-black text-sm">BDT {ticket.amount || 450}</span>
                      </div>
                      {ticket.snacks && ticket.snacks.length > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-amber-400 font-bold block flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Concessions Included</span>
                          </span>
                          <span className="text-[10px] text-gray-300 font-medium">
                            {ticket.snacks.reduce((sum, item) => sum + item.quantity, 0)} Items
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scannable Digital QR Code */}
                    <div className="pt-2 border-t border-dashed border-gray-800 flex flex-col items-center">
                      <div className="bg-white p-2.5 rounded-2xl shadow-lg mb-2">
                        <img 
                          src={qrUrl} 
                          alt="QR Ticket Code" 
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                        <span>Present QR code at theatre gate</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-dark-800 border border-gray-800 text-gray-500 flex items-center justify-center mx-auto">
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">No Active Digital Tickets</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    You haven't confirmed any movie tickets yet. Pick a premiere movie showtime to generate your digital QR pass!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="bg-dark-900/90 p-4 border-t border-gray-800 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 font-bold text-xs border border-gray-700 transition"
            >
              Close Ticket Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
