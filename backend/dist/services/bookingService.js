"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdSeat = holdSeat;
exports.getSeatMap = getSeatMap;
exports.syncExpiredHolds = syncExpiredHolds;
exports.initiatePayment = initiatePayment;
exports.handleGatewayCallback = handleGatewayCallback;
const index_js_1 = require("../db/index.js");
const axios_1 = __importDefault(require("axios"));
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
/**
 * High Concurrency Atomic Seat Hold using Redis + PostgreSQL
 */
async function holdSeat(showtimeId, seatCode, userId) {
    const ttl = (0, index_js_1.getHoldTTL)();
    const redisKey = `seat_hold:${showtimeId}:${seatCode.toUpperCase()}`;
    const bookingRef = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const holdPayload = JSON.stringify({ userId, bookingRef, showtimeId, seatCode });
    // 1. Atomic Redis Lock using NX (Set if Not Exists) + EX (Expiration in seconds)
    const acquired = await index_js_1.redis.set(redisKey, holdPayload, 'EX', ttl, 'NX');
    if (!acquired) {
        return {
            success: false,
            message: `Seat ${seatCode} is already held or booked by another user.`
        };
    }
    // 2. Resolve seat_id from database
    const client = await index_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        // Find seat_id for seatCode
        const seatRes = await client.query(`SELECT s.id FROM seats s 
       JOIN showtimes st ON st.theatre_id = s.theatre_id 
       WHERE st.id = $1 AND s.seat_code = $2`, [showtimeId, seatCode.toUpperCase()]);
        if (seatRes.rows.length === 0) {
            // Rollback Redis lock if seat invalid
            await index_js_1.redis.del(redisKey);
            await client.query('ROLLBACK');
            return { success: false, message: 'Invalid showtime or seat code' };
        }
        const seatId = seatRes.rows[0].id;
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
        // Verify seat is not already permanently BOOKED in database
        const stSeatRes = await client.query(`SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2 FOR UPDATE`, [showtimeId, seatId]);
        if (stSeatRes.rows.length > 0 && stSeatRes.rows[0].status === 'BOOKED') {
            await index_js_1.redis.del(redisKey);
            await client.query('ROLLBACK');
            return { success: false, message: `Seat ${seatCode} is already permanently booked.` };
        }
        // Update showtime_seats status to HELD
        await client.query(`UPDATE showtime_seats 
       SET status = 'HELD', held_by_user_id = $1, hold_expires_at = $2, booking_ref = $3, updated_at = NOW()
       WHERE showtime_id = $4 AND seat_id = $5`, [userId, expiresAt, bookingRef, showtimeId, seatId]);
        // Create pending booking record
        const priceRes = await client.query(`SELECT price_amount FROM showtimes WHERE id = $1`, [showtimeId]);
        const amount = priceRes.rows[0]?.price_amount || 450;
        await client.query(`INSERT INTO bookings (booking_ref, showtime_id, seat_id, user_id, amount, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       ON CONFLICT (booking_ref) DO NOTHING`, [bookingRef, showtimeId, seatId, userId, amount]);
        await client.query('COMMIT');
        return {
            success: true,
            message: `Seat ${seatCode} successfully held for ${ttl} seconds.`,
            booking_ref: bookingRef,
            hold_expires_at: expiresAt,
            ttl_seconds: ttl
        };
    }
    catch (err) {
        await client.query('ROLLBACK');
        await index_js_1.redis.del(redisKey);
        console.error('[HoldSeat] DB error:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Fetch seat map for a showtime, releasing expired holds
 */
async function getSeatMap(showtimeId) {
    // Sync expired holds first
    await syncExpiredHolds(showtimeId);
    const query = `
    SELECT 
      s.seat_code,
      s.row_label,
      s.seat_number,
      COALESCE(sts.status, 'AVAILABLE') as status,
      sts.held_by_user_id,
      sts.hold_expires_at,
      sts.booking_ref
    FROM seats s
    JOIN showtimes st ON st.theatre_id = s.theatre_id
    LEFT JOIN showtime_seats sts ON sts.seat_id = s.id AND sts.showtime_id = st.id
    WHERE st.id = $1
    ORDER BY s.row_label ASC, s.seat_number ASC;
  `;
    const res = await index_js_1.pool.query(query, [showtimeId]);
    return res.rows;
}
/**
 * Clean up expired holds in database if Redis lock expired
 */
async function syncExpiredHolds(showtimeId) {
    try {
        const whereClause = showtimeId
            ? `WHERE showtime_id = $1 AND status = 'HELD' AND hold_expires_at < NOW()`
            : `WHERE status = 'HELD' AND hold_expires_at < NOW()`;
        const params = showtimeId ? [showtimeId] : [];
        const res = await index_js_1.pool.query(`UPDATE showtime_seats 
       SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL
       ${whereClause}
       RETURNING booking_ref`, params);
        if (res.rows.length > 0) {
            const expiredRefs = res.rows.map(r => r.booking_ref).filter(Boolean);
            if (expiredRefs.length > 0) {
                await index_js_1.pool.query(`UPDATE bookings SET status = 'EXPIRED' WHERE booking_ref = ANY($1) AND status = 'PENDING'`, [expiredRefs]);
            }
        }
    }
    catch (err) {
        console.error('[SyncExpiredHolds] Error:', err);
    }
}
/**
 * Initiate Payment via Gateway
 */
async function initiatePayment(bookingRef, userPhone, headersMap = {}) {
    const bkRes = await index_js_1.pool.query(`SELECT * FROM bookings WHERE booking_ref = $1`, [bookingRef]);
    if (bkRes.rows.length === 0) {
        throw new Error('Booking not found');
    }
    const booking = bkRes.rows[0];
    const callbackUrl = process.env.CALLBACK_URL || `${BACKEND_URL}/api/payments/callback`;
    // Forward mock force headers if present
    const forwardHeaders = {};
    for (const [k, v] of Object.entries(headersMap)) {
        if (k.toLowerCase().startsWith('x-mock-')) {
            forwardHeaders[k] = v;
        }
    }
    try {
        const payload = {
            amount: booking.amount,
            currency: booking.currency || 'BDT',
            booking_ref: bookingRef,
            callback_url: callbackUrl
        };
        const gatewayRes = await axios_1.default.post(`${GATEWAY_URL}/charge`, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...forwardHeaders
            },
            timeout: 5000
        });
        const { payment_id, status } = gatewayRes.data;
        // Update booking record with payment_id
        await index_js_1.pool.query(`UPDATE bookings SET payment_id = $1, user_phone = $2, updated_at = NOW() WHERE booking_ref = $3`, [payment_id, userPhone, bookingRef]);
        return {
            payment_id,
            status: status || 'PENDING',
            booking_ref: bookingRef
        };
    }
    catch (err) {
        console.error('[InitiatePayment] Gateway call failed:', err?.message || err);
        // Even if gateway fails with 500 or timeout (Documented behavior), record attempt
        await index_js_1.pool.query(`UPDATE bookings SET user_phone = $1, updated_at = NOW() WHERE booking_ref = $2`, [userPhone, bookingRef]);
        return {
            payment_id: `pay_pending_${Date.now()}`,
            status: 'PENDING',
            booking_ref: bookingRef,
            warning: 'Gateway payment initiated asynchronously.'
        };
    }
}
/**
 * Handle Gateway Webhook Callback (Idempotent)
 */
