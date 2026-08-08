import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';
import { seedDb } from './db/seed.js';
import { getHoldTTL } from './db/index.js';
import { syncExpiredHolds, setMockMode } from './services/bookingService.js';
import { runPaymentRecoveryWorker } from './workers/paymentRecoveryWorker.js';
import { requestTracingMiddleware } from './middleware/observability.js';
import { rateLimiterMiddleware } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// BONUS TASK: Observability & Security Middleware
app.use(requestTracingMiddleware);
app.use(rateLimiterMiddleware);

// MANDATORY JUDGING HOOK #1: GET /health
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'CinemaSeat API',
    hold_ttl_seconds: getHoldTTL()
  });
});

app.use('/api', apiRouter);

// Background timer to automatically sync expired seat holds from Postgres
setInterval(() => {
  syncExpiredHolds().catch((err: any) => console.error('[Background Cleanup Error]', err));
}, 5000);

// BONUS TASK: Background Payment Recovery Worker (Every 15 seconds)
setInterval(() => {
  runPaymentRecoveryWorker().catch((err: any) => console.error('[Payment Recovery Worker Error]', err));
}, 15000);

async function startServer() {
  try {
    console.log('[Server] Connecting to PostgreSQL database...');
    await seedDb();
    console.log('[Server] Database connected & seeded.');
  } catch (err) {
    console.warn('[Server] DB Connection unavailable on local host. Activating standalone Mock Mode...');
    setMockMode(true);
  }

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 CinemaSeat API Service running on port ${PORT}`);
    console.log(`⏱️ HOLD_TTL_SECONDS set to: ${getHoldTTL()}s`);
    console.log(`=================================================`);
  });
}

startServer();
