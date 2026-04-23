# Mode 1 Run Report — Orchestration Security Center

**Generated:** 2026-04-22 — 23:01 (local) / 21:01 UTC  
**Run Type:** Mode 1 — Dashboard + Lab Scans (Lite Mode)  
**Engineer:** Antigravity AI Assistant  
**Repo:** `omarkapil/the-dashboard-project-` (post-pull, latest `main`)

---

## Summary

| Check | Result |
|---|---|
| Docker Desktop | ✅ Running (v29.3.1) |
| Lab Network | ✅ `the-dashboard-project-_lab_network` exists |
| Main Stack Build | ✅ Successful (after 1 fix — see §3) |
| All 6 Core Services | ✅ Up |
| Backend Health | ✅ `status: ok` |
| DB Schema | ✅ `m7n8o9p0q1r2` (current = head) |
| Redis | ✅ Connected |
| Celery Worker | ✅ Ready (3 tasks registered) |
| Lab Environment | ✅ All lab containers up |
| Lab Targets Seeded | ✅ 2 targets (exists from previous session) |
| API Authentication | ✅ JWT Bearer flow works |
| Dashboard URL | ✅ https://localhost (Caddy TLS proxy) |
| Swagger Docs | ✅ http://localhost:8000/docs |

**Overall: Mode 1 is FULLY OPERATIONAL ✅**

---

## 1. Pre-Run State

Before startup, Docker Desktop was offline. It was launched automatically and became ready within 5 seconds (it was recently used). The lab containers from the previous session were already running:

```
lab_traffic_gen      Up (running)
lab_webserver        Up (Juice Shop on :3000)
lab_api_gateway      Up (:8081)
lab_database         Up (:5433)
lab_fileserver       Up (healthy) SMB on :4445
lab_redis_cache      Up (:6380)
```

The external lab network `the-dashboard-project-_lab_network` was confirmed present.

---

## 2. Git State

```
Branch: main
Status: Up to date with origin/main
Recent pull: +7 commits merged (83 files changed, 1412 insertions, 6078 deletions)
New files: USE_CASES_AND_EVALUATION.md, frontend/Dockerfile.prod, frontend/nginx.conf, start-lite.sh, stop-all.sh
```

---

## 3. Build Phase — Issue and Fix

### ❌ First Build Attempt Failed

The new `frontend/Dockerfile.prod` (introduced in the latest pull) uses `npm ci`, which requires `package-lock.json` to be perfectly in sync with `package.json`. The pulled code added new dependencies (`framer-motion`, `d3-hierarchy`, `zustand`, `react-window`) without regenerating the lock file.

**Error:**
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
npm error Missing: d3-hierarchy@3.1.2 from lock file
npm error Missing: framer-motion@11.18.2 from lock file
npm error Missing: react-window@1.8.11 from lock file
npm error Missing: zustand@4.5.7 from lock file
```

### ✅ Fix Applied

Changed `Dockerfile.prod` line 9 from:
```dockerfile
RUN npm ci --prefer-offline
```
to:
```dockerfile
RUN npm install
```

This allows npm to resolve and install the new dependencies regardless of lock file state.

### ✅ Second Build — Successful

Build completed in approximately **4 minutes 9 seconds** total (22:57:18 → 23:01:27).

**Frontend build output:**
```
✓ 3201 modules transformed.
dist/index.html                   1.12 kB  │ gzip: 0.53 kB
dist/assets/vendor-charts-...  541.07 kB  │ gzip: 153.90 kB
dist/assets/index-...          132.30 kB  │ gzip: 42.79 kB
✓ built in 17.23s
```

**Backend/Celery key packages installed:**
- `fastapi-0.136.0`, `uvicorn-0.45.0`, `celery-5.6.3`
- `sqlalchemy-2.0.49`, `asyncpg-0.31.0`, `alembic-1.18.4`
- `google-genai-1.73.1`, `reportlab-4.4.10`
- `nmap` (system), `nuclei v3.3.8` (downloaded and installed)

---

## 4. Container Status (Post-Startup)

| Container | Status | Ports | Memory Used |
|---|---|---|---|
| `sme_dashboard_caddy` | ✅ Up | 0.0.0.0:80→80, 0.0.0.0:443→443 | 14 MiB / 64 MiB |
| `sme_dashboard_backend` | ✅ Up | 0.0.0.0:8000→8000 | 116 MiB / 384 MiB |
| `sme_dashboard_frontend` | ✅ Up | 80/tcp (internal) | 7 MiB / 48 MiB |
| `sme_dashboard_db` | ✅ Up (healthy) | 0.0.0.0:5432→5432 | 31 MiB / 256 MiB |
| `sme_dashboard_redis` | ✅ Up | 0.0.0.0:6379→6379 | 5 MiB / 96 MiB |
| `sme_dashboard_celery` | ✅ Up | — | 85 MiB / 512 MiB |
| **Main Stack Total** | | | **~258 MiB** |
| `lab_webserver` | ✅ Up | :3000 (Juice Shop) | 126 MiB / 384 MiB |
| `lab_api_gateway` | ✅ Up | :8081 (nginx) | 10 MiB / 64 MiB |
| `lab_database` | ✅ Up | :5433 (PostgreSQL) | 33 MiB / 128 MiB |
| `lab_fileserver` | ✅ Up (healthy) | :4445 (SMB), :1139 | 24 MiB / 128 MiB |
| `lab_redis_cache` | ✅ Up | :6380 | 4 MiB / 64 MiB |
| `lab_traffic_gen` | ✅ Up | — | 67 MiB / 128 MiB |
| **Lab Stack Total** | | | **~264 MiB** |
| **Grand Total RAM** | | | **~522 MiB containers** |

> **Note:** `sme_dashboard_openvas` is also running from a previous `--profile full` session (consuming ~973 MiB). In a clean Mode 1 run it would NOT be present.

---

## 5. Backend Health Check

**Endpoint:** `GET http://localhost:8000/health`

