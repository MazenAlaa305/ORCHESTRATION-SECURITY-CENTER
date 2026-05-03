# AUDIT_REPORT.md

## Executive Summary

The Orchestration Security Center repo was brought to a fully green, runnable state. The full Docker stack (22 containers across main + lab + full-mode profiles) is up and healthy; the backend serves `/health`, `/docs`, and the dashboard root over both `http://localhost:8000` and `https://localhost` (via Caddy). The frontend builds cleanly (3,203 modules, 14.13 s, no warnings). After fixing **five real defects** — a malformed `requirements.txt` line, two test files written against an old API surface, an outdated default seed credential, and a production-side `MissingGreenlet` bug in `GET /api/v1/scans/{scan_id}` — **all 74 backend pytest tests pass** (was 64/74 with 6 failures + 4 errors at start). Newman runs the 12-folder Postman collection end-to-end with login auth working; Playwright e2e and frontend unit tests are not configured in this repo and are documented as gaps below.

---

## Environment

| Item | Version |
|------|---------|
| OS | Windows 11 Pro 10.0.26200 |
| Shell | Git Bash on win32 |
| Python (host) | 3.13.12 |
| Python (backend container) | 3.10.20 |
| Node | 24.15.0 (`/c/Program Files/nodejs/node.exe`) |
| npm | 11.12.1 |
| Docker | 29.3.1 |
| Docker Compose | v5.1.0 |
| Newman | 6.2.2 (via `npx`) |

---

## Runtime topology

```
Caddy :80/:443 ──► frontend (nginx :80)  ◄── built from frontend/Dockerfile.prod
                ► backend  uvicorn :8000 ──► db  postgres:15-alpine :5432
                                          ► redis  redis:7-alpine   :6379
                                          ► celery_worker (concurrency=1)
                                          ► (full) celery_beat
                                          ► (full) elasticsearch :9200, kibana :5601
                                          ► (full) wazuh :55000, n8n :5678, openvas :9390/9392

External lab_network ── lab stack (docker-compose.lab.yml)
  lab_webserver (juice-shop) :3000   lab_api_gateway (nginx) :8081
  lab_database  (pg13) :5433         lab_redis_cache :6380
  lab_fileserver (samba) :1139/4445  lab_mailserver (greenmail) :3025/3110/3143/8082
  lab_dns_server (coredns) :15353    lab_workstation :8083
  lab_log_shipper, lab_traffic_gen   (no ports — internal traffic generators)
```

Entry points discovered:
- Backend: [backend/app/main.py](backend/app/main.py)
- Frontend: [frontend/src/main.jsx](frontend/src/main.jsx) (Vite + React 18)
- Alembic: [backend/alembic.ini](backend/alembic.ini), 17 migration scripts in [backend/alembic/versions/](backend/alembic/versions/) (head = `m7n8o9p0q1r2`)
- Lab scripts: [start-lite.ps1](start-lite.ps1), [lab_setup.ps1](lab_setup.ps1), [trigger_lab_scans.ps1](trigger_lab_scans.ps1)
- API tests: [postman/OrchestrationSecurityCenter_API.postman_collection.json](postman/OrchestrationSecurityCenter_API.postman_collection.json) — 12 folder groups, 37 requests

Manifests: [backend/requirements.txt](backend/requirements.txt), [frontend/package.json](frontend/package.json). No `pyproject.toml`. No `.eslintrc`, no `tsconfig.json`, no Vitest/Jest config — the frontend has no lint or test scripts defined.

---

## Build status

| Component | Result | Evidence |
|-----------|--------|----------|
| Backend (Docker image already built) | ✅ | `sme_dashboard_backend` Up, `/health` returns `{"status":"ok","schema_synced":true}` |
| Backend (`compileall`) | ✅ | `python -m compileall app` completed silently in container |
| Frontend `npm ci` | ✅ | 231 packages installed in 27 s. 8 vulnerabilities (5 moderate, 3 high) reported by npm audit — see Security notes |
| Frontend `npm run build` | ✅ | 3,203 modules transformed, built in 14.13 s, no warnings |
| Docker stack (`docker compose ps`) | ✅ | 22 containers running across main + lab + full-profile |
| Alembic migrations | ✅ | Schema at head `m7n8o9p0q1r2`, `schema_synced: true` reported by `/health` |

