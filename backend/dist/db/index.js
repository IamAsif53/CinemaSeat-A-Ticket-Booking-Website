"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHoldTTL = exports.redis = exports.pool = void 0;
exports.initDb = initDb;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connectionString = process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'cinemaseat'}`;
exports.pool = new pg_1.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
exports.redis = new ioredis_1.default({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 2000);
        return delay;
    }
});
const getHoldTTL = () => {
    const ttl = parseInt(process.env.HOLD_TTL_SECONDS || '60', 10);
    return isNaN(ttl) || ttl <= 0 ? 60 : ttl;
};
exports.getHoldTTL = getHoldTTL;
async function initDb() {
    try {
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
        await exports.pool.query(sql);
        console.log('[DB] Schema initialized successfully');
    }
    catch (err) {
        console.error('[DB] Failed to initialize schema:', err);
        throw err;
    }
}
