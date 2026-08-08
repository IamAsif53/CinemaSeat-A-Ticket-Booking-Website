# CinemaSeat — Scalable & Reliable Cinema Ticketing System

> **Zero to Production · Phase 2 Hackathon Project**  
> *When Everyone Wants the Same Seat*

**Repository URL:** [https://github.com/IamAsif53/CinemaSeat-A-Ticket-Booking-Website.git](https://github.com/IamAsif53/CinemaSeat-A-Ticket-Booking-Website.git)

CinemaSeat is a high-concurrency, fault-tolerant movie ticketing platform built to remain completely responsive under extreme premiere rush traffic and **guarantee zero double-booking** under heavy demand.

---

## 🏗️ System Architecture & CI/CD Pipeline

### System Architecture
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

### Milestone 3: CI/CD Pipeline (`.github/workflows/ci.yml`)
```mermaid
flowchart TD
    Trigger["Git Push / PR to Main"] --> PathFilter["1. Change-Aware Path Filter (dorny/paths-filter)"]
    PathFilter --> TypeCheck["2. TypeCheck & Build (Node.js 22)"]
    TypeCheck --> DockerSpin["3. Spin Docker Compose Stack (-d --build)"]
    DockerSpin --> HealthCheck["4. Wait for /health Hook (HTTP 200 OK)"]
    HealthCheck --> ScenarioA["5. Run Scenario A (100 Concurrent Buyers)"]
    ScenarioA --> ScenarioB["6. Run Scenario B (Abandoned Hold Expiration)"]
    ScenarioB --> GateCheck{"Is Push to Default Branch ('main')?"}
    GateCheck -->|Yes| CDDeploy["7. CD Production Deploy (Default Branch Only)"]
    GateCheck -->|No (PR Only)| PRPass["PR Check Passed (Merge Allowed)"]
```

---

## 🚀 Milestone 3 DevOps Pipeline Features

- **Automated CI Trigger:** CI runs automatically on pull requests and pushes to the `main` default branch.
- **Merge Protection:** Code cannot merge without passing all 4 CI stages (`TypeCheck`, `Build`, `Scenario A`, `Scenario B`).
- **CD Main Branch Only:** CD deployment (`cd-deploy-production`) executes **only** on pushes to the default `main` branch.
- **Change-Aware Workflows:** Uses `dorny/paths-filter` to inspect changed files across `backend/`, `frontend/`, `scripts/`, and `docker-compose.yml`.
- **Zero-Downtime Rolling Deployment:** Services remain reachable during rolling container updates.

---

## ✨ Key System Features & What Works

- **Zero Double-Booking Guarantee:** Redis Atomic Lua Scripts / `SET ... NX EX` enforce sub-millisecond atomic seat holds. Under 100 concurrent requests for seat `F12`, exactly 1 request succeeds and 99 are cleanly rejected with HTTP 409 Conflict.
- **Automatic Hold Expiration:** Seat holds naturally expire after `HOLD_TTL_SECONDS` (read from environment variable). Expired seats automatically return to `AVAILABLE` status for other buyers.
- **Non-Blocking Payment Processing:** `POST /api/bookings/pay` initiates Gateway charges asynchronously and returns HTTP 202 Accepted in under 50ms.
- **Idempotent Webhook Callback Handler:** `POST /api/payments/callback` **always returns HTTP 200 OK** immediately to prevent Gateway infinite retries. Duplicate webhook callbacks are deduplicated using database event logs (`event_id`).
- **Resilient Health Check Hook:** `GET /health` returns HTTP 200 in under 1 second, maintaining uptime even if the Mock Gateway container goes down completely.
- **Judge Control Header Support:** Full support for `X-Mock-Mode: deterministic`, `X-Mock-Force: fail`, `X-Mock-Force: duplicate`, `X-Mock-Force: timeout`, `X-Mock-Force: race`, and `X-Mock-Force: success`.
- **Rich Aesthetic Cinema Web UI:** Glassmorphism design, dark cinema theme, live interactive seat layout (Rows A-F, Seats 1-15 including Seat F12), countdown timers, OTP verification modal, digital ticket wallet, HD trailer modal, and QR ticket generator.

---

## 🚀 How to Run Locally & Cloud Deployment

### Local Development / Evaluation
```bash
# 1. Clone the repository
git clone https://github.com/IamAsif53/CinemaSeat-A-Ticket-Booking-Website.git
cd CinemaSeat-A-Ticket-Booking-Website

# 2. Run full containerized stack
docker compose up --build
```

Access endpoints:
- **Web UI & Reverse Proxy:** `http://localhost` (Port 80)
- **Health Check Hook:** `http://localhost/health`
- **Metrics Endpoint:** `http://localhost/api/metrics`
- **API Base URL:** `http://localhost/api`

### Cloud Deployment (Poridhi VM / AWS)
1. SSH into your Poridhi VM or AWS instance:
   ```bash
   ssh ubuntu@<VM_IP_ADDRESS>
   ```
2. Clone repository & bring up containers in background:
   ```bash
   git clone https://github.com/IamAsif53/CinemaSeat-A-Ticket-Booking-Website.git
   cd CinemaSeat-A-Ticket-Booking-Website
   docker compose up -d --build
   ```
3. Deployed URL: `http://<VM_IP_ADDRESS>`

---

## 📋 Mandatory API Endpoints for Judging Verification

### 1. Fetching a Seat Map
```bash
curl -X GET http://localhost/api/showtimes/showtime-spiderman-8pm/seats
```

### 2. Holding a Seat
```bash
curl -X POST http://localhost/api/showtimes/showtime-spiderman-8pm/hold \
  -H "Content-Type: application/json" \
  -d '{"seat_code": "F12", "user_id": "judge_user_001"}'
```
