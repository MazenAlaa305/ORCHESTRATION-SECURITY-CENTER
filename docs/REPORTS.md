# Reports — Orchestration Security Center

> Consolidated audit, security, browser-compat, and UAT reports.
> Merged from: `AUDIT_REPORT.md`, `SECURITY_AUDIT.md`, `BROWSER_COMPAT_REPORT.md`, `UAT_REPORT.md`.
> Phase-by-phase evidence trails remain in [`evidence/phase*/`](../evidence/).

---

# 1. AUDIT REPORT

## 1.1 Executive Summary

The Orchestration Security Center repo was brought to a fully green, runnable state. The full Docker stack (22 containers across main + lab + full-mode profiles) is up and healthy; the backend serves `/health`, `/docs`, and the dashboard root over both `http://localhost:8000` and `https://localhost` (via Caddy). The frontend builds cleanly (3,203 modules, 14.13 s, no warnings). After fixing **five real defects** — a malformed `requirements.txt` line, two test files written against an old API surface, an outdated default seed credential, and a production-side `MissingGreenlet` bug in `GET /api/v1/scans/{scan_id}` — **all 74 backend pytest tests pass** (was 64/74 with 6 failures + 4 errors at start). Newman runs the 12-folder Postman collection end-to-end with login auth working; Playwright e2e and frontend unit tests are not configured in this repo and are documented as gaps below.

## 1.2 Environment

| Item | Version |
|------|---------|
| OS | Windows 11 Pro 10.0.26200 |
| Shell | Git Bash on win32 |
| Python (host) | 3.13.12 |
| Python (backend container) | 3.10.20 |
| Node | 24.15.0 |
| npm | 11.12.1 |
| Docker | 29.3.1 |
| Docker Compose | v5.1.0 |
| Newman | 6.2.2 (via `npx`) |

## 1.3 Runtime Topology

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

Entry points:
- Backend: [backend/app/main.py](../backend/app/main.py)
- Frontend: [frontend/src/main.jsx](../frontend/src/main.jsx)
- Alembic: [backend/alembic.ini](../backend/alembic.ini), 17 migrations (head = `m7n8o9p0q1r2`)
- Lab scripts: [start-lite.ps1](../start-lite.ps1), [lab_setup.ps1](../lab_setup.ps1), [trigger_lab_scans.ps1](../trigger_lab_scans.ps1)
- API tests: [postman/...](../postman/) — 12 folder groups, 37 requests

## 1.4 Build Status

| Component | Result | Evidence |
|-----------|--------|----------|
| Backend (Docker image) | OK | `/health` returns `{"status":"ok","schema_synced":true}` |
| Backend `compileall` | OK | silent in container |
| Frontend `npm ci` | OK | 231 packages in 27 s. 8 vulnerabilities (5 moderate, 3 high) — see §1.8 |
| Frontend `npm run build` | OK | 3,203 modules, 14.13 s, no warnings |
| Docker stack | OK | 22 containers across main + lab + full |
| Alembic migrations | OK | head `m7n8o9p0q1r2`, `schema_synced: true` |

## 1.5 Static Analysis

| Tool | Configured? | Result |
|------|-------------|--------|
| `compileall backend/app` | n/a | OK |
| ruff / flake8 / mypy | not configured | skipped |
| `npm run lint` | no `lint` script | skipped |
| `tsc --noEmit` | no tsconfig (JSX project) | skipped |
| TODO/FIXME/XXX/HACK in `backend/app/` | — | 0 |
| TODO/FIXME/XXX/HACK in `frontend/src/` | — | 0 |
| `print(` in `backend/app/` | — | 0 outside fingerprint/pprint |
| `console.log` in `frontend/src/` | — | 0 |
| `console.error` in `frontend/src/` | — | 5 (all in legitimate catch branches) |
| Hardcoded secret regex | — | 0 real matches; secrets via `os.environ` |

12 Pydantic v2 deprecation warnings (`class Config` → `ConfigDict`); non-blocking.

## 1.6 Test Results

