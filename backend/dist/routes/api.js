"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const bookingService_js_1 = require("../services/bookingService.js");
const otpService_js_1 = require("../services/otpService.js");
const reviewService_js_1 = require("../services/reviewService.js");
const observability_js_1 = require("../middleware/observability.js");
const index_js_1 = require("../db/index.js");
exports.apiRouter = (0, express_1.Router)();
// BONUS TASK: Metrics Endpoint
exports.apiRouter.get('/metrics', (_req, res) => {
    res.status(200).json((0, observability_js_1.getMetricsData)());
});
// GET /api/movies
exports.apiRouter.get('/movies', async (req, res) => {
    try {
        const resDb = await index_js_1.pool.query('SELECT * FROM movies ORDER BY title ASC');
        if (resDb.rows.length > 0) {
            return res.json(resDb.rows);
        }
        res.json((0, bookingService_js_1.getMockMovies)());
    }
    catch (err) {
        res.json((0, bookingService_js_1.getMockMovies)());
    }
});
// GET /api/movies/:id/reviews
exports.apiRouter.get('/movies/:id/reviews', (req, res) => {
    try {
        const { id } = req.params;
        const stats = (0, reviewService_js_1.getMovieReviews)(id);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/movies/:id/reviews
exports.apiRouter.post('/movies/:id/reviews', (req, res) => {
    try {
        const { id } = req.params;
        const { author_name, rating, comment } = req.body;
        if (!rating || !comment) {
            return res.status(400).json({ error: 'rating and comment are required' });
        }
        const result = (0, reviewService_js_1.addMovieReview)(id, author_name || 'Anonymous Moviegoer', Number(rating), comment);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/showtimes/:id
exports.apiRouter.get('/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT st.*, m.title as movie_title, m.poster_url, m.duration_mins, m.genre, m.rating,
             t.name as theatre_name, t.location
      FROM showtimes st
      JOIN movies m ON m.id = st.movie_id
      JOIN theatres t ON t.id = st.theatre_id
      WHERE st.id = $1;
    `;
        const resDb = await index_js_1.pool.query(query, [id]);
        if (resDb.rows.length > 0) {
            return res.json(resDb.rows[0]);
        }
        res.json((0, bookingService_js_1.getMockShowtime)(id));
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
// POST /api/otp/send (Send Real OTP with BD Phone Validation)
exports.apiRouter.post('/otp/send', async (req, res) => {
    try {
        const { booking_ref, user_phone } = req.body;
        if (!booking_ref || !user_phone) {
            return res.status(400).json({ error: 'booking_ref and user_phone are required' });
        }
        const result = (0, otpService_js_1.sendOTP)(booking_ref, user_phone);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.status(200).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/otp/verify (Verify OTP & Execute Payment)
exports.apiRouter.post('/otp/verify', async (req, res) => {
    try {
        const { booking_ref, user_phone, otp_code } = req.body;
        if (!booking_ref || !user_phone || !otp_code) {
            return res.status(400).json({ error: 'booking_ref, user_phone, and otp_code are required' });
        }
        // 1. Verify OTP Code & BD Phone Number
        const otpVerification = (0, otpService_js_1.verifyOTP)(booking_ref, user_phone, otp_code);
        if (!otpVerification.success) {
            return res.status(400).json({ error: otpVerification.error });
        }
        // 2. Execute Payment Charge
        const paymentResult = await (0, bookingService_js_1.initiatePayment)(booking_ref, user_phone, req.headers);
        res.status(200).json({
            success: true,
            message: 'OTP Verified & Ticket Payment Confirmed!',
            ...paymentResult
        });
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
        if (!(0, otpService_js_1.isValidBDPhoneNumber)(user_phone)) {
            return res.status(400).json({ error: 'Invalid Bangladeshi phone number. Must be 11-digit mobile number (e.g. 01712345678).' });
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
    (0, bookingService_js_1.handleGatewayCallback)(req.body).catch(err => {
        console.error('Async callback handling error:', err.message);
    });
});
// GET /api/bookings/:ref
exports.apiRouter.get('/bookings/:ref', async (req, res) => {
    try {
        const { ref } = req.params;
        const query = `
      SELECT b.*, s.seat_code, st.screen_name, m.title as movie_title
      FROM bookings b
      JOIN seats s ON s.id = b.seat_id
      JOIN showtimes st ON st.id = b.showtime_id
      JOIN movies m ON m.id = st.movie_id
      WHERE b.booking_ref = $1;
    `;
        const resDb = await index_js_1.pool.query(query, [ref]);
        if (resDb.rows.length > 0) {
            return res.json(resDb.rows[0]);
        }
        const mockBk = (0, bookingService_js_1.getMockBooking)(ref);
        if (mockBk)
            return res.json(mockBk);
        res.status(404).json({ error: 'Booking not found' });
    }
    catch (err) {
        const mockBk = (0, bookingService_js_1.getMockBooking)(req.params.ref);
        if (mockBk)
            return res.json(mockBk);
        res.status(404).json({ error: 'Booking not found' });
    }
});