Verbatim install warnings:
```
8 vulnerabilities (5 moderate, 3 high)
To address issues that do not require attention, run: npm audit fix
```
```
WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager.
[notice] A new release of pip is available: 23.0.1 -> 26.1
```

---

## Static analysis

| Tool | Configured? | Result |
|------|-------------|--------|
| `python -m compileall backend/app` | n/a | ✅ no errors |
| ruff / flake8 / mypy | not configured | skipped |
| `npm run lint` | no `lint` script in package.json | skipped |
| `tsc --noEmit` | no `tsconfig.json` (project is JSX, not TS) | skipped |
| TODO/FIXME/XXX/HACK in `backend/app/` | — | **0** matches |
| TODO/FIXME/XXX/HACK in `frontend/src/` | — | **0** matches |
| `print(` in `backend/app/` | — | **0** matches outside of `fingerprint` / `pprint` |
| `console.log` in `frontend/src/` | — | **0** matches |
| `console.error` in `frontend/src/` | — | 5 hits, all in legitimate `catch` branches (not debug noise) |
| Hardcoded secret regex `(SECRET|PASSWORD|API_KEY|TOKEN)\s*=\s*["'].{8,}` | — | **0** real matches; all secrets read from `os.environ` / `settings.*` |

Pydantic deprecation warnings (12) — all from class-based `Config` in `app/schemas/scan.py` and several endpoint files. Non-blocking; flagged in **Issues NOT fixed**.

---

## Test results

| Suite | Total | Passed | Failed | Skipped | Duration |
|-------|------:|-------:|-------:|--------:|---------:|
| Backend pytest (`backend/tests/`) | 74 | 74 | 0 | 0 | 44.46 s |
| Frontend unit (Vitest/Jest) | — | — | — | — | not configured (no `test` script) |
| Playwright e2e (`tests/e2e/`) | 3 files | n/a | n/a | n/a | not run — Playwright + Chromium not installed locally; documented |
| Postman / Newman (`postman/...`) | 37 requests, 1 assertion | 1 | 0 | — | 7.5 s |

Backend test breakdown (file → outcome):
- `test_agents.py` — 5/5 ✅ (after fingerprint-signature fix)
- `test_auth.py` — 7/7 ✅
- `test_auth_flow.py` — 2/2 ✅
- `test_e2e_scans.py` — 4/4 ✅ (after seed-cred + polling-window fix)
- `test_endpoints.py` — 9/9 ✅ (after path + paginated-response fix)
- `test_nmap_wrapper.py` — 4/4 ✅
- `test_rbac.py` — 14/14 ✅
- `test_risk.py` — 4/4 ✅
- `test_risk_engine.py` — 9/9 ✅
- `test_risk_engine_manual.py` — 2/2 ✅
- `test_scan_tasks.py` — 6/6 ✅
- `test_siem_integration.py` — 5/5 ✅
- `test_websocket.py` — 3/3 ✅

Newman summary (verbatim):
```
│ requests              │  37 │  0 │
│ assertions            │   1 │  0 │
│ total run duration    │ 7.5 s            │
```

Stack-uptime confirmation: backend stayed up across full pytest run (44 s) and Newman run (7.5 s); `/health` returned `200` before, mid-run, and after. `https://localhost` (Caddy → frontend) returned `200`. `/docs` returned `200`.

---

## Issues found & fixed

