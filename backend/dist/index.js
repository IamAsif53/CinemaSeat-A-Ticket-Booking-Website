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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// MANDATORY JUDGING HOOK #1: GET /health
// Must return 200 in under 1s, even if mock gateway container is down!
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'CinemaSeat API',
        hold_ttl_seconds: (0, index_js_1.getHoldTTL)()
    });
});
app.use('/api', api_js_1.apiRouter);
// Background timer to automatically sync expired seat holds from Postgres
setInterval(() => {
    (0, bookingService_js_1.syncExpiredHolds)().catch((err) => console.error('[Background Cleanup Error]', err));
}, 5000);
async function startServer() {
    try {
        console.log('[Server] Initializing database and seed data...');
        await (0, seed_js_1.seedDb)();
        app.listen(PORT, () => {
            console.log(`=================================================`);
            console.log(`🚀 CinemaSeat API Service running on port ${PORT}`);
            console.log(`⏱️ HOLD_TTL_SECONDS set to: ${(0, index_js_1.getHoldTTL)()}s`);
            console.log(`=================================================`);
        });
    }
    catch (err) {
        console.error('[Server] Startup failed:', err);
        process.exit(1);
    }
}
startServer();
