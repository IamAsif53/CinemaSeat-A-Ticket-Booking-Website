# CinemaSeat — Scalable & Reliable Cinema Ticketing System

> **Zero to Production · Phase 2 Hackathon Project**  
> *When Everyone Wants the Same Seat*

CinemaSeat is a high-concurrency, fault-tolerant movie ticketing platform built to remain completely responsive under extreme premiere rush traffic and **guarantee zero double-booking** under heavy demand.

---

## 🏗️ Architecture Diagram

```mermaid
flowchart TD
    Client["User Browser / k6 Load Test / Judges"] --> Nginx["Nginx Reverse Proxy (Port 80)"]
    Nginx -->|/health & /api/*| Backend["CinemaSeat API Service (Node.js/Express)"]
    Nginx -->|/*| Frontend["CinemaSeat Next.js / React Web UI"]
    
    Backend -->|Atomic SET NX EX Lock| Redis[("Redis (Seat Lock & TTL Cache)")]
    Backend -->|Persist State & Audit| Postgres[("PostgreSQL Database")]
    
    Backend -->|POST /charge, /otp| Gateway["Mock Gateway Container (Port 9000)"]
    Gateway -->|Webhook Callback (POST /api/payments/callback)| Backend
```

---

## ✨ Features & What Works

- **Zero Double-Booking Guarantee:** Redis Atomic Lua Scripts / `SET ... NX EX` enforce sub-millisecond atomic seat holds. Under 100 concurrent requests for seat `F12`, exactly 1 request succeeds and 99 are cleanly rejected with HTTP 409 Conflict.
- **Automatic Hold Expiration:** Seat holds naturally expire after `HOLD_TTL_SECONDS` (read from environment variable). Expired seats automatically return to `AVAILABLE` status for other buyers.
- **Non-Blocking Payment Processing:** `POST /api/bookings/pay` initiates Gateway charges asynchronously and returns HTTP 202 Accepted in under 50ms.
- **Idempotent Webhook Callback Handler:** `POST /api/payments/callback` **always returns HTTP 200 OK** immediately to prevent Gateway infinite retries. Duplicate webhook callbacks are deduplicated using database event logs (`event_id`).
- **Resilient Health Check Hook:** `GET /health` returns HTTP 200 in under 1 second, maintaining uptime even if the Mock Gateway container goes down completely.
- **Judge Control Header Support:** Full support for `X-Mock-Mode: deterministic`, `X-Mock-Force: fail`, `X-Mock-Force: duplicate`, `X-Mock-Force: timeout`, `X-Mock-Force: race`, and `X-Mock-Force: success`.
- **Rich Aesthetic Cinema Web UI:** Glassmorphism design, dark cinema theme, live interactive seat layout (Rows A-F, Seats 1-15 including Seat F12), countdown timers, OTP verification modal, and QR ticket generator.

---

## 🚀 How to Run Locally from Clean Clone

### Prerequisites
- Docker & Docker Compose installed

### Execution Command
```bash
# 1. Clone the repository
git clone https://github.com/your-username/cinemaseat.git
cd cinemaseat

# 2. Run everything with zero manual configuration
docker compose up --build
```

Access the system:
- **Base Web Application & Proxy:** `http://localhost` (Port 80)
- **Health Check Endpoint:** `http://localhost/health`
- **API Base URL:** `http://localhost/api`
- **Mock Gateway Dashboard:** `http://localhost:9000/health`

---

## 📋 Mandatory API Endpoints for Judging Verification

### 1. Fetching a Seat Map
**Request:**
```bash
curl -X GET http://localhost/api/showtimes/showtime-spiderman-8pm/seats
```

**Response Example:**
```json
[
  {
    "seat_code": "F12",
    "row_label": "F",
    "seat_number": 12,
    "status": "AVAILABLE",
    "held_by_user_id": null,
    "hold_expires_at": null,
    "booking_ref": null
  }
]
```

### 2. Holding a Seat
**Request:**
```bash
curl -X POST http://localhost/api/showtimes/showtime-spiderman-8pm/hold \
  -H "Content-Type: application/json" \
  -d '{
    "seat_code": "F12",
    "user_id": "judge_user_001"
  }'
```

**Successful Response (201 Created):**
```json
{
  "success": true,
  "message": "Seat F12 successfully held for 60 seconds.",
  "booking_ref": "bk_1723110000_x9z2a",
  "hold_expires_at": "2026-08-08T14:01:00.000Z",
  "ttl_seconds": 60
}
```

**Conflict Response (409 Conflict - When already held):**
```json
{
  "success": false,
  "message": "Seat F12 is already held or booked by another user."
}
```

---

## 🧪 Verification & Load Test Scripts

### Run Scenario A (100 Concurrent Buyers, 1 Seat):
```bash
npm run test:scenario-a
```

### Run Scenario B (Abandoned Hold Expiration & Re-booking):
```bash
npm run test:scenario-b
```

---

## 🌐 Deployed Production URL
- **Deployed URL:** `http://localhost` (or Poridhi VM / AWS Deployed IP)
