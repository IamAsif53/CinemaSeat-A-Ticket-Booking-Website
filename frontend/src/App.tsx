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

interface BranchHoldState {
  seatCodes: string[];
  bookingRef: string;
  expiresAt: string;
}

interface CloudHold {
  key: string;
  seat_code: string;
  branch_id: string;
  showtime_id: string;
  user_id: string;
  expires_at: string;
}

interface CloudState {
  booked: string[];
  holds: CloudHold[];
}

// Helper to construct location & showtime scoped seat key
const getScopedSeatKey = (branchId: string, showtimeId: string, seatCode: string) => {
  return `${branchId || 'theatre-cuet'}:${showtimeId || 'showtime-spiderman-8pm'}:${seatCode}`;
};

// Helper to load booked seat keys from localStorage
const getStoredBookedSeatCodes = (): string[] => {
  try {
    const saved = localStorage.getItem(BOOKED_SEATS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Helper to save booked seat key to localStorage
const saveBookedSeatCode = (codeKey: string) => {
  try {
    const current = getStoredBookedSeatCodes();
    if (!current.includes(codeKey)) {
      const updated = [...current, codeKey];
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

// Helper to extract all booked seat keys from Digital Wallet tickets
const getBookedSeatKeysFromMyTickets = (): string[] => {
  const tickets = getStoredMyTickets();
  const keys: string[] = [];

  tickets.forEach(ticket => {
    const stId = ticket.showtime_id || 'showtime-spiderman-8pm';
    let branchId = 'theatre-cuet';
    if (ticket.screen_name) {
      const lowerScreen = ticket.screen_name.toLowerCase();
      if (lowerScreen.includes('gec')) branchId = 'theatre-gec';
      else if (lowerScreen.includes('bashundhara') || lowerScreen.includes('star')) branchId = 'theatre-star';
      else if (lowerScreen.includes('jamuna') || lowerScreen.includes('blockbuster')) branchId = 'theatre-blockbuster';
      else if (lowerScreen.includes('sylhet') || lowerScreen.includes('grand sylhet')) branchId = 'theatre-sylhet';
    }

    if (ticket.seat_code) {
      const seatCodes = ticket.seat_code.split(',').map(s => s.trim());
      seatCodes.forEach(code => {
        if (code) {
          keys.push(getScopedSeatKey(branchId, stId, code));
          keys.push(code); // Fallback raw seat code for local branch matching
        }
      });
    }
  });

  return keys;
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

// Fetch complete Cloud State (Booked seats + Active Holds across all devices)
const fetchCloudState = async (): Promise<CloudState> => {
  try {
    const res = await axios.get(CLOUD_SYNC_URL, { timeout: 3000 });
    if (res.data) {
      const booked = Array.isArray(res.data.booked) ? res.data.booked : [];
      const rawHolds = Array.isArray(res.data.holds) ? res.data.holds : [];
      const now = new Date().toISOString();
      const validHolds = rawHolds.filter((h: CloudHold) => h.expires_at > now);
      return { booked, holds: validHolds };
    }
  } catch (err) {
    console.log('Cloud sync fetch fallback');
  }
  return { booked: [], holds: [] };
};

// Add seat holds to Cloud State for multi-device locking
const addCloudHold = async (holdItems: CloudHold[]) => {
  try {
    const cloud = await fetchCloudState();
    const existingKeys = holdItems.map(h => h.key);
    const updatedHolds = [...cloud.holds.filter(h => !existingKeys.includes(h.key)), ...holdItems];
    
    await axios.put(CLOUD_SYNC_URL, {
      booked: cloud.booked,
      holds: updatedHolds
    }, { timeout: 4000 });
  } catch (e) {
    console.error('Failed to add cloud hold:', e);
  }
};

// Remove seat holds from Cloud State
const removeCloudHold = async (user_id: string, seatKeysToRemove?: string[]) => {
  try {
    const cloud = await fetchCloudState();
    let updatedHolds = cloud.holds;
    if (seatKeysToRemove && seatKeysToRemove.length > 0) {
      updatedHolds = cloud.holds.filter(h => !seatKeysToRemove.includes(h.key));
    } else {
      updatedHolds = cloud.holds.filter(h => h.user_id !== user_id);
    }
    await axios.put(CLOUD_SYNC_URL, {
      booked: cloud.booked,
      holds: updatedHolds
    }, { timeout: 4000 });
  } catch (e) {
    console.error('Failed to remove cloud hold:', e);
  }
};

// Convert seat holds to confirmed booked in Cloud State
const confirmCloudBookings = async (confirmedKeys: string[], user_id: string) => {
  try {
    const cloud = await fetchCloudState();
    const localBooked = getStoredBookedSeatCodes();
    const walletKeys = getBookedSeatKeysFromMyTickets();
    const combinedBooked = Array.from(new Set([...cloud.booked, ...localBooked, ...walletKeys, ...confirmedKeys]));
    const updatedHolds = cloud.holds.filter(h => !confirmedKeys.includes(h.key) && h.user_id !== user_id);

    localStorage.setItem(BOOKED_SEATS_STORAGE_KEY, JSON.stringify(combinedBooked));
    await axios.put(CLOUD_SYNC_URL, {
      booked: combinedBooked,
      holds: updatedHolds
    }, { timeout: 4000 });
  } catch (e) {
    console.error('Failed to confirm cloud bookings:', e);
  }
};

export function App() {
  const [movies, setMovies] = useState<Movie[]>(() => MovieFallback.getMovies());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(() => MovieFallback.getMovies()[0]);
  const [showtime, setShowtime] = useState<Showtime | null>(() => MovieFallback.getInitialShowtime());
  const [selectedBranch, setSelectedBranch] = useState<CinemaBranch>(() => getStoredBranch());
  
  // Persistent Branch Hold Engine State (Keyed by Branch ID)
  const [branchHoldsStore, setBranchHoldsStore] = useState<Record<string, BranchHoldState>>({});

  // Initialize seats state merged with location-scoped booked keys and wallet tickets!
  const [seats, setSeats] = useState<Seat[]>(() => {
    const initialSeats = MovieFallback.getInitialSeats();
    const storedBooked = getStoredBookedSeatCodes();
    const walletKeys = getBookedSeatKeysFromMyTickets();
    const combinedBooked = Array.from(new Set([...storedBooked, ...walletKeys]));
    const curBranch = getStoredBranch();
    const stId = 'showtime-spiderman-8pm';

    return initialSeats.map(s => {
      const key = getScopedSeatKey(curBranch.id, stId, s.seat_code);
      const isBooked = combinedBooked.includes(key) || (curBranch.id === 'theatre-cuet' && combinedBooked.includes(s.seat_code));
      return isBooked
        ? { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null }
        : s;
    });
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
          const walletKeys = getBookedSeatKeysFromMyTickets();
          const combinedBooked = Array.from(new Set([...storedBooked, ...walletKeys]));
          const stId = showtime?.id || 'showtime-spiderman-8pm';
          const activeBranchHold = branchHoldsStore[selectedBranch.id];
          const activeHeldCodes = activeBranchHold ? activeBranchHold.seatCodes : [];

          const merged: Seat[] = seatsRes.data.map((s: Seat) => {
            const key = getScopedSeatKey(selectedBranch.id, stId, s.seat_code);
            const isBooked = combinedBooked.includes(key) || (selectedBranch.id === 'theatre-cuet' && combinedBooked.includes(s.seat_code));
            if (isBooked) {
              return { ...s, status: 'BOOKED' as const };
            }
            if (activeHeldCodes.includes(s.seat_code)) {
              return { ...s, status: 'HELD' as const, held_by_user_id: currentUserId, hold_expires_at: activeBranchHold.expiresAt };
            }
            return s;
          });
          setSeats(merged);
        }
      } catch (err) {
        console.log('Using robust client-side catalog mode for preview deployment');
      }
    };
    init();
    return () => { isMounted = false; };
  }, [selectedBranch.id, showtime?.id, branchHoldsStore, currentUserId]);

  // MULTI-DEVICE CLOUD REAL-TIME CONCURRENCY POLLER: Synchronizes holds & wallet bookings across Phone <-> Laptop!
  useEffect(() => {
    let isMounted = true;
    const syncSeatsAcrossDevices = async () => {
      const cloud = await fetchCloudState();
      const localSeats = getStoredBookedSeatCodes();
      const walletKeys = getBookedSeatKeysFromMyTickets();
      const combinedBooked = Array.from(new Set([...cloud.booked, ...localSeats, ...walletKeys]));

      if (!isMounted) return;

      const stId = showtime?.id || 'showtime-spiderman-8pm';

      setSeats(prevSeats => {
        let changed = false;
        const updated: Seat[] = prevSeats.map(s => {
          const key = getScopedSeatKey(selectedBranch.id, stId, s.seat_code);
          const isBooked = combinedBooked.includes(key) || (selectedBranch.id === 'theatre-cuet' && combinedBooked.includes(s.seat_code));

          // 1. Check if booked globally or in wallet
          if (isBooked) {
            if (s.status !== 'BOOKED') {
              changed = true;
              return { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null };
            }
            return s;
          }

          // 2. Check if held globally in cloud (Phone or Laptop)
          const activeCloudHold = cloud.holds.find(h => h.key === key);
          if (activeCloudHold) {
            const isMyHold = activeCloudHold.user_id === currentUserId;
            const targetUserId = isMyHold ? currentUserId : activeCloudHold.user_id;

            if (s.status !== 'HELD' || s.held_by_user_id !== targetUserId) {
              changed = true;
              return {
                ...s,
                status: 'HELD' as const,
                held_by_user_id: targetUserId,
                hold_expires_at: activeCloudHold.expires_at
              };
            }
            return s;
          }

          // 3. If seat was held by someone else, but hold expired or released in cloud
          if (s.status === 'HELD' && s.held_by_user_id !== currentUserId) {
            changed = true;
            return { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null };
          }

          return s;
        });

        return changed ? updated : prevSeats;
      });
    };

    syncSeatsAcrossDevices();
    const interval = setInterval(syncSeatsAcrossDevices, 1500); // 1.5 second high-frequency concurrency polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBranch.id, showtime?.id, currentUserId]);

  // Switch Cinema Branch / Location — Preserves Held Seats Per Location Seamlessly!
  const handleSelectBranch = useCallback((branch: CinemaBranch) => {
    setSelectedBranch(branch);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branch));
    } catch (e) {}

    const storedBooked = getStoredBookedSeatCodes();
    const walletKeys = getBookedSeatKeysFromMyTickets();
    const combinedBooked = Array.from(new Set([...storedBooked, ...walletKeys]));
    const initialSeats = MovieFallback.getInitialSeats();
    const stId = showtime?.id || 'showtime-spiderman-8pm';

    // Restore any active held seats for this specific branch
    const branchHold = branchHoldsStore[branch.id];
    const branchHeldCodes = branchHold ? branchHold.seatCodes : [];

    if (branchHold && branchHeldCodes.length > 0) {
      setSelectedSeatCode(branchHeldCodes.join(', '));
      setHeldBookingRef(branchHold.bookingRef);
      setHoldExpiresAt(branchHold.expiresAt);
    } else {
      setSelectedSeatCode(null);
      setHeldBookingRef(null);
      setHoldExpiresAt(null);
    }

    setSeats(prev => initialSeats.map(s => {
      const scopedKey = getScopedSeatKey(branch.id, stId, s.seat_code);
      const isBooked = combinedBooked.includes(scopedKey) || (branch.id === 'theatre-cuet' && combinedBooked.includes(s.seat_code));
      const isHeldInThisBranch = branchHeldCodes.includes(s.seat_code);

      if (isBooked) return { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null };
      if (isHeldInThisBranch) {
        return { ...s, status: 'HELD' as const, held_by_user_id: currentUserId, hold_expires_at: branchHold?.expiresAt || null };
      }
      return { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null };
    }));

    if (branchHeldCodes.length > 0) {
      setToastMessage({ text: `📍 Location switched to ${branch.name}. Restored your ${branchHeldCodes.length} held seat(s): ${branchHeldCodes.join(', ')}!`, type: 'success' });
    } else {
      setToastMessage({ text: `📍 Location switched to ${branch.name} (${branch.city}). Fresh seat map loaded!`, type: 'success' });
    }
  }, [showtime, currentUserId, branchHoldsStore]);

  // Handle Booking Action on any movie card
  const handleBookMovieSeats = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    setViewMode('BOOKING');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenTrailer = useCallback((movie: Movie) => {
    setTrailerMovie(movie);
  }, []);

  // Handle Seat Hold Request (Strict Cross-Device Global Lock Enforcement!)
  const handleHoldSeat = useCallback(async (seatCode: string) => {
    if (!showtime || isHolding) return;

    setIsHolding(true);
    setToastMessage(null);

    const stId = showtime.id || 'showtime-spiderman-8pm';
    const targetScopedKey = getScopedSeatKey(selectedBranch.id, stId, seatCode);

    // 1. Double check global cloud state to prevent race conditions!
    const latestCloud = await fetchCloudState();
    const walletKeys = getBookedSeatKeysFromMyTickets();
    const existingOtherHold = latestCloud.holds.find(h => h.key === targetScopedKey && h.user_id !== currentUserId);
    const isCloudBooked = latestCloud.booked.includes(targetScopedKey) || walletKeys.includes(targetScopedKey) || walletKeys.includes(seatCode);

    if (isCloudBooked || existingOtherHold) {
      setToastMessage({
        text: `⚠️ Seat ${seatCode} is already BOOKED or HELD by another user on another device! Please select an available seat.`,
        type: 'error'
      });
      setIsHolding(false);
      return;
    }

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
          const merged: Seat[] = seatsRes.data.map((s: Seat) => {
            const key = getScopedSeatKey(selectedBranch.id, stId, s.seat_code);
            return (storedBooked.includes(key) || walletKeys.includes(s.seat_code)) ? { ...s, status: 'BOOKED' as const } : s;
          });
          
          setSeats(merged);

          const myHeld = merged.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
          const heldCodes = myHeld.map(s => s.seat_code);
          const heldCodesStr = heldCodes.join(', ');

          // Broadcast Hold to Global Cloud Store so Laptop updates immediately!
          const newCloudHold: CloudHold = {
            key: targetScopedKey,
            seat_code: seatCode,
            branch_id: selectedBranch.id,
            showtime_id: stId,
            user_id: currentUserId,
            expires_at: res.data.hold_expires_at
          };
          await addCloudHold([newCloudHold]);

          // Update Multi-Branch Hold Engine Store
          setBranchHoldsStore(prev => ({
            ...prev,
            [selectedBranch.id]: {
              seatCodes: heldCodes,
              bookingRef: res.data.booking_ref,
              expiresAt: res.data.hold_expires_at
            }
          }));

          setSelectedSeatCode(heldCodesStr);
          setHeldBookingRef(res.data.booking_ref);
          setHoldExpiresAt(res.data.hold_expires_at);

          setToastMessage({
            text: `🔒 Seat ${seatCode} locked globally across all devices for ${selectedBranch.name}!`,
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

    // Client-side Preview Fallback Mode for Multi-Device Global Seat Holding
    const mockRef = heldBookingRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
    const expires = new Date(Date.now() + 60000).toISOString();

    const newCloudHold: CloudHold = {
      key: targetScopedKey,
      seat_code: seatCode,
      branch_id: selectedBranch.id,
      showtime_id: stId,
      user_id: currentUserId,
      expires_at: expires
    };

    // Push hold to Global Cloud Store immediately!
    await addCloudHold([newCloudHold]);

    setSeats(prev => {
      const updated: Seat[] = prev.map(s => s.seat_code === seatCode ? { ...s, status: 'HELD' as const, held_by_user_id: currentUserId, hold_expires_at: expires } : s);
      const myHeld = updated.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
      const heldCodes = myHeld.map(s => s.seat_code);
      const heldCodesStr = heldCodes.join(', ');

      setBranchHoldsStore(bPrev => ({
        ...bPrev,
        [selectedBranch.id]: {
          seatCodes: heldCodes,
          bookingRef: mockRef,
          expiresAt: expires
        }
      }));

      setSelectedSeatCode(heldCodesStr);
      setHeldBookingRef(mockRef);
      setHoldExpiresAt(expires);

      setToastMessage({
        text: `🔒 Seat ${seatCode} locked globally across all devices for ${selectedBranch.name}!`,
        type: 'success'
      });

      return updated;
    });

    setIsHolding(false);
  }, [showtime, isHolding, currentUserId, isLiveBackend, heldBookingRef, selectedBranch.id, selectedBranch.name]);

  // Handle Single Seat Release Request
  const handleReleaseSingleSeat = useCallback(async (seatCode: string) => {
    const stId = showtime?.id || 'showtime-spiderman-8pm';
    const targetScopedKey = getScopedSeatKey(selectedBranch.id, stId, seatCode);

    // Release from Global Cloud Store
    await removeCloudHold(currentUserId, [targetScopedKey]);

    setSeats(prev => {
      const updated: Seat[] = prev.map(s => (s.seat_code === seatCode && s.held_by_user_id === currentUserId) ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s);
      const remainingMyHeld = updated.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
      const remainingCodes = remainingMyHeld.map(s => s.seat_code);
      const remainingCodesStr = remainingCodes.join(', ');

      setBranchHoldsStore(bPrev => {
        if (remainingCodes.length === 0) {
          const copy = { ...bPrev };
          delete copy[selectedBranch.id];
          return copy;
        }
        return {
          ...bPrev,
          [selectedBranch.id]: {
            ...bPrev[selectedBranch.id],
            seatCodes: remainingCodes
          }
        };
      });

      if (remainingCodes.length === 0) {
        setSelectedSeatCode(null);
        setHeldBookingRef(null);
        setHoldExpiresAt(null);
        setToastMessage({ text: `Released Seat ${seatCode}. All seat holds cleared for ${selectedBranch.name}.`, type: 'success' });
      } else {
        setSelectedSeatCode(remainingCodesStr);
        setToastMessage({ text: `Removed Seat ${seatCode}. Remaining held seats (${remainingCodes.length}): ${remainingCodesStr}`, type: 'success' });
      }
      return updated;
    });
  }, [currentUserId, selectedBranch.id, selectedBranch.name, showtime?.id]);

  // Handle Manual Cancel Hold Request (Releases ALL held seats globally for current branch)
  const handleCancelHold = useCallback(async () => {
    if (!showtime) return;

    if (isLiveBackend && heldBookingRef) {
      try {
        await axios.post('/api/bookings/cancel', { booking_ref: heldBookingRef });
      } catch (err: any) {
        console.log('Cancel hold endpoint called');
      }
    }

    // Release all holds for current user from Global Cloud Store
    await removeCloudHold(currentUserId);

    setBranchHoldsStore(prev => {
      const copy = { ...prev };
      delete copy[selectedBranch.id];
      return copy;
    });

    setSeats(prev => prev.map(s => s.held_by_user_id === currentUserId ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s));
    setToastMessage({ text: `All seat holds cancelled for ${selectedBranch.name}! Seats released globally.`, type: 'success' });
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setSelectedSnacks([]);
  }, [heldBookingRef, showtime, currentUserId, isLiveBackend, selectedBranch.id, selectedBranch.name]);

  // Handle Automatic Hold Expiration
  const handleHoldExpired = useCallback(async () => {
    await removeCloudHold(currentUserId);

    setBranchHoldsStore(prev => {
      const copy = { ...prev };
      delete copy[selectedBranch.id];
      return copy;
    });

    setSeats(prev => prev.map(s => s.held_by_user_id === currentUserId ? { ...s, status: 'AVAILABLE' as const, held_by_user_id: null, hold_expires_at: null } : s));
    setSelectedSeatCode(null);
    setHeldBookingRef(null);
    setHoldExpiresAt(null);
    setShowSnackModal(false);
    setShowPaymentModal(false);
    setSelectedSnacks([]);

    setToastMessage({
      text: `⏰ Seat hold time has expired for ${selectedBranch.name}! Seats released back to Available.`,
      type: 'error'
    });
  }, [currentUserId, selectedBranch.id, selectedBranch.name]);

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
        movies={movies}
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
          onSuccess={async (ref) => {
            const heldByMe = seats.filter(s => s.status === 'HELD' && s.held_by_user_id === currentUserId);
            const heldCodes = heldByMe.map(s => s.seat_code);
            const targetCodes = heldCodes.length > 0 
              ? heldCodes 
              : (selectedSeatCode ? selectedSeatCode.split(', ').map(c => c.trim()) : []);

            const confirmedSeatStr = selectedSeatCode || targetCodes.join(', ');
            const stId = showtime?.id || 'showtime-spiderman-8pm';

            const targetScopedKeys = targetCodes.map(code => getScopedSeatKey(selectedBranch.id, stId, code));

            // Confirm Cloud Bookings globally across all devices!
            await confirmCloudBookings(targetScopedKeys, currentUserId);

            // Clear branch hold store for this branch
            setBranchHoldsStore(prev => {
              const copy = { ...prev };
              delete copy[selectedBranch.id];
              return copy;
            });

            setSeats(prev => prev.map(s => (targetCodes.includes(s.seat_code) || (s.status === 'HELD' && s.held_by_user_id === currentUserId)) ? { ...s, status: 'BOOKED' as const, held_by_user_id: null, hold_expires_at: null } : s));

            // Save confirmed multi-ticket object with exact movie poster URL to Digital Wallet
            const ticketObj: Booking = {
              booking_ref: ref,
              showtime_id: stId,
              seat_code: confirmedSeatStr,
              amount: totalCheckoutAmount,
              status: 'CONFIRMED',
              movie_title: selectedMovie?.title || 'Spider-Man: Brand New Day',
              poster_url: selectedMovie?.poster_url || 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=300&q=80',
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

            setToastMessage({ text: `🎉 Seats ${confirmedSeatStr} confirmed & locked for ${selectedBranch.name}!`, type: 'success' });
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
