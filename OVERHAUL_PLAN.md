# Found 404 — Professional Overhaul Plan

**Project:** SME Cyber Exposure Dashboard  
**Role:** Senior Full-Stack Engineer + UX Architect + Security Consultant  
**Scope:** End-to-end refactor for production-grade reliability, security, and UX

---

## Executive Summary

The codebase has solid architectural bones (FastAPI + React + Redis pub/sub + AI agents) but suffers from integration gaps that prevent all pieces from working together professionally:

| Category | Issue Count | Severity |
|----------|-------------|----------|
| Backend Integration Gaps | 6 | High |
| Frontend State/Data Wiring | 8 | High |
| UI/UX Inconsistencies | 11 | Medium |
| Security Best Practices | 4 | High |
| Code Quality / DRY | 7 | Medium |

---

## Phase 1 — Backend: Integration & Reliability

### 1.1 `backend/app/main.py`
**Problems:**
- `@app.on_event("startup")` is deprecated in FastAPI 0.109+
- Redis listener crashes silently — no exponential backoff on reconnect
- Missing `/health` endpoint (called by frontend `Layout.jsx`)
- No structured logging configuration

**Fixes:**
- Replace `@app.on_event` with `@asynccontextmanager` lifespan pattern
- Add exponential backoff (2s → 4s → 8s → 32s cap) to Redis listener
- Add `GET /health` endpoint returning `{api, redis, workers}` status
- Configure `logging.basicConfig` with JSON formatter for production

### 1.2 `backend/app/core/config.py`
**Problems:**
- No validation on `GEMINI_API_KEY` being empty (silent AI failures)
- No `APP_ENV` / `DEBUG` flag to distinguish dev from prod
- CORS origins hardcoded — should support wildcard for dev

**Fixes:**
- Add `APP_ENV: str = "development"` and `DEBUG: bool = True`
- Add `HEALTH_CHECK_INTERVAL: int = 30`
- Validate `GEMINI_API_KEY` length with `@field_validator`

### 1.3 `backend/app/api/v1/endpoints/dashboard.py`
**Problems:**
- Inline Pydantic schemas mixed with endpoint logic (violates separation of concerns)
- `get_kpi_snapshot` accesses `agent_thoughts` dict without null-safe check → KeyError crash
- `refresh_risk` uses sync `SessionLocal` but calls async `engine.update_scan_risk()`
- No HTTP 404 guard when no scans exist

**Fixes:**
- Add null-safe `.get()` for `agent_thoughts` dict access
- Fix `refresh_risk` to use proper async session handling
- Return sensible defaults when no scan data exists

### 1.4 `backend/app/services/scan_tasks.py`
**Problems:**
- Nested `asyncio.run()` inside Celery worker body — causes RuntimeError when event loop exists
- `run_ai_analysis()` and `run_risk_analysis()` inner functions duplicate session creation
- `event_loop.is_running()` branch is unreachable in Celery context
- No retry logic on scan failure

**Fixes:**
- Replace nested `asyncio.run()` with `asyncio.new_event_loop().run_until_complete()`
- Extract `_run_async(coro)` helper function to eliminate duplication
- Simplify event publisher call to always use `asyncio.run()`
- Add `@celery_app.task(bind=True, max_retries=2)` with auto-retry on transient errors

### 1.5 `backend/app/services/event_publisher.py`
**Problems:**
- Redis connection is created lazily but never reconnected after disconnect
- No timeout on publish operation (hangs if Redis is down)
- `REDIS_URL` read from `os.getenv` instead of `settings` (config inconsistency)

**Fixes:**
- Import `settings` from `app.core.config` for consistency
- Add `asyncio.wait_for()` with 5s timeout on publish
- Handle `ConnectionError` and log warning instead of crashing

---

## Phase 2 — Frontend: State, Data Wiring & Architecture

### 2.1 `frontend/src/context/RealTimeContext.jsx`
**Problems:**
- Reconnection uses fixed 3s delay — hammers server on persistent outages
- No heartbeat/ping to detect stale connections
- `SCAN_STATUS` changes from WebSocket not updating `scanStatus` state
- `orchestrationLog` never cleared between scans (accumulates across sessions)

**Fixes:**
- Implement exponential backoff: `Math.min(3000 * 2^attempt, 32000)`
- Add `SCAN_STATUS` case in reducer → updates `scanStatus`
- Add `CLEAR_LOGS` action for scan start
- Add `onopen` ping via `setInterval` every 25s

### 2.2 `frontend/src/pages/Dashboard.jsx`
**Problems:**
- 290-line monolith: inline `SubTabBar` component + all tab content in one file
- `trendData` derived from `scans` array — but `scans` doesn't include `vulnerabilities` array unless explicitly fetched
- `handleScanStarted` manually sets `scanStatus` but also reads from WebSocket → race condition
- Import of `OpenVasScanButton` etc. without lazy loading causes slow initial render

