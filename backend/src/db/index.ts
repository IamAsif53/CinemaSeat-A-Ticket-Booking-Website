import { Pool } from 'pg';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'cinemaseat'}`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy() {
    return null; // Stop retrying if offline
  }
});

redis.on('error', (_err) => {
  // Suppress unhandled redis error logs in standalone mock mode
});

export const getHoldTTL = (): number => {
  const ttl = parseInt(process.env.HOLD_TTL_SECONDS || '60', 10);
  return isNaN(ttl) || ttl <= 0 ? 60 : ttl;
};

export async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('[DB] Schema initialized successfully');
  } catch (err) {
    console.error('[DB] Failed to initialize schema:', err);
    throw err;
  }
}
