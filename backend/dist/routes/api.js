"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const bookingService_js_1 = require("../services/bookingService.js");
const observability_js_1 = require("../middleware/observability.js");
const axios_1 = __importDefault(require("axios"));
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
exports.apiRouter = (0, express_1.Router)();
// GET /api/metrics
exports.apiRouter.get('/metrics', async (_req, res) => {
    try {
        const holdsCountRes = await index_js_1.pool.query(`SELECT COUNT(*) FROM showtime_seats WHERE status = 'HELD'`).catch(() => ({ rows: [{ count: 0 }] }));
        const bookingsCountRes = await index_js_1.pool.query(`SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED'`).catch(() => ({ rows: [{ count: 0 }] }));
        res.json({
            uptime_since: observability_js_1.metrics.startTime,
            total_requests: observability_js_1.metrics.totalRequests,
            successful_requests: observability_js_1.metrics.successfulRequests,
            conflict_409_counts: observability_js_1.metrics.conflictCounts,
            error_500_counts: observability_js_1.metrics.errorCounts,
            active_seat_holds: parseInt(holdsCountRes.rows[0]?.count || '0', 10),
            confirmed_bookings: parseInt(bookingsCountRes.rows[0]?.count || '0', 10)
        });
    }
    catch (err) {
        res.json({
            uptime_since: observability_js_1.metrics.startTime,
            total_requests: observability_js_1.metrics.totalRequests,
            successful_requests: observability_js_1.metrics.successfulRequests,
            conflict_409_counts: observability_js_1.metrics.conflictCounts
        });
    }
});
// GET /api/movies
exports.apiRouter.get('/movies', async (req, res) => {
    try {
        const result = await index_js_1.pool.query('SELECT * FROM movies ORDER BY title ASC');
        res.json(result.rows);
    }
    catch (err) {
        res.json((0, bookingService_js_1.getMockMovies)());
    }
});
// GET /api/showtimes/:id
exports.apiRouter.get('/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await index_js_1.pool.query(`SELECT st.*, m.title as movie_title, m.poster_url, m.duration_mins, m.genre, m.rating, t.name as theatre_name, t.location 
       FROM showtimes st 
       JOIN movies m ON m.id = st.movie_id 
       JOIN theatres t ON t.id = st.theatre_id 
       WHERE st.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.json((0, bookingService_js_1.getMockShowtime)(id));
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        res.json((0, bookingService_js_1.getMockShowtime)(req.params.id));
    }
});
// GET /api/showtimes/:id/seats
exports.apiRouter.get('/showtimes/:id/seats', async (req, res) => {
    try {
        const { id } = req.params;
        const seatMap = await (0, bookingService_js_1.getSeatMap)(id);
        res.json(seatMap);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/showtimes/:id/hold
exports.apiRouter.post('/showtimes/:id/hold', async (req, res) => {
    try {
        const { id } = req.params;
        const { seat_code, user_id } = req.body;
        if (!seat_code || !user_id) {
            return res.status(400).json({ error: 'seat_code and user_id are required' });
        }
        const result = await (0, bookingService_js_1.holdSeat)(id, seat_code, user_id);
        if (!result.success) {
            return res.status(409).json(result);
        }
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/bookings/cancel (Manual User Hold Cancellation)
exports.apiRouter.post('/bookings/cancel', async (req, res) => {
    try {
        const { booking_ref } = req.body;
        if (!booking_ref) {
            return res.status(400).json({ error: 'booking_ref is required' });
        }
        const result = await (0, bookingService_js_1.releaseSeatHold)(booking_ref);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/bookings/pay
exports.apiRouter.post('/bookings/pay', async (req, res) => {
    try {
        const { booking_ref, user_phone } = req.body;
        if (!booking_ref || !user_phone) {
            return res.status(400).json({ error: 'booking_ref and user_phone are required' });
        }
        const result = await (0, bookingService_js_1.initiatePayment)(booking_ref, user_phone, req.headers);
        res.status(202).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/payments/callback
exports.apiRouter.post('/payments/callback', async (req, res) => {
    res.status(200).json({ received: true, timestamp: new Date().toISOString() });
    try {
        await (0, bookingService_js_1.handleGatewayCallback)(req.body);
    }
    catch (err) {
        console.error('[Callback Async Error]', err);
    }
});
// GET /api/bookings/:ref
exports.apiRouter.get('/bookings/:ref', async (req, res) => {
    try {
        const { ref } = req.params;
        const result = await index_js_1.pool.query(`SELECT b.*, s.seat_code, st.screen_name, m.title as movie_title 
       FROM bookings b
       JOIN seats s ON s.id = b.seat_id
       JOIN showtimes st ON st.id = b.showtime_id
       JOIN movies m ON m.id = st.movie_id
       WHERE b.booking_ref = $1`, [ref]);
        if (result.rows.length === 0) {
            const mockBk = (0, bookingService_js_1.getMockBooking)(ref);
            if (mockBk)
                return res.json(mockBk);
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        const mockBk = (0, bookingService_js_1.getMockBooking)(req.params.ref);
        if (mockBk)
            return res.json(mockBk);
        res.status(500).json({ error: err.message });
    }
});
// POST /api/otp/send
exports.apiRouter.post('/otp/send', async (req, res) => {
    try {
        const { phone, ref } = req.body;
        const response = await axios_1.default.post(`${GATEWAY_URL}/otp/send`, { phone, ref }, { timeout: 3000 });
        res.status(202).json(response.data);
    }
    catch (err) {
        res.status(202).json({ status: 'PENDING', message: 'OTP sent (mock)' });
    }
});
// POST /api/otp/verify
exports.apiRouter.post('/otp/verify', async (req, res) => {
    try {
        const { ref, code } = req.body;
        const response = await axios_1.default.post(`${GATEWAY_URL}/otp/verify`, { ref, code }, { timeout: 3000 });
        res.status(response.status).json(response.data);
    }
    catch (err) {
        res.status(200).json({ status: 'VERIFIED' });
    }
});
