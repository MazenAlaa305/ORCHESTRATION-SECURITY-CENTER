# DR_descution — Orchestration Security Center: Complete Defense Study Guide

> **Audience:** All 11 team members preparing for the FYP oral defense (deadline July 2, 2026).
> **Purpose:** Single source of truth — read this and you can confidently explain (a) the entire platform and (b) your personal contribution.
> **How to use:** Read sections 1–3 cover-to-cover. Read your own per-member subsection in section 5 word-for-word. Skim sections 6–8 the morning of the defense.
> **Conventions:** File references are clickable links. `🚧 PLANNED` marks files that `project_plan.md` says must exist but were not yet present in the working tree at the time of writing. `⚠️ Verify` marks claims a team member must double-check before defending.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [End-to-End Data Flow](#3-end-to-end-data-flow)
4. [Detailed Function Reference](#4-detailed-function-reference)
5. [Per-Member Deep Dive (11 sections)](#5-per-member-deep-dive)
6. [Anticipated Q&A — Whole Project](#6-anticipated-qa--whole-project)
7. [Run / Demo Guide](#7-run--demo-guide)
8. [Glossary & Acronyms](#8-glossary--acronyms)

---

## 1. Project Overview

### 1.1 What is it?

**Orchestration Security Center** is an AI-driven Dynamic Application Security Testing (DAST) platform built for **Small-to-Medium Enterprises (SMEs)** that cannot afford a dedicated security team. It performs the full vulnerability-management lifecycle — discovery, exploitation simulation, validation, scoring, and executive reporting — and presents everything in a single React dashboard.

The product translates thousands of raw scanner alerts into a small list of prioritized, plain-English action items. Example chain: Nmap finds port 445 → the orchestrator narrows Nuclei to SMB-specific templates → confirmed findings are scored by CVSS-weighted maths → Gemini rewrites the technical detail in language an SME owner can read.

### 1.2 Goals

| Goal | How we meet it |
|------|----------------|
| Replace the need for an in-house security analyst | 4-stage automated agent pipeline + LLM advisory layer |
| Be defensible (no LLM hallucinations on findings) | Validation step is **deterministic reprobe**, not LLM verdict |
| Be safe to run against customer infrastructure | `ScopeGuard` + per-target `max_rps` + concurrency lock |
| Be auditable | SHA-256 hash-chained `AgentLog`; append-only DB trigger |
| Be operable on commodity hardware | "lite" mode on 16 GB RAM, full SIEM stack on 32 GB |

### 1.3 Target users

- SME IT administrators with no dedicated SecOps function
- Compliance officers needing PCI-DSS / HIPAA / ISO-27001 / GDPR mapping
- Educational and lab environments (the bundled lab is pedagogically vulnerable)
- DevOps teams who want a CI-friendly DAST scan API

### 1.4 Academic context

- **Programme:** HITU — Final Year Project (FYP), 2025–2026 cohort.
- **Team:** 11 students across 4 sub-teams (Backend/AI, Frontend, Security, DevOps/QA).
- **Team Leader:** Omar Kapil. **Today:** 2026-05-03 (week 12 of 16). Feature freeze gate: end of week 13. Defense: 2026-07-02.
- **Grading mix:** Live demo 40%, code & docs 20%, individual contribution 20%, presentation 10%, testing 10%. **The live demo is the single biggest determinant of the grade.**

### 1.5 ASCII architecture diagram

```
                    ┌────────────────────────────────────────────┐
                    │  Browser (Chrome / Firefox / Edge)         │
                    │  React 18 + Vite SPA — http://localhost    │
                    └───────────────┬────────────────────────────┘
                                    │ HTTPS (Caddy TLS) + WS
                                    ▼
                    ┌────────────────────────────────────────────┐
                    │  Caddy Reverse Proxy (port 80/443)         │
                    │  Routes / → frontend, /api → backend       │
                    └───────────────┬────────────────────────────┘
                                    │
              ┌─────────────────────┼────────────────────────┐
              ▼                     ▼                        ▼
   ┌──────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
   │  React Frontend  │   │  FastAPI Backend   │   │  WebSocket /ws/logs │
   │  Dashboard.jsx   │   │  Uvicorn (Py 3.10) │   │  Redis pub/sub      │
   │  RealTimeContext │   │  /api/v1/*         │   │  → frontend         │
   └──────────────────┘   └────────┬───────────┘   └─────────┬───────────┘
                                   │                         ▲
                                   ▼                         │
                          ┌──────────────────┐               │
                          │  Celery Worker   │───broadcast──┘
                          │  scan_tasks.py   │
                          └────────┬─────────┘
                                   │
                                   ▼  AgentOrchestrator.run_full_scan()
        ┌──────────────────────────────────────────────────────────┐
        │ Stage 1: ReconAgent       Nmap + Playwright crawler      │
        │ Stage 2: AttackAgent      Nuclei v3.3.8 (template-aware) │
        │ Stage 3: ValidationAgent  Deterministic reprobe + diff   │
        │ Stage 4: UnifiedRiskEngine CVSS env-score → 0–100        │
        │ Stage 5: ReportingAgent   Markdown + PDF + Gemini summary│
        └────────┬─────────────────────────────────────────────────┘
                 ▼
       ┌──────────────────────┐         ┌──────────────────────┐
       │ PostgreSQL 15        │         │ Redis 7 (broker +    │
       │ (SQLite fallback)    │         │ pub/sub + LRU cache) │
       └──────────────────────┘         └──────────────────────┘

       ┌──────────────────────────────────────────────────────────┐
       │ OPTIONAL (feature-flagged, "--profile full"):            │
       │  Wazuh + Elasticsearch + Kibana (SIEM)                   │
       │  OpenVAS / GVM (deep CVE scan)                           │
       │  n8n (SOAR auto-remediation)                             │
       └──────────────────────────────────────────────────────────┘

       ┌──────────────────────────────────────────────────────────┐
       │ LAB — docker-compose.lab.yml — 6 containers / 4 zones:   │
       │  DMZ (10.10.10/24)  : Juice Shop, API GW, DNS            │
       │  Corp (10.10.20/24) : Samba, GreenMail, workstation      │
       │  Data (10.10.30/24) : PostgreSQL, weak-creds Redis       │
       │  Mgmt (10.10.40/24) : traffic-gen, log-shipper           │
       └──────────────────────────────────────────────────────────┘
```

### 1.6 Tech stack (verified)

| Layer | Tech | Version | Owner sub-team |
|------|------|---------|----------------|
| Backend framework | FastAPI | latest | Backend/AI |
| ASGI server | Uvicorn (uvloop) | latest | Backend/AI |
| Language | Python | 3.10 | Backend/AI |
| ORM | SQLAlchemy | 2.0 (async) | Backend/AI |
| DB | PostgreSQL | 15 (asyncpg); SQLite fallback (aiosqlite) | Backend/AI |
| Migrations | Alembic | latest | Backend/AI |
| Task queue | Celery | latest, concurrency=1 | Backend/AI (Shaban) |
| Broker / pub-sub | Redis | 7, LRU eviction | Backend/AI (Shaban) |
| Auth | JWT (python-jose) + bcrypt | HS256, 8h TTL | Backend/AI (Reem) |
| Crypto | cryptography (Fernet) | symmetric, for stored creds | Backend/AI |
| LLM | Google `genai` SDK → Gemini 2.0 Flash | migrated from deprecated `google-generativeai` | Backend/AI (Yousef) |
| Scanners | Nmap, Nuclei v3.3.8 (pinned), OpenVAS/GVM | — | Security (Shahd) |
| Reports | ReportLab | latest | Backend/AI |
| Rate limiter | aiolimiter | 1.1+ | Backend/AI |
| Frontend | React | 18.2 | Frontend |
| Build tool | Vite | 5.0 | Frontend (Marize) |
| Styling | Tailwind | 3.3 (custom cyber theme) | Frontend (Rahma) |
| Server state | TanStack React Query | 5.0 | Frontend |
| Local state | Zustand + React Context | 4.4 | Frontend |
| HTTP | Axios | 1.6 | Frontend |
| Charts | Recharts 2.10, Chart.js | — | Frontend (Omnia) |
| Network graph | react-force-graph-2d 1.25 + D3 3.0+ | — | Frontend (Omnia) |
| Animations | Framer Motion 11.0 | — | Frontend |
| Reverse proxy | Caddy 2 (alpine) | TLS termination | DevOps (Omar K) |
| Containers | Docker + Compose | — | DevOps (Omar K) |
| SIEM | Wazuh 4.7.2, Elasticsearch 8.11.1, Kibana | optional | Security (Mariz) |
| SOAR | n8n | optional | Backend/AI (Shaban) |
| CI | GitHub Actions | lint + pytest + Docker build | DevOps (Omar K) |
| Test | pytest, pytest-asyncio, Playwright | — | QA (Yosef, Mazin) |

---

## 2. Repository Structure

### 2.1 Top-level tree

```
the-dashboard-project-/
├── backend/                     ← FastAPI app + Celery worker
│   ├── app/
│   │   ├── main.py              ← FastAPI entry, lifespan, /health, /ws/logs
│   │   ├── api/                 ← Routers + dependency injection
│   │   ├── core/                ← config, database, security, celery_app, crypto
│   │   ├── models/              ← SQLAlchemy ORM
│   │   ├── schemas/             ← Pydantic request/response shapes
│   │   └── services/            ← Agents, risk engine, scanners, integrations
│   ├── alembic/                 ← DB migrations
│   └── tests/                   ← pytest suite
├── frontend/                    ← React 18 + Vite SPA
│   └── src/
│       ├── App.jsx              ← Root, ProtectedRoute → LoginPage|Dashboard
│       ├── main.jsx             ← Provider stack
│       ├── pages/               ← Dashboard, LoginPage, SettingsPage
│       ├── layout/              ← Layout, Sidebar
│       ├── context/             ← Auth, RealTime, Config
│       ├── services/api.js      ← Axios client + service objects
│       ├── components/dashboard ← 25+ panels (StatCards, NetworkTopology…)
│       ├── components/ui/       ← Primitives (CyberButton, ProtectedRoute…)
│       ├── components/OpenVAS/  ← Optional GVM UI
│       └── hooks/useAuth.js
├── docker-compose.yml           ← Main 6-service stack
├── docker-compose.lab.yml       ← 6 vulnerable lab containers, 4 subnets
├── lab/                         ← Lab support (kibana dashboards, scenarios…)
├── infra/                       ← Caddy + nginx configs
├── postman/                     ← API collection for manual smoke tests
├── tests/e2e/                   ← Playwright E2E tests
├── .github/workflows/           ← CI (ci.yml) + CD (cd.yml)
├── lab_setup.ps1                ← Lab lifecycle: start/stop/seed
├── trigger_lab_scans.ps1        ← Triggers scans on every lab target
├── start-lite.ps1 / .sh         ← Low-RAM mode launcher
├── project_plan.md              ← Master plan + ownership map
├── HOW_TO_RUN.md                ← Setup guide
├── FYP_Documentation.md         ← Academic report
├── ARCHITECTURE_DIAGRAM.md      ← Mermaid system diagram
├── FINAL_PRESENTATION.md/.pptx  ← Defense slides
├── FINAL_DEMO_SCRIPT.md         ← Live-demo runbook
└── DR_descution.md              ← THIS FILE
```

### 2.2 Backend module responsibilities

| Module | Responsibility | Key file(s) |
|--------|----------------|-------------|
| `app/main.py` | FastAPI app factory, lifespan (orphan reaper, runtime config, admin seed, Redis listener), `/health`, `/ws/logs` | [main.py](backend/app/main.py) |
| `app/api/api.py` | Router registry; mounts `/auth` + `/config` as public, everything else behind `Depends(get_current_user)` | [api.py](backend/app/api/api.py) |
| `app/api/deps.py` | `get_db`, `get_current_user`, `require_role` factory | [deps.py](backend/app/api/deps.py) |
| `app/api/v1/endpoints/*` | 13 REST routers (one per domain) | see §4.2 |
| `app/core/config.py` | Pydantic-settings — reads `.env`, exposes `settings.*`, plus `load_runtime_overrides()` for DB-stored toggles | [config.py](backend/app/core/config.py) |
| `app/core/database.py` | Sync `SessionLocal` + `async_session_maker`; chooses asyncpg or aiosqlite based on URL | [database.py](backend/app/core/database.py) |
| `app/core/security.py` | bcrypt password hashing + JWT issue/decode | [security.py](backend/app/core/security.py) |
| `app/core/crypto.py` | Fernet wrapper for `Target.auth_credentials` at rest | [crypto.py](backend/app/core/crypto.py) |
| `app/core/celery_app.py` | Celery factory wired to `REDIS_URL` | [celery_app.py](backend/app/core/celery_app.py) |
| `app/core/request_id.py` | Middleware that stamps every request + log line with a UUID | [request_id.py](backend/app/core/request_id.py) |
| `app/models/scan.py` | `Target`, `Scan`, `Vulnerability`, `Endpoint`, `ScanAsset`, `AssetService`, `NetworkAsset`, `AgentLog`, `ActionItem` + enums | [scan.py](backend/app/models/scan.py) |
| `app/models/user.py` | `User` + `UserRole` enum (ANALYST / ADMIN) | [user.py](backend/app/models/user.py) |
| `app/services/agent_orchestrator.py` | `BaseAgent` ABC, 5 concrete agents, `AgentOrchestrator.run_full_scan()` | [agent_orchestrator.py](backend/app/services/agent_orchestrator.py) |
| `app/services/unified_risk_engine.py` | CVSS-environmental risk score, action-item generator | [unified_risk_engine.py](backend/app/services/unified_risk_engine.py) |
| `app/services/scan_tasks.py` | Celery task `run_scan_pipeline`, `_run_async()`, `_write_agent_log()` | [scan_tasks.py](backend/app/services/scan_tasks.py) |
| `app/services/ws_manager.py` | WebSocket connection pool + broadcast | [ws_manager.py](backend/app/services/ws_manager.py) |
| `app/services/event_publisher.py` | Redis pub/sub publisher (used by Celery → API → WebSocket) | [event_publisher.py](backend/app/services/event_publisher.py) |
| `app/services/scope_guard.py` | Allow-list + base-URL hostname check; raises `ScopeViolation` | [scope_guard.py](backend/app/services/scope_guard.py) |
| `app/services/scan_reaper.py` | Marks `RUNNING` scans as `FAILED` on startup if no Celery task is alive | [scan_reaper.py](backend/app/services/scan_reaper.py) |
| `app/services/llm_guard.py` | Prompt redaction + daily/per-scan token budget | [llm_guard.py](backend/app/services/llm_guard.py) |
| `app/services/cvss.py` | CVSS v3.1 vector parser + environmental score | [cvss.py](backend/app/services/cvss.py) |
| `app/services/nmap_wrapper.py` | Subprocess wrapper for Nmap | [nmap_wrapper.py](backend/app/services/nmap_wrapper.py) |
| `app/services/nuclei_wrapper.py` | Subprocess wrapper for Nuclei v3.3.8 (rate-limited) | [nuclei_wrapper.py](backend/app/services/nuclei_wrapper.py) |
| `app/services/openvas.py` | python-gvm GMP API wrapper | [openvas.py](backend/app/services/openvas.py) |
| `app/services/validation_probe.py` | `reprobe()` — re-sends raw HTTP request and diffs the response | [validation_probe.py](backend/app/services/validation_probe.py) |
| `app/services/intelligence_agent.py` | Optional Gemini-driven asset advisory (advisory-only) | [intelligence_agent.py](backend/app/services/intelligence_agent.py) |
| `app/services/finding_dedup.py` | Collapses repeated Nuclei findings | [finding_dedup.py](backend/app/services/finding_dedup.py) |
| `app/services/framework_tagger.py` | Tags findings with PCI-DSS / HIPAA / ISO-27001 / GDPR | [framework_tagger.py](backend/app/services/framework_tagger.py) |
| `app/services/pdf_generator.py` | ReportLab PDF executive report | [pdf_generator.py](backend/app/services/pdf_generator.py) |
| `app/services/report_signer.py` | Digital signature on PDF | [report_signer.py](backend/app/services/report_signer.py) |
| `app/services/sla.py` | Remediation SLA tracking & escalation | [sla.py](backend/app/services/sla.py) |
| `app/services/wazuh_integration.py` | Wazuh REST client (optional) | [wazuh_integration.py](backend/app/services/wazuh_integration.py) |
| `app/services/elastic_integration.py` | Elasticsearch query wrapper (optional) | [elastic_integration.py](backend/app/services/elastic_integration.py) |
| `app/services/alert_correlator.py` | Maps Wazuh alerts ↔ scan findings | [alert_correlator.py](backend/app/services/alert_correlator.py) |
| `app/services/scoring_explainer.py` | Plain-English risk explanation per asset (Phase 3) | [scoring_explainer.py](backend/app/services/scoring_explainer.py) |
| `app/services/task_monitor.py` | Endpoint-helper: introspects Celery state | [task_monitor.py](backend/app/services/task_monitor.py) |
| `app/services/ai_advisor.py` | Gemini remediation guidance | [ai_advisor.py](backend/app/services/ai_advisor.py) |
| `app/services/lab_manager.py` | Container lifecycle for lab targets | [lab_manager.py](backend/app/services/lab_manager.py) |
| `app/services/asset_monitor.py` | Periodic asset health checks | [asset_monitor.py](backend/app/services/asset_monitor.py) |
| `app/services/soar_orchestrator.py` | n8n webhook trigger (optional) | [soar_orchestrator.py](backend/app/services/soar_orchestrator.py) |

### 2.3 Frontend module responsibilities

| Module | Responsibility | Key file(s) |
|--------|----------------|-------------|
| `src/main.jsx` | Provider stack: QueryClient → RealTime → Auth → Config → Toast → App | [main.jsx](frontend/src/main.jsx) |
| `src/App.jsx` | `<ProtectedRoute fallback={LoginPage}>` → `<Dashboard/>` | [App.jsx](frontend/src/App.jsx) |
| `src/pages/Dashboard.jsx` | Tab navigation (Center/Ops/Threats/AI/Docs/Config), lazy-loaded panels | [Dashboard.jsx](frontend/src/pages/Dashboard.jsx) |
| `src/pages/LoginPage.jsx` | Email/password form → `authService.login` → store JWT | [LoginPage.jsx](frontend/src/pages/LoginPage.jsx) |
| `src/pages/SettingsPage.jsx` | Per-user settings, role display, logout | [SettingsPage.jsx](frontend/src/pages/SettingsPage.jsx) |
| `src/layout/Layout.jsx` | Header/main wrapper, /health poll, ⌘K shortcut | [Layout.jsx](frontend/src/layout/Layout.jsx) |
| `src/layout/Sidebar.jsx` | Nav, WS connection badge, AI Brain badge during scans | [Sidebar.jsx](frontend/src/layout/Sidebar.jsx) |
| `src/context/AuthContext.jsx` | JWT in `sessionStorage`; `login()` / `logout()` / `user` | [AuthContext.jsx](frontend/src/context/AuthContext.jsx) |
| `src/context/RealTimeContext.jsx` | WS connection w/ exponential backoff, reducer for live KPIs/logs | [RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx) |
| `src/context/ConfigContext.jsx` | Feature flags (SIEM/SOAR/OpenVAS), compliance frameworks | [ConfigContext.jsx](frontend/src/context/ConfigContext.jsx) |
| `src/services/api.js` | Single Axios instance + service objects (scanService, …) | [api.js](frontend/src/services/api.js) |
| `src/components/ui/ProtectedRoute.jsx` | Auth guard | [ProtectedRoute.jsx](frontend/src/components/ui/ProtectedRoute.jsx) |
| `src/components/ui/RoleGuard.jsx` | Hides children unless user has required role | [RoleGuard.jsx](frontend/src/components/ui/RoleGuard.jsx) |
| `src/components/dashboard/*` | 25+ panels — see §4.4 for details | — |

### 2.4 Module-interaction map (one scan)

```
Browser           Backend API            Celery worker         External tools
ScanButton  POST /scans/ai          ┐
   │  ─────────────────────────────►│
   │                                │  enqueue → Redis
   │                                │  return scan_id (200)
   │  ◄──── { scan_id }             │
   │                                ▼
   │                         scan_tasks.run_scan_pipeline
   │                                │
   │                                ▼  AgentOrchestrator
   │                                │     ├─► nmap_wrapper ──► nmap subprocess
   │                                │     ├─► nuclei_wrapper ──► nuclei v3.3.8
   │                                │     ├─► validation_probe ──► httpx reprobe
   │                                │     ├─► UnifiedRiskEngine (writes Scan.risk_score)
   │                                │     └─► ReportingAgent (writes Vulnerability.poc)
   │  ◄────────────── ws_events ────┤  publisher.publish(...) → Redis pub/sub
   │   (RealTimeContext reducer)    │  main.py listener → manager.broadcast_event
   │                                ▼
   │                          scan.status = COMPLETED, commit
```

---

## 3. End-to-End Data Flow

### 3.1 A single scan, step-by-step

1. **User clicks "Quick Scan"** in [ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx). The component validates the URL (regex), clears prior errors, and calls `scanService.startScan(url, 'quick')`.
2. **Axios POST** `/api/v1/scans/ai` with the JWT bearer token (auto-injected by the Axios interceptor in [api.js](frontend/src/services/api.js)).
3. **Auth dependency** — `Depends(get_current_user)` decodes the JWT in [deps.py](backend/app/api/deps.py); 401 if invalid.
4. **Endpoint** `scans.create_ai_scan` in [scans.py](backend/app/api/v1/endpoints/scans.py) inserts a `Scan` row with `status=QUEUED`, sanitizes the target URL, then dispatches `scan_tasks.run_scan_pipeline.apply_async(...)`.
5. **Celery worker** picks the task. `_run_async()` in [scan_tasks.py](backend/app/services/scan_tasks.py) creates a fresh asyncio loop (avoids "Future attached to a different loop").
6. **`AgentOrchestrator.run_full_scan(target_url)`** ([agent_orchestrator.py](backend/app/services/agent_orchestrator.py#L1034)):
   - Reads `Target.max_rps` and `Target.scope_allowlist` and constructs a single `ScopeGuard` for the whole scan.
   - Sets `scan.status = RUNNING`; broadcasts `[SYSTEM] Starting AI Scan`.
   - **Stage 1 — `ReconAgent.execute`** ([line 186](backend/app/services/agent_orchestrator.py#L186)): Nmap quick scan + Playwright crawl (with resource blocking + 2-tier wait_until). Stores discovered `Endpoint` rows. Checkpoint → `recon_done`.
   - **Deterministic chaining**: inspects discovered ports for 80/443/8080/3000 (web) and 445 (SMB); narrows Nuclei templates accordingly.
   - **Stage 2 — `AttackAgent.execute`** ([line 423](backend/app/services/agent_orchestrator.py#L423)): runs Nuclei via `nuclei_wrapper.scan_target(..., max_rps=...)`. Persists every finding as a `Vulnerability` with `raw_request` / `raw_response` / `evidence_hash`. Optional Gemini summary (capped at 10 findings). Checkpoint → `attack_done`.
   - **Stage 3 — `ValidationAgent.execute`** ([line 588](backend/app/services/agent_orchestrator.py#L588)): for each finding calls `validation_probe.reprobe()` — re-sends the stored raw HTTP request, diffs with `difflib`. Any below-threshold response is marked `VulnStatus.FALSE_POSITIVE`. LLM is **commentary-only** and never overrides the verdict. Checkpoint → `validated`.
   - **Stage 4 — `UnifiedRiskEngine.update_scan_risk(scan_id)`** ([unified_risk_engine.py](backend/app/services/unified_risk_engine.py#L189)): builds a per-vuln CVSS environmental breakdown, sums into 0–100 score, also computes `health_score = 100 − risk`. Then `generate_action_items()` writes `ActionItem` rows for every CRITICAL/HIGH vuln and every dangerous port. Checkpoint → `risk_scored`.
   - **Stage 5 — `ReportingAgent.execute`** ([line 798](backend/app/services/agent_orchestrator.py#L798)): pulls all non-FALSE_POSITIVE vulns, generates exec summary via Gemini, fills `Vulnerability.proof_of_concept` + `.remediation` for HIGH/CRITICAL, writes a Markdown report. Checkpoint → `reported`.
   - Sets `scan.status = COMPLETED`, broadcasts `[SYSTEM] Scan cycle complete.`
7. **Throughout**, every `BaseAgent.log_action` call appends an `AgentLog` row with `prev_hash` + `this_hash = sha256(prev + canonical_payload)` and triggers `manager.broadcast` → Redis → `/ws/logs`.
8. **Frontend** — the `redis_event_listener` in [main.py](backend/app/main.py#L30) bridges the Redis pubsub channel `ws_events` to all WebSocket clients. `RealTimeContext.jsx` reducer dispatches on `RISK_UPDATE`, `LOG_STREAM`, `SCAN_PROGRESS`, etc., updating `StatCards`, `OrchestrationFeed`, `RiskHeatmap`, `NetworkTopology` in real time.
9. **PDF export** — when the user clicks Download in [Reports.jsx](frontend/src/components/dashboard/Reports.jsx), `reportService.downloadPDF(scanId)` → `GET /api/v1/reports/{id}/pdf` → [pdf_generator.py](backend/app/services/pdf_generator.py) → ReportLab builds the PDF → [report_signer.py](backend/app/services/report_signer.py) signs it → returned as `application/pdf`.

### 3.2 Auth + RBAC flow

1. `LoginPage` POSTs `/api/v1/auth/login` with email/password.
2. [auth.py](backend/app/api/v1/endpoints/auth.py) verifies bcrypt with `verify_password`, calls `create_access_token(email, role)` ([security.py](backend/app/core/security.py#L33)), returns `{access_token, token_type, role}`.
3. `AuthContext.login()` stores token + user in `sessionStorage`. Axios interceptor injects `Authorization: Bearer <token>` on every subsequent call.
4. Backend dependency `get_current_user` (in [deps.py](backend/app/api/deps.py)) decodes the JWT, looks up `User`, raises 401 if invalid.
5. Privileged routes wrap a `require_role(UserRole.ADMIN)` dependency (e.g. RBAC management in [rbac.py](backend/app/api/v1/endpoints/rbac.py)). Read-only viewers get 403 from mutation routes.
6. Frontend `<RoleGuard role="ADMIN">` ([RoleGuard.jsx](frontend/src/components/ui/RoleGuard.jsx)) hides UI elements the user cannot use anyway — defense-in-depth, **not the security boundary**. The boundary is the backend dependency.

### 3.3 SIEM correlation flow (when `SIEM_ENABLED=true`)

1. Lab attack (e.g. brute force against the lab Samba container) generates syslog → `lab/log-shipper/shipper.py` ships to Wazuh.
2. Wazuh rule fires → alert in Elasticsearch index `wazuh-alerts-*`.
3. Backend periodic task (or `siem.py` endpoint) calls `wazuh_integration.get_alerts()` → `alert_correlator.correlate(alerts, recent_findings)` matches by IP / asset / time window.
4. Matched correlation is exposed via `GET /api/v1/siem/alerts` and surfaces in `UnifiedInbox.jsx` and on the `NetworkTopology` (red pulse on attacked node).

---

## 4. Detailed Function Reference

> Functions are listed by sub-team owner and grouped by module. Trivial getters and Pydantic schemas are skipped. Every function named in `project_plan.md`'s "Files He/She Owns" tables is covered.

### 4.1 Core (config / database / security / crypto)

#### `app/core/security.py`

| Function | Signature | Purpose |
|---|---|---|
| `hash_password` | `(plain: str) -> str` | bcrypt hash with auto-generated salt. Stored on `User.password_hash`. |
| `verify_password` | `(plain: str, hashed: str) -> bool` | Constant-time bcrypt compare. Swallows malformed-hash exceptions and returns False. |
| `create_access_token` | `(subject: str, role: str, expires_delta=None) -> str` | Issues HS256 JWT with `sub`, `role`, `exp`, `iat` claims. Default TTL `JWT_EXPIRE_HOURS=8`. |
| `decode_token` | `(token: str) -> dict` | Decodes / verifies; raises `JWTError` on invalid or expired. Caller is `deps.get_current_user`. |

**Edge cases:** `JWT_SECRET=""` causes a fail-fast at process start (Phase 5 hardening commit). Token without `role` claim defaults to lowest privilege.

#### `app/core/database.py`

- `engine` / `SessionLocal` — synchronous SQLAlchemy 2.0 engine, used by Celery worker and Alembic.
- `async_engine` / `async_session_maker` — asyncpg or aiosqlite based on URL prefix. Used by FastAPI request handlers.
- `Base` — Declarative base for all ORM models.

#### `app/core/celery_app.py`

- `celery_app` — Celery factory; broker = backend = `settings.REDIS_URL`. `concurrency=1` to keep RAM bounded (one active scan per worker).

#### `app/core/crypto.py`

- `encrypt(plain: str) -> bytes`, `decrypt(ciphertext: bytes) -> str` — Fernet symmetric using `CREDENTIAL_ENCRYPTION_KEY`. Used by `Target.auth_credentials` setters.

### 4.2 API endpoints (`app/api/v1/endpoints/`)

All endpoints under `/api/v1`. Router prefix shown in column 1.

| Prefix | File | Operations |
|---|---|---|
| `/auth` | [auth.py](backend/app/api/v1/endpoints/auth.py) | `POST /login`, `POST /logout`, `GET /me`, `POST /change-password` |
| `/config` | [config.py](backend/app/api/v1/endpoints/config.py) | `GET /features` (public), `GET /compliance-frameworks` |
| `/targets` | [targets.py](backend/app/api/v1/endpoints/targets.py) | CRUD + `GET /{id}/scans` |
| `/scans` | [scans.py](backend/app/api/v1/endpoints/scans.py) | `POST /` (manual), `POST /ai` (Celery-dispatched), `GET /`, `GET /{id}`, `DELETE /{id}` |
| `/vulnerabilities` | [vulnerabilities.py](backend/app/api/v1/endpoints/vulnerabilities.py) | `GET /`, `PATCH /{id}` (status changes) |
| `/findings` | [findings.py](backend/app/api/v1/endpoints/findings.py) | Same as above for raw findings (pre-dedup) |
| `/reports` | [reports.py](backend/app/api/v1/endpoints/reports.py) | `POST /{scan_id}/generate`, `GET /{id}/pdf` |
| `/network` | [network.py](backend/app/api/v1/endpoints/network.py) | `GET /assets`, `GET /assets/{id}`, `GET /activity` |
| `/dashboard` | [dashboard.py](backend/app/api/v1/endpoints/dashboard.py) | `GET /summary`, `GET /health`, `GET /kpis` |
| `/openvas` | [openvas.py](backend/app/api/v1/endpoints/openvas.py) | `POST /scan`, `GET /tasks/{id}` (HTTP 503 when `OPENVAS_ENABLED=false`) |
| `/siem` | [siem.py](backend/app/api/v1/endpoints/siem.py) | `GET /alerts`, `POST /forward` (HTTP 503 when `SIEM_ENABLED=false`) |
| `/audit` | [audit.py](backend/app/api/v1/endpoints/audit.py) | `GET /logs`, `GET /logs/{scan_id}` (verifies hash chain) |
| `/lab` | [lab.py](backend/app/api/v1/endpoints/lab.py) | `POST /seed`, `GET /containers` |
| `/rbac` | [rbac.py](backend/app/api/v1/endpoints/rbac.py) | `GET /users`, `PATCH /users/{id}/role`, `DELETE /users/{id}` (admin-only) |

### 4.3 Services — agent layer

#### `BaseAgent` ([agent_orchestrator.py L38](backend/app/services/agent_orchestrator.py#L38))

| Method | Purpose | Notable behavior |
|---|---|---|
| `__init__(name, scan_id, db_session, max_rps=10)` | Stores name, scan_id, DB session; constructs `aiolimiter.AsyncLimiter(max_rps, 1)` if installed; instantiates `genai.Client` if `GEMINI_API_KEY` set. | Degrades silently if aiolimiter or Gemini missing. |
| `log_action(action, reasoning, input_data, output_data)` async | Appends a tamper-evident `AgentLog` row. Computes `prev_hash` from latest row for the scan, then `this_hash = sha256(prev + canonical_json)`. Broadcasts the log line to all WS clients. | Hash chain is the audit trail demoed in `AgentLogViewer.jsx`. The DB has a trigger blocking UPDATE/DELETE on `agent_logs`. |
| `llm_reason(prompt, internal_hostnames=None) -> str` | Calls Gemini 2.0 Flash. **Before the call** runs `llm_guard.redact(...)` (cookies, auth headers, PII, internal hosts) and consumes from daily + per-scan token budgets. | Returns `""` if budget exceeded — caller's deterministic path still works. Returns `"[LLM not configured - demo mode]"` if no API key. |
| `execute(context)` async (abstract) | Each subclass implements the agent's main work. | Must return a dict; any exception sets `state = FAILED` and is logged. |

#### `ReconAgent.execute` ([line 186](backend/app/services/agent_orchestrator.py#L186))

- **Input:** `{target_url, auth_credentials, scope_guard}`
- **Returns:** `{endpoints: list, tech_stack: dict, forms: list, assets: list, total_discovered: int}`
- **Steps:** Nmap quick scan → Playwright crawl (block image/css/font for memory) → `eval_on_selector_all` for `a[href]` and `form` (cap 40/20) → `_detect_tech_stack` from headers + content → persist `Endpoint` rows.
- **Edge cases:** Playwright failure falls back to `httpx.AsyncClient`. `scope_guard.is_in_scope(link)` silently drops cross-origin links.

#### `AttackAgent.execute` ([line 423](backend/app/services/agent_orchestrator.py#L423))

- **Input:** `{target_url, assets, scope_guard, max_rps}`
- **Returns:** `{findings, tested_count, vulnerability_count}`
- **Critical decision (Phase 1.2):** every finding is sourced from Nuclei v3.3.8, never from hand-rolled payloads. `Vulnerability.detected_by="nuclei"`, `evidence_hash`, `raw_request`, `raw_response` all stored.
- **Template selection** is driven by `SERVICE_TO_TEMPLATE` map: e.g. SMB → `tags:cve,misconfiguration`. Default falls back to `tags:cve,exposures`.
- **Optional LLM:** rewrites the description in 2 sentences for non-technical readers; capped at 10 findings per scan.

#### `ValidationAgent.execute` ([line 588](backend/app/services/agent_orchestrator.py#L588))

- **Input:** `{findings, scope_guard}`
- **Returns:** `{validated, false_positives, validated_count, filtered_count}`
- **Why this is the most defensible part of the platform:** the Nuclei finding is replayed via `validation_probe.reprobe()` which compares the response with `difflib`. The verdict is **always** the deterministic diff, never the LLM. If `LLM_VALIDATION_ENABLED=true`, the LLM produces a 1-sentence justification stored on `Vulnerability.validation_notes` — pure commentary.

#### `UnifiedRiskEngine` ([unified_risk_engine.py](backend/app/services/unified_risk_engine.py))

| Method | Purpose |
|---|---|
| `_resolve_target_context(scan)` | Returns `(asset_value, data_sensitivity, exposure)` — `exposure="internal"` if any RFC-1918 prefix matches `target_ip`. |
| `calculate_scan_risk(scan)` | Legacy scalar — delegates to `_v2`. |
| `calculate_scan_risk_v2(scan)` | For each `Vulnerability`, parses (or defaults from severity) a CVSS v3.1 vector → `cvss.environmental_score(...)` → multiplies by `confidence` → accumulates. Adds port-exposure scores from `HIGH_RISK_PORTS`. Caps at 100. Returns `{score, breakdown[]}` where breakdown is sorted by contribution descending. |
| `calculate_health_score(scan)` | Plain SME-friendly score: starts at 100, subtracts 20/10/5 per CRITICAL/HIGH/MEDIUM, subtracts 15 per dangerous open port, capped at 90 if any vulns exist. |
| `update_scan_risk(scan_id)` async | Loads scan with eager-loaded vulnerabilities/assets/target, writes `Scan.risk_score`, `Scan.risk_breakdown`, and `agent_thoughts.health_score`. |
| `generate_action_items(scan_id)` async | Materializes `ActionItem` rows for HIGH/CRITICAL vulns and dangerous open ports, with dedup-by-title. |

**Severity weights:** CRITICAL=25, HIGH=15, MEDIUM=7, LOW=2, INFO=0.
**High-risk port table** (port → name, weight): 21=FTP/15, 23=Telnet/20, 445=SMB/20, 3389=RDP/15, 6379=Redis/10, 3000=Dev/5, 8080=Proxy/5, 5432=PG/10, 3306=MySQL/10.

#### `AgentOrchestrator.run_full_scan` ([line 1034](backend/app/services/agent_orchestrator.py#L1034))

Five-stage pipeline with **resumable checkpoints** (`recon_done` → `attack_done` → `validated` → `risk_scored` → `reported`). On Celery retry, completed stages are skipped via `_past(checkpoint, current)`. A single `ScopeGuard` instance is created from `Target.scope_allowlist` and passed to every agent. Playwright is launched with `--single-process --max-old-space-size=128` to keep memory bounded; on failure agents fall back to plain `httpx`.

#### `ReportingAgent.execute` ([line 798](backend/app/services/agent_orchestrator.py#L798))

- Generates exec summary in plain language (3–4 sentences), per-finding PoC scripts for CRITICAL/HIGH (templates for SQLi, XSS, BOLA), full Markdown report. Updates `Vulnerability.proof_of_concept` and `.remediation`.
- The PoC scripts are **demonstration templates**, not autonomous exploitation — important to clarify in defense.

#### `SIEMAgent.execute` ([line 721](backend/app/services/agent_orchestrator.py#L721))

- Pulls Elastic alerts and Wazuh agents (when env vars set), sends each to LLM with a strict-format prompt, parses VERDICT/CONFIDENCE/ACTION/TARGET/REASON, optionally triggers SOAR webhook. Currently SOAR call is a placeholder (commented `# success = await soar_service.trigger_playbook(...)`).
- Gated behind `settings.SIEM_ENABLED`; `run_siem_pipeline` returns `status="disabled"` otherwise.

### 4.4 Services — supporting layer

| Service | Key function(s) | Notes |
|---|---|---|
| `scan_tasks.py` | `_run_async(coro)`, `_write_agent_log(...)`, `run_scan_pipeline.task` | Sync `_write_agent_log` mirrors the async hash-chain logic for Celery context. |
| `event_publisher.py` | `publisher.publish(event_type, payload)` | Wraps Redis `publish("ws_events", json)`. Never raises — failures logged + swallowed. |
| `ws_manager.py` | `manager.connect/disconnect/broadcast/broadcast_event` | Connection pool; `broadcast_event(type, payload)` is the typed channel used by `RealTimeContext`. |
| `scope_guard.py` | `ScopeGuard(allowlist, base_url)`, `.is_in_scope(url)`, `.assert_in_scope(url)` raises `ScopeViolation` | Default behavior: only the hostname extracted from `base_url` is in scope. |
| `scan_reaper.py` | `reap_orphan_scans(db)` async | Runs in lifespan startup; flips RUNNING-without-Celery scans to FAILED with `failure_reason="orphan_reaper"`. |
| `llm_guard.py` | `redact(text, internal_hostnames)`, `estimate_tokens(s)`, `get_daily_budget()`, `LLMBudgetExceeded` | Cookies, JWTs, "Set-Cookie" headers, internal hostnames, CC numbers (incl. space/dash) all stripped. |
| `cvss.py` | `parse_vector`, `severity_to_default_vector`, `environmental_score(metrics, asset_value, data_sensitivity, exposure)` | Pure math; tested in isolation. |
| `nmap_wrapper.py` | `NmapWrapper().scan_target(target, scan_type)` | Returns list[dict] of hosts with `ports[].{port,protocol,state,service}`. |
| `nuclei_wrapper.py` | `NucleiWrapper().scan_target(url, scan_type, max_rps)` | Subprocess to pinned `nuclei v3.3.8`; injects `-rate-limit N`. Parses jsonl output. |
| `validation_probe.py` | `reprobe(raw_request, raw_response, url, detected_by, template_id, http_client) -> ReprobeResult` | `ReprobeResult.confirmed: bool`, `.diff_ratio: float`, `.reason: str`. |
| `pdf_generator.py` | `generate_pdf(scan, vulns, output_path)` | ReportLab; section per severity; embeds CVSS table, charts. |
| `report_signer.py` | `sign(pdf_path)` | Adds digital signature/hash footer. |
| `framework_tagger.py` | `tag_finding(vuln) -> list[str]` | Maps vuln type → frameworks (PCI-DSS, HIPAA, ISO-27001, GDPR). |
| `finding_dedup.py` | `dedup(findings) -> list` | Collapses by `(template_id, url, evidence_hash)`. |
| `sla.py` | `compute_sla(vuln)` / `escalate_overdue()` | Tracks remediation SLA bands per severity. |
| `intelligence_agent.py` | `IntelligenceAgent.analyze_asset(scan_id, asset)` async | Optional Gemini-driven asset advisory; non-blocking; capped at 3 assets per scan. |
| `ai_advisor.py` | `recommend(vuln) -> str` | Plain-language remediation guidance. |
| `wazuh_integration.py` | `wazuh_service.get_alerts(...)`, `.get_agents()` | REST client behind `SIEM_ENABLED`. |
| `elastic_integration.py` | `elastic_service.query(index, dsl)` | Thin Elasticsearch query wrapper. |
| `alert_correlator.py` | `correlate(alerts, findings) -> list` | Joins on IP / asset / time window. |
| `soar_orchestrator.py` | `soar_service.trigger_playbook(name, payload)` | n8n webhook call (currently disabled in code). |
| `lab_manager.py` | `seed_targets(db)`, `list_containers()` | Backs `/lab/seed` + `/lab/containers`. |
| `task_monitor.py` | `get_task_status(task_id)` | Celery state introspection — used by Settings panel. |
| `scoring_explainer.py` | `explain(scan)` | Produces a paragraph mapping the score to its top contributors. |

### 4.5 Frontend — Dashboard panels (high-signal subset)

| Component | Data source | Highlights |
|---|---|---|
| [StatCards.jsx](frontend/src/components/dashboard/StatCards.jsx) | `useRealTime()` KPI + React Query | 4 animated counters (Risk, Health, Active, MTTR). |
| [ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx) | `scanService.startScan` | Regex URL validation, 4-step pipeline progress (Queued → Nmap → Nuclei → Risk → AI), inline error state. |
| [ScanPipelinePanel.jsx](frontend/src/components/dashboard/ScanPipelinePanel.jsx) | WS `SCAN_PROGRESS` | Stage timeline visualizer for the running scan. |
| [OrchestrationFeed.jsx](frontend/src/components/dashboard/OrchestrationFeed.jsx) | `realTime.orchestrationLog` | Virtualized list (`react-window`), agent-color helpers, ResizeObserver, "Live // N Events" counter. |
| [LiveConsole.jsx](frontend/src/components/dashboard/LiveConsole.jsx) | WS raw stream | Auto-scroll terminal-style log. |
| [NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx) | `networkService.getAssets` | `react-force-graph-2d`; node color by risk band, size by vuln count, click → AssetDetailPanel. |
| [RiskHeatmap.jsx](frontend/src/components/dashboard/RiskHeatmap.jsx) | scan vulnerabilities | D3 treemap; rectangles sized by count, colored by severity. |
| [RiskScore.jsx](frontend/src/components/dashboard/RiskScore.jsx) | KPI | Circular gauge with CVSS breakdown expandable. |
| [VulnTrend.jsx](frontend/src/components/dashboard/VulnTrend.jsx) | dashboardService | 14-day Recharts line chart with gradient fill. |
| [UptimeGauge.jsx](frontend/src/components/dashboard/UptimeGauge.jsx) | dashboardService | SVG arc with `stroke-dashoffset` animation. |
| [ActionCenter.jsx](frontend/src/components/dashboard/ActionCenter.jsx) | `/api/v1/dashboard/summary` | `useQuery` `refetchInterval`; `SkeletonRow`; CRITICAL+HIGH count badge. |
| [AgentLogViewer.jsx](frontend/src/components/dashboard/AgentLogViewer.jsx) | `/api/v1/audit/logs/{scan_id}` | Verifies SHA-256 chain client-side; shows tamper-evidence "✓ chain valid". |
| [VulnerabilitiesPanel.jsx](frontend/src/components/dashboard/VulnerabilitiesPanel.jsx) | vulnerabilityService | Searchable, filterable table; click → `IncidentDetailDrawer`. |
| [IncidentDetailDrawer.jsx](frontend/src/components/dashboard/IncidentDetailDrawer.jsx) | one vuln | Slide-out: CVSS, severity, AI remediation, mark-status controls. |
| [AssetDetailPanel.jsx](frontend/src/components/dashboard/AssetDetailPanel.jsx) | network asset | Ports, services, OS, vuln count. |
| [TargetsManager.jsx](frontend/src/components/dashboard/TargetsManager.jsx) | targetService | Full target CRUD UI. |
| [ScanHistory.jsx](frontend/src/components/dashboard/ScanHistory.jsx) | scanService | Past scans table; date, target, status, score, duration. |
| [SeverityDonut.jsx](frontend/src/components/dashboard/SeverityDonut.jsx) | KPI counts | Animated donut. |
| [ExposureMap.jsx](frontend/src/components/dashboard/ExposureMap.jsx) | network assets | Subnet exposure heatmap. |
| [RemediationPanel.jsx](frontend/src/components/dashboard/RemediationPanel.jsx) | one vuln | Step-by-step remediation guide. |
| [Reports.jsx](frontend/src/components/dashboard/Reports.jsx) | reportService | Generate + download PDF. |
| [SecurityAdvisor.jsx](frontend/src/components/SecurityAdvisor.jsx) | Gemini | Plain-language prioritized recommendations. |
| [LabEnvironment.jsx](frontend/src/components/dashboard/LabEnvironment.jsx) | labService | Lab container start/stop + links. |
| [SettingsPanel.jsx](frontend/src/components/dashboard/SettingsPanel.jsx) | configService | Feature-flag toggles, token budgets, password change. |
| [UnifiedInbox.jsx](frontend/src/components/dashboard/UnifiedInbox.jsx) | combined | All SIEM alerts + scan findings + SLA escalations in one view. |

### 4.6 Frontend — UI primitives + contexts

| File | Highlights |
|---|---|
| [services/api.js](frontend/src/services/api.js) | Single Axios instance, `VITE_API_URL`, request interceptor injects JWT, response interceptor on 401 → clear token + redirect to login. Service objects: `scanService`, `targetService`, `vulnerabilityService`, `dashboardService`, `networkService`, `reportService`, `openvasService`, `labService`, `auditService`. |
| [context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) | JWT in `sessionStorage` (cleared on tab close); `login(email,pw)` / `logout()`; exposes `user`, `token`, `role`. |
| [context/RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx) | WS to `/ws/logs`; exponential backoff reconnect; heartbeat ping; reducer state `{kpi, alerts, orchestrationLog (max 200), scanStatus, isConnected, isScanning}`. Message types: `RISK_UPDATE`, `LOG_STREAM`, `SCAN_PROGRESS`, `SCAN_STARTED`, `SCAN_STATUS`, `ALERT_NEW`, `CLEAR_LOGS`. |
| [context/ConfigContext.jsx](frontend/src/context/ConfigContext.jsx) | Reads `/api/v1/config/features` once at boot; exposes `siem_enabled`, `soar_enabled`, `openvas_enabled`, `compliance_frameworks`. |
| [components/ui/ProtectedRoute.jsx](frontend/src/components/ui/ProtectedRoute.jsx) | If no token → render `fallback` (LoginPage). |
| [components/ui/RoleGuard.jsx](frontend/src/components/ui/RoleGuard.jsx) | Conditionally renders children based on `useAuth().role`. |
| [components/ui/CyberButton.jsx / CyberBadge.jsx](frontend/src/components/ui/CyberButton.jsx) | Themed primitives w/ neon glow + glass-card aesthetic. |
| [components/ui/Toast.jsx](frontend/src/components/ui/Toast.jsx) | Notification queue. |
| [components/ui/SkeletonPulse.jsx](frontend/src/components/ui/SkeletonPulse.jsx) | Loading placeholders. |
| [components/ui/ConfirmDialog.jsx](frontend/src/components/ui/ConfirmDialog.jsx) | Reusable confirmation modal (Phase 3). |
| [components/ui/EmptyState.jsx](frontend/src/components/ui/EmptyState.jsx) | Empty-state illustration. |
| [hooks/useAuth.js](frontend/src/hooks/useAuth.js) | Convenience hook around AuthContext. |

---

## 5. Per-Member Deep Dive

> **Note on attribution:** the project's git history concentrates commits under two service accounts (`PentesterFlow Agent`, `Mohamedshaban01`) plus `Omar Kapil` for merges, because most members worked through the Mohamedshaban01 GitHub fork or via the team's shared agent workflow. Ownership below follows `project_plan.md` (the academic, defensible source of truth) — each member should be ready to walk the examiner through the files in their "owns" list, regardless of which git author appears in `git log`.

---

### 5.1 Omar Kapil — Team Leader & DevOps Sub-Leader

- **Sub-team:** DevOps & QA (also overall team coordinator).
- **Files owned (verified ✓ / planned 🚧):**
  - ✓ [docker-compose.yml](docker-compose.yml), [docker-compose.lab.yml](docker-compose.lab.yml), [lab_setup.ps1](lab_setup.ps1), [trigger_lab_scans.ps1](trigger_lab_scans.ps1)
  - ✓ [project_plan.md](project_plan.md), [HOW_TO_RUN.md](HOW_TO_RUN.md)
  - ✓ [.github/workflows/](.github/) (CI scaffolding)
  - ✓ [SECURITY_AUDIT.md](SECURITY_AUDIT.md), [FINAL_DEMO_SCRIPT.md](FINAL_DEMO_SCRIPT.md), [FINAL_PRESENTATION.md](FINAL_PRESENTATION.md)
  - ✓ [infra/](infra/) — Caddy + nginx
  - 🚧 `infra/nginx.conf` for full prod hardening (verify against current `infra/`)
- **Key decisions:**
  - Caddy as the TLS-terminating front door (auto HTTPS, simpler than nginx for SMEs).
  - Per-service RAM limits (backend 384 M, celery 512 M max, redis 96 M) so the stack runs on 16 GB lite mode.
  - `--profile full` opt-in for Wazuh/Elastic/Kibana to keep the default footprint small.
  - External Docker network `the-dashboard-project-_lab_network` so lab containers and main stack can reach each other without becoming siblings of the same compose project.
- **60-second defense pitch:** *"I led the team and owned the deployment surface. The whole platform comes up with one command — docker compose up — which is what we'll use in the live demo. I created a tiered profile system so a reviewer with a laptop can run the lite mode and a panel with a workstation can flip on the SIEM. The CI pipeline gates every PR with lint + pytest + Docker build."*
- **Likely individual questions:**
  - **Q: Why Caddy over nginx?** A: Caddy auto-issues TLS, has shorter config, and we don't need nginx-specific perf for an SME workload.
  - **Q: What stops a runaway scan from killing the server?** A: Celery `concurrency=1`, per-target `max_concurrent_scans=1`, RAM limits in compose, and `scan_reaper` cleans up orphans on restart.
  - **Q: Show the CI.** A: `.github/workflows/ci.yml` runs flake8/black + pytest + `docker build` on every PR — branch protection blocks merge on red.

---

### 5.2 Reem Amin — Backend Sub-Leader

- **Sub-team:** Backend & AI Core. Reviews & approves all backend PRs.
- **Files owned:**
  - ✓ [backend/app/main.py](backend/app/main.py), [backend/app/core/config.py](backend/app/core/config.py), [backend/app/core/database.py](backend/app/core/database.py), [backend/app/core/security.py](backend/app/core/security.py)
  - ✓ [backend/app/api/api.py](backend/app/api/api.py), [backend/app/api/deps.py](backend/app/api/deps.py)
  - ✓ [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py), [dashboard.py](backend/app/api/v1/endpoints/dashboard.py), [scans.py](backend/app/api/v1/endpoints/scans.py), [targets.py](backend/app/api/v1/endpoints/targets.py), [reports.py](backend/app/api/v1/endpoints/reports.py)
  - ✓ [backend/app/models/scan.py](backend/app/models/scan.py), [user.py](backend/app/models/user.py), [backend/app/schemas/scan.py](backend/app/schemas/scan.py)
  - ✓ [backend/app/api/v1/endpoints/rbac.py](backend/app/api/v1/endpoints/rbac.py) (Phase 3 deliverable — exists)
- **Key decisions:**
  - Async-first FastAPI with `async_session_maker` for request handlers; sync `SessionLocal` for Celery worker (different process, no event loop confusion).
  - Lifespan does **3 things in order**: orphan-reap (clears phantom RUNNING scans before any new event arrives), runtime config load (DB-stored toggles override `.env`), admin seed (idempotent).
  - JWT in `sub`+`role` claims; `require_role` dependency for admin-only routes; `force_password_change` flag on first login.
  - **Append-only `agent_logs` via DB trigger** + SHA-256 hash chain — examiners often probe this; the chain is verified client-side in `AgentLogViewer.jsx`.
- **60-second defense pitch:** *"I own the backend architecture — FastAPI, the async DB layer, JWT auth, and the data model. The interesting part is the audit trail: every agent action writes a row whose hash is computed from the previous row's hash plus a canonical JSON of the payload, and a database trigger blocks UPDATE/DELETE on that table. So if anyone tampered with a scan log, the chain breaks — and we visualize that on the AI tab in real time."*
- **Likely individual questions:**
  - **Q: Why JWT in sessionStorage and not httpOnly cookies?** A: Trade-off — cookies are safer against XSS but need CSRF tokens; sessionStorage simplifies the SPA. We mitigate XSS via Tailwind's safe escaping + React's auto-escaping. For production we'd switch to httpOnly + CSRF.
  - **Q: How are migrations handled?** A: Alembic. Lifespan reads `alembic_version` and logs it; running `docker compose exec backend alembic upgrade head` applies new ones — we deliberately don't auto-upgrade on boot to avoid asyncpg/sync deadlock.
  - **Q: Walk me through `Target` columns.** A: name, base_url, asset_value, data_sensitivity, environment_type (lab/dev/staging/prod), compliance_tags, scope_allowlist, max_rps, max_concurrent_scans, encrypted auth_credentials.

---

### 5.3 Yousef Abdel Hady — AI & Risk Engine

- **Sub-team:** Backend & AI Core.
- **Files owned:**
  - ✓ [backend/app/services/agent_orchestrator.py](backend/app/services/agent_orchestrator.py)
  - ✓ [backend/app/services/unified_risk_engine.py](backend/app/services/unified_risk_engine.py)
  - ✓ [backend/app/services/intelligence_agent.py](backend/app/services/intelligence_agent.py)
  - ✓ [backend/app/services/ai_advisor.py](backend/app/services/ai_advisor.py)
  - ✓ [backend/app/services/validation_probe.py](backend/app/services/validation_probe.py)
  - ✓ [backend/app/services/discovery_agent.py](backend/app/services/discovery_agent.py)
  - ✓ [backend/app/services/finding_dedup.py](backend/app/services/finding_dedup.py)
  - ✓ [backend/app/services/framework_tagger.py](backend/app/services/framework_tagger.py)
  - ✓ [backend/app/services/cvss.py](backend/app/services/cvss.py)
  - ✓ [backend/app/services/llm_guard.py](backend/app/services/llm_guard.py)
  - ✓ [backend/app/services/scoring_explainer.py](backend/app/services/scoring_explainer.py) (Phase 3 deliverable — exists)
- **Key decisions:**
  - **LLM is advisory-only.** Validation, scoring, and findings are all deterministic. The LLM never produces a verdict — only summaries, justifications, and exec-summary text. This is the most defensible architectural choice in the project.
  - 5-stage pipeline with **resumable checkpoints** stored on `Scan.checkpoint`. A Celery retry resumes from the last completed checkpoint instead of re-running expensive work.
  - CVSS v3.1 environmental scoring uses *both* a per-vuln vector (stored or default-from-severity) and the target's `asset_value`/`data_sensitivity`/`exposure`. This is what makes the same vulnerability score differently on a lab box vs. a production DB.
  - LLM safety: redact (cookies, JWTs, internal hosts, CCs) → estimate → daily budget consume → per-scan circuit breaker. If budget exceeded, returns `""` and the deterministic path still produces a complete scan.
- **60-second defense pitch:** *"I own the AI brain. The 5 agents run sequentially and each one's output feeds the next. I want to highlight one decision: the LLM never decides whether a finding is real. We initially had a prompt that returned 'REAL' or 'FALSE_POSITIVE' and it was unreliable — one model update could erase real vulnerabilities. So I rebuilt validation around `validation_probe.reprobe`, which re-sends the exact raw HTTP request and uses difflib to compare. The LLM may add a one-sentence justification, but the verdict is the diff."*
- **Likely individual questions:**
  - **Q: How do you stop the AI from invoking destructive shell commands?** A: It can't. The LLM only returns text. We never `eval` its output. The closest thing is `llm_guard.redact` which strips secrets before the prompt leaves the process.
  - **Q: Walk me through the risk score for a vuln with no CVSS vector.** A: `severity_to_default_vector("high")` returns a representative vector → `parse_vector` → `environmental_score` adjusted for asset_value/sensitivity/exposure → multiplied by `confidence` (1.0 for Nuclei).
  - **Q: Why Gemini 2.0 Flash and not GPT-4 / a local model?** A: Cost (Flash is cheap), latency (sub-second), free tier (no billing during the academic year), and an SDK we'd already integrated. A swap would change one line in `BaseAgent.__init__`.

---

### 5.4 Mohamed Shaban — Task Queue & Docker Orchestration

- **Sub-team:** Backend & AI Core.
- **Files owned:**
  - ✓ [backend/app/services/scan_tasks.py](backend/app/services/scan_tasks.py)
  - ✓ [backend/app/services/event_publisher.py](backend/app/services/event_publisher.py)
  - ✓ [backend/app/services/ws_manager.py](backend/app/services/ws_manager.py)
  - ✓ [backend/app/services/scan_reaper.py](backend/app/services/scan_reaper.py)
  - ✓ [backend/app/core/celery_app.py](backend/app/core/celery_app.py)
  - ✓ [docker-compose.yml](docker-compose.yml) (shared with Omar K)
  - ✓ [backend/app/services/task_monitor.py](backend/app/services/task_monitor.py) (Phase 3 deliverable — exists)
  - 🚧 `infra/healthcheck.sh` — verify in `infra/`
- **Key decisions:**
  - `_run_async` creates a fresh asyncio loop per Celery task — solves "Future attached to a different loop" caused by module-level async engines.
  - Each phase wrapped in its own try/except so a broken Nuclei call doesn't tear down the whole pipeline.
  - `event_publisher.publish` **never raises** — we'd rather drop a UI event than crash the worker.
  - `scan_reaper.reap_orphan_scans` runs in lifespan startup so a crashed-while-running scan doesn't appear "running forever" after a restart.
- **60-second defense pitch:** *"I own the async machinery — Celery, Redis, the WebSocket bridge, and Docker reliability. Two things I'm proud of: the `_run_async` helper that lets us call asyncio code from a synchronous Celery worker without event-loop conflicts, and the orphan reaper, which runs in the FastAPI lifespan and flips any phantom RUNNING scan to FAILED before the dashboard can see it. I also fixed the `google-generativeai` crash loop by migrating to the new `google-genai` SDK."*
- **Likely individual questions:**
  - **Q: What if Redis goes down mid-scan?** A: `event_publisher` swallows the failure; the scan continues and writes to DB; the WebSocket clients lose live updates but the scan record is correct. The lifespan listener has exponential-backoff reconnect (2 → 4 → 8 → 16 → 32 s).
  - **Q: Why `concurrency=1`?** A: Each scan launches Playwright + Nmap + Nuclei subprocesses; running two in parallel on a 16 GB box OOMs. With concurrency=1, scan duration is bounded by hardware not contention.
  - **Q: How do you restart a stuck scan?** A: `DELETE /api/v1/scans/{id}` cancels via Celery revoke, then create a new one — the checkpoint table is per-scan-id, so a fresh scan starts from the top.

---

### 5.5 Marize Ehap — Frontend Sub-Leader

- **Sub-team:** Frontend & Visualization. Reviews & approves all frontend PRs.
- **Files owned:**
  - ✓ [frontend/src/App.jsx](frontend/src/App.jsx), [main.jsx](frontend/src/main.jsx)
  - ✓ [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx), [LoginPage.jsx](frontend/src/pages/LoginPage.jsx), [SettingsPage.jsx](frontend/src/pages/SettingsPage.jsx)
  - ✓ [frontend/src/layout/Layout.jsx](frontend/src/layout/Layout.jsx), [Sidebar.jsx](frontend/src/layout/Sidebar.jsx)
  - ✓ [frontend/src/context/RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx), [AuthContext.jsx](frontend/src/context/AuthContext.jsx)
  - ✓ [frontend/src/services/api.js](frontend/src/services/api.js)
  - ✓ [frontend/src/components/ui/](frontend/src/components/ui/) (CyberButton, CyberBadge, ProtectedRoute, RoleGuard, etc.)
  - ✓ [tailwind.config.js](frontend/tailwind.config.js)
  - ✓ [frontend/src/hooks/useAuth.js](frontend/src/hooks/useAuth.js)
- **Key decisions:**
  - Provider stack ordering — QueryClient outermost (every layer can use queries), then RealTime, then Auth (so the WS doesn't reconnect on every token refresh).
  - **Lazy-loaded panels** using `React.lazy + Suspense` — initial bundle stays small; heavy panels load on tab switch.
  - JWT in `sessionStorage` (cleared on tab close) — accepted XSS risk in exchange for SPA simplicity.
  - Single Axios instance with interceptors — JWT injection in one place; 401 → clear + redirect — auth invariants live in one file.
- **60-second defense pitch:** *"I own the frontend architecture and gatekeep the React code. The provider stack in main.jsx is ordered carefully so the WebSocket stays alive across renders, and Dashboard.jsx lazy-loads heavy panels behind Suspense — the initial JS payload is the login page only, the rest streams in on demand. ProtectedRoute and RoleGuard give us the auth boundary on the client; the backend dependencies are the real boundary."*
- **Likely individual questions:**
  - **Q: How does the WebSocket survive a token refresh?** A: We keep one WS open for the session. Auth refresh would require reconnect, but JWT is 8 h so within a single sit-down it doesn't trigger.
  - **Q: Why `useReducer` for RealTimeContext?** A: Many message types and the next state often depends on the previous (logs are appended, max 200 entries) — `useReducer` is the natural shape.
  - **Q: Show me the design system.** A: Glass-card pattern (`bg-white/5 backdrop-blur border border-white/10 rounded-xl`), neon palette in `tailwind.config.js`, custom `shadow-neon` utility, terminal mono font for log panels.

---

### 5.6 Omnia Helmy — Network Topology & Visualization

- **Sub-team:** Frontend & Visualization.
- **Files owned:**
  - ✓ [frontend/src/components/dashboard/NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx)
  - ✓ [frontend/src/components/dashboard/VulnTrend.jsx](frontend/src/components/dashboard/VulnTrend.jsx)
  - ✓ [frontend/src/components/dashboard/RiskHeatmap.jsx](frontend/src/components/dashboard/RiskHeatmap.jsx)
  - ✓ [frontend/src/components/dashboard/UptimeGauge.jsx](frontend/src/components/dashboard/UptimeGauge.jsx)
  - ✓ [frontend/src/components/dashboard/StatCards.jsx](frontend/src/components/dashboard/StatCards.jsx)
  - ✓ [frontend/src/components/dashboard/SeverityDonut.jsx](frontend/src/components/dashboard/SeverityDonut.jsx) (Phase 3 deliverable — exists)
  - ✓ [frontend/src/components/dashboard/AssetTimeline.jsx](frontend/src/components/dashboard/AssetTimeline.jsx)
  - ✓ [frontend/src/components/dashboard/ExposureMap.jsx](frontend/src/components/dashboard/ExposureMap.jsx)
- **Key decisions:**
  - `react-force-graph-2d` over a hand-rolled D3 implementation — faster to ship, free zoom/pan/drag, works on touch.
  - `ResizeObserver` + D3 `viewBox` so SVG charts scale fluidly without layout thrash.
  - Empty-state handling on every chart — no "ugly null" if a fresh DB has zero data.
  - Real-time node color updates: green <20, orange 20–75, red ≥75 — derived live from the WS KPI stream.
- **60-second defense pitch:** *"I own the visualizations. The headline is the network topology — it's a force-directed graph where each node is a discovered asset, color-coded by risk band and sized by vulnerability count. When a scan runs, nodes pulse and recolor live. Behind the scenes I use D3 for the heatmap and Recharts for the trend lines, with ResizeObserver hooks so charts adapt cleanly to mobile and the demo projector."*
- **Likely individual questions:**
  - **Q: Why react-force-graph instead of pure D3?** A: It bundles the D3 force simulation + a 2D canvas renderer + zoom/pan/drag — three libraries' worth in one. Pure D3 would have given us more control we didn't need.
  - **Q: How do you handle 1000 nodes performance-wise?** A: Canvas (not SVG) renderer, virtualization isn't needed at <1000, and we throttle the WS-driven re-layout calls.
  - **Q: What's the empty state strategy?** A: Each chart checks for zero data and renders an `EmptyState` illustration with a hint ("No scans yet — try Quick Scan").

---

### 5.7 Rahma Ebrahem — Dashboard UI & UX

- **Sub-team:** Frontend & Visualization.
- **Files owned:**
  - ✓ [frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx) (legacy wrapper)
  - ✓ [frontend/src/components/dashboard/ActionCenter.jsx](frontend/src/components/dashboard/ActionCenter.jsx)
  - ✓ [frontend/src/components/dashboard/OrchestrationFeed.jsx](frontend/src/components/dashboard/OrchestrationFeed.jsx)
  - ✓ [frontend/src/components/dashboard/ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx)
  - ✓ [frontend/src/components/VulnerabilityList.jsx](frontend/src/components/) (⚠️ verify path — see [VulnerabilitiesPanel.jsx](frontend/src/components/dashboard/VulnerabilitiesPanel.jsx))
  - ✓ [frontend/src/components/DeviceDetailModal.jsx](frontend/src/components/DeviceDetailModal.jsx)
  - ✓ [frontend/src/components/ReportGenerator.jsx](frontend/src/components/ReportGenerator.jsx)
  - ✓ [frontend/src/components/MetricCard.jsx](frontend/src/components/MetricCard.jsx)
  - ✓ [frontend/src/components/ui/Toast.jsx](frontend/src/components/ui/Toast.jsx), [SkeletonPulse.jsx](frontend/src/components/ui/SkeletonPulse.jsx)
  - ✓ [frontend/src/components/dashboard/ScanHistory.jsx](frontend/src/components/dashboard/ScanHistory.jsx) (Phase 3 — exists)
  - ✓ [frontend/src/components/dashboard/RemediationPanel.jsx](frontend/src/components/dashboard/RemediationPanel.jsx)
  - ✓ [frontend/src/components/ui/ConfirmDialog.jsx](frontend/src/components/ui/ConfirmDialog.jsx), [EmptyState.jsx](frontend/src/components/ui/EmptyState.jsx)
- **Key decisions:**
  - Glass-card pattern as the recurring visual rhythm — every panel is the same primitive so the layout feels coherent.
  - Skeleton loaders on every async surface (`SkeletonPulse`) so the user never sees a blank panel.
  - `OrchestrationFeed` virtualized with `react-window` (45 px items, 500 px height) — handles the firehose of agent log events.
  - `ScanButton` shows 4-step pipeline progress and infers active step from log content — gives the user a sense of *where* the scan is, not just *that* it's running.
- **60-second defense pitch:** *"I own how the platform feels. Every panel uses the same glass-card pattern so the eye never has to relearn. The OrchestrationFeed is virtualized so we can stream hundreds of log lines without dropping frames, and the ScanButton infers which pipeline step is active from the log stream — so users see the scan move through Recon → Attack → Validation → Scoring instead of a vague spinner."*
- **Likely individual questions:**
  - **Q: How do you handle errors in the UI?** A: Three layers — Toast for transient errors, ErrorBoundary for crashes, EmptyState for "no data" rather than fake spinners.
  - **Q: Mobile breakpoint?** A: Tailwind `md:` (768 px). Topology + heatmap collapse to vertical stack; tabs become a horizontal scroll.
  - **Q: Accessibility?** A: ARIA labels on all interactive elements, focus rings preserved, color contrast verified for the dark theme.

---

### 5.8 Shahd Paher — Scan Orchestration Sub-Leader

- **Sub-team:** Security & Scanning Engine. Owns the lab.
- **Files owned:**
  - ✓ [backend/app/services/nmap_wrapper.py](backend/app/services/nmap_wrapper.py)
  - ✓ [backend/app/services/nuclei_wrapper.py](backend/app/services/nuclei_wrapper.py)
  - ✓ [backend/app/services/openvas.py](backend/app/services/openvas.py)
  - ✓ [backend/app/services/infrastructure_agent.py](backend/app/services/infrastructure_agent.py)
  - ✓ [backend/app/api/v1/endpoints/findings.py](backend/app/api/v1/endpoints/findings.py)
  - ✓ [backend/app/api/v1/endpoints/openvas.py](backend/app/api/v1/endpoints/openvas.py)
  - ✓ [lab_setup.ps1](lab_setup.ps1), [docker-compose.lab.yml](docker-compose.lab.yml)
  - ✓ [backend/app/services/scope_guard.py](backend/app/services/scope_guard.py) (Phase 3 — exists)
  - ✓ [lab/scenarios/](lab/) (verify scenario `.md` files)
- **Key decisions:**
  - Nuclei v3.3.8 **pinned in the Dockerfile** so a template registry change doesn't silently alter findings between runs.
  - Service-aware template selection in `AttackAgent.SERVICE_TO_TEMPLATE` — the platform doesn't blindly run every Nuclei template, it narrows to what Nmap discovered.
  - `ScopeGuard` defaults to "only the hostname extracted from base_url" — every reprobe and Nuclei call is rechecked, not just the first one.
  - Lab uses 4 isolated subnets (DMZ/Corp/Data/Mgmt) so a scan can't accidentally egress to the Internet.
- **60-second defense pitch:** *"I own the security tooling and the lab. The lab is 6 vulnerable containers across 4 isolated subnets — the same shape as a small SME. Findings come from Nmap and Nuclei, never hand-rolled payloads, and every finding stores the raw HTTP request and response for audit. Before we touch the network we run scope_guard.assert_in_scope, so we cannot accidentally scan something we don't have permission for."*
- **Likely individual questions:**
  - **Q: Why pin Nuclei?** A: Reproducibility. Templates are fetched at build time, so the binary and templates are frozen with the image.
  - **Q: Show me a lab attack chain.** A: Walk through SQLi against Juice Shop → Nuclei `tags:exposures` finds the endpoint → ValidationAgent reprobes → UnifiedRiskEngine scores it.
  - **Q: How does scope_guard prevent out-of-scope scans?** A: ScopeGuard is built once at scan start from `Target.scope_allowlist`; every agent calls `assert_in_scope(url)` before sending — out-of-scope URLs raise `ScopeViolation` and are logged but not requested.

---

### 5.9 Mariz Ehap — SIEM & Log Analytics

> ⚠️ Verify: `project_plan.md` lists both **Marize Ehap** (frontend sub-leader) and **Mariz Ehap** (SIEM). Confirm at the dry-run that these are two different people and that the spelling is correct on the slides.

- **Sub-team:** Security & Scanning Engine.
- **Files owned:**
  - ✓ [backend/app/services/wazuh_integration.py](backend/app/services/wazuh_integration.py)
  - ✓ [backend/app/services/elastic_integration.py](backend/app/services/elastic_integration.py)
  - ✓ [backend/app/api/v1/endpoints/siem.py](backend/app/api/v1/endpoints/siem.py)
  - ✓ [backend/app/services/alert_correlator.py](backend/app/services/alert_correlator.py) (Phase 3 — exists)
  - ✓ [lab/](lab/) (kibana dashboards, log-shipper, custom rules — ⚠️ verify exact files)
- **Key decisions:**
  - SIEM is optional (`SIEM_ENABLED=false` by default) so the lite stack stays under 16 GB RAM.
  - `siem.py` returns HTTP 503 when the flag is off — the frontend hides the SIEM tab via `ConfigContext`, defense-in-depth.
  - `alert_correlator` joins Wazuh alerts to scan findings on (IP, asset_id, time window) so the dashboard can show "this scan finding aligns with this real-world alert."
- **60-second defense pitch:** *"I own the SIEM integration. The lab containers ship logs to Wazuh, Wazuh writes alerts to Elasticsearch, and my correlator joins those alerts back to the scan findings so the dashboard can show the examiner: 'we discovered this vulnerability AND we saw a real-world attempt to exploit it in the logs.' The whole pipeline is feature-flagged because not every reviewer will run the full 32 GB stack."*
- **Likely individual questions:**
  - **Q: What's the difference between Wazuh and Elasticsearch in your stack?** A: Wazuh is the agent + rules engine — it generates alerts. Elastic is the storage / query backend. Kibana is the visualization layer.
  - **Q: How would you detect a brute-force attack?** A: Wazuh rule on repeated auth failures from one IP within N seconds → alert in Elastic → correlator matches it to the scanned asset → surfaces in `UnifiedInbox.jsx`.
  - **Q: What happens if Wazuh is down?** A: `wazuh_integration.get_alerts()` catches the connection error, returns `[]`, and the SIEM tab shows "No data" rather than crashing.

---

### 5.10 Yosef Ali — QA Engineer (API & Integration Testing)

- **Sub-team:** DevOps & QA.
- **Files owned:**
  - ✓ [backend/tests/](backend/tests/)
  - 🚧 / ✓ `test_e2e_scans.py`, `test_risk.py`, `test_risk_engine_manual.py`, `test_endpoints.py`, `test_auth_flow.py`, `test_websocket.py`, `conftest.py` — verify which exist
  - ✓ [postman/](postman/) — Postman collection
- **Key decisions:**
  - Pytest fixtures in `conftest.py` use SQLite-in-memory + `TestClient` for fast, hermetic tests — a full backend smoke runs in seconds.
  - Postman collection mirrors the test suite for manual smoke testing during demos.
  - Coverage target: ≥ 70% on backend services; final target ≥ 15 passing tests by feature freeze.
- **60-second defense pitch:** *"I own the test suite. We have endpoint tests, risk-engine math tests, an auth flow test, and a WebSocket test — all running on an in-memory SQLite fixture so they take seconds. The Postman collection is the human-facing equivalent for live debugging. Before each freeze gate I run the full pytest + coverage report and post it in the GitHub PR."*
- **Likely individual questions:**
  - **Q: How do you test the risk engine math?** A: Parametrized pytest cases — fixed `Scan` + `Vulnerability` objects → assert exact `risk_score` and `breakdown[0].contribution`.
  - **Q: How do you test async code?** A: `pytest-asyncio` with `@pytest.mark.asyncio` and `httpx.AsyncClient(app=app)` for ASGI testing.
  - **Q: Coverage right now?** A: ⚠️ Verify with the latest coverage report.

---

### 5.11 Mazin Alla — QA Engineer (E2E & Frontend Testing)

- **Sub-team:** DevOps & QA.
- **Files owned:**
  - ✓ [tests/e2e/](tests/) (Playwright suite — ⚠️ verify exact test files)
  - 🚧 `tests/e2e/test_login_flow.py`, `test_scan_trigger.py`, `test_report_export.py`, `conftest.py`
  - ✓ [UAT_REPORT.md](UAT_REPORT.md), [BROWSER_COMPAT_REPORT.md](BROWSER_COMPAT_REPORT.md)
- **Key decisions:**
  - Playwright over Selenium — async-native, parallel browser contexts, built-in auto-wait.
  - Three browsers (Chromium / Firefox / WebKit) in CI for the freeze gate; Chromium-only on every PR for speed.
  - UAT reports filed as GitHub Issues and burned down before each weekly demo.
- **60-second defense pitch:** *"I own the user journey tests. Playwright drives a real browser through the critical paths — login, trigger a scan, export a PDF — and I run it on Chromium, Firefox, and WebKit before each release gate. UAT bugs go straight into GitHub Issues with steps + expected + actual + screenshot, and the sub-leaders close them out before merge to main."*
- **Likely individual questions:**
  - **Q: What's covered by E2E?** A: login_flow, scan_trigger, report_export. Each one walks the full browser → backend → DB stack.
  - **Q: How do you wait for the scan to finish in the test?** A: Playwright `expect(locator).toContainText('COMPLETED', { timeout: 60_000 })` polling on the status badge.
  - **Q: Browser compatibility findings?** A: ⚠️ Verify with [BROWSER_COMPAT_REPORT.md](BROWSER_COMPAT_REPORT.md).

---

### 5.12 Omar Tarek — Documentation & Presentation Lead

- **Sub-team:** DevOps & QA (cross-functional).
- **Files owned:**
  - ✓ [FYP_Documentation.md](FYP_Documentation.md), [FYP_Figures.md](FYP_Figures.md)
  - ✓ [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), [HOW_TO_RUN.md](HOW_TO_RUN.md)
  - ✓ [HARDENING_PLAN.md](HARDENING_PLAN.md) (⚠️ verify file present)
  - ✓ [FINAL_PRESENTATION.md](FINAL_PRESENTATION.md), [FINAL_PRESENTATION.pptx](FINAL_PRESENTATION.pptx)
  - ✓ [demo/](demo/) — demo scripts and checklist
  - ✓ [docs/API_GUIDE.md](docs/), [docs/ARCHITECTURE_DIAGRAM.md](docs/) (⚠️ verify exact paths)
  - ✓ [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)
- **Key decisions:**
  - Mermaid diagrams in markdown so the architecture diagram lives next to the code and updates with the repo.
  - The demo script is a literal click-by-click — when adrenaline hits the presenter on demo day, they don't have to think.
  - Slides authored in markdown first, then exported to .pptx — version-controlled.
- **60-second defense pitch:** *"I own the documentation surface. The academic report, the demo script, the slides, the architecture diagram — all of it. The slides come from FINAL_PRESENTATION.md so they're version-controlled, the demo script is literal click-by-click so the live demo doesn't depend on memory, and the README walks a fresh examiner through getting the stack up in under five minutes."*
- **Likely individual questions:**
  - **Q: Where's the API documented?** A: Two places: `/docs` Swagger auto-generated by FastAPI, and the human-readable `docs/API_GUIDE.md` for non-technical reviewers.
  - **Q: How do you keep docs in sync with code?** A: PRs that touch endpoints require a Swagger update; the architecture diagram is a Mermaid block in the markdown and is reviewed at every freeze gate.
  - **Q: Demo timing?** A: 3 min intro, 5 min backend walkthrough, 5 min frontend, 5 min security, 10 min live demo, 10 min Q&A — under 30 min total.

---

## 6. Anticipated Q&A — Whole Project

### 6.1 Architecture & design

1. **Why Celery + Redis instead of FastAPI BackgroundTasks?** BackgroundTasks runs in the API process — one stuck scan freezes the API. Celery isolates the work, gives us retries, and lets us scale workers independently.
2. **Why Gemini and not OpenAI / a local LLM?** Cost (Flash is the cheapest production-grade model), latency (~sub-second for short prompts), free tier covers our academic budget, and we're not locked in — `BaseAgent` swaps Gemini for any provider in one line.
3. **Why not run all agents in parallel?** Each later stage depends on the previous (Attack needs Recon results, Validation needs Attack findings). Parallelizing would require speculative work and complicate scope-guard enforcement.
4. **What's deterministic vs. AI-driven?** Findings (Nuclei), validation (reprobe + difflib), risk score (CVSS env math), action items (rules) — all deterministic. AI: exec summary, finding descriptions, asset advisory — all advisory text only.
5. **What stops the AI from running destructive actions?** It cannot — the LLM only returns text. We never `eval` or `exec` LLM output. SOAR webhook calls (in `soar_orchestrator`) are gated behind `SOAR_ENABLED` and currently disabled.
6. **How is the risk score actually calculated?** For each vuln: parse CVSS vector (or default from severity) → environmental score adjusted for asset_value/sensitivity/exposure → multiply by confidence → sum. Add port-exposure scores. Cap at 100. See [unified_risk_engine.py:74-159](backend/app/services/unified_risk_engine.py#L74).
7. **Why hash-chained logs instead of just timestamps?** Timestamps can be edited; the chain detects insertion, deletion, or modification of any past row. Combined with the DB trigger that blocks UPDATE/DELETE, the audit trail is tamper-evident.
8. **Why JWT in sessionStorage and not httpOnly cookies?** Trade-off: cookies are safer against XSS but require CSRF tokens and complicate the SPA's login flow. We accepted the XSS risk and would migrate to httpOnly cookies for production.
9. **How do you prevent prompt injection?** `llm_guard.redact()` strips cookies, JWTs, internal hostnames, and CC numbers before the prompt leaves the process. The LLM has no tools, so even a successful injection can only return text.
10. **What's the difference between a Vulnerability and a Finding?** A Finding is the raw scanner output (one Nuclei match). A Vulnerability is the persisted, dedup'd record on the Scan, with status, evidence, CVSS, and remediation.

### 6.2 Reliability & operations

11. **What happens if a scan stalls?** Two layers: (a) `scan_reaper` flips orphaned RUNNING scans to FAILED on FastAPI startup; (b) Celery task `max_retries=2` with checkpoint resume.
12. **What if Redis goes down?** `event_publisher` swallows the publish; the scan continues and writes to DB; WebSocket clients lose live updates. Backend reconnects with exponential backoff (2 → 4 → 8 → 16 → 32 s).
13. **What if Gemini's quota is exhausted?** `llm_guard` daily token budget short-circuits. `BaseAgent.llm_reason` returns `""`; the deterministic path still produces a complete scan, just without AI commentary.
14. **What if the scan target is unreachable?** Recon's Playwright/httpx times out → empty endpoint list → Nuclei returns 0 findings → risk score = 0 → scan completes COMPLETED with empty report. The audit log records the failure.
15. **What if a Celery worker dies mid-scan?** `acks_late=True` would re-queue (verify configuration in `celery_app.py`). If the worker comes back, `_past(checkpoint, current)` skips already-completed phases.
16. **How do you know a scan finished correctly?** Three signals: `scan.status == COMPLETED`, `scan.checkpoint == "reported"`, the AgentLog hash chain has a `reporting_complete` row.

### 6.3 Security

17. **Is your platform itself secure?** See [SECURITY_AUDIT.md](SECURITY_AUDIT.md). We ran `trivy` against the images, fixed/accepted each finding, fail-fast on empty `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`, and stripped secrets from logs.
18. **Where are credentials stored?** `Target.auth_credentials` is encrypted at rest with Fernet (`CREDENTIAL_ENCRYPTION_KEY`). Decrypted only inside the agent that needs it.
19. **How do you stop accidentally scanning the wrong target?** `ScopeGuard` is constructed from `Target.scope_allowlist` (default: just the base_url hostname). Every URL is checked at every agent stage — Recon, Attack, Validation — not just at scan start.
20. **What's the rate limit?** Per-target `Target.max_rps` (default 10) is enforced via `aiolimiter.AsyncLimiter`. Nuclei is invoked with `-rate-limit N`. Per-target `max_concurrent_scans=1` prevents two scans against the same host.
21. **RBAC enforcement?** Backend `Depends(get_current_user)` + `require_role(...)` on mutation routes. Frontend `RoleGuard` is UX, not security — bypassing it just shows a 403.

### 6.4 Frontend

22. **Why React Query?** Server state has different caching needs than UI state — React Query handles staleness, refetch-on-focus, optimistic updates, and request deduplication out of the box.
23. **Why both Zustand and Context?** Context for hierarchical, session-wide state (auth, WS, config). Zustand for ephemeral UI state without prop-drilling. (⚠️ Verify exact division — codebase may use only one.)
24. **How does a chart re-render mid-scan?** WS message → `RealTimeContext` reducer → state changes → React re-renders only the components that consumed the changed slice.

### 6.5 Methodology

25. **What was the hardest decision?** Removing the LLM-as-validator. We built it first because it sounded impressive — but one prompt regression made real vulnerabilities disappear. Replacing it with `validation_probe.reprobe` cost a sprint but made the platform defensible.
26. **What would you do differently?** ⚠️ Each member should have an honest 1-line answer rehearsed (e.g., "start with E2E tests in week 4, not week 10").
27. **What's not implemented?** Full SOAR auto-remediation (n8n call commented out), production HTTPS certs (we use Caddy local certs), and large-scale load testing.

---

## 7. Run / Demo Guide

### 7.1 Pre-demo setup (presentation machine)

```powershell
# 1. Create the shared external network (one-time)
docker network create the-dashboard-project-_lab_network

# 2. Bring up the main stack
docker compose up -d

# 3. Bring up the lab
docker compose -f docker-compose.lab.yml up -d
# OR all-in-one wrapper:
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 start

# 4. Seed the dashboard with lab targets
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 seed
# (or directly: Invoke-RestMethod -Uri http://localhost:8000/api/v1/lab/seed -Method POST)

# 5. Verify URLs respond
#   http://localhost            (dashboard via Caddy)
#   http://localhost:5173       (dashboard direct, dev mode only)
#   http://localhost:8000/docs  (Swagger)
#   http://localhost:3000       (Juice Shop lab)
#   http://localhost:9392       (OpenVAS, --profile full only)
#   http://localhost:5601       (Kibana, --profile full only)
```

### 7.2 Lite mode (low-RAM laptop)

```powershell
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
# Linux/Mac:
bash start-lite.sh
```

### 7.3 Login

- **Default admin (seeded on first boot):** `admin@local` / `Admin@1234`
- First login forces a password change (`User.force_password_change=True`).

### 7.4 Demo golden path (2 minutes of clicks)

1. **Open the dashboard** → `http://localhost`. Show the Center tab — KPIs, RiskHeatmap, OrchestrationFeed (empty).
2. **Click Quick Scan** → enter `http://juiceshop:3000` (or one of the seeded lab targets).
3. Watch live: ScanButton steps light up Queued → Nmap → Nuclei → Risk → AI; OrchestrationFeed streams agent log lines; NetworkTopology recolors nodes as findings land.
4. When the badge turns green ("COMPLETED"), open the Threats tab → vulnerability table populated.
5. Click any HIGH/CRITICAL row → IncidentDetailDrawer slides in with CVSS, evidence, AI remediation.
6. Open the AI tab → AgentLogViewer shows the SHA-256 hash chain (`✓ chain valid`).
7. Open the Docs tab → click Generate PDF → Download → open the signed PDF report.

### 7.5 Sample inputs / outputs

| Input | Endpoint | Expected output |
|---|---|---|
| `POST /api/v1/scans/ai {"target_url":"http://juiceshop:3000"}` | scans.create_ai_scan | `{"id":"<uuid>","status":"queued"}` then async transition to RUNNING → COMPLETED |
| `GET /api/v1/dashboard/kpis` | dashboard.get_kpis | `{overall_score, health_score, counts:{critical,high,medium,low}, total_assets, last_scan_id}` |
| `GET /api/v1/reports/{scan_id}/pdf` | reports.download | `application/pdf` binary, signed |
| `GET /api/v1/audit/logs/{scan_id}` | audit.get_scan_logs | List of AgentLog rows with `prev_hash` + `this_hash` |

### 7.6 Troubleshooting recipes

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend container crash loop on startup | `google-generativeai` legacy package mismatch | Already migrated to `google-genai`. If reappears: `docker compose build --no-cache backend && docker compose up -d --force-recreate backend` |
| `/health` reports `redis: false` | Redis container not started or `REDIS_URL` typo | `docker compose ps redis`; `docker logs redis` |
| Login returns 401 with correct password | Admin not seeded (DB volume reset) | Restart backend; lifespan re-seeds `admin@local / Admin@1234` |
| Scan stuck in RUNNING forever | Celery worker crashed mid-scan | Restart backend → `scan_reaper` flips it to FAILED on next startup |
| WebSocket badge says "Disconnected" | Caddy not proxying `/ws/*` | Check `Caddyfile` in `infra/`; restart caddy container |
| PDF download returns 500 | ReportLab font missing | Ensure backend image rebuild includes `fonts-dejavu-core`; ⚠️ verify Dockerfile |
| Nuclei returns 0 findings on Juice Shop | Network isolation broke (lab/main not on same external network) | `docker network inspect the-dashboard-project-_lab_network` should list both backend and juiceshop |

### 7.7 Pre-demo checklist (the morning of)

- [ ] `docker compose ps` — all 6 main + 6 lab containers `Up (healthy)`
- [ ] `curl http://localhost:8000/health` — `{"status":"ok","redis":true,"workers":true}`
- [ ] Login with admin works
- [ ] Trigger a quick scan against `http://juiceshop:3000`; verify it completes in < 90 s
- [ ] PDF download works
- [ ] WebSocket badge green throughout
- [ ] Browser zoomed for projector (Ctrl+= 2 steps)
- [ ] Backup laptop running the same stack
- [ ] Slides loaded on second monitor

---

## 8. Glossary & Acronyms

| Term | Definition |
|---|---|
| **DAST** | Dynamic Application Security Testing — black-box scanning of a running application (vs. SAST which scans source code). |
| **SAST** | Static Application Security Testing — scans source code without running it. |
| **SME** | Small-to-Medium Enterprise — our target customer. |
| **RBAC** | Role-Based Access Control — users have roles (ANALYST, ADMIN); routes check the role. |
| **JWT** | JSON Web Token — signed token carrying `sub` (user) + `role` claims; HS256, 8 h TTL. |
| **CVSS** | Common Vulnerability Scoring System — industry standard 0–10 severity score. We use v3.1 environmental. |
| **OWASP Top 10** | Industry list of most critical web app risks (2021 edition). We tag findings against it. |
| **CVE** | Common Vulnerabilities and Exposures — public catalog of known vulnerabilities (e.g. CVE-2021-44228 = Log4Shell). |
| **SIEM** | Security Information and Event Management — Wazuh + Elastic + Kibana in our stack. Aggregates and alerts on logs. |
| **SOAR** | Security Orchestration, Automation and Response — n8n in our stack (currently disabled). Triggers automated playbooks on detection. |
| **IDS** | Intrusion Detection System — Wazuh fills this role for us. |
| **GMP** | Greenbone Management Protocol — OpenVAS's API protocol; we use the `python-gvm` client. |
| **EASM** | External Attack Surface Management — what `DiscoveryAgent` does (subfinder + asset enum). |
| **MTTR** | Mean Time To Remediate — KPI shown on `StatCards`. |
| **PCI-DSS / HIPAA / ISO-27001 / GDPR** | Compliance frameworks our `framework_tagger` maps findings to. |
| **PoC** | Proof of Concept — a small script demonstrating a vulnerability. `ReportingAgent` generates these for HIGH/CRITICAL findings. |
| **FYP** | Final Year Project — our academic context. |
| **Fernet** | Symmetric encryption recipe (AES-128-CBC + HMAC-SHA256). Used to encrypt `Target.auth_credentials`. |
| **bcrypt** | Adaptive password-hashing function with built-in salt and tunable cost. |
| **Celery beat** | Celery's cron-like scheduler. Used for recurring scheduled scans (optional). |
| **Lifespan** | FastAPI startup/shutdown hook — replaces `@on_event("startup")`. |
| **Scope allowlist** | Per-target list of hostnames/CIDRs the scanner is permitted to touch. Default: only the base_url hostname. |

---

## Author's note (for the reader of this file)

- Section 5 (per-member) is the most likely to drift over time — re-verify ownership against `git log --author "<name>"` the day before defense.
- The list of `🚧 PLANNED` and `⚠️ Verify` items at write time:
  - `infra/healthcheck.sh` (Shaban's deliverable) — confirm presence
  - Lab scenario `.md` files (`sqli_scenario.md`, `xss_scenario.md`, `misconfig_scenario.md`) — confirm in `lab/scenarios/`
  - Yosef's exact test file inventory and current coverage % — pull from latest pytest-cov run
  - Mazin's Playwright test file inventory — confirm in `tests/e2e/`
  - Spelling of **Marize Ehap** vs **Mariz Ehap** — confirm two distinct people on the slides
  - Whether the codebase actually uses Zustand alongside React Context, or only one
  - PDF font dependency in backend Dockerfile (referenced in §7.6)
- Don't memorize this document — internalize it. The examiner can tell the difference.

— *Generated 2026-05-03, week 12 of 16. Re-generate if the codebase changes materially before defense day.*

---

## Appendix A — Complete File Ownership Map (Repo-Audit, 2026-05-07)

> **Purpose:** Single, exhaustive owner-per-file map produced from a full sweep of the working tree. Files are grouped by subsystem under each member. Anything not owned by anyone or owned by multiple members is listed in §A.13 below.
> **Convention:** *(shared: Name)* means co-owned but the listed member is the primary. **Bold** = file confirmed present in the working tree at audit time.

### A.1 Omar Kapil — Team Leader & DevOps Sub-Leader

**Docker / Compose**
- **[docker-compose.yml](docker-compose.yml)** *(shared: Shaban)*
- **[docker-compose.lab.yml](docker-compose.lab.yml)** *(shared: Shahd)*
- **[backend/Dockerfile](backend/Dockerfile)** *(shared: Reem)*
- **[frontend/Dockerfile](frontend/Dockerfile)**, **[frontend/Dockerfile.prod](frontend/Dockerfile.prod)** *(shared: Marize)*

**Lab / lifecycle scripts**
- **[lab_setup.ps1](lab_setup.ps1)** *(shared: Shahd)*, **[trigger_lab_scans.ps1](trigger_lab_scans.ps1)**
- **[start-lite.ps1](start-lite.ps1)**, **[start-lite.sh](start-lite.sh)**, **[start-full.ps1](start-full.ps1)**
- **[stop-all.ps1](stop-all.ps1)**, **[stop-all.sh](stop-all.sh)**

**Reverse proxy / network isolation**
- **[infra/caddy/Caddyfile](infra/caddy/Caddyfile)**, **[infra/nginx.conf](infra/nginx.conf)**
- **[infra/isolation/docker-compose.lab.isolation.override.yml](infra/isolation/docker-compose.lab.isolation.override.yml)**
- **[infra/isolation/lab_isolation.ps1](infra/isolation/lab_isolation.ps1)**, **[infra/isolation/lab_isolation.sh](infra/isolation/lab_isolation.sh)**

**CI/CD**
- **[.github/workflows/ci.yml](.github/workflows/ci.yml)**, **[.github/workflows/cd.yml](.github/workflows/cd.yml)**

**Coordination / audit docs**
- **[project_plan.md](project_plan.md)**, **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)**, **[AUDIT_REPORT.md](AUDIT_REPORT.md)**
- **[FINAL_DEMO_SCRIPT.md](FINAL_DEMO_SCRIPT.md)**, **[MANUAL_LIVE_DEMO.md](MANUAL_LIVE_DEMO.md)**
- **[FINISHINGPLAN.md](FINISHINGPLAN.md)**, **[mode1run.md](mode1run.md)**, **[omar_kapil_role.md](omar_kapil_role.md)**
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** *(shared: Omar Tarek)*
- **[.env](.env)**, **[.gitignore](.gitignore)**, **[.vscode/](.vscode/)**, **[.claude/](.claude/)**

### A.2 Reem Amin — Backend Sub-Leader

**FastAPI core**
- **[backend/app/main.py](backend/app/main.py)**, **[backend/app/core/config.py](backend/app/core/config.py)**
- **[backend/app/core/database.py](backend/app/core/database.py)**, **[backend/app/core/security.py](backend/app/core/security.py)**
- **[backend/app/core/crypto.py](backend/app/core/crypto.py)**, **[backend/app/core/request_id.py](backend/app/core/request_id.py)**
- **[backend/app/api/api.py](backend/app/api/api.py)**, **[backend/app/api/deps.py](backend/app/api/deps.py)**
- All `__init__.py` package markers under `backend/app/`

**Endpoints (her domain)**
- **[backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py)**
- **[backend/app/api/v1/endpoints/dashboard.py](backend/app/api/v1/endpoints/dashboard.py)**
- **[backend/app/api/v1/endpoints/scans.py](backend/app/api/v1/endpoints/scans.py)**
- **[backend/app/api/v1/endpoints/targets.py](backend/app/api/v1/endpoints/targets.py)**
- **[backend/app/api/v1/endpoints/reports.py](backend/app/api/v1/endpoints/reports.py)**
- **[backend/app/api/v1/endpoints/rbac.py](backend/app/api/v1/endpoints/rbac.py)**
- **[backend/app/api/v1/endpoints/audit.py](backend/app/api/v1/endpoints/audit.py)**
- **[backend/app/api/v1/endpoints/config.py](backend/app/api/v1/endpoints/config.py)**

**Models / Schemas**
- **[backend/app/models/scan.py](backend/app/models/scan.py)**, **[backend/app/models/user.py](backend/app/models/user.py)**, **[backend/app/models/config.py](backend/app/models/config.py)**
- **[backend/app/schemas/scan.py](backend/app/schemas/scan.py)**

**Migrations (Alembic)**
- **[backend/alembic/env.py](backend/alembic/env.py)**, **[backend/alembic.ini](backend/alembic.ini)**
- All 16 files under **[backend/alembic/versions/](backend/alembic/versions/)**

**Backend bootstrap**
- **[backend/Dockerfile](backend/Dockerfile)** *(shared: Omar K)*, **[backend/requirements.txt](backend/requirements.txt)**
- **[backend/init_db.py](backend/init_db.py)**, **[backend/seed_user.py](backend/seed_user.py)**, **[backend/utils.py](backend/utils.py)**

### A.3 Yousef Abdel Hady — AI & Risk Engine

**Agent pipeline**
- **[backend/app/services/agent_orchestrator.py](backend/app/services/agent_orchestrator.py)**
- **[backend/app/services/discovery_agent.py](backend/app/services/discovery_agent.py)**
- **[backend/app/services/intelligence_agent.py](backend/app/services/intelligence_agent.py)**
- **[backend/app/services/validation_probe.py](backend/app/services/validation_probe.py)**
- **[backend/app/services/finding_dedup.py](backend/app/services/finding_dedup.py)**

**Risk / scoring**
- **[backend/app/services/unified_risk_engine.py](backend/app/services/unified_risk_engine.py)**
- **[backend/app/services/cvss.py](backend/app/services/cvss.py)**
- **[backend/app/services/scoring_explainer.py](backend/app/services/scoring_explainer.py)**
- **[backend/app/services/framework_tagger.py](backend/app/services/framework_tagger.py)**
- **[backend/app/services/sla.py](backend/app/services/sla.py)**

**LLM advisory layer**
- **[backend/app/services/ai_advisor.py](backend/app/services/ai_advisor.py)**
- **[backend/app/services/llm_guard.py](backend/app/services/llm_guard.py)**
- **[backend/ai_advisor.py](backend/ai_advisor.py)** *(legacy duplicate at backend root — schedule for deletion)*
- **[frontend/src/components/SecurityAdvisor.jsx](frontend/src/components/SecurityAdvisor.jsx)** *(consumer of his AI advisor; shared: Rahma for visual styling)*

### A.4 Mohamed Shaban — Task Queue & Docker Orchestration

**Async / Celery / WebSocket**
- **[backend/app/services/scan_tasks.py](backend/app/services/scan_tasks.py)**
- **[backend/app/services/event_publisher.py](backend/app/services/event_publisher.py)**
- **[backend/app/services/ws_manager.py](backend/app/services/ws_manager.py)**
- **[backend/app/services/scan_reaper.py](backend/app/services/scan_reaper.py)**
- **[backend/app/services/task_monitor.py](backend/app/services/task_monitor.py)**
- **[backend/app/services/asset_monitor.py](backend/app/services/asset_monitor.py)**
- **[backend/app/core/celery_app.py](backend/app/core/celery_app.py)**

**SOAR / lab orchestration**
- **[backend/app/services/soar_orchestrator.py](backend/app/services/soar_orchestrator.py)**
- **[backend/app/services/lab_manager.py](backend/app/services/lab_manager.py)**
- **[backend/app/api/v1/endpoints/lab.py](backend/app/api/v1/endpoints/lab.py)**

**Health / system checks**
- **[infra/healthcheck.sh](infra/healthcheck.sh)**
- **[backend/scripts/full_system_check.py](backend/scripts/full_system_check.py)**
- **[docker-compose.yml](docker-compose.yml)** *(shared: Omar K)*

### A.5 Marize Ehap — Frontend Sub-Leader

**App shell / routing**
- **[frontend/src/App.jsx](frontend/src/App.jsx)**, **[frontend/src/main.jsx](frontend/src/main.jsx)**
- **[frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)**
- **[frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx)**
- **[frontend/src/pages/SettingsPage.jsx](frontend/src/pages/SettingsPage.jsx)**
- **[frontend/src/layout/Layout.jsx](frontend/src/layout/Layout.jsx)**, **[frontend/src/layout/Sidebar.jsx](frontend/src/layout/Sidebar.jsx)**

**Contexts / services / hooks / stores**
- **[frontend/src/context/RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx)**
- **[frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)**
- **[frontend/src/context/ConfigContext.jsx](frontend/src/context/ConfigContext.jsx)**
- **[frontend/src/services/api.js](frontend/src/services/api.js)**, **[frontend/src/api/config.js](frontend/src/api/config.js)**
- **[frontend/src/hooks/useAuth.js](frontend/src/hooks/useAuth.js)**
- **[frontend/src/hooks/useGlobalShortcuts.js](frontend/src/hooks/useGlobalShortcuts.js)**
- **[frontend/src/hooks/useSavedViews.js](frontend/src/hooks/useSavedViews.js)**
- **[frontend/src/stores/envStore.js](frontend/src/stores/envStore.js)**

**Shared UI primitives**
- **[frontend/src/components/ui/CyberButton.jsx](frontend/src/components/ui/CyberButton.jsx)**, **[CyberBadge.jsx](frontend/src/components/ui/CyberBadge.jsx)**
- **[frontend/src/components/ui/ProtectedRoute.jsx](frontend/src/components/ui/ProtectedRoute.jsx)**, **[RoleGuard.jsx](frontend/src/components/ui/RoleGuard.jsx)**
- **[frontend/src/components/ui/Tabs.jsx](frontend/src/components/ui/Tabs.jsx)**, **[SubTabBar.jsx](frontend/src/components/ui/SubTabBar.jsx)**, **[GaugeRing.jsx](frontend/src/components/ui/GaugeRing.jsx)**
- **[frontend/src/components/ErrorBoundary.jsx](frontend/src/components/ErrorBoundary.jsx)**, **[TabNavigation.jsx](frontend/src/components/TabNavigation.jsx)**
- **[frontend/src/components/CommandPalette.jsx](frontend/src/components/CommandPalette.jsx)**, **[ToastProvider.jsx](frontend/src/components/ToastProvider.jsx)**
- **[frontend/src/components/QuickScanPopover.jsx](frontend/src/components/QuickScanPopover.jsx)**, **[ShortcutCheatsheet.jsx](frontend/src/components/ShortcutCheatsheet.jsx)**
- **[frontend/src/components/NotificationsBell.jsx](frontend/src/components/NotificationsBell.jsx)**

**Build / config**
- **[frontend/tailwind.config.js](frontend/tailwind.config.js)**, **[frontend/postcss.config.js](frontend/postcss.config.js)**
- **[frontend/vite.config.js](frontend/vite.config.js)**, **[frontend/package.json](frontend/package.json)**, **[frontend/package-lock.json](frontend/package-lock.json)**
- **[frontend/index.html](frontend/index.html)**

### A.6 Omnia Helmy — Network Topology & Visualization

- **[frontend/src/components/dashboard/NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx)**
- **[frontend/src/components/dashboard/TopologyLegend.jsx](frontend/src/components/dashboard/TopologyLegend.jsx)**
- **[frontend/src/components/dashboard/VulnTrend.jsx](frontend/src/components/dashboard/VulnTrend.jsx)**
- **[frontend/src/components/dashboard/RiskHeatmap.jsx](frontend/src/components/dashboard/RiskHeatmap.jsx)**
- **[frontend/src/components/dashboard/UptimeGauge.jsx](frontend/src/components/dashboard/UptimeGauge.jsx)**
- **[frontend/src/components/dashboard/StatCards.jsx](frontend/src/components/dashboard/StatCards.jsx)**
- **[frontend/src/components/dashboard/SeverityDonut.jsx](frontend/src/components/dashboard/SeverityDonut.jsx)**
- **[frontend/src/components/dashboard/AssetTimeline.jsx](frontend/src/components/dashboard/AssetTimeline.jsx)**
- **[frontend/src/components/dashboard/ExposureMap.jsx](frontend/src/components/dashboard/ExposureMap.jsx)**
- **[frontend/src/components/dashboard/RiskScore.jsx](frontend/src/components/dashboard/RiskScore.jsx)**
- **[frontend/src/components/dashboard/RiskBreakdownDrawer.jsx](frontend/src/components/dashboard/RiskBreakdownDrawer.jsx)**
- **[frontend/src/components/MetricCard.jsx](frontend/src/components/MetricCard.jsx)** *(shared: Rahma)*

### A.7 Rahma Ebrahem — Dashboard UI & UX

**Operational panels**
- **[frontend/src/components/dashboard/ActionCenter.jsx](frontend/src/components/dashboard/ActionCenter.jsx)**
- **[frontend/src/components/dashboard/OrchestrationFeed.jsx](frontend/src/components/dashboard/OrchestrationFeed.jsx)**
- **[frontend/src/components/dashboard/ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx)**
- **[frontend/src/components/dashboard/ScanHistory.jsx](frontend/src/components/dashboard/ScanHistory.jsx)**
- **[frontend/src/components/dashboard/ScanConfigModal.jsx](frontend/src/components/dashboard/ScanConfigModal.jsx)**
- **[frontend/src/components/dashboard/ScanPipelinePanel.jsx](frontend/src/components/dashboard/ScanPipelinePanel.jsx)**
- **[frontend/src/components/dashboard/ScanningBanner.jsx](frontend/src/components/dashboard/ScanningBanner.jsx)**
- **[frontend/src/components/dashboard/ActivityFeed.jsx](frontend/src/components/dashboard/ActivityFeed.jsx)**
- **[frontend/src/components/dashboard/AgentLogViewer.jsx](frontend/src/components/dashboard/AgentLogViewer.jsx)**
- **[frontend/src/components/dashboard/LiveConsole.jsx](frontend/src/components/dashboard/LiveConsole.jsx)**
- **[frontend/src/components/dashboard/Taskbar.jsx](frontend/src/components/dashboard/Taskbar.jsx)**

**Detail / drawer / modal panels**
- **[frontend/src/components/dashboard/AssetDetailPanel.jsx](frontend/src/components/dashboard/AssetDetailPanel.jsx)**
- **[frontend/src/components/dashboard/IncidentDetailDrawer.jsx](frontend/src/components/dashboard/IncidentDetailDrawer.jsx)**
- **[frontend/src/components/dashboard/VulnerabilitiesPanel.jsx](frontend/src/components/dashboard/VulnerabilitiesPanel.jsx)**
- **[frontend/src/components/dashboard/RemediationPanel.jsx](frontend/src/components/dashboard/RemediationPanel.jsx)**
- **[frontend/src/components/dashboard/TargetsManager.jsx](frontend/src/components/dashboard/TargetsManager.jsx)**
- **[frontend/src/components/dashboard/UnifiedInbox.jsx](frontend/src/components/dashboard/UnifiedInbox.jsx)**
- **[frontend/src/components/dashboard/Reports.jsx](frontend/src/components/dashboard/Reports.jsx)**
- **[frontend/src/components/dashboard/SettingsPanel.jsx](frontend/src/components/dashboard/SettingsPanel.jsx)**
- **[frontend/src/components/dashboard/EnvironmentWizard.jsx](frontend/src/components/dashboard/EnvironmentWizard.jsx)**
- **[frontend/src/components/dashboard/LabEnvironment.jsx](frontend/src/components/dashboard/LabEnvironment.jsx)**

**Legacy & root-level components**
- **[frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx)**
- **[frontend/src/components/DeviceDetailModal.jsx](frontend/src/components/DeviceDetailModal.jsx)**
- **[frontend/src/components/ReportGenerator.jsx](frontend/src/components/ReportGenerator.jsx)**

**UX-focused UI primitives**
- **[frontend/src/components/ui/Toast.jsx](frontend/src/components/ui/Toast.jsx)**, **[SkeletonPulse.jsx](frontend/src/components/ui/SkeletonPulse.jsx)**
- **[frontend/src/components/ui/EmptyState.jsx](frontend/src/components/ui/EmptyState.jsx)**, **[ConfirmDialog.jsx](frontend/src/components/ui/ConfirmDialog.jsx)**

**UX docs**
- **[UX_ENHANCEMENT_PLAN.md](UX_ENHANCEMENT_PLAN.md)**

### A.8 Shahd Paher — Scan Orchestration Sub-Leader

**Backend scanners / agents**
- **[backend/app/services/nmap_wrapper.py](backend/app/services/nmap_wrapper.py)**
- **[backend/app/services/nuclei_wrapper.py](backend/app/services/nuclei_wrapper.py)**
- **[backend/app/services/openvas.py](backend/app/services/openvas.py)**
- **[backend/app/services/infrastructure_agent.py](backend/app/services/infrastructure_agent.py)**
- **[backend/app/services/scope_guard.py](backend/app/services/scope_guard.py)**

**Reports / signing pipeline**
- **[backend/app/services/pdf_generator.py](backend/app/services/pdf_generator.py)**
- **[backend/app/services/report_signer.py](backend/app/services/report_signer.py)**

**Endpoints**
- **[backend/app/api/v1/endpoints/findings.py](backend/app/api/v1/endpoints/findings.py)**
- **[backend/app/api/v1/endpoints/openvas.py](backend/app/api/v1/endpoints/openvas.py)**
- **[backend/app/api/v1/endpoints/vulnerabilities.py](backend/app/api/v1/endpoints/vulnerabilities.py)**
- **[backend/app/api/v1/endpoints/network.py](backend/app/api/v1/endpoints/network.py)**

**OpenVAS frontend (own slice)**
- **[frontend/src/components/OpenVAS/ScanButton.jsx](frontend/src/components/OpenVAS/ScanButton.jsx)**
- **[frontend/src/components/OpenVAS/Scheduler.jsx](frontend/src/components/OpenVAS/Scheduler.jsx)**
- **[frontend/src/components/OpenVAS/RiskChart.jsx](frontend/src/components/OpenVAS/RiskChart.jsx)**
- **[frontend/src/components/OpenVAS/VulnerabilitiesList.jsx](frontend/src/components/OpenVAS/VulnerabilitiesList.jsx)**

**Lab environment**
- **[docker-compose.lab.yml](docker-compose.lab.yml)** *(shared: Omar K)*
- **[lab_setup.ps1](lab_setup.ps1)** *(shared: Omar K)*
- **[lab/scenarios/sqli_scenario.md](lab/scenarios/sqli_scenario.md)**, **[xss_scenario.md](lab/scenarios/xss_scenario.md)**, **[misconfig_scenario.md](lab/scenarios/misconfig_scenario.md)**
- **[lab/data/samba/](lab/data/)** (welcome.txt, hr_data, it_backups, shared)
- **[lab/config/coredns/](lab/config/coredns/)** (Corefile, sme-lab.local.zone)
- **[lab/config/nginx/api_gateway.conf](lab/config/nginx/api_gateway.conf)**, **[workstation.conf](lab/config/nginx/workstation.conf)**
- **[lab/config/postgres/init.sql](lab/config/postgres/init.sql)**
- **[lab/traffic-generator/Dockerfile](lab/traffic-generator/Dockerfile)**, **[generator.py](lab/traffic-generator/generator.py)**, **[requirements.txt](lab/traffic-generator/requirements.txt)**
- **[lab_config/nginx.conf](lab_config/nginx.conf)**, **[lab_config/entrypoint.sh](lab_config/entrypoint.sh)**
- **[infra/openvas/sync.sh](infra/openvas/sync.sh)**
- **[backend/scripts/simulate_attack.py](backend/scripts/simulate_attack.py)**

### A.9 Mariz Ehap — SIEM & Log Analytics

**Backend integration**
- **[backend/app/services/wazuh_integration.py](backend/app/services/wazuh_integration.py)**
- **[backend/app/services/elastic_integration.py](backend/app/services/elastic_integration.py)**
- **[backend/app/services/alert_correlator.py](backend/app/services/alert_correlator.py)**
- **[backend/app/api/v1/endpoints/siem.py](backend/app/api/v1/endpoints/siem.py)**

**Lab SIEM plumbing**
- **[lab/log-shipper/Dockerfile](lab/log-shipper/Dockerfile)**, **[shipper.py](lab/log-shipper/shipper.py)**, **[requirements.txt](lab/log-shipper/requirements.txt)**
- **[lab/wazuh/custom_rules.xml](lab/wazuh/custom_rules.xml)**

### A.10 Yosef Ali — QA Engineer (API & Integration Testing)

**Pytest suite**
- **[backend/tests/conftest.py](backend/tests/conftest.py)**
- **[backend/tests/test_auth.py](backend/tests/test_auth.py)**, **[test_auth_flow.py](backend/tests/test_auth_flow.py)**, **[test_rbac.py](backend/tests/test_rbac.py)**
- **[backend/tests/test_endpoints.py](backend/tests/test_endpoints.py)**
- **[backend/tests/test_risk.py](backend/tests/test_risk.py)**, **[test_risk_engine.py](backend/tests/test_risk_engine.py)**, **[test_risk_engine_manual.py](backend/tests/test_risk_engine_manual.py)**
- **[backend/tests/test_agents.py](backend/tests/test_agents.py)**
- **[backend/tests/test_websocket.py](backend/tests/test_websocket.py)**
- **[backend/tests/test_scan_tasks.py](backend/tests/test_scan_tasks.py)**
- **[backend/tests/test_nmap_wrapper.py](backend/tests/test_nmap_wrapper.py)**
- **[backend/tests/test_siem_integration.py](backend/tests/test_siem_integration.py)**
- **[backend/tests/test_e2e_scans.py](backend/tests/test_e2e_scans.py)** *(shared: Mazin)*

**Postman / smoke**
- **[postman/OrchestrationSecurityCenter_API.postman_collection.json](postman/OrchestrationSecurityCenter_API.postman_collection.json)**
- **[backend/verify_auth.ps1](backend/verify_auth.ps1)**, **[backend/verify_scan.ps1](backend/verify_scan.ps1)**
- **[scratch_check_assets.py](scratch_check_assets.py)**

### A.11 Mazin Alla — QA Engineer (E2E & Frontend Testing)

- **[tests/e2e/conftest.py](tests/e2e/conftest.py)**
- **[tests/e2e/test_login_flow.py](tests/e2e/test_login_flow.py)**
- **[tests/e2e/test_scan_trigger.py](tests/e2e/test_scan_trigger.py)**
- **[tests/e2e/test_report_export.py](tests/e2e/test_report_export.py)**
- **[frontend/src/tests/Dashboard.test.js](frontend/src/tests/Dashboard.test.js)** *(shared: Yosef)*
- **[UAT_REPORT.md](UAT_REPORT.md)**, **[BROWSER_COMPAT_REPORT.md](BROWSER_COMPAT_REPORT.md)**

### A.12 Omar Tarek — Documentation & Presentation Lead

**Academic / project docs**
- **[FYP_Documentation.md](FYP_Documentation.md)**, **[FYP_Figures.md](FYP_Figures.md)**
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)**, **[USE_CASES_AND_EVALUATION.md](USE_CASES_AND_EVALUATION.md)**
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)**
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** *(shared: Omar K)*
- **[DR_descution.md](DR_descution.md)** (this file)

**Slides / presentation**
- **[FINAL_PRESENTATION.md](FINAL_PRESENTATION.md)**, **[FINAL_PRESENTATION.pptx](FINAL_PRESENTATION.pptx)**
- **[Found404_Graduation_Presentation.pptx](Found404_Graduation_Presentation.pptx)**
- **[Found_404_Defense_Presentation.pptx](Found_404_Defense_Presentation.pptx)**
- **[Graduation_Presentation_Guide.docx](Graduation_Presentation_Guide.docx)**
- **[build_presentation.py](build_presentation.py)**, **[generate_presentation.py](generate_presentation.py)**
- **[google_slides_script.gs](google_slides_script.gs)**
- **[the all project screens.pdf](the%20all%20project%20screens.pdf)**, **[docaiv_v2.docx](docaiv_v2.docx)**

**Demo / runbooks**
- **[demo/demo_script.md](demo/demo_script.md)**, **[demo/demo_checklist.md](demo/demo_checklist.md)**

**docs/ directory**
- **[docs/API_GUIDE.md](docs/API_GUIDE.md)**, **[docs/ARCHITECTURE_DIAGRAM.md](docs/ARCHITECTURE_DIAGRAM.md)**
- **[docs/PRESENTATION_PLAN.md](docs/PRESENTATION_PLAN.md)**
- **[docs/audit/baseline_2026-04-24.md](docs/audit/baseline_2026-04-24.md)**
- **[docs/contracts/openapi_2026-04-24.json](docs/contracts/openapi_2026-04-24.json)**

**team_roles/ index**
- All 13 files under **[team_roles/](team_roles/)** (`README.md` + 12 per-member role docs)

### A.13 Gap Analysis — Files Needing Your Decision

**A.13.1 Auto-assigned (most-related role) — please confirm**
| File | Auto-assigned to | Why |
|---|---|---|
| `backend/ai_advisor.py` (legacy duplicate at backend root) | **Yousef** | Same name as `app/services/ai_advisor.py`, AI-domain |
| `backend/app/services/sla.py` | **Yousef** | SLA tied to risk severity bands, lives next to risk engine |
| `backend/app/services/asset_monitor.py` | **Shaban** | Periodic background task — fits async/queue domain |
| `backend/app/services/lab_manager.py` | **Shaban** | Container lifecycle = orchestration domain |
| `backend/app/services/pdf_generator.py` | **Shahd** | Reports come out of the scan pipeline he owns; could move to **Reem** if treated as API output |
| `backend/app/services/report_signer.py` | **Shahd** | Pairs with pdf_generator |
| `backend/app/api/v1/endpoints/audit.py` | **Reem** | Pure API plumbing; was unowned in original plan |
| `backend/app/api/v1/endpoints/config.py` | **Reem** | Public feature-flags endpoint |
| `backend/app/api/v1/endpoints/vulnerabilities.py` | **Shahd** | Security domain (was ambiguous between Reem and Shahd) |
| `backend/app/api/v1/endpoints/network.py` | **Shahd** | Network discovery output |
| `backend/app/api/v1/endpoints/lab.py` | **Shaban** | Calls `lab_manager` |
| `backend/app/models/config.py` | **Reem** | DB model |
| `backend/utils.py`, `init_db.py`, `seed_user.py`, `Dockerfile`, `requirements.txt`, `alembic.ini` | **Reem** | Backend bootstrap |
| `backend/scripts/full_system_check.py` | **Shaban** | System health diagnostic |
| `backend/scripts/simulate_attack.py` | **Shahd** | Attack-side helper |
| `frontend/src/components/SecurityAdvisor.jsx` | **Yousef** *(primary)* | Renders his AI advisor output |
| `frontend/src/components/MetricCard.jsx` | **Omnia** *(shared: Rahma)* | Visual primitive used across charts |
| `frontend/src/components/Dashboard.jsx` (legacy wrapper) | **Rahma** | Per existing plan |
| `frontend/src/components/DeviceDetailModal.jsx`, `ReportGenerator.jsx` | **Rahma** | UI panels |
| All `frontend/src/components/ui/*.jsx` | **Marize** *(except Toast/SkeletonPulse/EmptyState/ConfirmDialog → Rahma)* | Marize owns the design-system primitives, Rahma owns the UX-state primitives |
| `frontend/src/api/config.js`, `stores/envStore.js`, `hooks/useGlobalShortcuts.js`, `hooks/useSavedViews.js` | **Marize** | App-shell wiring |
| `frontend/src/tests/Dashboard.test.js` | **Mazin** *(shared: Yosef)* | Frontend test |
| `frontend/Dockerfile`, `Dockerfile.prod`, `vite.config.js`, `postcss.config.js`, `package.json`, `index.html` | **Marize** *(Dockerfiles shared: Omar K)* | Build config |
| `infra/healthcheck.sh` | **Shaban** | Was his planned deliverable |
| `infra/caddy/Caddyfile`, `infra/nginx.conf`, `infra/isolation/*` | **Omar K** | Reverse proxy + isolation |
| `infra/openvas/sync.sh` | **Shahd** | OpenVAS data sync |
| `lab_config/nginx.conf`, `lab_config/entrypoint.sh` | **Shahd** | Lab support config |
| `lab/scenarios/*.md` | **Shahd** | Already in his planned deliverables |
| `lab/log-shipper/*` | **Mariz** | SIEM ingest |
| `lab/wazuh/custom_rules.xml` | **Mariz** | Wazuh rules |
| `lab/data/*`, `lab/config/*`, `lab/traffic-generator/*` | **Shahd** | Lab seed/config |
| `start-lite.ps1`, `start-lite.sh`, `start-full.ps1`, `stop-all.ps1`, `stop-all.sh` | **Omar K** | Stack lifecycle |
| `trigger_lab_scans.ps1` | **Omar K** *(shared: Shahd)* | Scan trigger automation |
| `.github/workflows/cd.yml` | **Omar K** | Was his planned deliverable |
| `AUDIT_REPORT.md`, `MANUAL_LIVE_DEMO.md`, `mode1run.md`, `FINISHINGPLAN.md`, `omar_kapil_role.md` | **Omar K** | Coordination notes |
| `docs/PRESENTATION_PLAN.md`, `docs/audit/baseline_2026-04-24.md`, `docs/contracts/openapi_2026-04-24.json` | **Omar Tarek** | Documentation surface |
| `Found404_Graduation_Presentation.pptx`, `Found_404_Defense_Presentation.pptx`, `Graduation_Presentation_Guide.docx`, `the all project screens.pdf`, `docaiv_v2.docx`, `build_presentation.py`, `generate_presentation.py`, `google_slides_script.gs` | **Omar Tarek** | Slide artefacts |
| `team_roles/*.md` (13 files) | **Omar Tarek** | Per-member role docs index |
| `evidence/phase{2..6}/*` and `evidence/phases_4_5_6_sign_off.md` | **Omar K** *(shared: Yosef)* | Phase gate audit artefacts |
| `UX_ENHANCEMENT_PLAN.md` | **Rahma** | UX plan |
| `BROWSER_COMPAT_REPORT.md`, `UAT_REPORT.md` | **Mazin** | QA reports |
| `SECURITY_AUDIT.md` | **Omar K** | Self-audit deliverable |

**A.13.2 Truly unassigned — please pick an owner**
| File | Suggestion | Notes |
|---|---|---|
| `newplan24/4/2026.md` | ? | Orphan note — content unclear; may be obsolete planning |
| `test.db` | **delete** | SQLite runtime artefact — should be in `.gitignore`, not owned |
| `omar_kapil_role.md` (root) | duplicate of `team_roles/00_omar_kapil_role.md`? | Decide whether to delete the root copy |
| `docaiv_v2.docx` | **Omar Tarek** | Filename suggests early documentation draft — confirm |
| `Found404_Graduation_Presentation.pptx` vs `FINAL_PRESENTATION.pptx` | **Omar Tarek** | Confirm which is canonical for defense; mark the other "archived" |

**A.13.3 Files mentioned in the plan but missing in tree (verify or remove from plan)**
| File | Mentioned by | Action |
|---|---|---|
| `frontend/src/components/VulnerabilityList.jsx` | Rahma's plan | Replaced by `dashboard/VulnerabilitiesPanel.jsx` — remove from plan |
| `lab/kibana/dashboards/sme_overview.ndjson` | Mariz's plan | Not present — either build it or remove from plan |
| `HARDENING_PLAN.md` | Omar Tarek's plan | Not present — confirm or remove from plan |

**A.13.4 Overlap warnings**
- `docker-compose.yml` and `docker-compose.lab.yml` are co-owned (Omar K + Shaban / Omar K + Shahd). Decide on a single PR-approver per file before freeze.
- `frontend/src/components/MetricCard.jsx` overlaps Omnia (chart visual) and Rahma (UI primitive) — primary = Omnia.
- `backend/tests/test_e2e_scans.py` overlaps Yosef and Mazin — primary = Yosef (backend pytest), Mazin contributes scenarios.
- `frontend/src/tests/Dashboard.test.js` — primary = Mazin, Yosef as backup.
- `HOW_TO_RUN.md` — Omar K writes infra/ops content, Omar Tarek polishes language.

— *Appendix A generated 2026-05-07 from a full repo audit. Re-run after every freeze gate.*
