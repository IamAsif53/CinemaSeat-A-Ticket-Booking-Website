import { pool, redis, getHoldTTL } from '../db/index.js';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';

let isMockMode = false;
export function setMockMode(val: boolean) {
  isMockMode = val;
  if (val) {
    console.log('⚠️ Running in Local Memory Mock Mode (No Postgres/Redis required)');
    initMockStore();
  }
}

// In-Memory Data Store for local standalone preview
const mockMovies = [
  {
    id: 'movie-spiderman',
    title: 'Spider-Man: Brand New Day',
    description: 'Zayan has been waiting months for this. The midnight premiere seats just went live at 8 PM sharp.',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 150,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2026-08-08'
  },
  {
    id: 'movie-oppenheimer',
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    duration_mins: 180,
    genre: 'Biography / Drama',
    rating: 'R',
    release_date: '2026-08-07'
  }
];

const mockShowtimes = [
  {
    id: 'showtime-spiderman-8pm',
    movie_id: 'movie-spiderman',
    theatre_id: 'theatre-cuet',
    screen_name: 'Hall 1 (IMAX)',
    start_time: '2026-08-08T20:00:00Z',
    price_amount: 450,
    movie_title: 'Spider-Man: Brand New Day',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 150,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    theatre_name: 'CUET Grand Cinema',
    location: 'CUET Campus, Chittagong'
  }
];

const mockSeatsMap = new Map<string, any>();
const mockBookingsMap = new Map<string, any>();
const mockCallbacksMap = new Map<string, any>();

function initMockStore() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const r of rows) {
    for (let num = 1; num <= 15; num++) {
      const code = `${r}${num}`;
      mockSeatsMap.set(code, {
        seat_code: code,
        row_label: r,
        seat_number: num,
        status: 'AVAILABLE',
        held_by_user_id: null,
        hold_expires_at: null,
        booking_ref: null
      });
    }
  }
}

export interface SeatHoldResult {
  success: boolean;
  message: string;
  booking_ref?: string;
  hold_expires_at?: string;
  ttl_seconds?: number;
}

