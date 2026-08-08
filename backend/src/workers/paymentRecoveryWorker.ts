import { pool } from '../db/index.js';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';

/**
 * Background Payment Recovery Worker
 * Ensures fault isolation: If the Gateway container is stopped and restarted,
 * pending payments automatically recover when the Gateway comes back online!
 */
export async function runPaymentRecoveryWorker() {
  try {
    // 1. Check Gateway health
    const gatewayHealth = await axios.get(`${GATEWAY_URL}/health`, { timeout: 2000 })
      .then(res => res.status === 200)
      .catch(() => false);

    if (!gatewayHealth) {
      // Gateway is offline; skip recovery loop silently until Gateway comes back
      return;
    }

    // 2. Fetch pending bookings older than 10 seconds
    const pendingRes = await pool.query(
      `SELECT * FROM bookings 
       WHERE status = 'PENDING' 
       AND created_at < NOW() - INTERVAL '10 seconds'
       AND created_at > NOW() - INTERVAL '15 minutes'
       ORDER BY created_at ASC 
       LIMIT 10`
    );

    if (pendingRes.rows.length === 0) {
      return;
    }

    console.log(`[Payment Recovery Worker] Found ${pendingRes.rows.length} pending bookings to reconcile.`);

    for (const bk of pendingRes.rows) {
      const callbackUrl = process.env.CALLBACK_URL || `${BACKEND_URL}/api/payments/callback`;

      try {
        const payload = {
          amount: bk.amount,
          currency: bk.currency || 'BDT',
          booking_ref: bk.booking_ref,
          callback_url: callbackUrl
        };

        const gatewayRes = await axios.post(`${GATEWAY_URL}/charge`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 3000
        });

        if (gatewayRes.data?.payment_id) {
          await pool.query(
            `UPDATE bookings SET payment_id = $1, updated_at = NOW() WHERE booking_ref = $2`,
            [gatewayRes.data.payment_id, bk.booking_ref]
          );
        }
      } catch (retryErr: any) {
        console.warn(`[Payment Recovery Worker] Retry attempt for ${bk.booking_ref} postponed: ${retryErr.message}`);
      }
    }
  } catch (err: any) {
    console.error('[Payment Recovery Worker Error]', err?.message || err);
  }
}
