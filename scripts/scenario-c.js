import axios from 'axios';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5000';
const SHOWTIME_ID = 'showtime-spiderman-8pm';
const SEAT_CODE = 'F12';
const HAMMER_CONCURRENT = 100;
const BROWSE_CONCURRENT = 50;

async function runScenarioC() {
  console.log(`================================================================`);
  console.log(`🚀 SCENARIO C: Peak Traffic Load & Graceful Degradation Test`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`1. Hammering Premiere Showtime Seat ${SEAT_CODE} with ${HAMMER_CONCURRENT} concurrent buyers`);
  console.log(`2. Simultaneously browsing catalog movies with ${BROWSE_CONCURRENT} concurrent buyers`);
  console.log(`================================================================\n`);

  const startTime = Date.now();

  // Group 1: 100 Buyers hammering premiere seat F12
  const hammerRequests = Array.from({ length: HAMMER_CONCURRENT }).map((_, i) => {
    const userId = `hammer_user_${i}_${Math.random().toString(36).substring(2, 6)}`;
    return axios.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, {
      seat_code: SEAT_CODE,
      user_id: userId
    }, { timeout: 10000 })
    .then(res => ({ type: 'HOLD', success: true, status: res.status }))
    .catch(err => ({ 
      type: 'HOLD', 
      success: false, 
      status: err.response?.status || 500, 
      message: err.response?.data?.message || err.message 
    }));
  });

  // Group 2: 50 Buyers simultaneously browsing other movies catalog
  const browseRequests = Array.from({ length: BROWSE_CONCURRENT }).map((_, i) => {
    return axios.get(`${BASE_URL}/api/movies`, { timeout: 5000 })
    .then(res => ({ type: 'BROWSE', success: true, status: res.status, count: res.data?.length || 0 }))
    .catch(err => ({ type: 'BROWSE', success: false, status: err.response?.status || 500 }));
  });

  // Execute all 150 concurrent requests simultaneously!
  const results = await Promise.all([...hammerRequests, ...browseRequests]);
  const durationMs = Date.now() - startTime;

  let successfulHolds = 0;
  let rejectedHolds = 0;
  let successfulBrowses = 0;
  let failedBrowses = 0;

  results.forEach(r => {
    if (r.type === 'HOLD') {
      if (r.success && r.status === 201) successfulHolds++;
      else if (r.status === 409) rejectedHolds++;
    } else if (r.type === 'BROWSE') {
      if (r.success && r.status === 200) successfulBrowses++;
      else failedBrowses++;
    }
  });

  console.log(`📊 SCENARIO C RESULTS:`);
  console.log(` Total Concurrent Requests: ${HAMMER_CONCURRENT + BROWSE_CONCURRENT}`);
  console.log(` Duration:                  ${durationMs} ms`);
  console.log(` Successful Seat Holds:     ${successfulHolds} (Expected: 1)`);
  console.log(` Rejected Holds (409):       ${rejectedHolds} (Expected: 99)`);
  console.log(` Successful Movie Browses:  ${successfulBrowses} / ${BROWSE_CONCURRENT} (Expected: 50)`);
  console.log(` Failed Browses:            ${failedBrowses} (Expected: 0)`);
  console.log(`================================================================`);

  if (successfulHolds === 1 && rejectedHolds === 99 && successfulBrowses === BROWSE_CONCURRENT) {
    console.log(`✅ TEST PASSED: Zero double-booking & 100% graceful degradation verified under peak traffic!`);
    process.exit(0);
  } else {
    console.error(`❌ TEST FAILED: Performance degradation or concurrency violation detected!`);
    process.exit(1);
  }
}

runScenarioC().catch(err => {
  console.error('Fatal Scenario C execution error:', err);
  process.exit(1);
});
