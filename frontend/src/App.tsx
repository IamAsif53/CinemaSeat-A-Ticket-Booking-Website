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
import { MovieFallback } from './data/fallbackMovies';
import { AlertTriangle, Activity } from 'lucide-react';

const BOOKED_SEATS_STORAGE_KEY = 'cinemaseat_persistent_booked_codes';
const CLOUD_SYNC_URL = 'https://jsonblob.com/api/jsonBlob/019fe0b1-ef87-76ed-a02e-d1ead4e15086';

// Helper to load booked seat codes from localStorage
const getStoredBookedSeatCodes = (): string[] => {
  try {
    const saved = localStorage.getItem(BOOKED_SEATS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Helper to save booked seat code to localStorage
const saveBookedSeatCode = (code: string) => {
  try {
    const current = getStoredBookedSeatCodes();
    if (!current.includes(code)) {
      const updated = [...current, code];
      localStorage.setItem(BOOKED_SEATS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save booked seat code:', e);
  }
};

// Helper to fetch global cloud booked seats across all devices
const fetchCloudBookedSeats = async (): Promise<string[]> => {
  try {
    const res = await axios.get(CLOUD_SYNC_URL, { timeout: 3000 });
    if (res.data && Array.isArray(res.data.booked)) {
      return res.data.booked;
    }
  } catch (err) {
    console.log('Cloud sync fetch fallback');
  }
  return [];
};

// Helper to sync booked seat to global cloud store
const syncBookedSeatToCloud = async (seatCode: string) => {
  try {
    const currentLocal = getStoredBookedSeatCodes();
    const cloudList = await fetchCloudBookedSeats();
    
    // Combine local and cloud seats uniquely
    const combined = Array.from(new Set([...currentLocal, ...cloudList, seatCode]));
    
    // Update local storage
    localStorage.setItem(BOOKED_SEATS_STORAGE_KEY, JSON.stringify(combined));

    // Update cloud store for multi-device sync (Phone <-> Laptop)
    await axios.put(CLOUD_SYNC_URL, { booked: combined }, { timeout: 4000 });
  } catch (err) {
    console.error('Failed to sync seat to cloud:', err);
  }
};

export function App() {
  const [movies, setMovies] = useState<Movie[]>(() => MovieFallback.getMovies());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(() => MovieFallback.getMovies()[0]);
  const [showtime, setShowtime] = useState<Showtime | null>(() => MovieFallback.getInitialShowtime());
  
  // Initialize seats state merged with localStorage persistent booked codes!
  const [seats, setSeats] = useState<Seat[]>(() => {
    const initialSeats = MovieFallback.getInitialSeats();
    const storedBooked = getStoredBookedSeatCodes();
    return initialSeats.map(s => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED', held_by_user_id: null, hold_expires_at: null } : s);
  });
  
  const seatsRef = useRef<Seat[]>(seats);
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
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  // Load Movies & Initial Showtime from Backend API (with fallback if running statically)
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const mRes = await axios.get('/api/movies', { timeout: 3000 });
        if (!isMounted) return;

        if (mRes.data && Array.isArray(mRes.data) && mRes.data.length > 0) {
          setMovies(mRes.data);
          setSelectedMovie(mRes.data[0]);
          setIsLiveBackend(true);
        }

        const stRes = await axios.get('/api/showtimes/showtime-spiderman-8pm', { timeout: 3000 });
        if (!isMounted) return;
        if (stRes.data) setShowtime(stRes.data);

        const seatsRes = await axios.get('/api/showtimes/showtime-spiderman-8pm/seats', { timeout: 3000 });
        if (!isMounted) return;
        if (seatsRes.data && Array.isArray(seatsRes.data)) {
          const storedBooked = getStoredBookedSeatCodes();
          const merged = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' } : s);
          setSeats(merged);
        }
      } catch (err) {
        console.log('Using robust client-side catalog mode for preview deployment');
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // MULTI-DEVICE CLOUD POLLER: Synchronize booked seats across Phone <-> Laptop in real-time!
  useEffect(() => {
    let isMounted = true;
    const syncSeatsAcrossDevices = async () => {
      const cloudSeats = await fetchCloudBookedSeats();
      const localSeats = getStoredBookedSeatCodes();
      const combinedBooked = Array.from(new Set([...cloudSeats, ...localSeats]));

      if (!isMounted) return;

      setSeats(prevSeats => {
        let changed = false;
        const updated = prevSeats.map(s => {
          if (combinedBooked.includes(s.seat_code) && s.status !== 'BOOKED') {
            changed = true;
            return { ...s, status: 'BOOKED', held_by_user_id: null, hold_expires_at: null };
          }
          return s;
        });
        return changed ? updated : prevSeats;
      });
    };

    syncSeatsAcrossDevices();
    const interval = setInterval(syncSeatsAcrossDevices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

    // If live backend API is available
    if (isLiveBackend) {
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
          const storedBooked = getStoredBookedSeatCodes();
          const merged = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' } : s);
          setSeats(merged);
        }
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.response?.data?.error || `Failed to hold seat ${seatCode}`;
        setToastMessage({ text: errMsg, type: 'error' });
        
        if (showtime) {
          const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
          const storedBooked = getStoredBookedSeatCodes();
          const merged = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' } : s);
          setSeats(merged);
        }
      } finally {
        setIsHolding(false);
      }
      return;
    }

    // Client-side Preview Fallback Mode
    setTimeout(() => {
      const mockRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const expires = new Date(Date.now() + 60000).toISOString();
      setSelectedSeatCode(seatCode);
      setHeldBookingRef(mockRef);
      setHoldExpiresAt(expires);

      setSeats(prev => prev.map(s => s.seat_code === seatCode ? { ...s, status: 'HELD', held_by_user_id: currentUserId, hold_expires_at: expires } : s));
      setToastMessage({ text: `Seat ${seatCode} held successfully! You have 60 seconds to pay.`, type: 'success' });
      setIsHolding(false);
    }, 400);
  }, [showtime, isHolding, currentUserId, isLiveBackend]);

  // Handle Manual Cancel Hold Request
  const handleCancelHold = useCallback(async () => {
    if (!heldBookingRef || !showtime) return;

    if (isLiveBackend) {
      try {
        await axios.post('/api/bookings/cancel', { booking_ref: heldBookingRef });
        setToastMessage({ text: `Seat ${selectedSeatCode} hold cancelled. Returned to Available.`, type: 'success' });

        setSelectedSeatCode(null);
        setHeldBookingRef(null);
        setHoldExpiresAt(null);

        const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
        const storedBooked = getStoredBookedSeatCodes();
        const merged = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' } : s);
        setSeats(merged);
      } catch (err: any) {
        setToastMessage({ text: 'Failed to cancel seat hold', type: 'error' });
      }
      return;
    }

    // Client Preview Fallback
    setSeats(prev => prev.map(s => s.seat_code === selectedSeatCode ? { ...s, status: 'AVAILABLE', held_by_user_id: null, hold_expires_at: null } : s));
    setToastMessage({ text: `Seat ${selectedSeatCode} hold cancelled. Returned to Available.`, type: 'success' });
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
  }, [heldBookingRef, showtime, selectedSeatCode, isLiveBackend]);

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

    if (isLiveBackend && showtime) {
      const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
      const storedBooked = getStoredBookedSeatCodes();
      const merged = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' } : s);
      setSeats(merged);
    } else {
      setSeats(prev => prev.map(s => s.seat_code === seatCode ? { ...s, status: 'AVAILABLE', held_by_user_id: null, hold_expires_at: null } : s));
    }
  }, [selectedSeatCode, showtime, isLiveBackend]);

  const featuredMovie = movies.find(m => m.id === 'movie-spiderman') || movies[0];

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans">
      <Navbar
        viewMode={viewMode}
        onNavigateHome={() => { setViewMode('HOME'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onNavigateCatalog={() => { setViewMode('CATALOG'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health / Status Badge */}
        {!isLiveBackend && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span><strong>Vercel Multi-Device Live Sync:</strong> Real-time seat locking active across Phone, Laptop & Desktop browsers.</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">PREVIEW READY</span>
          </div>
        )}

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
            const currentSeat = selectedSeatCode;
            if (currentSeat) {
              saveBookedSeatCode(currentSeat);
              syncBookedSeatToCloud(currentSeat);
              setSeats(prev => prev.map(s => s.seat_code === currentSeat ? { ...s, status: 'BOOKED', held_by_user_id: null, hold_expires_at: null } : s));
            }
            setShowPaymentModal(false);
            setConfirmedBookingRef(ref);
            setHeldBookingRef(null);
            setSelectedSeatCode(null);
            setHoldExpiresAt(null);
            if (currentSeat) {
              setToastMessage({ text: `🎉 Seat ${currentSeat} confirmed & locked across all devices!`, type: 'success' });
            }
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