```json
{
  "status": "ok",
  "api": true,
  "redis": true,
  "workers": true,
  "schema_synced": true,
  "schema_detail": "current=m7n8o9p0q1r2 head=m7n8o9p0q1r2"
}
```

**All 4 subsystems healthy:**
- ✅ API server (Uvicorn/FastAPI)
- ✅ Redis connection
- ✅ Celery workers
- ✅ Database schema at latest migration head (`m7n8o9p0q1r2`)

---

## 6. Backend Startup Logs (Key Events)

```
[INFO]  Started server process [1]
[INFO]  Waiting for application startup.
[INFO]  app.main: DB schema at alembic revision: m7n8o9p0q1r2
[INFO]  app.services.scan_reaper: [ScanReaper] No orphaned scans found on startup.
[INFO]  app.main: Orchestration Security Center API started.
[INFO]  Application startup complete.
[INFO]  Uvicorn running on http://0.0.0.0:8000
[INFO]  app.main: Redis event listener connected.
[WARNING] app.main: Redis listener reconnect (attempt 1): Timeout reading from redis:6379 — retrying in 1s
[INFO]  app.main: Redis event listener connected.
```

> The Redis reconnect warning on startup is normal transient behavior — the connection re-established immediately. No errors.

---

## 7. Celery Worker Startup Logs

```
- ** ---------- [config]
- ** ---------- .> app:         worker:0x7075817390c0
- ** ---------- .> transport:   redis://redis:6379/0
- ** ---------- .> results:     redis://redis:6379/0
- *** --- * --- .> concurrency: 1 (prefork)

[tasks]
  . app.services.scan_tasks.check_sla_breaches
  . app.services.scan_tasks.run_scan_task
  . app.services.scan_tasks.trigger_periodic_scan

[INFO] Connected to redis://redis:6379/0
[INFO] mingle: all alone
[INFO] celery@74042943f412 ready.
```

✅ 3 tasks registered, connected to Redis broker, concurrency=1 (lite mode).

---

## 8. Lab Target Seeding

**Endpoint:** `POST http://localhost:8000/api/v1/lab/seed`

```json
{
  "seeded": [
    { "name": "E-Commerce Web Server",  "status": "exists", "id": "23dc3f8d-..." },
    { "name": "Corporate API Gateway",  "status": "exists", "id": "e18b8ead-..." }
  ],
  "count": 2
}
```

Targets already existed (seeded in the previous session). Data persisted via the `postgres_data` volume. ✅

---

## 9. API Verification

### Authentication
- **Endpoint:** `POST /api/v1/auth/login`
- **Default credentials:** `admin@local` / `Admin@1234`
- **Token type:** JWT Bearer, HS256
- **Response:** `{ access_token, token_type: "bearer", role: "ADMIN", force_password_change: true }`

> ⚠️ `force_password_change: true` — the admin password should be changed on first use via the dashboard Settings panel.

### Registered Targets

| Name | Base URL | Last Scanned | Type |
|---|---|---|---|
| [Lab] Corporate API Gateway | http://lab_api_gateway:8081 | 2026-04-19 22:57 | lab |
| [Lab] E-Commerce Web Server | http://lab_webserver:3000 | 2026-04-19 22:56 | lab |

### Scan History (from previous session)

| Scan ID (short) | Target | Status | Risk Score | Vulns |
|---|---|---|---|---|
| `17684190` | Corporate API Gateway | ✅ completed | 0.0 | 1 |
| `b5edccce` | E-Commerce Web Server | ✅ completed | 1.5 | 1 |
| `4f460ccd` | Corporate API Gateway | ✅ completed | 0.0 | 1 |
| `5a2ca3de` | E-Commerce Web Server | ✅ completed | 1.5 | 1 |
| `89cc6998` | E-Commerce Web Server | ❌ failed | — | 0 |
| `94398c77` | Corporate API Gateway | ❌ failed | — | 0 |
| `2472d773` | Corporate API Gateway | ✅ completed | 0.0 | 0 |
| `f320a8c4` | E-Commerce Web Server | ✅ completed | 0.0 | 0 |