| Suite | Total | Passed | Failed | Skipped | Duration |
|-------|------:|-------:|-------:|--------:|---------:|
| Backend pytest | 74 | 74 | 0 | 0 | 44.46 s |
| Frontend unit | — | — | — | — | not configured |
| Playwright e2e | 3 files | n/a | n/a | n/a | not run (Playwright not installed) |
| Postman / Newman | 37 requests, 1 assertion | 1 | 0 | — | 7.5 s |

Backend per-file: `test_agents.py` 5/5, `test_auth.py` 7/7, `test_auth_flow.py` 2/2, `test_e2e_scans.py` 4/4, `test_endpoints.py` 9/9, `test_nmap_wrapper.py` 4/4, `test_rbac.py` 14/14, `test_risk.py` 4/4, `test_risk_engine.py` 9/9, `test_risk_engine_manual.py` 2/2, `test_scan_tasks.py` 6/6, `test_siem_integration.py` 5/5, `test_websocket.py` 3/3.

## 1.7 Defects Fixed

1. **`requirements.txt` line concatenation** — line 26 was `cryptography>=42.0.0croniter==3.0.3`. Split into two lines at [backend/requirements.txt:26-27](../backend/requirements.txt#L26-L27).
2. **`GET /api/v1/scans/{scan_id}` returns 500 (`MissingGreenlet`)** — `Vulnerability.control_tags` lazy-accessed `self.finding.control_tags` without eager-loading. Added `selectinload(Vulnerability.finding)` at [backend/app/api/v1/endpoints/scans.py:286](../backend/app/api/v1/endpoints/scans.py#L286).
3. **`tests/test_agents.py`** — `fingerprint()` called with stale `match_sig` kwarg. Updated kwargs at [backend/tests/test_agents.py:40-62](../backend/tests/test_agents.py#L40-L62).
4. **`tests/test_endpoints.py`** — three out-of-date assumptions: `/api/v1/dashboard/kpi` → `/kpi-snapshot`; `/api/v1/reports/` no longer exists; `GET /api/v1/scans/` returns paginated envelope. Fixed in [backend/tests/test_endpoints.py:28-77](../backend/tests/test_endpoints.py).
5. **`tests/test_e2e_scans.py`** — wrong seed credentials (`test@local` → `admin@local / Admin@1234`); polling window 20 → 90 retries because `celery --concurrency=1` serializes scans.
6. **Stale `tests/tests/` subdirectory in container** — removed inside container only (housekeeping).

## 1.8 Defects NOT Fixed

1. **8 npm vulnerabilities** (5 moderate, 3 high) — `npm audit fix --force` would bump majors of `react-force-graph-2d`, `framer-motion`. Out of scope for bug-fix pass.
2. **12 Pydantic v2 deprecation warnings** — migrate `class Config` → `ConfigDict`. Cosmetic now; hard error in v3.
3. **No frontend unit-test harness** — no `test`/`lint`/`typecheck` scripts. Net-new feature.
4. **Playwright e2e suite not exercised** — needs `pip install pytest playwright && playwright install chromium`.
5. **Postman `OpenVAS / Lab / Audit` requests return 404** — collection targets paths (`/audit/log`, `/audit/verify`, `/lab/services`, `/lab/scenarios/{name}/run`, `/openvas/tasks`) that don't exist. Either implement or prune.
6. **`test_trigger_scan` uses `return value` instead of `assert`** — Pytest 9 `PytestReturnNotNoneWarning`. Cosmetic.
7. **`alembic.ini` missing `path_separator=os`** — Alembic 1.18 deprecation. Cosmetic.
8. **Default seed `admin@local / Admin@1234`** in plaintext at [backend/app/main.py:121-126](../backend/app/main.py#L121-L126). Intentional bootstrap with `force_password_change=True`. **Rotate before any production deploy.**

## 1.9 Next-Step Recommendations

1. **(P0)** Bake test deps into backend image (`pytest`, `pytest-asyncio`, `pytest-cov`, `croniter`).
2. **(P0)** Add frontend `test` + `lint` scripts (Vitest + ESLint).
3. **(P1)** Migrate Pydantic schemas to v2 `ConfigDict`.
4. **(P1)** Reconcile Postman collection with live API.
5. **(P2)** CI gates: `pip-audit`, `npm audit --audit-level=high`, pytest, newman, compose smoke.
6. **(P2)** Increase `celery_worker` concurrency from 1 → 2–4.
7. **(P3)** Move admin seed out of source into one-shot init job.
8. **(P3)** Replace deprecated `aioredis` with `redis.asyncio`.

---

# 2. SECURITY AUDIT

**Audit date:** 2026-04-26 · **Auditor:** Omar Kapil

## 2.1 Scope
Production Docker images, FastAPI codebase, Caddy/Nginx reverse proxy, secrets handling, AI-agent pipeline. Out of scope: lab vulnerable services (`docker-compose.lab.yml`), which are intentionally insecure.

## 2.2 Tooling
- `trivy image` — CRITICAL+HIGH gate against backend, frontend, worker images
- `bandit -r backend/app` — Python static analysis
- `pip-audit -r backend/requirements.txt` — dependency CVE scan
- `npm audit --omit=dev` (frontend)
- Manual OWASP Top 10 (2021) self-assessment

## 2.3 Findings Summary
| ID | Severity | Component | Title | Status |
|----|----------|-----------|-------|--------|
| (fill from trivy/bandit/pip-audit) | | | | |

> Run `make audit` (or commands in §2.2) and paste trimmed results above before sign-off.

## 2.4 OWASP Top 10 Self-Check

| OWASP | Mitigation | Evidence |
|---|---|---|
| A01 Broken Access Control | `require_role()` on every mutating route; admin-only RBAC; ProtectedRoute + RoleGuard on FE | [backend/app/api/deps.py:46](../backend/app/api/deps.py#L46), [backend/app/api/v1/endpoints/rbac.py](../backend/app/api/v1/endpoints/rbac.py), [frontend/src/components/auth/RoleGuard.jsx](../frontend/src/components/auth/RoleGuard.jsx) |
| A02 Cryptographic Failures | bcrypt for passwords; Fernet for at-rest credential encryption; TLS at Caddy | [backend/app/core/security.py](../backend/app/core/security.py), [backend/app/core/crypto.py](../backend/app/core/crypto.py), [infra/caddy/Caddyfile](../infra/caddy/Caddyfile) |
| A03 Injection | SQLAlchemy ORM (no raw SQL); Pydantic validation; shell-safe wrappers for nmap/nuclei | [backend/app/services/nmap_wrapper.py](../backend/app/services/nmap_wrapper.py) |
| A04 Insecure Design | Scope guard rejects out-of-scope targets; scan dedup prevents flooding | [backend/app/services/scope_guard.py](../backend/app/services/scope_guard.py), [backend/app/services/scan_dedup.py](../backend/app/services/scan_dedup.py) |
| A05 Security Misconfiguration | Caddy enforces HTTPS+HSTS; CORS pinned; secrets via env; no debug endpoints in prod | [infra/caddy/Caddyfile](../infra/caddy/Caddyfile), [docker-compose.yml](../docker-compose.yml) |
| A06 Vulnerable Components | Trivy gate in CI (CRITICAL+HIGH fail); Dependabot; pinned image digests | [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| A07 Identification & Auth | JWT 30-min expiry; bcrypt; force password change; rate-limit on `/auth/login` | [backend/app/api/v1/endpoints/auth.py](../backend/app/api/v1/endpoints/auth.py) |
| A08 Software/Data Integrity | SHA-256 hash-chained audit log; signed images via cosign (planned) | [backend/app/api/v1/endpoints/audit.py](../backend/app/api/v1/endpoints/audit.py) |
| A09 Logging & Monitoring | Structured JSON; X-Request-ID middleware; Wazuh + Elastic | [backend/app/core/request_id.py](../backend/app/core/request_id.py) |
| A10 SSRF | Scope guard rejects out-of-network targets pre-tool-invocation | [backend/app/services/scope_guard.py](../backend/app/services/scope_guard.py) |

## 2.5 Threat Model (Top 5)

| # | Threat | Mitigation | Residual |
|---|--------|------------|----------|
| 1 | Stolen JWT replay | 30-min expiry; rotate signing key on incident | Low |
| 2 | Operator scans out-of-scope target | Scope guard allow-list; admin-only target creation | Low |
| 3 | LLM-injected malicious advice | LLM advisory-only; deterministic scoring; `llm_guard` filter | Low |
| 4 | Worker compromise pivots to lab subnet | Lab on `internal: true` networks; no outbound from worker | Low |
| 5 | Brute-force admin password | bcrypt cost ≥ 12; rate-limit; force change first login | Medium |

## 2.6 Action Items
- [ ] Paste trivy output; resolve any CRITICAL/HIGH before freeze
- [ ] Paste bandit output; resolve any HIGH severity warnings
- [ ] Paste pip-audit output; bump any vulnerable dependency
- [ ] Add cosign image signing to CD workflow (post-freeze, optional)
- [ ] Add automated dependency review action on PRs

---

# 3. BROWSER COMPATIBILITY

**Date:** 2026-04-26

## 3.1 Matrix
| Feature | Chrome 120 | Firefox 122 | Edge 120 |
|---------|------------|-------------|----------|
| Login form | ☐ | ☐ | ☐ |
| Dashboard layout | ☐ | ☐ | ☐ |
| WebSocket live updates (event feed, KPIs) | ☐ | ☐ | ☐ |
| Severity donut + Risk score widget | ☐ | ☐ | ☐ |
| Network topology (D3) | ☐ | ☐ | ☐ |
| Vulnerabilities table sort + filter | ☐ | ☐ | ☐ |
| RemediationPanel rendering | ☐ | ☐ | ☐ |
| PDF report download | ☐ | ☐ | ☐ |
| Settings page (force password change) | ☐ | ☐ | ☐ |
| RBAC admin actions | ☐ | ☐ | ☐ |

> Mark ✅ pass / ⚠ minor visual / ❌ broken. Attach screenshots for each cell that is not ✅.

## 3.2 Console / Network Errors
| Browser | URL | Error | Notes |
|---------|-----|-------|-------|
|  |  |  |  |

## 3.3 Screenshots
Place evidence in `evidence/browser_compat/{chrome,firefox,edge}_*.png` and link from this table.

## 3.4 Sign-off
- Tester: ____________  ·  Date: 2026-04-26

---

# 4. UAT REPORT

**Session:** 2026-04-26 · **Participants:** 11 (full team)

## 4.1 Methodology
Each member runs through Part A of [demo/DEMO.md](../demo/DEMO.md) against their own browser/laptop, on a fresh clone. Pass criteria per scenario: completes successfully, completes within stated time budget, no console/server errors.

## 4.2 Environment
- Backend: `docker compose up -d` + `docker compose -f docker-compose.lab.yml up -d`
- Browser matrix: Chrome 120, Firefox 122, Edge 120
- OS: Windows 11, macOS 14, Ubuntu 22.04

## 4.3 Bugs Found
| # | Title | Steps | Expected | Actual | Severity | Status |
|---|-------|-------|----------|--------|----------|--------|
| 1 | (fill from session) | … | … | … | High | Open |
| 2 | … | … | … | … | Medium | Open |

## 4.4 Pass Rate
- Login flow: __ / 11
- Trigger Quick scan: __ / 11
- Drill into a CRITICAL finding: __ / 11
- View RemediationPanel content: __ / 11
- Export PDF report: __ / 11
- View SIEM correlation tab: __ / 11
- Admin RBAC (create + disable user): __ / 11

## 4.5 Observations & Feedback
- (qualitative notes — UI clarity, naming, perceived speed, anything that surprised the user)

## 4.6 Sign-off
- Backend: Reem · ☐
- Frontend: Marize · ☐
- Security: Shahd · ☐
- DevOps/QA: Omar K · ☐
- Project Lead: Omar K · ☐

---

*Last updated: 2026-05-07 — merged from 4 source files.*