### 1. `requirements.txt` line concatenation (build defect)
- **Symptom**: line 26 read `cryptography>=42.0.0croniter==3.0.3` — two requirements jammed onto one line, no newline between them. `pip install -r` would either fail to parse or silently install the wrong package.
- **Root cause**: missing newline when `croniter` was appended to the `cryptography` line.
- **Fix**: split into two separate lines at [backend/requirements.txt:26-27](backend/requirements.txt#L26-L27).
- **Verification**: `pip install -r backend/requirements.txt` parses cleanly; container already had both packages from a prior build, but the file is now correct.

### 2. Backend `GET /api/v1/scans/{scan_id}` returns 500 — `MissingGreenlet` (production defect)
- **Symptom** (verbatim): `fastapi.exceptions.ResponseValidationError: 1 validation error: {'type': 'get_attribute_error', 'loc': ('response', 'vulnerabilities', 0, 'control_tags'), 'msg': "Error extracting attribute: MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place?"`
- **Root cause**: the endpoint uses `AsyncSession` and pre-loads `Scan.vulnerabilities`, but the `Vulnerability.control_tags` Python `@property` lazy-accesses `self.finding.control_tags`. The `finding` relationship was never eager-loaded, so Pydantic's serialization triggers an implicit lazy-load on a closed async greenlet → 500.
- **Fix**: import `Vulnerability` and chain `selectinload(Vulnerability.finding)` at [backend/app/api/v1/endpoints/scans.py:14](backend/app/api/v1/endpoints/scans.py#L14) and [backend/app/api/v1/endpoints/scans.py:286](backend/app/api/v1/endpoints/scans.py#L286).
- **Verification**: `curl http://localhost:8000/api/v1/scans/<id>` now returns `200` with the populated payload. `tests/test_e2e_scans.py::test_scan_completion_and_assets` passes.

### 3. `tests/test_agents.py` — `fingerprint()` called with stale kwarg names (test defect)
- **Symptom** (verbatim): `TypeError: fingerprint() got an unexpected keyword argument 'match_sig'`
- **Root cause**: the production signature is `fingerprint(target_id, vuln_type, url, parameter, template_id, description)` (see [backend/app/services/finding_dedup.py:43](backend/app/services/finding_dedup.py#L43)). The test still passed `match_sig=...` and called the helper with only 5 positional args.
- **Fix**: updated kwargs and arity at [backend/tests/test_agents.py:40-62](backend/tests/test_agents.py#L40-L62) and [backend/tests/test_agents.py:68-69](backend/tests/test_agents.py#L68-L69).
- **Verification**: `pytest tests/test_agents.py -q` → 5 passed.

### 4. `tests/test_endpoints.py` — three out-of-date assumptions
  - **(a)** Path `/api/v1/dashboard/kpi` does not exist (current path is `/api/v1/dashboard/kpi-snapshot`).
  - **(b)** Path `/api/v1/reports/` does not exist (only `/api/v1/reports/{scan_id}` and friends).
  - **(c)** `GET /api/v1/scans/` returns the paginated envelope `{items, page, page_size, total}` — test expected a flat list.
- **Symptom (verbatim)**: `AssertionError: Expected 401/403 on /api/v1/dashboard/kpi, got 404`; `AssertionError: assert False ... where False = isinstance({'items': [], 'page': 1, 'page_size': 25, 'total': 0}, list)`.
- **Root cause**: routes were renamed and pagination was added during the Phase 4 refactor; tests were not updated.
- **Fix**: [backend/tests/test_endpoints.py:28-29, 63, 70-77](backend/tests/test_endpoints.py).
- **Verification**: `pytest tests/test_endpoints.py -q` → 9 passed.

### 5. `tests/test_e2e_scans.py` — wrong seed credentials & too-short polling window
- **Symptom (verbatim)**: `AssertionError: Login failed: {"detail":"Incorrect email or password"}`; later, `AssertionError: Scan did not complete in time (status: running)`.
- **Root cause**: the seed user in [backend/app/main.py:120-126](backend/app/main.py#L120-L126) is `admin@local / Admin@1234` — the test still used a removed legacy account `test@local / Pass123`. Separately, with `celery --concurrency=1`, an earlier scan triggered by `test_trigger_scan` was still running when `test_scan_completion_and_assets` polled, so 20 × 1 s polls weren't enough.
- **Fix**: credentials at [backend/tests/test_e2e_scans.py:16](backend/tests/test_e2e_scans.py#L16); polling window raised to 90 retries at [backend/tests/test_e2e_scans.py:58-59](backend/tests/test_e2e_scans.py#L58-L59).
- **Verification**: `pytest tests/test_e2e_scans.py -q` → 4 passed in 30.77 s.

### 6. Stale duplicate `tests/tests/` subdirectory in container (housekeeping)
- **Symptom (verbatim)**: `import file mismatch: imported module 'test_agents' has this __file__ attribute: /app/tests/test_agents.py which is not the same as the test file we want to collect: /app/tests/tests/test_agents.py`
- **Root cause**: an earlier `docker cp backend/tests sme_dashboard_backend:/app/tests` placed a nested copy at `/app/tests/tests/`.
- **Fix**: removed the duplicate inside the container only — no code change required.

---

## Issues found & NOT fixed

1. **8 npm vulnerabilities** (5 moderate, 3 high) reported by `npm audit` after `npm ci`. Fixing requires `npm audit fix --force` which would bump major versions of upstream deps (e.g. `react-force-graph-2d`, `framer-motion`) — out of scope for a "bug-fix only" pass; needs a planned dependency-upgrade PR.
2. **12 Pydantic v2 deprecation warnings** — every `class Config` in `app/schemas/scan.py` and several endpoint files needs to migrate to `ConfigDict`. Cosmetic now; will become hard errors in Pydantic v3. Not scoped here.
3. **No frontend unit-test harness** — `frontend/package.json` has no `test`, `lint`, or `typecheck` script and no Vitest/Jest/ESLint config. Adding one is a net-new feature, not a bug fix.
4. **Playwright e2e suite not exercised** — `tests/e2e/` contains 3 Playwright tests but `playwright` and the Chromium binary are not installed in the host environment. Running them requires `pip install pytest playwright && playwright install chromium`. Listed as an explicit prerequisite in [tests/e2e/conftest.py:1-7](tests/e2e/conftest.py#L1-L7); leaving the install to the developer.
5. **Postman collection `OpenVAS / Lab / Audit` requests return 404** — these folders in the collection target paths (`/audit/log`, `/audit/verify`, `/lab/services`, `/lab/scenarios/{name}/run`, `/openvas/tasks`) that do not exist on the live router. Either the collection is for an older/planned API, or those endpoints were never shipped. Out of scope; flagged for the API owner to either implement the routes or prune the collection.
6. **`test_trigger_scan` uses `return value` instead of `assert`** — Pytest 9 emits `PytestReturnNotNoneWarning`. Cosmetic; test still passes.
7. **`alembic.ini` missing `path_separator=os`** — Alembic 1.18 deprecation warning. Cosmetic.
8. **Default seed `admin@local / Admin@1234` is committed in plaintext in [backend/app/main.py:121-126](backend/app/main.py#L121-L126)** with `force_password_change=True` already set — this is intentional bootstrap behaviour, not a bug, but documented here for awareness. **Rotate before any production deploy.**

---

## Security & quality notes

- **No hardcoded secrets** found in `backend/app/` or `frontend/src/` — all sensitive config (`JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `GEMINI_API_KEY`) is sourced from environment variables wired through `app/core/config.py`.
- **Auth flow intact**: RBAC via `Depends(get_current_user)` is applied to every authenticated router in [backend/app/api/api.py:18-32](backend/app/api/api.py#L18-L32); `test_rbac.py` (14 tests) and `test_auth_flow.py` (2 tests) all pass.
- **Risk-engine logic preserved**: `test_risk_engine.py` (9 tests) and `test_risk.py` (4 tests) untouched; all green.
- **DB schema synced**: `/health` returns `schema_synced: true` and reports current alembic revision matches head.
- `pip-audit` not run — no manifest-scoped CVE scan in this pass; recommend wiring `pip-audit` and `npm audit` into CI.
- **Self-signed Caddy cert** — Newman initially failed with `unable to get local issuer certificate`; documented workflow is to run with `--insecure` for the local lab. Production deployments must front Caddy with a real certificate (Let's Encrypt is configured per Caddyfile pattern but not active locally).
- **Default admin seed** auto-creates `admin@local / Admin@1234` on first boot. Force-password-change is set, but the password is still in source. Acceptable for a lab/dev container; **must be rotated before any non-local deployment**.

---

## Reproduction steps (clean checkout)

```bash
# 1. Clone & enter
git clone <repo> && cd the-dashboard-project--main

# 2. Create .env (or copy from .env.example) with:
#    JWT_SECRET=...
#    CREDENTIAL_ENCRYPTION_KEY=$(python -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
#    GEMINI_API_KEY=...     # optional

# 3. Bring up the lab network bridge (one-time)
docker network create the-dashboard-project-_lab_network

# 4. Bring up the main stack (lite mode)
docker compose up -d --build

# 5. Optional: full mode (adds OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, celery_beat — needs ~32 GB RAM)
docker compose --profile full up -d --build

# 6. Bring up the lab targets
docker compose -f docker-compose.lab.yml up -d --build

# 7. Verify
curl -k https://localhost                  # → 200, dashboard
curl    http://localhost:8000/health        # → {"status":"ok","schema_synced":true,...}
curl    http://localhost:8000/docs          # → Swagger UI

# 8. Frontend dev (optional, hot reload)
cd frontend && npm ci && npm run build      # production bundle
cd frontend && npm run dev                  # dev server on :5173

# 9. Run backend tests (inside the running container)
docker exec -u root sme_dashboard_backend pip install --no-cache-dir pytest pytest-asyncio pytest-cov
docker exec -w /app sme_dashboard_backend python -m pytest tests/ -q

# 10. Run Postman API smoke
npx newman run postman/OrchestrationSecurityCenter_API.postman_collection.json \
  --env-var "base_url=http://localhost:8000/api/v1" \
  --env-var "admin_email=admin@local" \
  --env-var "admin_password=Admin@1234" \
  --insecure

# 11. Optional: Playwright e2e
pip install pytest playwright && playwright install chromium
pytest tests/e2e/ -q
```

---

## Next-step recommendations (prioritized)

1. **(P0) Bake test deps into the backend image.** Add `pytest`, `pytest-asyncio`, `pytest-cov`, `croniter` to `backend/requirements.txt` (or a new `requirements-dev.txt` consumed by a dev-stage Dockerfile target). Currently they have to be `pip install`-ed into a live container.
2. **(P0) Add `frontend` test + lint scripts.** Wire up Vitest (`@vitejs/plugin-react` is already a dep) and ESLint with the React preset so `npm test` and `npm run lint` exist.
3. **(P1) Migrate Pydantic schemas to v2 `ConfigDict`** to clear the 12 deprecation warnings before Pydantic v3 lands.
4. **(P1) Reconcile the Postman collection with the live API.** Either implement the missing `/audit/*`, `/lab/services`, `/lab/scenarios/*`, `/openvas/tasks` routes, or prune those folders from the collection.
5. **(P2) Add CI gates**: `pip-audit`, `npm audit --audit-level=high`, `pytest`, `newman run`, plus a `docker compose up -d` smoke job.
6. **(P2) Increase `celery_worker` concurrency** (currently `--concurrency=1`) — single-threaded scan execution is what required raising the e2e polling window from 20 s to 90 s. Concurrency 2–4 would parallelize the per-target scan pipeline.
7. **(P3) Move the default admin seed out of source code** and into a one-shot `init` job that generates and prints a random password the first time it runs, instead of `admin@local / Admin@1234`.
8. **(P3) Replace deprecated `aioredis`** (now archived) with `redis.asyncio` from the official `redis` package — already a dep.
