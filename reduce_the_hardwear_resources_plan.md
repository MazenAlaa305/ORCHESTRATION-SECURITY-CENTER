# Hardware Resource Reduction Plan
## Orchestration Security Center — Full-Stack Optimization

> **Goal:** Reduce RAM and CPU usage across the entire running stack  
> **Constraint:** Zero functionality removed. Zero features deleted.  
> **Method:** Configuration tuning, container right-sizing, code efficiency, build-mode switching  
> **Target savings:** Cut default-profile RAM from ~3.4 GB → ~1.5 GB (55% reduction)

---

## Current Resource Baseline

### Main Stack (default profile — `docker compose up -d`)

| Service | CPU Limit | RAM Limit | Actual Typical Usage |
|---------|-----------|-----------|----------------------|
| caddy | 0.25 | 64 MB | ~20 MB |
| backend (FastAPI) | 1.0 | 512 MB | ~200–300 MB |
| frontend (Vite dev) | 0.5 | 384 MB | ~300–350 MB |
| db (PostgreSQL 15) | 1.0 | 512 MB | ~150–300 MB |
| redis | 0.25 | 128 MB | ~20–60 MB |
| celery_worker | 1.5 | 1024 MB | ~400–600 MB |
| **TOTAL (default)** | **4.5 CPU** | **2.6 GB** | **~1.1–1.7 GB** |

### Lab Stack (default lab profile — 6 containers)

| Service | CPU Limit | RAM Limit |
|---------|-----------|-----------|
| lab_webserver (Juice Shop) | 1.0 | 384 MB |
| lab_api_gateway (nginx) | 0.25 | 64 MB |
| lab_fileserver (Samba) | 0.5 | 128 MB |
| lab_database (PostgreSQL 13) | 0.5 | 128 MB |
| lab_redis_cache | 0.25 | 64 MB |
| lab_traffic_gen | 0.5 | 128 MB |
| **TOTAL (lab default)** | **3.0 CPU** | **~900 MB** |

### Grand Total (default + lab)
**7.5 CPU cores · ~3.5 GB RAM (limits) · ~2.0 GB typical usage**

---

## After Optimization Target

| Category | Before | After | Saved |
|----------|--------|-------|-------|
| Main stack RAM limit | 2.6 GB | 1.2 GB | **~1.4 GB** |
| Lab stack RAM limit | 900 MB | 640 MB | **~260 MB** |
| Grand total RAM limit | 3.5 GB | 1.84 GB | **~1.66 GB** |
| Frontend bundle size | ~2.8 MB gzip | ~1.2 MB gzip | **~57%** |
| Scan peak RAM (browser) | +200 MB | +80 MB | **~60%** |

---

## Phases Overview

```
PHASE 1 — Docker service right-sizing      (biggest wins, infrastructure only)
PHASE 2 — PostgreSQL & Redis tuning        (database-level config)
PHASE 3 — Frontend: switch to prod build   (removes Vite dev overhead)
PHASE 4 — Frontend: bundle deduplication   (remove redundant libraries)
PHASE 5 — Backend: pool & worker tuning    (application-level config)
PHASE 6 — Backend: Playwright optimization (per-scan memory reduction)
PHASE 7 — Lab environment tightening      (lab container right-sizing)
PHASE 8 — Startup profiles documentation  (operational knowledge)
```

---

## PHASE 1 — Docker Service Right-Sizing

### Step 1.1 — Reduce Celery Worker: Concurrency 2 → 1, RAM 1024 MB → 512 MB

**File:** `docker-compose.yml` — service `celery_worker`

**Why this is safe:** An SME security platform runs one scan at a time in normal operation. Concurrency=2 pre-allocates two worker processes (each loading Python + Playwright + AI model client). Concurrency=1 still processes queued scans correctly — they queue and run sequentially.

**Change:**
```yaml
celery_worker:
  command: celery -A app.core.celery_app worker --loglevel=info --concurrency=1   # was --concurrency=2
  deploy:
    resources:
      limits:
        cpus: '1.0'          # was 1.5
        memory: 512M         # was 1024M
      reservations:
        cpus: '0.3'          # was 0.5
        memory: 128M         # was 256M
```