**Fixes:**
- Extract `SubTabBar` to own file: `components/ui/SubTabBar.jsx`
- Derive `trendData` from KPI history stored in `realTime` instead of scan array
- Remove redundant manual `SET_SCAN_STATUS` dispatch — rely on WebSocket
- Add `React.lazy()` for heavy tab components (Reports, NetworkTopology)

### 2.3 `frontend/src/services/api.js`
**Problems:**
- No request/response interceptors for centralized error handling
- No token/auth header injection pattern (ready for future auth)
- No request cancellation via `AbortController`
- Duplicate `api.patch` patterns in `vulnerabilityService`

**Fixes:**
- Add response interceptor that extracts `.data` automatically
- Add request interceptor for auth token injection
- Add `axios-retry` configuration (3 retries, exponential backoff)
- Export named `createCancelToken()` helper

---

## Phase 3 — Dashboard Components: Professional UX

### 3.1 `StatCards.jsx`
**Problems:**
- Severity breakdown reads from `latestScan.vulnerabilities[]` array — but this array is empty when data comes from KPI snapshot (WS)
- Health score derived as `100 - riskScore` locally but `realTime.kpi.health_score` is available directly

**Fixes:**
- Wire severity counts directly from `realTime.kpi.counts` (critical/high/medium/low)
- Use `realTime.kpi.health_score` directly instead of re-deriving
- Add `Filler` animation when transitioning from 0 → value

### 3.2 `ScanButton.jsx`
**Problems:**
- Pipeline step only advances to `nmap` on API response — never progresses further
- Not connected to WebSocket `scanStatus` or log messages
- `alert()` used for errors — unprofessional UI

**Fixes:**
- Subscribe to `useRealTime()` — advance pipeline steps based on log messages
- Map log keywords to steps: "RECON"→nmap, "ATTACK"→nuclei, "RISK"→risk, "REPORT"→ai
- Replace `alert()` with `toast()` notification
- Disable input during scan, re-enable when complete

### 3.3 `OrchestrationFeed.jsx`
**Problems:**
- `height={500}` hardcoded in `FixedSizeList` — overflows or wastes space in flex containers
- Log items show `'—'` for missing timestamps on legacy logs
- No clear/reset button for stale logs

**Fixes:**
- Use `ResizeObserver` via `useRef` to make height dynamic
- Normalize all log items to `{message, timestamp, agent, level}` shape
- Add "Clear" button + confirmation
- Color-code log levels: ERROR→red, WARN→orange, INFO→cyan, DEBUG→gray

### 3.4 `VulnTrend.jsx`
**Problems:**
- Empty state renders a blank Chart.js canvas — looks broken
- No loading state passed in
- X-axis disabled (`display: false`) makes dates unreadable
- Chart height not constrained — expands without bound

**Fixes:**
- Show `"No scan history yet"` empty state when `data.length === 0`
- Enable X-axis with short date labels (MM/DD)
- Set `maintainAspectRatio: false` + fixed container height of 140px
- Add `fill: 'origin'` with gradient from cyan to transparent

### 3.5 `RiskHeatmap.jsx`
**Problems:**
- SVG `viewBox="0 0 600 300"` is hardcoded — not responsive on narrow screens
- No animation on data change
- "Asset Severity Matrix" label is misleading — it's vulnerability severity, not asset severity

**Fixes:**
- Use `ResizeObserver` to get container width dynamically
- Add D3 enter/update/exit transitions (0.4s ease)
- Rename label to "Vulnerability Severity Distribution"
- Add count labels inside large rectangles

