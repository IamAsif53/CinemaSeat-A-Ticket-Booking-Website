import { Router, Request, Response } from 'express';
import {
  holdSeat,
  getSeatMap,
  initiatePayment,
  handleGatewayCallback,
  getMockMovies,
  getMockShowtime,
  getMockBooking,
  releaseSeatHold
} from '../services/bookingService.js';
import { sendOTP, verifyOTP, isValidBDPhoneNumber } from '../services/otpService.js';
import { getMovieReviews, addMovieReview } from '../services/reviewService.js';
import { pool, redis } from '../db/index.js';

export const apiRouter = Router();

// GET /api/movies
apiRouter.get('/movies', async (req: Request, res: Response) => {
  try {
    const resDb = await pool.query('SELECT * FROM movies ORDER BY title ASC');
    if (resDb.rows.length > 0) {
      return res.json(resDb.rows);
    }
    res.json(getMockMovies());
  } catch (err) {
    res.json(getMockMovies());
  }
});

// GET /api/movies/:id/reviews
apiRouter.get('/movies/:id/reviews', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = getMovieReviews(id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movies/:id/reviews
apiRouter.post('/movies/:id/reviews', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { author_name, rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ error: 'rating and comment are required' });
    }

    const result = addMovieReview(id, author_name || 'Anonymous Moviegoer', Number(rating), comment);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/showtimes/:id
apiRouter.get('/showtimes/:id', async (req: Request, res: Response) => {
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
    const resDb = await pool.query(query, [id]);
    if (resDb.rows.length > 0) {
      return res.json(resDb.rows[0]);
    }
    res.json(getMockShowtime(id));
  } catch (err) {
    res.json(getMockShowtime(req.params.id));
  }
});

// GET /api/showtimes/:id/seats
apiRouter.get('/showtimes/:id/seats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seatMap = await getSeatMap(id);
    res.json(seatMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/showtimes/:id/hold
apiRouter.post('/showtimes/:id/hold', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seat_code, user_id } = req.body;

    if (!seat_code || !user_id) {
      return res.status(400).json({ error: 'seat_code and user_id are required' });
    }

    const result = await holdSeat(id, seat_code, user_id);
    if (!result.success) {
      return res.status(409).json(result);
    }

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/cancel (Manual User Hold Cancellation)
apiRouter.post('/bookings/cancel', async (req: Request, res: Response) => {
  try {
    const { booking_ref } = req.body;
    if (!booking_ref) {
      return res.status(400).json({ error: 'booking_ref is required' });
    }

    const result = await releaseSeatHold(booking_ref);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/otp/send (Send Real OTP with BD Phone Validation)
apiRouter.post('/otp/send', async (req: Request, res: Response) => {
  try {
    const { booking_ref, user_phone } = req.body;
    if (!booking_ref || !user_phone) {
      return res.status(400).json({ error: 'booking_ref and user_phone are required' });
    }

    const result = sendOTP(booking_ref, user_phone);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/otp/verify (Verify OTP & Execute Payment)
apiRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { booking_ref, user_phone, otp_code } = req.body;

    if (!booking_ref || !user_phone || !otp_code) {
      return res.status(400).json({ error: 'booking_ref, user_phone, and otp_code are required' });
    }

    // 1. Verify OTP Code & BD Phone Number
    const otpVerification = verifyOTP(booking_ref, user_phone, otp_code);
    if (!otpVerification.success) {
      return res.status(400).json({ error: otpVerification.error });
    }

    // 2. Execute Payment Charge
    const paymentResult = await initiatePayment(booking_ref, user_phone, req.headers as Record<string, string>);
    res.status(200).json({
      success: true,
      message: 'OTP Verified & Ticket Payment Confirmed!',
      ...paymentResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/pay
apiRouter.post('/bookings/pay', async (req: Request, res: Response) => {
  try {
    const { booking_ref, user_phone } = req.body;

    if (!booking_ref || !user_phone) {
      return res.status(400).json({ error: 'booking_ref and user_phone are required' });
    }

    if (!isValidBDPhoneNumber(user_phone)) {
      return res.status(400).json({ error: 'Invalid Bangladeshi phone number. Must be 11-digit mobile number (e.g. 01712345678).' });
    }

    const result = await initiatePayment(booking_ref, user_phone, req.headers as Record<string, string>);
    res.status(202).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/callback
apiRouter.post('/payments/callback', async (req: Request, res: Response) => {
  res.status(200).json({ received: true, timestamp: new Date().toISOString() });
  handleGatewayCallback(req.body).catch(err => {
    console.error('Async callback handling error:', err.message);
  });
});

// GET /api/bookings/:ref
apiRouter.get('/bookings/:ref', async (req: Request, res: Response) => {
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
    const resDb = await pool.query(query, [ref]);
    if (resDb.rows.length > 0) {
      return res.json(resDb.rows[0]);
    }
    const mockBk = getMockBooking(ref);
    if (mockBk) return res.json(mockBk);
    res.status(404).json({ error: 'Booking not found' });
  } catch (err) {
    const mockBk = getMockBooking(req.params.ref);
    if (mockBk) return res.json(mockBk);
    res.status(404).json({ error: 'Booking not found' });
  }
});