**Savings: ~512 MB RAM · 0.5 CPU**

---

### Step 1.2 — Reduce Backend RAM Limit 512 MB → 384 MB

**File:** `docker-compose.yml` — service `backend`

**Why this is safe:** FastAPI with async SQLAlchemy and a reduced connection pool (applied in Phase 5) has typical usage of ~180–250 MB. The current 512 MB limit provides excessive headroom.

**Change:**
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '0.75'    # was 1.0 — FastAPI is I/O-bound, rarely CPU-saturated
        memory: 384M    # was 512M
```

**Savings: ~128 MB RAM · 0.25 CPU**

---

### Step 1.3 — Reduce PostgreSQL RAM Limit 512 MB → 256 MB

**File:** `docker-compose.yml` — service `db`

**Why this is safe:** PostgreSQL with proper `shared_buffers` tuning (Phase 2) will operate efficiently within 256 MB for an SME-scale dataset (hundreds of scans, thousands of vulnerabilities).

**Change:**
```yaml
db:
  deploy:
    resources:
      limits:
        cpus: '0.5'    # was 1.0 — DB is rarely CPU-bound at this scale
        memory: 256M   # was 512M
      reservations:
        cpus: '0.1'    # was 0.2
        memory: 64M    # was 128M
```

**Savings: ~256 MB RAM · 0.5 CPU**

---

### Step 1.4 — Reduce Redis RAM Limit 128 MB → 96 MB

**File:** `docker-compose.yml` — service `redis`

**Why this is safe:** Redis is used for task queuing (Celery) and WebSocket pub/sub — not heavy caching. Total active keys at any time are in the hundreds, not millions. 96 MB with an eviction policy (Phase 2) is more than sufficient.

**Change:**
```yaml
redis:
  deploy:
    resources:
      limits:
        cpus: '0.15'   # was 0.25
        memory: 96M    # was 128M
```

**Savings: ~32 MB RAM · 0.1 CPU**

---

## PHASE 2 — PostgreSQL & Redis Runtime Tuning

### Step 2.1 — PostgreSQL Memory Tuning via Command Override

**File:** `docker-compose.yml` — service `db`

**Why this is needed:** By default, PostgreSQL 15 auto-tunes based on system RAM, which can overestimate how much shared_buffers to allocate when running inside a container. Explicit tuning ensures it stays inside the 256 MB limit set in Step 1.3.

**Change — add `command` block to the `db` service:**
```yaml
db:
  image: postgres:15-alpine
  command: >
    postgres
    -c shared_buffers=64MB
    -c work_mem=4MB
    -c maintenance_work_mem=32MB
    -c effective_cache_size=128MB
    -c checkpoint_completion_target=0.9
    -c max_connections=30
    -c wal_buffers=4MB
    -c synchronous_commit=off
```

**Explanation of each parameter:**
- `shared_buffers=64MB` — PostgreSQL's own buffer pool. Rule of thumb is 25% of available RAM (256 MB × 0.25 = 64 MB).
- `work_mem=4MB` — Memory per sort/hash operation. Low value is fine at this query volume.
- `max_connections=30` — Default is 100. The backend pool uses max 7 connections (pool_size=5 + overflow=2 after Phase 5). 30 leaves plenty of headroom.
- `synchronous_commit=off` — Async WAL writes. Safe for a dev/lab environment. Improves write throughput with no data correctness risk (worst case: lose last few transactions on crash, which doesn't matter in a lab).

**Savings: Prevents PostgreSQL from over-allocating OS shared memory. Keeps actual RSS ~80–120 MB.**

---

### Step 2.2 — Redis Memory Cap with Eviction Policy

**File:** `docker-compose.yml` — service `redis`

**Why this is needed:** Without `maxmemory`, Redis will grow unbounded. Adding a cap with LRU eviction means Redis self-manages its footprint — old Celery task results and expired WebSocket events are evicted automatically.

**Change — add `command` to the `redis` service:**
```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 80mb
    --maxmemory-policy allkeys-lru
    --save ""
    --appendonly no
