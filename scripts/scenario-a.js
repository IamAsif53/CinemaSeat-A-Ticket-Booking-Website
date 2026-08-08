import axios from 'axios';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5000';
const SHOWTIME_ID = 'showtime-spiderman-8pm';
const SEAT_CODE = 'F12';
const CONCURRENT_REQUESTS = 100;

async function runScenarioA() {
  console.log(`================================================================`);
  console.log(`🚀 SCENARIO A: 100 Concurrent Buyers Fighting for Seat ${SEAT_CODE}`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`================================================================\n`);

  const requests = [];
  const startTime = Date.now();

  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    const userId = `concurrent_user_${i}_${Math.random().toString(36).substring(2, 6)}`;
    const req = axios.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, {
      seat_code: SEAT_CODE,
      user_id: userId
    }, { timeout: 10000 })
    .then(res => ({ success: true, status: res.status, data: res.data }))
    .catch(err => ({ 
      success: false, 
      status: err.response?.status || 500, 
      message: err.response?.data?.message || err.message 
    }));

    requests.push(req);
  }

  const results = await Promise.all(requests);
  const durationMs = Date.now() - startTime;

  let successfulHolds = 0;
  let rejections = 0;
  let errors = 0;

  results.forEach(r => {
    if (r.success && r.status === 201) {
      successfulHolds++;
    } else if (r.status === 409) {
      rejections++;
    } else {
      errors++;
    }
  });

  const oversellCount = Math.max(0, successfulHolds - 1);

  console.log(`📊 SCENARIO A RESULTS:`);
  console.log(` Total Requests Sent:    ${CONCURRENT_REQUESTS}`);
  console.log(` Duration:               ${durationMs} ms`);
  console.log(` Successful Holds:      ${successfulHolds} (Expected: 1)`);
  console.log(` Rejected Requests (409): ${rejections} (Expected: 99)`);
  console.log(` Errors:                 ${errors}`);
  console.log(` Oversell Count:         ${oversellCount} (Expected: 0)`);
  console.log(`================================================================`);

  if (successfulHolds === 1 && oversellCount === 0) {
    console.log(`✅ TEST PASSED: Zero double-booking verified under 100 concurrent requests!`);
    process.exit(0);
  } else {
    console.error(`❌ TEST FAILED: Concurrency violation detected!`);
    process.exit(1);
  }
}

runScenarioA().catch(err => {
  console.error('Fatal Scenario A execution error:', err);
  process.exit(1);
});
