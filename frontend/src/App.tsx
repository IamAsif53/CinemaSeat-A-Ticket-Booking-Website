import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { HeroBanner } from './components/HeroBanner';
import { MovieGrid } from './components/MovieGrid';
import { MovieHeader } from './components/MovieHeader';
import { SeatMap } from './components/SeatMap';
import { PaymentModal } from './components/PaymentModal';
import { TicketReceiptModal } from './components/TicketReceiptModal';
import { Movie, Showtime, Seat } from './types';
import { AlertTriangle } from 'lucide-react';

export function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const seatsRef = useRef<Seat[]>([]);
  seatsRef.current = seats;

  const [currentUserId] = useState<string>(() => `user_${Math.floor(Math.random() * 10000)}`);
  const [viewMode, setViewMode] = useState<'HOME' | 'CATALOG' | 'BOOKING'>('HOME');
  
  const [selectedSeatCode, setSelectedSeatCode] = useState<string | null>(null);
  const [heldBookingRef, setHeldBookingRef] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Load Movies & Initial Showtime
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const mRes = await axios.get('/api/movies');
        if (!isMounted) return;
        setMovies(mRes.data);
        if (mRes.data.length > 0) {
          setSelectedMovie(mRes.data[0]);
        }

        const stRes = await axios.get('/api/showtimes/showtime-spiderman-8pm');
        if (!isMounted) return;
        setShowtime(stRes.data);

        const seatsRes = await axios.get('/api/showtimes/showtime-spiderman-8pm/seats');
        if (!isMounted) return;
        setSeats(seatsRes.data);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // SMART POLLING: Only update seats state if seat data actually changed to prevent DOM flickering!
  useEffect(() => {
    if (!showtime || viewMode !== 'BOOKING') return;

    let isMounted = true;
    const fetchSeats = async () => {
      try {
        const res = await axios.get(`/api/showtimes/${showtime.id}/seats`);
        if (!isMounted) return;

        const newSeats: Seat[] = res.data;
        const currentSeatsStr = JSON.stringify(seatsRef.current);
        const newSeatsStr = JSON.stringify(newSeats);

        // Only trigger re-render if seats data changed
        if (currentSeatsStr !== newSeatsStr) {
          setSeats(newSeats);
        }
      } catch (err) {
        console.error('Error fetching seat map:', err);
      }
    };

    const interval = setInterval(fetchSeats, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showtime, viewMode]);

  // Handle Booking Action on any movie card
  const handleBookMovieSeats = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    setViewMode('BOOKING');
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle Seat Hold Request
  const handleHoldSeat = useCallback(async (seatCode: string) => {
    if (!showtime || isHolding) return;

    setIsHolding(true);
    setToastMessage(null);

    try {
      const res = await axios.post(`/api/showtimes/${showtime.id}/hold`, {
        seat_code: seatCode,
        user_id: currentUserId
      });

      if (res.data.success) {
        setSelectedSeatCode(seatCode);
        setHeldBookingRef(res.data.booking_ref);
        setHoldExpiresAt(res.data.hold_expires_at);
        setToastMessage({ text: `Seat ${seatCode} held successfully! You have 60 seconds to pay.`, type: 'success' });

        const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
        setSeats(seatsRes.data);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || `Failed to hold seat ${seatCode}`;
      setToastMessage({ text: errMsg, type: 'error' });
      
      if (showtime) {
        const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
        setSeats(seatsRes.data);
      }
    } finally {
      setIsHolding(false);
    }
  }, [showtime, isHolding, currentUserId]);

  // Handle Manual Cancel Hold Request
  const handleCancelHold = useCallback(async () => {
    if (!heldBookingRef || !showtime) return;

    try {
      await axios.post('/api/bookings/cancel', { booking_ref: heldBookingRef });
      setToastMessage({ text: `Seat ${selectedSeatCode} hold cancelled. Returned to Available.`, type: 'success' });

      setSelectedSeatCode(null);
      setHeldBookingRef(null);
      setHoldExpiresAt(null);

      const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
      setSeats(seatsRes.data);
    } catch (err: any) {
      setToastMessage({ text: 'Failed to cancel seat hold', type: 'error' });
    }
  }, [heldBookingRef, showtime, selectedSeatCode]);

  // Handle Automatic Hold Expiration
  const handleHoldExpired = useCallback(async () => {
    if (!selectedSeatCode) return;
    const seatCode = selectedSeatCode;

    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setShowPaymentModal(false);

    setToastMessage({
      text: `⏰ Hold for seat ${seatCode} has expired! Seat released back to Available.`,
      type: 'error'
    });

    if (showtime) {
      const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
      setSeats(seatsRes.data);
    }
  }, [selectedSeatCode, showtime]);

  const featuredMovie = movies.find(m => m.id === 'movie-spiderman') || movies[0];

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans">
      <Navbar
        viewMode={viewMode}
        onNavigateHome={() => { setViewMode('HOME'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onNavigateCatalog={() => { setViewMode('CATALOG'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-semibold animate-fade-in ${
            toastMessage.type === 'error' 
              ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300' 
              : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-xs opacity-80 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* View Mode 1: Landing Home Page */}
        {viewMode === 'HOME' && (
          <HomePage
            movies={movies}
            onExploreMovies={() => { setViewMode('CATALOG'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onQuickBook={handleBookMovieSeats}
          />
        )}

        {/* View Mode 2: Catalog View */}
        {viewMode === 'CATALOG' && (
          <div className="space-y-8 animate-fade-in">
            {featuredMovie && (
              <HeroBanner featuredMovie={featuredMovie} onBookNow={handleBookMovieSeats} />
            )}

            <MovieGrid movies={movies} onBookSeats={handleBookMovieSeats} />
          </div>
        )}

        {/* View Mode 3: Seat Map Booking View */}
        {viewMode === 'BOOKING' && selectedMovie && showtime && (
          <div className="space-y-8 animate-fade-in">
            <MovieHeader
              movies={movies}
              selectedMovie={selectedMovie}
              showtime={showtime}
              onSelectMovie={setSelectedMovie}
            />

            <SeatMap
              seats={seats}
              currentUserId={currentUserId}
              selectedSeatCode={selectedSeatCode}
              heldBookingRef={heldBookingRef}
              holdExpiresAt={holdExpiresAt}
              onHoldSeat={handleHoldSeat}
              onCancelHold={handleCancelHold}
              onHoldExpired={handleHoldExpired}
              onPaySeat={() => setShowPaymentModal(true)}
              isHolding={isHolding}
              showtimeId={showtime.id}
            />
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && heldBookingRef && selectedSeatCode && (
        <PaymentModal
          bookingRef={heldBookingRef}
          seatCode={selectedSeatCode}
          amount={showtime?.price_amount || 450}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(ref) => {
            setShowPaymentModal(false);
            setConfirmedBookingRef(ref);
            setHeldBookingRef(null);
            setSelectedSeatCode(null);
            setHoldExpiresAt(null);
          }}
        />
      )}

      {/* Ticket Receipt Modal */}
      {confirmedBookingRef && (
        <TicketReceiptModal
          bookingRef={confirmedBookingRef}
          onClose={() => setConfirmedBookingRef(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
        <p>CinemaSeat — Zero to Production Phase 2 Hackathon Project</p>
      </footer>
    </div>
  );
}
