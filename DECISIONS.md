# DECISIONS.md — Architecture & Engineering Trade-offs

This document details the three primary architectural decisions argued during the design of **CinemaSeat**, detailing the options considered, our ultimate choice, the rationale, and what trade-offs were accepted.

---

## Decision 1: High-Concurrency Locking Mechanism (Redis SET NX EX vs. PostgreSQL SELECT FOR UPDATE)

### Options Considered:
1. **Option A: PostgreSQL Row Locks (`SELECT ... FOR UPDATE`)**  
   Locking rows directly in PostgreSQL during hold requests.
2. **Option B: Redis Atomic Key-Value Locking (`SET key val NX EX ttl`)**  
   Using Redis as an in-memory distributed atomic locking engine with built-in TTL expiration.

### What We Chose:
**Option B: Redis Atomic Key-Value Locking**

### Why:
During premiere rush traffic, hundreds of requests hit the exact same seat (`F12`) within milliseconds. Relational database row locks create connection pool bottlenecks, lock contention, and high CPU spikes under 100+ concurrent requests. 

Redis handles single-threaded atomic operations in sub-millisecond speeds. `SET seat_hold:showtime:F12 val NX EX 60` is guaranteed to succeed for exactly one client CPU cycle and reject all subsequent 99 concurrent attempts immediately without touching database disk I/O.

### What We Gave Up:
- **Dual Storage Dependency:** We must keep Redis locks and PostgreSQL `showtime_seats` table status in sync. If Redis is flushed manually, PostgreSQL fallback checks are required to prevent premature seat re-assignments.

---

## Decision 2: Webhook Callback Processing Model (Synchronous Ack vs. Immediate 200 OK + Async Queue)

### Options Considered:
1. **Option A: Synchronous Processing before Returning Webhook Response**  
   Executing DB transactions, seat updates, and sending HTTP response after processing.
2. **Option B: Immediate HTTP 200 OK Response + Asynchronous DB State Mutation**  
   Instantly returning `200 OK` to the Mock Gateway container, then executing database state updates asynchronously.

### What We Chose:
**Option B: Immediate HTTP 200 OK Response + Asynchronous DB State Mutation**

### Why:
The Mock Gateway container specification notes that any non-200 or delayed response causes the Gateway to assume callback failure and trigger infinite retry loops. Furthermore, Gateway network latency fluctuates between 2s to 15s. 

Returning HTTP 200 immediately fulfills Gateway delivery guarantees, insulates our application from Gateway timeouts, and allows our idempotent callback processor to process the payload reliably using transaction locks and `event_id` deduplication logs.

### What We Gave Up:
- **Client Polling Dependency:** Because payment callback confirmation happens asynchronously after the initial `/charge` invocation, the frontend must poll `GET /api/bookings/:ref` or listen for status changes rather than receiving an instantaneous inline confirmation.

---

## Decision 3: Service Architecture (Microservices vs. Unified Modular Monolith)

### Options Considered:
1. **Option A: Splitting into Independent Microservices** (Auth Service, Catalog Service, Booking Engine Service, Payment Gateway Proxy Service).
2. **Option B: Unified Containerized Express + Nginx System** with clean service boundaries in code.

### What We Chose:
**Option B: Unified Containerized System with Nginx Reverse Proxy**

### Why:
In an 8-hour hackathon, inter-service networking overhead (gRPC/HTTP RPC), distributed transactions, network split-brain risks, and complex Docker Compose service orchestration consume valuable time without improving seat locking correctness. 

By building a single backend service container behind an Nginx reverse proxy, we achieved single-command deployment (`docker compose up`), sub-second startup times, simple health check hooks (`GET /health`), and zero network serialization overhead.

### What We Gave Up:
- **Independent Scaling:** Catalog browsing and high-concurrency seat hold endpoints run on the same API instance rather than scaling independently on separate microservice pods.
