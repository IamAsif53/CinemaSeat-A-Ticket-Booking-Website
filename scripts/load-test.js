import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const holdSuccessCounter = new Counter('successful_holds');
const holdConflictCounter = new Counter('rejected_holds_409');
const errorRate = new Rate('error_rate');
const seatMapDuration = new Trend('seat_map_duration_ms');
const holdDuration = new Trend('hold_duration_ms');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 virtual users (Light load)
    { duration: '1m',  target: 100 }, // Ramp up to 100 virtual users (Premiere rush spike)
    { duration: '30s', target: 200 }, // Ramp up to 200 virtual users (Stress test / Breakpoint search)
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should respond under 500ms
    'error_rate': ['rate<0.05'],        // Error rate under 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost';
const SHOWTIME_ID = 'showtime-spiderman-8pm';

export default function () {
  // 1. Fetch Seat Map
  const mapStart = Date.now();
  const mapRes = http.get(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/seats`);
  seatMapDuration.add(Date.now() - mapStart);

  const mapSuccess = check(mapRes, {
    'seat map status is 200': (r) => r.status === 200,
  });
  errorRate.add(!mapSuccess);

  sleep(Math.random() * 0.5);

  // 2. Attempt Hold on Random Seat from A1 to F15
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const randomRow = rowLabels[Math.floor(Math.random() * rowLabels.length)];
  const randomNum = Math.floor(Math.random() * 15) + 1;
  const seatCode = `${randomRow}${randomNum}`;
  const userId = `vu_${__VU}_${__ITER}`;

  const holdPayload = JSON.stringify({
    seat_code: seatCode,
    user_id: userId
  });

  const holdHeaders = { 'Content-Type': 'application/json' };
  const holdStart = Date.now();
  const holdRes = http.post(`${BASE_URL}/api/showtimes/${SHOWTIME_ID}/hold`, holdPayload, { headers: holdHeaders });
  holdDuration.add(Date.now() - holdStart);

  if (holdRes.status === 201) {
    holdSuccessCounter.add(1);
    errorRate.add(false);
  } else if (holdRes.status === 409) {
    holdConflictCounter.add(1);
    errorRate.add(false); // 409 Conflict is expected behavior under contention
  } else {
    errorRate.add(true);
  }

  sleep(1);
}
