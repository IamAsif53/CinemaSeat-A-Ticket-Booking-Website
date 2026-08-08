import axios from 'axios';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5000';
const SHOWTIME_ID = 'showtime-spiderman-8pm';
const SEAT_CODE = 'E10';

async function runScenarioB() {
  console.log(`================================================================`);
  console.log(`🚀 SCENARIO B: The Abandoned Hold Expiration Test`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`================================================================\n`);

  // 1. Fetch Health to get HOLD_TTL_SECONDS
  const healthRes = await axios.get(`${BASE_URL}/health`);
  const ttlSeconds = healthRes.data.hold_ttl_seconds || 60;
  console.log(`⏱️ Server HOLD_TTL_SECONDS is set to: ${ttlSeconds} seconds`);

  // 2. User 1 holds seat E10
  const user1 = 'abandoning_user_101';
  console.log(`\n[Step 1] User 1 (${user1}) holding seat ${SEAT_CODE}...`);
  const hold1Res = await axios.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, {
    seat_code: SEAT_CODE,
    user_id: user1
  });
  
  console.log(`[Step 1 OK] Seat ${SEAT_CODE} held! Booking ref: ${hold1Res.data.booking_ref}`);
  console.log(`[Step 1 OK] Hold expires at: ${hold1Res.data.hold_expires_at}`);

  // 3. User 2 immediately attempts to hold seat E10 (Should fail 409)
  const user2 = 'buyer_user_202';
  console.log(`\n[Step 2] User 2 (${user2}) attempts to hold seat ${SEAT_CODE} immediately (should be blocked)...`);
  try {
    await axios.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, {
      seat_code: SEAT_CODE,
      user_id: user2
    });
    console.error(`❌ FAILED: User 2 was able to hold seat before TTL expiration!`);
    process.exit(1);
  } catch (err) {
    console.log(`[Step 2 OK] User 2 correctly rejected with 409 Conflict: "${err.response?.data?.message}"`);
  }

  // 4. Wait for TTL to expire (+3 seconds buffer)
  const waitMs = (ttlSeconds + 3) * 1000;
  console.log(`\n[Step 3] Walking away without paying. Waiting ${ttlSeconds + 3} seconds for TTL to expire...`);
  await new Promise(resolve => setTimeout(resolve, waitMs));

  // 5. Check seat map to verify status returned to AVAILABLE
  console.log(`\n[Step 4] Checking seat map...`);
  const seatMapRes = await axios.get(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/seats`);
  const seatE10 = seatMapRes.data.find((s) => s.seat_code === SEAT_CODE);
  console.log(`[Step 4 Status] Seat ${SEAT_CODE} status in database: ${seatE10?.status}`);

  if (seatE10?.status !== 'AVAILABLE') {
    console.error(`❌ FAILED: Seat status is still ${seatE10?.status}, expected AVAILABLE!`);
    process.exit(1);
  }

  // 6. User 2 retries holding seat E10 (Should now succeed!)
  console.log(`\n[Step 5] User 2 (${user2}) retrying seat hold after expiration...`);
  const hold2Res = await axios.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, {
    seat_code: SEAT_CODE,
    user_id: user2
  });

  if (hold2Res.status === 201 && hold2Res.data.success) {
    console.log(`[Step 5 OK] Seat ${SEAT_CODE} successfully acquired by User 2 after hold expired!`);
    console.log(`================================================================`);
    console.log(`✅ TEST PASSED: Abandoned hold expiration and re-booking verified!`);
    process.exit(0);
  } else {
    console.error(`❌ FAILED: User 2 could not hold seat after expiration.`);
    process.exit(1);
  }
}

runScenarioB().catch(err => {
  console.error('Fatal Scenario B execution error:', err);
  process.exit(1);
});