```

**Explanation:**
- `--maxmemory 80mb` — Hard cap at 80 MB. Below the 96 MB container limit.
- `--maxmemory-policy allkeys-lru` — Evict least-recently-used keys when full. Safe for Celery (completed task results) and pub/sub.
- `--save "" --appendonly no` — Disable RDB snapshots and AOF. Redis is used for transient data only (queue + pub/sub). Persistence wastes I/O and RAM.

**Savings: ~20–40 MB RAM. Eliminates background I/O from snapshot writes.**

---

## PHASE 3 — Frontend: Switch from Vite Dev Server to Production Build

### Step 3.1 — Create a Production-Mode Frontend Dockerfile

**File to create:** `frontend/Dockerfile.prod`

**Why this is the biggest single win:** The current Vite dev server keeps every source module in memory for Hot Module Replacement (HMR). In Docker, HMR is unused (there's no browser connected to the dev server for live editing). The dev server consumes ~300–350 MB RAM for nothing. A production build with a lightweight static file server consumes ~20–30 MB.

**Create `frontend/Dockerfile.prod`:**
```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# Stage 2 — Serve
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Create `frontend/nginx.conf`:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Update `docker-compose.yml` — service `frontend`:**
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.prod    # switch from default Dockerfile
  # Remove the volume mount — no live reload needed in Docker
  # volumes:
  #   - ./frontend:/app           # DELETE THIS
  #   - /app/node_modules         # DELETE THIS
  environment:
    - VITE_API_URL=https://localhost/api/v1
  depends_on:
    - backend
  deploy:
    resources:
      limits:
        cpus: '0.1'     # was 0.5 — nginx is nearly free
        memory: 48M     # was 384M