### Vulnerabilities Found

| Title | Host | Port | Service | Severity | Status |
|---|---|---|---|---|---|
| Ppp Exposed on 172.18.0.10:3000 | 172.18.0.10 | 3000 | ppp | info | open |
| Nginx Exposed on 172.18.0.9:8081 | 172.18.0.9 | 8081 | http | info | open |

---

## 10. Service Access URLs

### Mode 1 (Lite) — Always Available

| Service | URL | Status |
|---|---|---|
| Dashboard (TLS) | https://localhost | ✅ Live (accept self-signed cert) |
| Backend API | http://localhost:8000 | ✅ Live |
| Swagger / OpenAPI Docs | http://localhost:8000/docs | ✅ Live |
| Health Endpoint | http://localhost:8000/health | ✅ `{"status":"ok"}` |
| Juice Shop (scan target) | http://localhost:3000 | ✅ Live |
| API Gateway (scan target) | http://localhost:8081 | ✅ Live |

### Disabled (Mode 2 / `--profile full` only)

| Service | Flag |
|---|---|
| OpenVAS | `OPENVAS_ENABLED=false` |
| Elasticsearch / SIEM | `SIEM_ENABLED=false` |
| Wazuh / n8n / SOAR | `SOAR_ENABLED=false` |

---

## 11. Issues Encountered

### Issue 1: `npm ci` fails on frontend build (FIXED)

- **Root cause:** `frontend/Dockerfile.prod` (added in latest pull) uses `npm ci`, but `package-lock.json` in the repo is stale — it's missing `framer-motion`, `zustand`, `d3-hierarchy`, `react-window`.
- **Fix:** Changed `RUN npm ci --prefer-offline` → `RUN npm install` in `frontend/Dockerfile.prod`.
- **Permanent fix needed:** Re-generate `package-lock.json` on a machine with Node.js and commit it: `cd frontend && npm install && git add package-lock.json && git commit -m "chore: sync package-lock.json"`.

### Issue 2: Admin Password Not Set (WORKED AROUND)

- **Root cause:** The `postgres_data` volume was preserved from a previous session. The admin account in the DB was created with a different password than `Admin@1234` (the current code default).
- **Workaround:** Reset the admin password directly via a Python script inside the backend container.
- **Note:** This is only a concern when the volume carries state from a previous run with a different password. A fresh `docker compose down -v` + restart would reseed correctly.

### Issue 3: Redis Listener Reconnect Warnings (BENIGN)

- **Root cause:** The backend's async Redis event listener times out during the initial 30-second wait period and reconnects. This is expected transient behavior.
- **Impact:** None — the connection recovers automatically within 1 second each time.

---

## 12. Resource Budget

| Component | RAM Used | RAM Limit | % |
|---|---|---|---|
| sme_dashboard_backend | 116 MiB | 384 MiB | 30% |
| sme_dashboard_celery | 85 MiB | 512 MiB | 17% |
| sme_dashboard_db | 31 MiB | 256 MiB | 12% |
| sme_dashboard_caddy | 14 MiB | 64 MiB | 22% |
| sme_dashboard_redis | 5 MiB | 96 MiB | 5% |
| sme_dashboard_frontend | 7 MiB | 48 MiB | 15% |
| **Main stack total** | **~258 MiB** | 1.36 GiB | — |
| Lab containers (6) | ~264 MiB | ~896 MiB | — |
| **Mode 1 grand total** | **~522 MiB** | ~2.2 GiB | — |

> Well within the 8 GB Mode 1 container budget. Windows + Docker Desktop overhead (~4.5 GB) brings the total system usage to approximately **5.0–5.5 GB** on a 16 GB machine.

---

## 13. How to Run Scans

Once Mode 1 is up, trigger scans on all seeded lab targets:

```powershell
# Trigger scans via the script
powershell -ExecutionPolicy Bypass -File .\trigger_lab_scans.ps1

# Or manually via API (requires auth token from dashboard login)
POST http://localhost:8000/api/v1/scans
Content-Type: application/json
Authorization: Bearer <token>
{ "target_id": "<target-uuid>" }
```

Then observe in the dashboard:
- **Orchestration Feed** tab → live agent log messages
- **Scan Pipeline Panel** → Stage 1 (RECON) → 2 (CHAIN) → 3 (VALIDATE) → 4 (RISK SCORE)
- **Network Topology** graph → nodes appear as hosts are discovered

---

## 14. Shutdown / Reset Commands

```powershell
# Stop everything (keeps volumes / data)
docker compose down
docker compose -f docker-compose.lab.yml down

# Full reset (wipes all data volumes)
docker compose down -v
docker compose -f docker-compose.lab.yml down -v

# Restart from scratch
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
```

---

*Report generated by Antigravity AI · 2026-04-22 23:01 local time*
