import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';
import { seedDb } from './db/seed.js';
import { getHoldTTL } from './db/index.js';
import { syncExpiredHolds } from './services/bookingService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MANDATORY JUDGING HOOK #1: GET /health
// Must return 200 in under 1s, even if mock gateway container is down!
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

async function startServer() {
  try {
    console.log('[Server] Initializing database and seed data...');
    await seedDb();
    
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 CinemaSeat API Service running on port ${PORT}`);
      console.log(`⏱️ HOLD_TTL_SECONDS set to: ${getHoldTTL()}s`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('[Server] Startup failed:', err);
    process.exit(1);
  }
}

startServer();