export async function holdSeat(
  showtimeId: string,
  seatCode: string,
  userId: string
): Promise<SeatHoldResult> {
  const ttl = getHoldTTL();
  const code = seatCode.toUpperCase();

  if (isMockMode) {
    const s = mockSeatsMap.get(code);
    if (!s) return { success: false, message: 'Invalid seat' };

    const now = Date.now();
    if (s.status === 'BOOKED' || (s.status === 'HELD' && new Date(s.hold_expires_at).getTime() > now)) {
      return { success: false, message: `Seat ${code} is already held or booked by another user.` };
    }

    const bookingRef = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(now + ttl * 1000).toISOString();

    s.status = 'HELD';
    s.held_by_user_id = userId;
    s.hold_expires_at = expiresAt;
    s.booking_ref = bookingRef;

    mockBookingsMap.set(bookingRef, {
      booking_ref: bookingRef,
      showtime_id: showtimeId,
      seat_code: code,
      user_id: userId,
      amount: 450,
      status: 'PENDING',
      movie_title: 'Spider-Man: Brand New Day',
      screen_name: 'Hall 1 (IMAX)'
    });

    return {
      success: true,
      message: `Seat ${code} successfully held for ${ttl} seconds.`,
      booking_ref: bookingRef,
      hold_expires_at: expiresAt,
      ttl_seconds: ttl
    };
  }

  // Postgres + Redis mode
  const redisKey = `seat_hold:${showtimeId}:${code}`;
  const bookingRef = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const holdPayload = JSON.stringify({ userId, bookingRef, showtimeId, seatCode: code });

  const acquired = await redis.set(redisKey, holdPayload, 'EX', ttl, 'NX');
  if (!acquired) {
    return { success: false, message: `Seat ${code} is already held or booked by another user.` };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seatRes = await client.query(
      `SELECT s.id FROM seats s JOIN showtimes st ON st.theatre_id = s.theatre_id WHERE st.id = $1 AND s.seat_code = $2`,
      [showtimeId, code]
    );

    if (seatRes.rows.length === 0) {
      await redis.del(redisKey);
      await client.query('ROLLBACK');
      return { success: false, message: 'Invalid showtime or seat code' };
    }

    const seatId = seatRes.rows[0].id;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const stSeatRes = await client.query(
      `SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2 FOR UPDATE`,
      [showtimeId, seatId]
    );

    if (stSeatRes.rows.length > 0 && stSeatRes.rows[0].status === 'BOOKED') {
      await redis.del(redisKey);
      await client.query('ROLLBACK');
      return { success: false, message: `Seat ${code} is already permanently booked.` };
    }

    await client.query(
      `UPDATE showtime_seats SET status = 'HELD', held_by_user_id = $1, hold_expires_at = $2, booking_ref = $3, updated_at = NOW() WHERE showtime_id = $4 AND seat_id = $5`,
      [userId, expiresAt, bookingRef, showtimeId, seatId]
    );

    await client.query(
      `INSERT INTO bookings (booking_ref, showtime_id, seat_id, user_id, amount, status) VALUES ($1, $2, $3, $4, 450, 'PENDING') ON CONFLICT DO NOTHING`,
      [bookingRef, showtimeId, seatId, userId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: `Seat ${code} successfully held for ${ttl} seconds.`,
      booking_ref: bookingRef,
      hold_expires_at: expiresAt,
      ttl_seconds: ttl
    };
  } catch (err) {
    await client.query('ROLLBACK');
    await redis.del(redisKey);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Explicit User Release / Cancel Hold Feature
 */
export async function releaseSeatHold(bookingRef: string) {
  if (isMockMode) {
    const bk = mockBookingsMap.get(bookingRef);
    if (bk) {
      bk.status = 'CANCELLED';
      const s = mockSeatsMap.get(bk.seat_code);
      if (s) {
        s.status = 'AVAILABLE';
        s.held_by_user_id = null;
        s.hold_expires_at = null;
        s.booking_ref = null;
      }
    }
    return { success: true, message: 'Seat hold cancelled and returned to AVAILABLE' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bkRes = await client.query(`SELECT * FROM bookings WHERE booking_ref = $1 FOR UPDATE`, [bookingRef]);
    if (bkRes.rows.length === 0) {
      await client.query('COMMIT');
      return { success: false, message: 'Booking not found' };
    }

    const booking = bkRes.rows[0];
    if (booking.status === 'CONFIRMED') {
      await client.query('COMMIT');
      return { success: false, message: 'Cannot cancel a confirmed booking' };
    }

    // Update booking status
    await client.query(`UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE booking_ref = $1`, [bookingRef]);

    // Update seat status back to AVAILABLE
    await client.query(
      `UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL, updated_at = NOW() WHERE showtime_id = $1 AND seat_id = $2`,
      [booking.showtime_id, booking.seat_id]
    );

    // Delete Redis lock if present
    const seatRes = await client.query(`SELECT seat_code FROM seats WHERE id = $1`, [booking.seat_id]);
    if (seatRes.rows.length > 0) {
      const redisKey = `seat_hold:${booking.showtime_id}:${seatRes.rows[0].seat_code}`;
      await redis.del(redisKey);
    }

    await client.query('COMMIT');
    return { success: true, message: 'Seat hold cancelled and returned to AVAILABLE' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getSeatMap(showtimeId: string) {
  await syncExpiredHolds(showtimeId);

  if (isMockMode) {
    return Array.from(mockSeatsMap.values());
  }

  const query = `
    SELECT s.seat_code, s.row_label, s.seat_number, COALESCE(sts.status, 'AVAILABLE') as status, sts.held_by_user_id, sts.hold_expires_at, sts.booking_ref
    FROM seats s
    JOIN showtimes st ON st.theatre_id = s.theatre_id
    LEFT JOIN showtime_seats sts ON sts.seat_id = s.id AND sts.showtime_id = st.id
    WHERE st.id = $1
    ORDER BY s.row_label ASC, s.seat_number ASC;
  `;
  const res = await pool.query(query, [showtimeId]);
  return res.rows;
}

export async function syncExpiredHolds(showtimeId?: string) {
  const now = Date.now();
  if (isMockMode) {
    for (const [, s] of mockSeatsMap.entries()) {
      if (s.status === 'HELD' && s.hold_expires_at && new Date(s.hold_expires_at).getTime() < now) {
        s.status = 'AVAILABLE';
        s.held_by_user_id = null;
        s.hold_expires_at = null;
        if (s.booking_ref && mockBookingsMap.has(s.booking_ref)) {
          mockBookingsMap.get(s.booking_ref).status = 'EXPIRED';
        }
        s.booking_ref = null;
      }
    }
    return;
  }

  try {
    const whereClause = showtimeId 
      ? `WHERE showtime_id = $1 AND status = 'HELD' AND hold_expires_at < NOW()`
      : `WHERE status = 'HELD' AND hold_expires_at < NOW()`;
    
    const params = showtimeId ? [showtimeId] : [];

    const res = await pool.query(
      `UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL ${whereClause} RETURNING booking_ref`,
      params
    );

    if (res.rows.length > 0) {
      const expiredRefs = res.rows.map(r => r.booking_ref).filter(Boolean);
      if (expiredRefs.length > 0) {
        await pool.query(`UPDATE bookings SET status = 'EXPIRED' WHERE booking_ref = ANY($1) AND status = 'PENDING'`, [expiredRefs]);
      }
    }
  } catch (err) {
    // Ignore error in fallback
  }
}

export async function initiatePayment(
  bookingRef: string,
  userPhone: string,
  headersMap: Record<string, string> = {}
) {
  if (isMockMode) {
    const bk = mockBookingsMap.get(bookingRef);
    if (!bk) throw new Error('Booking not found');
    bk.user_phone = userPhone;
    bk.status = 'CONFIRMED';
    const s = mockSeatsMap.get(bk.seat_code);
    if (s) s.status = 'BOOKED';

    return { payment_id: `pay_${Date.now()}`, status: 'CONFIRMED', booking_ref: bookingRef };
  }

  const bkRes = await pool.query(`SELECT * FROM bookings WHERE booking_ref = $1`, [bookingRef]);
  if (bkRes.rows.length === 0) throw new Error('Booking not found');
  const booking = bkRes.rows[0];

  const callbackUrl = process.env.CALLBACK_URL || `${BACKEND_URL}/api/payments/callback`;
  const forwardHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headersMap)) {
    if (k.toLowerCase().startsWith('x-mock-')) forwardHeaders[k] = v;
  }

  try {
    const payload = { amount: booking.amount, currency: booking.currency || 'BDT', booking_ref: bookingRef, callback_url: callbackUrl };
    const gatewayRes = await axios.post(`${GATEWAY_URL}/charge`, payload, { headers: { 'Content-Type': 'application/json', ...forwardHeaders }, timeout: 5000 });
    const { payment_id, status } = gatewayRes.data;

    await pool.query(`UPDATE bookings SET payment_id = $1, user_phone = $2, updated_at = NOW() WHERE booking_ref = $3`, [payment_id, userPhone, bookingRef]);
    return { payment_id, status: status || 'PENDING', booking_ref: bookingRef };
  } catch (err: any) {
    await pool.query(`UPDATE bookings SET user_phone = $1, updated_at = NOW() WHERE booking_ref = $2`, [userPhone, bookingRef]);
    return { payment_id: `pay_pending_${Date.now()}`, status: 'PENDING', booking_ref: bookingRef };
  }
}

export async function handleGatewayCallback(payload: any) {
  const { event_id, booking_ref, status } = payload;
  if (!booking_ref || !status) return { processed: false };

  if (isMockMode) {
    const bk = mockBookingsMap.get(booking_ref);
    if (bk) {
      bk.status = status === 'SUCCEEDED' ? 'CONFIRMED' : 'FAILED';
      const s = mockSeatsMap.get(bk.seat_code);
      if (s) s.status = status === 'SUCCEEDED' ? 'BOOKED' : 'AVAILABLE';
    }
    return { processed: true };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (event_id) {
      const existingCb = await client.query(`SELECT id FROM gateway_callbacks WHERE event_id = $1`, [event_id]);
      if (existingCb.rows.length > 0) {
        await client.query('COMMIT');
        return { processed: true, duplicate: true };
      }
      await client.query(`INSERT INTO gateway_callbacks (event_id, booking_ref, payment_id, status, amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [event_id, booking_ref, payload.payment_id, status, payload.amount]);
    }

    const bkRes = await client.query(`SELECT * FROM bookings WHERE booking_ref = $1 FOR UPDATE`, [booking_ref]);
    if (bkRes.rows.length === 0) {
      await client.query('COMMIT');
      return { processed: false };
    }

    const booking = bkRes.rows[0];
    if (status === 'SUCCEEDED') {
      await client.query(`UPDATE bookings SET status = 'CONFIRMED', payment_id = $1 WHERE booking_ref = $2`, [payload.payment_id, booking_ref]);
      await client.query(`UPDATE showtime_seats SET status = 'BOOKED' WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
    } else {
      await client.query(`UPDATE bookings SET status = 'FAILED' WHERE booking_ref = $1`, [booking_ref]);
      await client.query(`UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
    }

    await client.query('COMMIT');
    return { processed: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function getMockMovies() { return mockMovies; }
export function getMockShowtime(id: string) { return mockShowtimes.find(s => s.id === id) || mockShowtimes[0]; }
export function getMockBooking(ref: string) { return mockBookingsMap.get(ref); }
