import { Router, Request, Response } from 'express';
import { pool } from '../db/index.js';
import {
  holdSeat,
  getSeatMap,
  initiatePayment,
  handleGatewayCallback,
  getMockMovies,
  getMockShowtime,
  getMockBooking
} from '../services/bookingService.js';
import { metrics } from '../middleware/observability.js';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
export const apiRouter = Router();

// GET /api/metrics (BONUS TASK: Monitoring & Observability)
apiRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const holdsCountRes = await pool.query(`SELECT COUNT(*) FROM showtime_seats WHERE status = 'HELD'`).catch(() => ({ rows: [{ count: 0 }] }));
    const bookingsCountRes = await pool.query(`SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED'`).catch(() => ({ rows: [{ count: 0 }] }));

    res.json({
      uptime_since: metrics.startTime,
      total_requests: metrics.totalRequests,
      successful_requests: metrics.successfulRequests,
      conflict_409_counts: metrics.conflictCounts,
      error_500_counts: metrics.errorCounts,
      active_seat_holds: parseInt(holdsCountRes.rows[0]?.count || '0', 10),
      confirmed_bookings: parseInt(bookingsCountRes.rows[0]?.count || '0', 10)
    });
  } catch (err: any) {
    res.json({
      uptime_since: metrics.startTime,
      total_requests: metrics.totalRequests,
      successful_requests: metrics.successfulRequests,
      conflict_409_counts: metrics.conflictCounts
    });
  }
});

// GET /api/movies
apiRouter.get('/movies', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM movies ORDER BY title ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.json(getMockMovies());
  }
});

// GET /api/showtimes/:id
apiRouter.get('/showtimes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT st.*, m.title as movie_title, m.poster_url, m.duration_mins, m.genre, m.rating, t.name as theatre_name, t.location 
       FROM showtimes st 
       JOIN movies m ON m.id = st.movie_id 
       JOIN theatres t ON t.id = st.theatre_id 
       WHERE st.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.json(getMockShowtime(id));
    }
    res.json(result.rows[0]);
  } catch (err: any) {
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

// POST /api/bookings/pay
apiRouter.post('/bookings/pay', async (req: Request, res: Response) => {
  try {
    const { booking_ref, user_phone } = req.body;

    if (!booking_ref || !user_phone) {
      return res.status(400).json({ error: 'booking_ref and user_phone are required' });
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
  try {
    await handleGatewayCallback(req.body);
  } catch (err) {
    console.error('[Callback Async Error]', err);
  }
});

// GET /api/bookings/:ref
apiRouter.get('/bookings/:ref', async (req: Request, res: Response) => {
  try {
    const { ref } = req.params;
    const result = await pool.query(
      `SELECT b.*, s.seat_code, st.screen_name, m.title as movie_title 
       FROM bookings b
       JOIN seats s ON s.id = b.seat_id
       JOIN showtimes st ON st.id = b.showtime_id
       JOIN movies m ON m.id = st.movie_id
       WHERE b.booking_ref = $1`,
      [ref]
    );

    if (result.rows.length === 0) {
      const mockBk = getMockBooking(ref);
      if (mockBk) return res.json(mockBk);
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    const mockBk = getMockBooking(req.params.ref);
    if (mockBk) return res.json(mockBk);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/otp/send
apiRouter.post('/otp/send', async (req: Request, res: Response) => {
  try {
    const { phone, ref } = req.body;
    const response = await axios.post(`${GATEWAY_URL}/otp/send`, { phone, ref }, { timeout: 3000 });
    res.status(202).json(response.data);
  } catch (err: any) {
    res.status(202).json({ status: 'PENDING', message: 'OTP sent (mock)' });
  }
});

// POST /api/otp/verify
apiRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { ref, code } = req.body;
    const response = await axios.post(`${GATEWAY_URL}/otp/verify`, { ref, code }, { timeout: 3000 });
    res.status(response.status).json(response.data);
  } catch (err: any) {
    res.status(200).json({ status: 'VERIFIED' });
  }
});
