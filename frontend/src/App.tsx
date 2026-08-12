import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { HeroBanner } from './components/HeroBanner';
import { MovieGrid } from './components/MovieGrid';
import { MovieHeader } from './components/MovieHeader';
import { SeatMap } from './components/SeatMap';
import { SnackModal } from './components/SnackModal';
import { PaymentModal } from './components/PaymentModal';
import { TicketReceiptModal } from './components/TicketReceiptModal';
import { MyTicketsDrawer } from './components/MyTicketsDrawer';
import { TrailerModal } from './components/TrailerModal';
import { TelemetryWidget } from './components/TelemetryWidget';
import { BranchSelectorModal, CINEMA_BRANCHES, CinemaBranch } from './components/BranchSelectorModal';
import { Movie, Showtime, Seat, SnackItem, Booking } from './types';
import { MovieFallback } from './data/fallbackMovies';
import { AlertTriangle } from 'lucide-react';

const BOOKED_SEATS_STORAGE_KEY = 'cinemaseat_persistent_booked_codes';
const MY_TICKETS_STORAGE_KEY = 'cinemaseat_my_tickets';
const BRANCH_STORAGE_KEY = 'cinemaseat_selected_branch';
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

// Helper to load tickets from localStorage for Digital Wallet
const getStoredMyTickets = (): Booking[] => {
  try {
    const saved = localStorage.getItem(MY_TICKETS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Helper to save new ticket to Digital Wallet
const saveMyTicket = (newTicket: Booking) => {
  try {
    const current = getStoredMyTickets();
    const updated = [newTicket, ...current.filter(t => t.booking_ref !== newTicket.booking_ref)];
    localStorage.setItem(MY_TICKETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save ticket to wallet:', e);
  }
};

// Helper to get stored cinema branch
const getStoredBranch = (): CinemaBranch => {
  try {
    const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return CINEMA_BRANCHES[0];
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
    return initialSeats.map(s => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null } : s);
  });
  
  const seatsRef = useRef<Seat[]>(seats);
  seatsRef.current = seats;

  const [currentUserId] = useState<string>(() => `user_${Math.floor(Math.random() * 10000)}`);
  const [viewMode, setViewMode] = useState<'HOME' | 'CATALOG' | 'BOOKING'>('HOME');
  
  const [selectedSeatCode, setSelectedSeatCode] = useState<string | null>(null);
  const [lastConfirmedSeatCode, setLastConfirmedSeatCode] = useState<string>('');
  const [heldBookingRef, setHeldBookingRef] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [showSnackModal, setShowSnackModal] = useState<boolean>(false);
  const [selectedSnacks, setSelectedSnacks] = useState<SnackItem[]>([]);
  const [totalCheckoutAmount, setTotalCheckoutAmount] = useState<number>(450);

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<Booking[]>(() => getStoredMyTickets());
  const [showTicketDrawer, setShowTicketDrawer] = useState<boolean>(false);
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);

  const [selectedBranch, setSelectedBranch] = useState<CinemaBranch>(() => getStoredBranch());
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);

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
          const merged: Seat[] = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' as const } : s);
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
        const updated: Seat[] = prevSeats.map(s => {
          if (combinedBooked.includes(s.seat_code) && s.status !== 'BOOKED') {
            changed = true;
            return { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null };
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

  const handleSelectBranch = useCallback((branch: CinemaBranch) => {
    setSelectedBranch(branch);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branch));
    } catch (e) {}
    setToastMessage({ text: `📍 Cinema location updated to ${branch.name} (${branch.city})`, type: 'success' });
  }, []);

  // Handle Booking Action on any movie card
  const handleBookMovieSeats = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    setViewMode('BOOKING');
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setSelectedSnacks([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenTrailer = useCallback((movie: Movie) => {
    setTrailerMovie(movie);
  }, []);

  // Handle Seat Hold Request (Supports Multi-Seat Holding!)
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
          const seatsRes = await axios.get(`/api/showtimes/${showtime.id}/seats`);
          const storedBooked = getStoredBookedSeatCodes();
          const merged: Seat[] = seatsRes.data.map((s: Seat) => storedBooked.includes(s.seat_code) ? { ...s, status: 'BOOKED' as const } : s);
          
          setSeats(merged);

          const myHeld = merged.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
          const heldCodes = myHeld.map(s => s.seat_code).join(', ');
          
          setSelectedSeatCode(heldCodes);
          setHeldBookingRef(res.data.booking_ref);
          setHoldExpiresAt(res.data.hold_expires_at);

          setToastMessage({
            text: `Seat ${seatCode} held! (${myHeld.length} seat${myHeld.length > 1 ? 's' : ''} total: ${heldCodes}). You have 60s to pay.`,
            type: 'success'
          });
        }
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.response?.data?.error || `Failed to hold seat ${seatCode}`;
        setToastMessage({ text: errMsg, type: 'error' });
      } finally {
        setIsHolding(false);
      }
      return;
    }

    // Client-side Preview Fallback Mode for Multi-Seat Holding
    setTimeout(() => {
      const mockRef = heldBookingRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const expires = new Date(Date.now() + 60000).toISOString();

      setSeats(prev => {
        const updated: Seat[] = prev.map(s => s.seat_code === seatCode ? { ...s, status: 'HELD' as const, held_by_user_id: currentUserId, hold_expires_at: expires } : s);
        const myHeld = updated.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
        const heldCodes = myHeld.map(s => s.seat_code).join(', ');
        
        setSelectedSeatCode(heldCodes);
        setHeldBookingRef(mockRef);
        setHoldExpiresAt(expires);

        setToastMessage({
          text: `Seat ${seatCode} held successfully! (${myHeld.length} seat${myHeld.length > 1 ? 's' : ''} total: ${heldCodes}). You have 60 seconds to pay.`,
          type: 'success'
        });

        return updated;
      });

      setIsHolding(false);
    }, 400);
  }, [showtime, isHolding, currentUserId, isLiveBackend, heldBookingRef]);

  // Handle Single Seat Release Request
  const handleReleaseSingleSeat = useCallback((seatCode: string) => {
    setSeats(prev => {
      const updated: Seat[] = prev.map(s => (s.seat_code === seatCode && s.held_by_user_id === currentUserId) ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s);
      const remainingMyHeld = updated.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
      const remainingCodes = remainingMyHeld.map(s => s.seat_code).join(', ');

      if (remainingMyHeld.length === 0) {
        setSelectedSeatCode(null);
        setHeldBookingRef(null);
        setHoldExpiresAt(null);
        setToastMessage({ text: `Released Seat ${seatCode}. All seat holds cleared.`, type: 'success' });
      } else {
        setSelectedSeatCode(remainingCodes);
        setToastMessage({ text: `Removed Seat ${seatCode}. Remaining held seats (${remainingMyHeld.length}): ${remainingCodes}`, type: 'success' });
      }
      return updated;
    });
  }, [currentUserId]);

  // Handle Manual Cancel Hold Request (Releases ALL held seats for current user at once!)
  const handleCancelHold = useCallback(async () => {
    if (!showtime) return;

    if (isLiveBackend && heldBookingRef) {
      try {
        await axios.post('/api/bookings/cancel', { booking_ref: heldBookingRef });
      } catch (err: any) {
        console.log('Cancel hold endpoint called');
      }
    }

    // Atomic release of ALL seats held by currentUserId
    setSeats(prev => prev.map(s => s.held_by_user_id === currentUserId ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s));
    setToastMessage({ text: `All seat holds cancelled! All seats returned to Available.`, type: 'success' });
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setSelectedSnacks([]);
  }, [heldBookingRef, showtime, currentUserId, isLiveBackend]);

  // Handle Automatic Hold Expiration
  const handleHoldExpired = useCallback(async () => {
    setSeats(prev => prev.map(s => s.held_by_user_id === currentUserId ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s));
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setShowSnackModal(false);
    setShowPaymentModal(false);
    setSelectedSnacks([]);

    setToastMessage({
      text: `⏰ Seat hold time has expired! Seats released back to Available.`,
      type: 'error'
    });
  }, [currentUserId]);

  const featuredMovie = movies.find(m => m.id === 'movie-spiderman') || movies[0];

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans">
      <Navbar
        viewMode={viewMode}
        onNavigateHome={() => { setViewMode('HOME'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onNavigateCatalog={() => { setViewMode('CATALOG'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onOpenTickets={() => setShowTicketDrawer(true)}
        onOpenTelemetry={() => setShowTelemetryModal(true)}
        onOpenBranchModal={() => setShowBranchModal(true)}
        selectedBranch={selectedBranch}
        ticketCount={myTickets.length}
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
            onWatchTrailer={handleOpenTrailer}
          />
        )}

        {/* View Mode 2: Catalog View */}
        {viewMode === 'CATALOG' && (
          <div className="space-y-8 animate-fade-in">
            {featuredMovie && (
              <HeroBanner 
                featuredMovie={featuredMovie} 
                onBookNow={handleBookMovieSeats} 
                onWatchTrailer={handleOpenTrailer} 
              />
            )}

            <MovieGrid 
              movies={movies} 
              onBookSeats={handleBookMovieSeats} 
              onWatchTrailer={handleOpenTrailer} 
            />
          </div>
        )}

        {/* View Mode 3: Seat Map Booking View */}
        {viewMode === 'BOOKING' && selectedMovie && showtime && (
          <div className="space-y-8 animate-fade-in">
            <MovieHeader
              movies={movies}
              selectedMovie={selectedMovie}
              showtime={{
                ...showtime,
                theatre_name: selectedBranch.name,
                screen_name: `${selectedBranch.name} — Hall 1 (IMAX)`
              }}
              onSelectMovie={setSelectedMovie}
            />

            <SeatMap
              seats={seats}
              currentUserId={currentUserId}
              selectedSeatCode={selectedSeatCode}
              heldBookingRef={heldBookingRef}
              holdExpiresAt={holdExpiresAt}
              onHoldSeat={handleHoldSeat}
              onReleaseSingleSeat={handleReleaseSingleSeat}
              onCancelHold={handleCancelHold}
              onHoldExpired={handleHoldExpired}
              onPaySeat={(totalPrice, displayLabel) => {
                setTotalCheckoutAmount(totalPrice);
                setSelectedSeatCode(displayLabel);
                setShowSnackModal(true);
              }}
              isHolding={isHolding}
              showtimeId={showtime.id}
              unitTicketPrice={showtime.price_amount || 450}
            />
          </div>
        )}
      </main>

      {/* Cinema Branch & City Switcher Modal */}
      <BranchSelectorModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        selectedBranch={selectedBranch}
        onSelectBranch={handleSelectBranch}
      />

      {/* Digital Ticket Wallet Drawer */}
      <MyTicketsDrawer
        isOpen={showTicketDrawer}
        onClose={() => setShowTicketDrawer(false)}
        tickets={myTickets}
      />

      {/* Live System Telemetry Analytics Widget */}
      <TelemetryWidget
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
      />

      {/* HD Trailer Video Player Modal */}
      {trailerMovie && (
        <TrailerModal
          movie={trailerMovie}
          onClose={() => setTrailerMovie(null)}
          onBookNow={handleBookMovieSeats}
        />
      )}

      {/* Snack Builder Modal */}
      {showSnackModal && selectedSeatCode && (
        <SnackModal
          seatCode={selectedSeatCode}
          ticketPrice={totalCheckoutAmount}
          onClose={() => setShowSnackModal(false)}
          onConfirmSnacks={(chosenSnacks, finalAmount) => {
            setSelectedSnacks(chosenSnacks);
            setTotalCheckoutAmount(finalAmount);
            setShowSnackModal(false);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && heldBookingRef && selectedSeatCode && (
        <PaymentModal
          bookingRef={heldBookingRef}
          seatCode={selectedSeatCode}
          amount={totalCheckoutAmount}
          selectedSnacks={selectedSnacks}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(ref) => {
            const heldByMe = seats.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
            const heldCodes = heldByMe.map(s => s.seat_code);
            const targetCodes = heldCodes.length > 0 
              ? heldCodes 
              : (selectedSeatCode ? selectedSeatCode.split(', ').map(c => c.trim()) : []);

            const confirmedSeatStr = selectedSeatCode || targetCodes.join(', ');

            targetCodes.forEach(code => {
              saveBookedSeatCode(code);
              syncBookedSeatToCloud(code);
            });

            setSeats(prev => prev.map(s => (targetCodes.includes(s.seat_code) || (s.status === 'HELD' && s.held_by_user_id === currentUserId)) ? { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null } : s));

            // Save confirmed multi-ticket object to Digital Wallet
            const ticketObj: Booking = {
              booking_ref: ref,
              showtime_id: showtime?.id || 'showtime-spiderman-8pm',
              seat_code: confirmedSeatStr,
              amount: totalCheckoutAmount,
              status: 'CONFIRMED',
              movie_title: selectedMovie?.title || 'Spider-Man: Brand New Day',
              screen_name: `${selectedBranch.name} — Hall 1 (IMAX)`,
              created_at: new Date().toISOString(),
              snacks: selectedSnacks
            };
            saveMyTicket(ticketObj);
            setMyTickets(getStoredMyTickets());

            setLastConfirmedSeatCode(confirmedSeatStr);
            setShowPaymentModal(false);
            setConfirmedBookingRef(ref);
            setHeldBookingRef(null);
            setSelectedSeatCode(null);
            setHoldExpiresAt(null);

            setToastMessage({ text: `🎉 Seats ${confirmedSeatStr} confirmed & locked across all devices!`, type: 'success' });
          }}
        />
      )}

      {/* Ticket Receipt Modal */}
      {confirmedBookingRef && (
        <TicketReceiptModal
          bookingRef={confirmedBookingRef}
          seatCode={lastConfirmedSeatCode}
          selectedSnacks={selectedSnacks}
          totalAmountPaid={totalCheckoutAmount}
          onClose={() => {
            setConfirmedBookingRef(null);
            setSelectedSnacks([]);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
        <p>CinemaSeat — Zero to Production Phase 2 Hackathon Project</p>
      </footer>
    </div>
  );
}