async function handleGatewayCallback(payload) {
    const { event_id, payment_id, booking_ref, status, amount } = payload;
    console.log(`[Webhook Callback] Received event_id=${event_id}, booking_ref=${booking_ref}, status=${status}`);
    if (!booking_ref || !status) {
        return { processed: false, reason: 'Missing booking_ref or status' };
    }
    const client = await index_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Idempotency check on event_id if provided
        if (event_id) {
            const existingCb = await client.query(`SELECT id FROM gateway_callbacks WHERE event_id = $1`, [event_id]);
            if (existingCb.rows.length > 0) {
                await client.query('COMMIT');
                console.log(`[Webhook Callback] Duplicate event_id ${event_id} ignored.`);
                return { processed: true, duplicate: true };
            }
            await client.query(`INSERT INTO gateway_callbacks (event_id, booking_ref, payment_id, status, amount, payload)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (event_id) DO NOTHING`, [event_id, booking_ref, payment_id, status, amount, JSON.stringify(payload)]);
        }
        // 2. Fetch booking for update
        const bkRes = await client.query(`SELECT * FROM bookings WHERE booking_ref = $1 FOR UPDATE`, [booking_ref]);
        if (bkRes.rows.length === 0) {
            await client.query('COMMIT');
            return { processed: false, reason: 'Booking ref not found' };
        }
        const booking = bkRes.rows[0];
        // If already terminal state (CONFIRMED or FAILED), prevent double confirmation
        if (booking.status === 'CONFIRMED' || (booking.status === 'FAILED' && status === 'FAILED')) {
            await client.query('COMMIT');
            return { processed: true, already_processed: true };
        }
        if (status === 'SUCCEEDED') {
            // Update Booking
            await client.query(`UPDATE bookings SET status = 'CONFIRMED', payment_id = $1, updated_at = NOW() WHERE booking_ref = $2`, [payment_id || booking.payment_id, booking_ref]);
            // Transition seat status to BOOKED permanently
            await client.query(`UPDATE showtime_seats SET status = 'BOOKED', updated_at = NOW() WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
        }
        else if (status === 'FAILED' || status === 'REFUNDED') {
            // Update Booking
            await client.query(`UPDATE bookings SET status = 'FAILED', payment_id = $1, updated_at = NOW() WHERE booking_ref = $2`, [payment_id || booking.payment_id, booking_ref]);
            // Release seat back to AVAILABLE
            await client.query(`UPDATE showtime_seats 
         SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL, updated_at = NOW() 
         WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
            // Fetch seat code and remove Redis lock if present
            const seatRes = await client.query(`SELECT seat_code FROM seats WHERE id = $1`, [booking.seat_id]);
            if (seatRes.rows.length > 0) {
                const redisKey = `seat_hold:${booking.showtime_id}:${seatRes.rows[0].seat_code}`;
                await index_js_1.redis.del(redisKey);
            }
        }
        await client.query('COMMIT');
        return { processed: true, status };
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('[Webhook Callback] Error handling callback:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