### 3.6 `UptimeGauge.jsx`
**Problems:**
- No trend indicator (is health improving or degrading?)
- SVG is not rotated from top (starts from 3 o'clock position)
- No sub-label for score context

**Fixes:**
- Rotate circle start to 12 o'clock (`transform="rotate(-90 60 60)"`)
- Add `↑ Stable` / `↓ Degraded` trend label based on delta
- Add "OPERATIONAL" / "DEGRADED" / "CRITICAL" status text

### 3.7 `ActionCenter.jsx`
**Problems:**
- Fetches once on mount — stale after scan completes
- No loading skeleton
- No action to dismiss/mark items as complete from UI

**Fixes:**
- Add `useQuery` with `refetchInterval: 30_000` for auto-refresh
- Add `SkeletonPulse` loading state
- Add dismiss button (calls `PATCH /dashboard/actions/:id`)

---

## Phase 4 — Layout & Navigation

### 4.1 `Sidebar.jsx`
**Problems:**
- No visual indicator of WebSocket connection status
- No live scan badge (users don't know a scan is running)
- Collapse state lost on page refresh

**Fixes:**
- Add `useRealTime()` hook → show green/red dot for WS status
- Show pulsing badge on "AI Brain" nav item when scan is running
- Persist collapse state to `localStorage`

### 4.2 `Layout.jsx` (`TopBar`)
**Problems:**
- Health check calls `/health` which doesn't exist in backend → always shows healthy (404 → caught → no-op)
- Search input is purely cosmetic — no functionality wired
- `onQuickScan` prop not passed from `Dashboard.jsx` → Quick Scan button in TopBar does nothing

**Fixes:**
- Add `/health` endpoint to backend (Phase 1.1)
- Parse health response to show individual `{api, redis, workers}` status
- Wire `onQuickScan` from Dashboard through Layout
- Add keyboard shortcut `⌘K` / `Ctrl+K` to focus search

---

## Phase 5 — Security Best Practices

### 5.1 Input Validation
- `ScanButton.jsx`: Validate target with regex before submitting (no shell-injectable chars)
- `backend/scans.py`: Validate `target_url` with `pydantic.AnyHttpUrl` or IP validator
- `scan_tasks.py`: `clean_target` already strips URLs — add allowlist for valid hostname chars

### 5.2 Error Information Leakage
- Backend: Catch broad `Exception` and return generic `500` — never expose stack traces to client
- Frontend: API interceptor should log full error to console but show generic message in UI

### 5.3 Auth Readiness
- `api.js`: Request interceptor already structured for auth token — add `localStorage` token injection pattern (commented, ready to activate)
- Backend `config.py`: Add `SECRET_KEY: str` and `ACCESS_TOKEN_EXPIRE_MINUTES: int = 30`

---

## Implementation Order

```
Day 1 — Backend Foundation
  ✦ 1.1 main.py lifespan + /health endpoint
  ✦ 1.3 dashboard.py null-safety + defaults
  ✦ 1.4 scan_tasks.py asyncio cleanup
  ✦ 1.5 event_publisher.py robustness

Day 2 — Frontend Core
  ✦ 2.1 RealTimeContext exponential backoff + scan status
  ✦ 2.2 Dashboard.jsx architecture cleanup
  ✦ 2.3 api.js interceptors + retry

Day 3 — Dashboard Components
  ✦ 3.1 StatCards KPI wiring
  ✦ 3.2 ScanButton WebSocket sync
  ✦ 3.3 OrchestrationFeed dynamic height + colors
  ✦ 3.4 VulnTrend empty state + responsive
  ✦ 3.5 RiskHeatmap responsive + transitions
  ✦ 3.6 UptimeGauge rotation + status
  ✦ 3.7 ActionCenter auto-refresh

Day 4 — Layout & Polish
  ✦ 4.1 Sidebar WS status + scan badge
  ✦ 4.2 Layout health endpoint + search
  ✦ 5.x Security hardening throughout
```

---

## File Change Index

| File | Change Type | Priority |
|------|-------------|----------|
| `backend/app/main.py` | Refactor lifespan, add /health | Critical |
| `backend/app/api/v1/endpoints/dashboard.py` | Null-safety, async fix | High |
| `backend/app/services/scan_tasks.py` | asyncio safety, DRY | High |
| `backend/app/services/event_publisher.py` | Timeout, config consistency | High |
| `frontend/src/context/RealTimeContext.jsx` | Backoff, scan status, heartbeat | Critical |
| `frontend/src/pages/Dashboard.jsx` | Extract SubTabBar, lazy load | High |
| `frontend/src/services/api.js` | Interceptors, retry | High |
| `frontend/src/components/dashboard/StatCards.jsx` | KPI wiring | High |
| `frontend/src/components/dashboard/ScanButton.jsx` | WS pipeline sync | High |
| `frontend/src/components/dashboard/OrchestrationFeed.jsx` | Dynamic height, log colors | Medium |
| `frontend/src/components/dashboard/VulnTrend.jsx` | Empty state, responsive | Medium |
| `frontend/src/components/dashboard/RiskHeatmap.jsx` | Responsive, transitions | Medium |
| `frontend/src/components/dashboard/UptimeGauge.jsx` | Rotation, status label | Medium |
| `frontend/src/components/dashboard/ActionCenter.jsx` | Auto-refresh, skeleton | Medium |
| `frontend/src/layout/Sidebar.jsx` | WS status, scan badge | Medium |
| `frontend/src/layout/Layout.jsx` | Health wiring, search | Medium |

---

*Generated by Senior Full-Stack / Security Architect review — Found 404 Project*