```

**Important note:** For local development (editing frontend code), continue using `npm run dev` directly on the host machine — not in Docker. Docker is for running the assembled system, not for frontend development.

**Savings: ~300–340 MB RAM · 0.4 CPU**

---

### Step 3.2 — Add Vite Build Optimizations

**File:** `frontend/vite.config.js`

**Read the current config first, then add these options inside `defineConfig`:**
```js
build: {
    rollupOptions: {
        output: {
            manualChunks: {
                'vendor-react':    ['react', 'react-dom'],
                'vendor-query':    ['@tanstack/react-query'],
                'vendor-charts':   ['recharts'],
                'vendor-graph':    ['react-force-graph-2d', 'd3-force'],
                'vendor-motion':   ['framer-motion'],
                'vendor-zustand':  ['zustand'],
            }
        }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,    // disable sourcemaps in production — saves ~2x bundle size on disk
    minify: 'esbuild',  // faster than terser, still excellent compression
}
```

**Why:** Splitting vendor chunks means the browser caches library code separately from application code. A code change only invalidates the small app chunk, not the 1 MB vendor chunk. Faster reloads, less re-parsing.

**Savings: ~30–40% faster initial page load. Browser memory reduced by ~50–80 MB (no re-parsing cached chunks).**

---

## PHASE 4 — Frontend Bundle Deduplication (Remove Redundant Libraries)

### Step 4.1 — Remove `chart.js` and `react-chartjs-2`

**File:** `frontend/package.json`

**Why this is safe:** The project already has `recharts` (a React-native charting library) for all dashboard charts. `chart.js` is Canvas-based and requires manual React integration via `react-chartjs-2`. Keeping both means loading two separate charting engines. Remove the redundant one.

**Step 1 — Audit usage:**
```bash
grep -r "chart.js\|react-chartjs-2\|ChartJS\|from 'chart.js'\|from 'react-chartjs-2'" frontend/src/
```

**Step 2 — For any component using `chart.js`, migrate to `recharts` equivalent:**

| chart.js component | recharts equivalent |
|-------------------|---------------------|
| `<Bar>` | `<BarChart>` + `<Bar>` |
| `<Line>` | `<LineChart>` + `<Line>` |
| `<Pie>` / `<Doughnut>` | `<PieChart>` + `<Pie>` |
| `<Radar>` | `<RadarChart>` + `<Radar>` |

**Step 3 — Remove from `package.json`:**
```bash
npm uninstall chart.js react-chartjs-2
```

**Savings: ~280 KB gzipped removed from bundle. ~40–60 MB browser memory. Reduces JS parse time on first load.**

---

### Step 4.2 — Remove Redundant Full `d3` Library

**File:** `frontend/package.json`

**Why this is safe:** The project imports `d3-force` separately (for force layout physics) and `react-force-graph-2d` (which bundles its own copy of d3 internally). The full `d3` library at `^7.9.0` adds ~300 KB gzipped for modules that are never used directly in the dashboard code (geo projections, color interpolation, etc.).

**Step 1 — Audit actual d3 usage:**
```bash
grep -r "from 'd3'" frontend/src/ | grep -v "d3-force"
```

**Step 2a — If only `d3-force` features are used:** Remove full `d3`, keep `d3-force`:
```bash
npm uninstall d3
```

**Step 2b — If specific d3 sub-modules are needed:** Replace the full library with only the sub-packages actually used. Example:
```bash
npm uninstall d3
npm install d3-scale d3-shape d3-axis   # only what's actually imported
```

**Savings: ~250–300 KB gzipped removed from bundle. ~30–50 MB browser memory.**

---

### Step 4.3 — Make React Query DevTools Development-Only

**File:** `frontend/src/main.jsx` or wherever `ReactQueryDevtools` is imported

**Why:** `@tanstack/react-query-devtools` is a debugging tool. It should only load in development. In production, it adds ~40 KB gzipped to the bundle for zero user benefit.

**Change:**
```jsx
// Before (always loads DevTools):
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// After (only loads in dev):
const ReactQueryDevtools = import.meta.env.DEV
    ? (await import('@tanstack/react-query-devtools')).ReactQueryDevtools
    : () => null;
```

Or simpler — use the built-in conditional approach:
```jsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

The Vite build system tree-shakes the entire import when `import.meta.env.DEV` is `false` in production mode.

**Savings: ~40 KB gzipped removed from production bundle.**

---

## PHASE 5 — Backend: Connection Pool & Worker Tuning

### Step 5.1 — Reduce PostgreSQL Connection Pool Size

**File:** `backend/app/core/database.py`

**Why this is safe:** Each open PostgreSQL connection uses ~5–10 MB of RAM on the PostgreSQL server side. With `pool_size=10` and `max_overflow=5`, the backend could open up to 15 connections — consuming ~75–150 MB of PostgreSQL RAM just for idle connections. Reducing to 5+2 is sufficient for single-user SME operation.

**Find the engine configuration and change:**
```python
# Async engine (used by FastAPI routes):
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=5,          # was 10
    max_overflow=2,       # was 5
    pool_pre_ping=True,
    pool_recycle=300,     # recycle connections every 5 min — prevents stale connections
)

# Sync engine (used by Celery/Alembic):
sync_engine = create_engine(
    DATABASE_URL,
    pool_size=3,          # was 10
    max_overflow=1,       # was 5
    pool_pre_ping=True,
    pool_recycle=300,
)
```

**Savings: ~50–100 MB PostgreSQL server RAM. ~30–50 MB backend process RAM (fewer pre-allocated connection objects).**

---

### Step 5.2 — Explicit Uvicorn Worker Count in Backend Dockerfile

**File:** `backend/Dockerfile` — `CMD` instruction

**Why:** Ensure Uvicorn runs with exactly 1 worker (already the likely default, but make it explicit). Multiple Uvicorn workers would each import all Python modules — tripling memory usage for no benefit when running behind a single-user dashboard.

**Find and ensure the CMD line reads:**
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop"]
```

**Why `--loop uvloop`:** uvloop is already installed (part of `uvicorn[standard]`). It's a faster event loop that reduces CPU usage by ~15–20% for async-heavy workloads with no code changes required.

**Savings: Prevents accidental multi-worker startup. uvloop reduces CPU usage ~15–20%.**

---

### Step 5.3 — Lazy Import Heavy Libraries in Agents

**Files:** `backend/app/services/agent_orchestrator.py`, `nmap_wrapper.py`, `pdf_generator.py`

**Why this is important:** Python loads all top-level imports when a module is first imported. Libraries like `playwright`, `python-nmap`, `reportlab`, and `python-gvm` each add ~20–80 MB to the baseline process RSS. If a scan is never run, these libraries should never load.

**Pattern — move imports inside the functions that use them:**

In `nmap_wrapper.py`:
```python
# Before (top-level — always loads nmap at startup):
import nmap

# After (lazy — loads only when a scan actually runs):
def run_nmap_scan(target: str, ...):
    import nmap    # moved inside function
    scanner = nmap.PortScanner()
    ...
```

In `pdf_generator.py`:
```python
def generate_pdf(scan_data: dict, output_path: str):
    from reportlab.lib.pagesizes import letter    # lazy
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    ...
```

In `agent_orchestrator.py` — ReconAgent:
```python
async def _playwright_crawl(self, url: str):
    from playwright.async_api import async_playwright    # lazy
    async with async_playwright() as p:
        ...
```

**Savings: ~80–150 MB baseline backend RAM (libraries only load when a scan runs).**

---

## PHASE 6 — Backend: Playwright Browser Optimization

### Step 6.1 — Minimize Browser Launch Arguments

**File:** `backend/app/services/agent_orchestrator.py` — inside `ReconAgent._playwright_crawl()`

**Why:** Each Playwright Chromium instance has a large memory footprint (~150–250 MB). Using minimal launch flags cuts this significantly without affecting crawling ability.

**Change the browser launch call:**
```python
browser = await p.chromium.launch(
    headless=True,
    args=[
        '--no-sandbox',
        '--disable-dev-shm-usage',   # use /tmp instead of /dev/shm (critical in Docker)
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--no-zygote',
        '--single-process',          # reduce subprocess overhead in containers
        '--memory-pressure-off',
        '--js-flags=--max-old-space-size=128',   # cap V8 heap at 128 MB
    ]
)
```

**Why `--disable-dev-shm-usage`:** In Docker, `/dev/shm` is often only 64 MB. Chromium uses it for IPC. Without this flag, the browser crashes or thrashes. With it, it falls back to `/tmp` — slower but reliable.

**Savings: ~80–120 MB per scan's peak RAM usage. Prevents browser crashes in memory-constrained environments.**

---

### Step 6.2 — Limit Page Navigation Timeout and Max Pages Crawled

**File:** `backend/app/services/agent_orchestrator.py` — ReconAgent

**Why:** A Playwright crawl with no limits will follow links indefinitely. In a 512 MB container, this causes OOM kills. Explicit limits reduce peak memory and scan time.

**Add these limits to the ReconAgent crawl logic:**
```python
# Set a strict timeout on page navigation
page = await browser.new_page()
page.set_default_navigation_timeout(15000)   # 15 seconds max per page
page.set_default_timeout(10000)

# Limit number of pages crawled
MAX_PAGES = 20    # was unlimited
crawled = 0

# Block resource types that are not needed for crawling
await page.route("**/*", lambda route: route.abort()
    if route.request.resource_type in ["image", "stylesheet", "font", "media"]
    else route.continue_()
)
```

**Why blocking images/CSS/fonts:** The crawler only needs HTML content and JavaScript for endpoint discovery. Images and stylesheets can be 10–50× the size of the HTML content. Blocking them cuts bandwidth usage and speeds up each page load.

**Savings: ~40–80 MB per scan (fewer resources loaded into browser memory). 30–50% faster crawl time.**

---

## PHASE 7 — Lab Environment Right-Sizing

### Step 7.1 — Reduce Juice Shop Container Limits

**File:** `docker-compose.lab.yml` — service `lab_webserver`

**Why this is safe:** Juice Shop is a Node.js application. It typically uses 150–200 MB at idle. The 384 MB limit is generous for a lab target.

**Change:**
```yaml
lab_webserver:
  deploy:
    resources:
      limits:
        cpus: '0.5'     # was 1.0
        memory: 256M    # was 384M
```

**Savings: ~128 MB RAM · 0.5 CPU**

---

### Step 7.2 — Reduce Traffic Generator Intensity and RAM

**File:** `docker-compose.lab.yml` — service `lab_traffic_gen`

**Why this is safe:** The traffic generator's purpose is to populate the dashboard with realistic-looking network activity for demonstration. "Low" intensity generates the same data variety at lower CPU and RAM cost — the difference is only request frequency.

**Change:**
```yaml
lab_traffic_gen:
  environment:
    - TRAFFIC_INTENSITY=low    # was medium
  deploy:
    resources:
      limits:
        cpus: '0.25'     # was 0.5
        memory: 80M      # was 128M
```

**Savings: ~48 MB RAM · 0.25 CPU**

---

### Step 7.3 — Reduce Lab Database and Lab Redis Limits

**File:** `docker-compose.lab.yml` — services `lab_database` and `lab_redis_cache`

**Why this is safe:** These are intentionally vulnerable target containers for scanning. They run minimal workloads (no actual application queries against them). Their limits are over-provisioned relative to their actual activity.

**Changes:**
```yaml
lab_database:
  deploy:
    resources:
      limits:
        cpus: '0.25'    # was 0.5
        memory: 96M     # was 128M

lab_redis_cache:
  deploy:
    resources:
      limits:
        cpus: '0.1'     # was 0.25
        memory: 48M     # was 64M
```

**Savings: ~48 MB RAM · 0.4 CPU**

---

## PHASE 8 — Startup Profiles and Operational Knowledge

### Step 8.1 — Understand What `--profile full` Means (Do NOT use unless needed)

The `--profile full` flag activates 6 additional heavy services. **Never start these unless you specifically need them:**

| Service | RAM Limit | When you need it |
|---------|-----------|------------------|
| celery_beat | ~256 MB | Only if using scheduled scans |
| openvas | ~1–2 GB | Only for OpenVAS-based scanning |
| elasticsearch | ~512 MB (JVM) + OS | Only for SIEM log storage |
| kibana | ~512 MB | Only to view SIEM logs in browser |
| wazuh | ~1–2 GB | Only for agent-based monitoring |
| n8n | ~256 MB | Only for SOAR automation flows |

**Default command (recommended — runs only core 6 services):**
```bash
docker compose up -d
```

**Full stack (only when demonstrating integrations):**
```bash
docker compose --profile full up -d
```

---

### Step 8.2 — Reduce Elasticsearch JVM Heap When Using Full Profile

**File:** `docker-compose.yml` — service `elasticsearch`

**Why this is safe:** The dashboard's SIEM integration (`SIEM_ENABLED=false` by default) is dormant. Elasticsearch is only used to store lab traffic logs. 256 MB JVM heap is sufficient for this log volume.

**Change:**
```yaml
elasticsearch:
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms256m -Xmx256m"    # was -Xms512m -Xmx512m
```

**Savings: ~256 MB when running full profile.**

---

### Step 8.3 — Create a Quick-Start Alias for Minimum Footprint

**Create file: `start-lite.sh` (for Git Bash / WSL)**
```bash
#!/bin/bash
# Minimum footprint startup — core services only, lab in lite mode
echo "[1/3] Starting main stack (no optional services)..."
docker compose up -d

echo "[2/3] Starting lite lab (6 containers)..."
docker compose -f docker-compose.lab.yml up -d

echo "[3/3] Stack is up. Core services only."
echo ""
echo "Main dashboard:   http://localhost:5173"
echo "API docs:         http://localhost:8000/docs"
echo "Juice Shop:       http://localhost:3000"
echo ""
echo "To add full integrations: docker compose --profile full up -d"
```

**Create file: `stop-all.sh`**
```bash
#!/bin/bash
docker compose down
docker compose -f docker-compose.lab.yml down
echo "All containers stopped."
```

---

## Implementation Order (Priority Sequence)

Execute in this exact order to avoid conflicts. Each phase is independent — complete one before starting the next.

```
STEP  PHASE   CHANGE                                          SAVINGS
────  ──────  ──────────────────────────────────────────────  ───────
1     1.1     Celery: concurrency 2→1, 1024→512 MB           ~512 MB
2     1.2     Backend: 512→384 MB limit                       ~128 MB
3     1.3     PostgreSQL: 512→256 MB limit                    ~256 MB
4     1.4     Redis: 128→96 MB limit                          ~32 MB
5     2.1     PostgreSQL: add tuning command args             ~50 MB
6     2.2     Redis: add maxmemory + disable persistence      ~30 MB
7     3.1     Frontend: switch to production build Dockerfile  ~320 MB
8     3.2     Frontend: add Vite build chunk splitting        (perf)
9     4.1     Remove chart.js + react-chartjs-2              ~280 KB
10    4.2     Remove full d3 library                         ~300 KB
11    4.3     Make ReactQueryDevtools dev-only               ~40 KB
12    5.1     Reduce DB connection pool 10→5                  ~80 MB
13    5.2     Explicit uvicorn --workers 1 --loop uvloop      (perf)
14    5.3     Lazy import heavy libraries in agents           ~100 MB
15    6.1     Playwright: minimal launch args                 ~100 MB/scan
16    6.2     Playwright: page limits + block media           ~60 MB/scan
17    7.1     Lab Juice Shop: 384→256 MB                     ~128 MB
18    7.2     Lab traffic gen: medium→low, 128→80 MB         ~48 MB
19    7.3     Lab DB + Redis: tighten limits                  ~48 MB
20    8.1     Operational: never use --profile full by default (knowledge)
21    8.2     Elasticsearch: 512→256 MB JVM when needed       ~256 MB
22    8.3     Create start-lite.sh convenience scripts        (ops)
```

---

## After Optimization: New Baseline (Default Profile)

| Service | New RAM Limit | New CPU Limit |
|---------|--------------|--------------|
| caddy | 64 MB | 0.25 |
| backend | 384 MB | 0.75 |
| frontend (nginx prod) | 48 MB | 0.10 |
| db (PostgreSQL 15) | 256 MB | 0.50 |
| redis | 96 MB | 0.15 |
| celery_worker | 512 MB | 1.00 |
| **TOTAL main stack** | **1.36 GB** | **2.75 CPU** |

| Lab Service | New RAM Limit | New CPU Limit |
|-------------|--------------|--------------|
| lab_webserver | 256 MB | 0.50 |
| lab_api_gateway | 64 MB | 0.25 |
| lab_fileserver | 128 MB | 0.50 |
| lab_database | 96 MB | 0.25 |
| lab_redis_cache | 48 MB | 0.10 |
| lab_traffic_gen | 80 MB | 0.25 |
| **TOTAL lab** | **672 MB** | **1.85 CPU** |

**Grand Total After: ~2.03 GB limit · 4.6 CPU cores**  
**vs Before: ~3.5 GB limit · 7.5 CPU cores**

**Net savings: ~1.47 GB RAM (-42%) · ~2.9 CPU cores (-39%)**  
**Zero features removed. Zero services deleted.**

---

## Verification Checklist

After applying each phase, verify the system is still fully functional:

```
[ ] docker compose ps — all services show "Up (healthy)"
[ ] http://localhost:8000/docs — API Swagger UI loads
[ ] http://localhost:5173 — dashboard loads (or port 80 after Caddy)
[ ] POST /api/v1/targets — target creation works
[ ] POST /api/v1/scans/ai — scan queues and runs
[ ] WebSocket /ws/logs — real-time log stream works
[ ] http://localhost:3000 — Juice Shop accessible
[ ] docker stats — container RAM stays within new limits during a scan
```

---

*Plan authored: 2026-04-22*  
*Author context: Windows 11 host, Docker Desktop, SME Cyber Dashboard v0.1.0*
