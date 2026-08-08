"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_js_1 = require("./routes/api.js");
const seed_js_1 = require("./db/seed.js");
const index_js_1 = require("./db/index.js");
const bookingService_js_1 = require("./services/bookingService.js");
const paymentRecoveryWorker_js_1 = require("./workers/paymentRecoveryWorker.js");
const observability_js_1 = require("./middleware/observability.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// BONUS TASK: Observability & Security Middleware
app.use(observability_js_1.requestTracingMiddleware);
app.use(rateLimiter_js_1.rateLimiterMiddleware);
// MANDATORY JUDGING HOOK #1: GET /health
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'CinemaSeat API',
        hold_ttl_seconds: (0, index_js_1.getHoldTTL)()
    });
});
// BONUS TASK: Metrics Endpoint
app.get('/metrics', (_req, res) => {
    res.status(200).json((0, observability_js_1.getMetricsData)());
});
app.use('/api', api_js_1.apiRouter);
// Background timer to automatically sync expired seat holds from Postgres
setInterval(() => {
    (0, bookingService_js_1.syncExpiredHolds)().catch((err) => console.error('[Background Cleanup Error]', err));
}, 5000);
// BONUS TASK: Background Payment Recovery Worker (Every 15 seconds)
setInterval(() => {
    (0, paymentRecoveryWorker_js_1.runPaymentRecoveryWorker)().catch((err) => console.error('[Payment Recovery Worker Error]', err));
}, 15000);
async function startServer() {
    try {
        console.log('[Server] Connecting to PostgreSQL database...');
        await (0, seed_js_1.seedDb)();
        console.log('[Server] Database connected & seeded.');
    }
    catch (err) {
        console.warn('[Server] DB Connection unavailable on local host. Activating standalone Mock Mode...');
        (0, bookingService_js_1.setMockMode)(true);
    }
    app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 CinemaSeat API Service running on port ${PORT}`);
        console.log(`⏱️ HOLD_TTL_SECONDS set to: ${(0, index_js_1.getHoldTTL)()}s`);
        console.log(`=================================================`);
    });
}
startServer();
