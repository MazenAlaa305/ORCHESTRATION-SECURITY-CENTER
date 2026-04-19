# Found 404 — Graduation Project Master Plan (v2)

> **Project:** Found 404 — AI-Driven Cybersecurity Exposure Platform for SMEs
> **Start Date:** March 2, 2026 | **Deadline:** July 2, 2026 (University Presentation)
> **Last Updated:** April 19, 2026 | **Current Week:** Week 10 of 16
> **Team Size:** 11 members | **Team Leader:** Omar Kapil

---

## What is Found 404?

Found 404 is an AI-driven Dynamic Application Security Testing (DAST) platform for Small-to-Medium Enterprises. It combines automated vulnerability discovery, sequential AI agent orchestration, risk scoring, and real-time visualization into a single dashboard. The platform maps an organization's attack surface, explains risks in plain language, and suggests actionable remediation — removing the need for a dedicated security team.

**Core Architecture:**
```
React Dashboard (Vite + Tailwind)
        ↕ Axios HTTP + WebSocket
FastAPI REST API + AgentOrchestrator
        ↕ Celery + Redis (async tasks)
PostgreSQL DB ← Nmap/Nuclei/OpenVAS/Wazuh
```

---

## Phase Progress Overview

| Phase | Weeks | Period | Status |
|-------|-------|--------|--------|
| Phase 1: Foundation & Learning | 1–4 | March 2–29, 2026 | ✅ COMPLETED |
| Phase 2: Core Development | 5–9 | March 30 – May 3, 2026 | ✅ COMPLETED |
| Phase 3: Integration & Enhancement | 10–13 | May 4 – May 31, 2026 | 🔄 IN PROGRESS |
| Phase 4: Presentation & Finalization | 14–16 | June 1–July 2, 2026 | ⏳ UPCOMING |

---

## Team Structure & Complete Member Profiles

---

### Sub-Team 1 — Backend & AI Core
**Sub-Leader:** Reem Amin
**Stack:** Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis, Gemini API

---

#### Reem Amin — Backend Sub-Leader

**Role:** Owns the entire FastAPI backend architecture, database layer, and async task system. Acts as the technical gatekeeper for all backend code.

**Responsibilities:**
- Design and maintain all REST API routes
- Review and approve all backend pull requests
- Ensure database migrations run cleanly via Alembic
- Daily standup for Sub-Team 1 (10 min every morning)
- Backend demo segment during university presentation

**Files She Owns / Must Work On:**
```
backend/app/main.py                          ← FastAPI app entry, lifespan, CORS, WebSocket
backend/app/core/config.py                   ← All env vars (GEMINI_API_KEY, DB_URL, REDIS_URL)
backend/app/core/database.py                 ← Sync + async SQLAlchemy session factories
backend/app/core/security.py                 ← JWT token logic, password hashing (bcrypt)
backend/app/api/api.py                       ← Router registry (registers all v1 routers)
backend/app/api/deps.py                      ← FastAPI dependency injection (get_db, get_current_user)
backend/app/api/v1/endpoints/auth.py         ← Login, register, /me, token refresh
backend/app/api/v1/endpoints/dashboard.py    ← KPI snapshot, risk overview, action items
backend/app/api/v1/endpoints/scans.py        ← Scan CRUD, POST /scans/ai trigger
backend/app/api/v1/endpoints/targets.py      ← Target CRUD + discovery
backend/app/api/v1/endpoints/reports.py      ← Report generation, PDF export endpoint
backend/app/models/scan.py                   ← ALL ORM models (Target, Scan, Vulnerability…)
backend/app/models/user.py                   ← User model (RBAC roles: admin/analyst/viewer)
backend/app/schemas/scan.py                  ← Pydantic request/response schemas
backend/alembic/env.py                       ← Migration runner config
```

**Files She Must Create (Phase 3):**
```
backend/app/api/v1/endpoints/rbac.py         ← Role management endpoints (assign/revoke roles)
backend/tests/test_auth.py                   ← Auth endpoint unit tests
backend/tests/test_rbac.py                   ← Role-based access control tests
backend/alembic/versions/002_add_rbac.py     ← Migration: add roles column to users table
```

**What She Must Learn:**
- FastAPI dependency injection pattern (`Depends()`) for RBAC middleware
- JWT token expiry, refresh token pattern, bcrypt hashing
- Alembic `autogenerate` + `upgrade`/`downgrade` commands
- SQLAlchemy async sessions (`async with async_session_maker() as db`)
- Pydantic v2 validators (`@model_validator`, `@field_validator`)

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Implement RBAC: `user.role` field, JWT claims, role-guard dependency |
| 11 | Wire PDF export endpoint to `pdf_generator.py`; add Swagger docs |
| 12 | API cleanup: consistent error shapes, structured logging, rate limiting |
| 13 | Fix all UAT bugs; finalize OpenAPI docs; freeze backend |

---

#### Yousef Abdel Hady — AI & Risk Engine

**Role:** Owns the AI agent pipeline and the risk scoring system. Every scan's intelligence passes through his code.

**Responsibilities:**
- Maintain and improve the `AgentOrchestrator` and all 5 agents
- Tune `UnifiedRiskEngine` scoring to produce accurate, explainable scores
- Ensure AI advisory output (Gemini) is meaningful and non-hallucinating
- Demonstrate the AI reasoning panel during presentation

**Files He Owns / Must Work On:**
```
backend/app/services/agent_orchestrator.py   ← BaseAgent class + 5-agent pipeline
backend/app/services/unified_risk_engine.py  ← Risk Score math (0–100), Health Score
backend/app/services/intelligence_agent.py   ← Gemini advisory-only LLM reasoning
backend/app/services/ai_advisor.py           ← AI recommendation generation
backend/app/services/validation_probe.py     ← Confidence filter (removes < 0.6)
backend/app/services/discovery_agent.py      ← Asset/endpoint discovery logic
backend/app/services/finding_dedup.py        ← Deduplication of repeated vulnerabilities
backend/app/services/framework_tagger.py     ← Tags findings to OWASP/CVSS frameworks
backend/app/services/cvss.py                 ← CVSS score calculation
backend/app/services/llm_guard.py            ← Prevents AI from executing destructive actions
```

**Files He Must Create (Phase 3):**
```
backend/app/services/scoring_explainer.py    ← Generates plain-English score explanation
backend/tests/test_risk_engine.py            ← Parametrized unit tests for score math
backend/tests/test_agents.py                 ← Agent behavior tests (mock Gemini API)
```

**What He Must Learn:**
- Google Generative AI Python SDK (`genai.GenerativeModel`, `generate_content`)
- Prompt engineering: system prompts, few-shot examples, output structuring
- Python `asyncio` for running async agents in sequence
- CVSS v3.1 scoring formula and severity bands
- OWASP Top 10 categories (to correctly tag findings)

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Add `scoring_explainer.py` — plain-English risk explanation per asset |
| 11 | Improve Gemini prompt to return structured JSON remediation steps |
| 12 | Add CVSS score to every vulnerability record; tag with OWASP category |
| 13 | Write ≥ 10 passing tests for risk engine + agent pipeline |

---

#### Mohamed Shaban — Task Queue & Docker Orchestration

**Role:** Owns the async task infrastructure (Celery + Redis), background job management, and Docker service reliability.

**Responsibilities:**
- Ensure all scan tasks run reliably in background without blocking the API
- Manage Celery worker configuration and task retry logic
- Keep Docker Compose healthy (all services start, stay up, connect to each other)
- Diagnose and fix container crash loops

**Files He Owns / Must Work On:**
```
backend/app/services/scan_tasks.py           ← Celery task: run_ai_scan(), retry logic
backend/app/services/event_publisher.py      ← Redis pub/sub publisher for WebSocket
backend/app/services/ws_manager.py           ← WebSocket connection manager + broadcast
backend/app/services/scan_reaper.py          ← Kills stalled scans (watchdog task)
backend/app/core/celery_app.py               ← Celery app factory + beat schedule
docker-compose.yml                           ← All main stack services
```

**Files He Must Create (Phase 3):**
```
backend/app/services/task_monitor.py         ← API endpoint to check Celery task status
backend/tests/test_scan_tasks.py             ← Celery task tests (using eager mode)
infra/healthcheck.sh                         ← Shell script: checks all containers healthy
```

**What He Must Learn:**
- Celery task lifecycle: `@app.task`, `apply_async()`, `retry()`, result backends
- Redis pub/sub: `publish()` / `subscribe()` / `listen()` pattern
- Docker Compose `depends_on`, `healthcheck`, volume mounts
- Python `asyncio.run()` vs event loop integration in Celery workers
- `docker logs`, `docker stats`, container restart policies

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Fix any Celery worker crashes; add task status endpoint |
| 11 | Add `scan_reaper.py` to auto-kill scans stuck > 10 min |
| 12 | Docker Compose healthchecks for all services; write `healthcheck.sh` |
| 13 | End-to-end test: trigger scan → verify task completes → DB updated |

---

### Sub-Team 2 — Frontend & Visualization
**Sub-Leader:** Marize Ehap
**Stack:** React 18, Vite, TailwindCSS, D3.js, React Force Graph, Recharts, Chart.js, Zustand

---

#### Marize Ehap — Frontend Sub-Leader

**Role:** Owns the entire React frontend architecture, component structure, and UI consistency. Acts as gatekeeper for all frontend code.

**Responsibilities:**
- Ensure all components follow the cyber-theme design system (neon glow, glass cards)
- Review and merge frontend pull requests
- Maintain routing, lazy loading, and page structure
- Frontend demo segment during university presentation

**Files She Owns / Must Work On:**
```
frontend/src/App.jsx                         ← Root component + router
frontend/src/main.jsx                        ← App entry, providers (QueryClient, RealTime)
frontend/src/pages/Dashboard.jsx             ← Main dashboard page, tab navigation
frontend/src/layout/Layout.jsx               ← Page wrapper, health check, ⌘K shortcut
frontend/src/layout/Sidebar.jsx              ← Navigation sidebar, WS status badge
frontend/src/context/RealTimeContext.jsx     ← WebSocket state + reducer
frontend/src/context/AuthContext.jsx         ← Auth state (JWT token, user role)
frontend/src/services/api.js                 ← Axios instance + all service objects
frontend/src/components/ui/                  ← All shared UI primitives (Button, Badge…)
tailwind.config.js                           ← Custom cyber theme colors + animations
```

**Files She Must Create (Phase 3):**
```
frontend/src/pages/LoginPage.jsx             ← Login form with JWT auth flow
frontend/src/components/ui/ProtectedRoute.jsx ← Route guard: redirects unauthenticated users
frontend/src/components/ui/RoleGuard.jsx     ← Hides UI elements based on user role
frontend/src/hooks/useAuth.js                ← Custom hook wrapping AuthContext
frontend/src/pages/SettingsPage.jsx          ← User settings, role display, logout
```

**What She Must Learn:**
- React Router v6: `<BrowserRouter>`, `<Routes>`, `<Route>`, `useNavigate()`
- JWT handling in React: storing tokens (`localStorage` vs `sessionStorage`)
- React Query: `useQuery`, `useMutation`, `queryClient.invalidateQueries()`
- Tailwind responsive classes: `sm:`, `md:`, `lg:` breakpoints
- React.lazy() + Suspense for code splitting

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Build `LoginPage.jsx`, wire to `/api/v1/auth/login`, store JWT |
| 11 | Add `ProtectedRoute` and `RoleGuard`; hide analyst features from viewer role |
| 12 | UI polish: loading skeletons, error boundaries, mobile breakpoints |
| 13 | Fix all UAT-reported UI bugs; freeze frontend |

---

#### Omnia Helmy — Network Topology & Visualization

**Role:** Owns all data visualization components, especially the interactive network topology graph (D3/Force Graph).

**Responsibilities:**
- Maintain network topology graph: nodes, edges, hover tooltips
- Build and maintain all chart components (Recharts, Chart.js, D3)
- Ensure visualizations update in real-time during a scan

**Files She Owns / Must Work On:**
```
frontend/src/components/dashboard/NetworkTopology.jsx    ← Force graph: nodes/edges/hover
frontend/src/components/dashboard/VulnTrend.jsx          ← Vulnerability trend line chart
frontend/src/components/dashboard/RiskHeatmap.jsx        ← D3 heatmap of risk by asset
frontend/src/components/dashboard/UptimeGauge.jsx        ← Circular arc gauge
frontend/src/components/dashboard/StatCards.jsx          ← KPI stat cards from real-time context
```

**Files She Must Create (Phase 3):**
```
frontend/src/components/dashboard/SeverityDonut.jsx      ← Donut chart: critical/high/medium/low
frontend/src/components/dashboard/AssetTimeline.jsx      ← Timeline of scan events per asset
frontend/src/components/dashboard/ExposureMap.jsx        ← Visual subnet exposure heatmap
```

**What She Must Learn:**
- D3.js core: scales, axes, SVG paths, `d3.forceSimulation()`
- React Force Graph: `<ForceGraph2D>`, node/link data format
- Recharts: `<LineChart>`, `<BarChart>`, `<PieChart>`, responsive containers
- Chart.js with React: `react-chartjs-2` wrapper, plugin registration
- `useEffect` + `useRef` pattern for imperative D3 DOM access in React

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Add real-time node color updates during scan (green/red/grey by risk score) |
| 11 | Build `SeverityDonut.jsx` — animated donut pulling from live KPI data |
| 12 | Add `ExposureMap.jsx`; ensure all charts have empty-state handling |
| 13 | Visual regression testing: verify charts render correctly on all screen sizes |

---

#### Rahma Ebrahem — Dashboard UI & UX

**Role:** Owns the look, feel, and usability of the dashboard. Responsible for making the platform look professional and polished.

**Responsibilities:**
- Enforce consistent design language (spacing, color, typography)
- Build page-level layouts and responsive grid systems
- Create and maintain UI components used across the dashboard
- Write the UX section of the project report

**Files She Owns / Must Work On:**
```
frontend/src/components/Dashboard.jsx                    ← Legacy dashboard wrapper
frontend/src/components/dashboard/ActionCenter.jsx       ← Action items panel
frontend/src/components/dashboard/OrchestrationFeed.jsx  ← Live agent log feed
frontend/src/components/dashboard/ScanButton.jsx         ← Scan trigger button + URL input
frontend/src/components/VulnerabilityList.jsx            ← Vulnerability table + filters
frontend/src/components/DeviceDetailModal.jsx            ← Asset detail modal popup
frontend/src/components/ReportGenerator.jsx              ← Report generation UI
frontend/src/components/MetricCard.jsx                   ← Reusable metric display card
frontend/src/components/ui/Toast.jsx                     ← Notification toast system
frontend/src/components/ui/SkeletonPulse.jsx             ← Loading placeholder animations
```

**Files She Must Create (Phase 3):**
```
frontend/src/components/dashboard/ScanHistory.jsx        ← Table of past scans with status
frontend/src/components/dashboard/RemediationPanel.jsx   ← Guided remediation step list
frontend/src/components/ui/ConfirmDialog.jsx             ← Reusable confirmation modal
frontend/src/components/ui/EmptyState.jsx                ← Empty state illustration component
```

**What She Must Learn:**
- TailwindCSS advanced: `@apply`, custom variants, arbitrary values `[]`
- CSS animations: `transition`, `transform`, `keyframes` via Tailwind
- Accessibility basics: ARIA labels, keyboard navigation, focus rings
- Figma-to-code workflow: translating mockups to Tailwind components
- `framer-motion` (optional): for smooth panel transitions

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Polish `ScanButton` with animated scanning state + progress indicator |
| 11 | Build `RemediationPanel.jsx` — step-by-step fix guide per vulnerability |
| 12 | Add `ScanHistory.jsx` table + implement animated page transitions |
| 13 | Final UX audit: fix contrast issues, add loading states to all async operations |

---

### Sub-Team 3 — Security & Scanning Engine
**Sub-Leader:** Shahd Paher
**Stack:** Nmap, Nuclei, Wazuh, Elasticsearch, Kibana, OpenVAS, Docker networking

---

#### Shahd Paher — Scan Orchestration Sub-Leader

**Role:** Owns the scan pipeline from target discovery through vulnerability reporting. Manages the lab environment.

**Responsibilities:**
- Maintain Nmap + Nuclei integration in the backend
- Keep lab environment healthy (all 4 subnets operational)
- Design scan scenarios that reveal real vulnerabilities
- Security demo segment during university presentation

**Files She Owns / Must Work On:**
```
backend/app/services/nmap_wrapper.py         ← Nmap scan execution + XML result parsing
backend/app/services/nuclei_wrapper.py       ← Nuclei template runner + result ingestion
backend/app/services/openvas.py              ← OpenVAS GMP API wrapper (python-gvm)
backend/app/services/infrastructure_agent.py ← Port/service/OS fingerprinting agent
backend/app/api/v1/endpoints/findings.py     ← Findings CRUD, filter by severity/type
backend/app/api/v1/endpoints/openvas.py      ← OpenVAS task management API
lab_setup.ps1                                ← Lab start/stop/seed PowerShell script
docker-compose.lab.yml                       ← 4-subnet lab: DMZ, Corp, Data, MGMT
```

**Files She Must Create (Phase 3):**
```
lab/scenarios/sqli_scenario.md               ← Documented SQL injection attack scenario
lab/scenarios/xss_scenario.md               ← Documented XSS scenario on Juice Shop
lab/scenarios/misconfig_scenario.md          ← SMB/Redis misconfiguration scenario
backend/app/services/scope_guard.py          ← Scan scope validator (prevent out-of-scope scans)
backend/tests/test_nmap_wrapper.py           ← Unit tests for Nmap result parser
```

**What She Must Learn:**
- Nmap: scan types (`-sS`, `-sV`, `-sC`, `-A`), XML output parsing (`python-nmap`)
- Nuclei: template structure (YAML), severity levels, custom template writing
- OpenVAS GMP protocol: `create_task()`, `start_task()`, `get_results()` via `python-gvm`
- Docker networking: subnet definitions, container DNS resolution, `--network` flags
- OWASP Top 10 (2021): understand what each category represents in scan results

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Add 3 new vulnerable lab nodes (DVWA, Metasploitable-lite, vulnerable API) |
| 11 | Write and document 3 attack scenarios; integrate IDS simulation in Wazuh |
| 12 | Capture live traffic during scan with TShark; export PCAP for demo |
| 13 | Run full end-to-end scan on all 10 lab containers; verify all findings appear |

---

#### Mariz Ehap — SIEM & Log Analytics

**Role:** Owns the SIEM stack (Wazuh + Elasticsearch + Kibana) and the log correlation layer.

**Responsibilities:**
- Ensure Wazuh receives logs from lab containers
- Build Kibana dashboards showing alert activity
- Wire SIEM data into the Found 404 dashboard via API

**Files He/She Owns / Must Work On:**
```
backend/app/services/wazuh_integration.py    ← Wazuh REST API client (get alerts, agents)
backend/app/services/elastic_integration.py  ← Elasticsearch query wrapper
backend/app/api/v1/endpoints/siem.py         ← SIEM alert feed endpoint
lab/log-shipper/shipper.py                   ← Log shipping agent (forwards lab logs to Wazuh)
```

**Files He/She Must Create (Phase 3):**
```
backend/app/services/alert_correlator.py     ← Correlates Wazuh alerts with scan findings
lab/kibana/dashboards/sme_overview.ndjson    ← Kibana dashboard export (importable)
lab/wazuh/custom_rules.xml                   ← Wazuh custom detection rules for lab scenarios
backend/tests/test_siem_integration.py       ← Mock Wazuh API tests
```

**What He/She Must Learn:**
- Wazuh REST API: authentication, `/security/users`, `/alerts` endpoints
- Elasticsearch Query DSL: `match`, `range`, `bool`, `agg` queries
- Kibana: dashboard creation, visualization types, index patterns
- Log formats: syslog, JSON structured logs, Wazuh alert schema
- Docker log drivers: `json-file`, `syslog` — how logs flow to Wazuh

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Verify Wazuh receives logs from all lab containers; fix broken log shippers |
| 11 | Build `alert_correlator.py` — maps Wazuh alerts to scan vulnerability records |
| 12 | Create and export Kibana dashboard for the demo; import into Docker container |
| 13 | Full end-to-end: trigger attack → see Wazuh alert → see it on Found 404 dashboard |

---

### Sub-Team 4 — DevOps & Quality Assurance
**Sub-Leader:** Omar Kapil *(also Team Leader)*
**Stack:** Docker Compose, GitHub Actions, Pytest, Postman, PowerShell

---

#### Omar Kapil — Team Leader & DevOps Sub-Leader

**Role:** Overall project coordinator, CI/CD pipeline owner, and infrastructure lead. The single point of truth for project status.

**Responsibilities:**
- Weekly kickoff meeting facilitation (all 11 members, Mondays)
- Cross-team integration sync (sub-leaders + Omar, Wednesdays)
- Friday demo/review session coordination
- GitHub branch management and merge approval
- CI/CD pipeline maintenance (GitHub Actions)
- Lead the university presentation (intro + closing)

**Files He Owns / Must Work On:**
```
docker-compose.yml                           ← Main stack: backend, frontend, db, redis, celery
docker-compose.lab.yml                       ← Lab environment: 10 containers, 4 subnets
lab_setup.ps1                                ← Lab lifecycle script (start/stop/seed)
trigger_lab_scans.ps1                        ← Automated scan trigger script
.github/workflows/ci.yml                     ← GitHub Actions CI pipeline
project_plan.md                              ← This file — kept always up to date
HOW_TO_RUN.md                                ← Setup guide for new team members
```

**Files He Must Create (Phase 3–4):**
```
.github/workflows/ci.yml                     ← CI: lint + pytest + Docker build on every PR
.github/workflows/cd.yml                     ← CD: optional deploy-to-staging on main merge
infra/nginx.conf                             ← Nginx reverse proxy config (prod hardening)
SECURITY_AUDIT.md                            ← Platform self-audit report (Phase 3, Week 12)
FINAL_DEMO_SCRIPT.md                         ← Step-by-step demo script for presentation day
```

**What He Must Learn:**
- GitHub Actions: workflow syntax, `jobs`, `steps`, `uses` (actions), secrets
- Docker multi-stage builds, `.dockerignore`, image size optimization
- Nginx reverse proxy: `proxy_pass`, SSL termination, rate limiting headers
- Postman collection runner: `newman` CLI for API smoke tests
- Security baseline checks: OWASP Top 10 self-assessment, CVE scanning with `trivy`

**Phase 3–4 Targets:**
| Week | Task |
|------|------|
| 10 | Set up GitHub Actions CI (lint + test on every PR) |
| 11 | UAT session with all 11 members; collect and log every bug |
| 12 | Run `trivy` image scan on Docker images; write `SECURITY_AUDIT.md` |
| 13 | Final integration test: all sub-teams merge to `main`; regression suite passes |
| 14 | Write `FINAL_DEMO_SCRIPT.md`; coordinate demo video recording |
| 15 | Dry-run presentation with all 11 members; collect and apply feedback |
| 16 | University Presentation Day — lead intro + Q&A coordination |

---

#### Yosef Ali — QA Engineer (API & Integration Testing)

**Role:** Owns all backend automated tests — unit, integration, and API-level.

**Responsibilities:**
- Write and maintain Pytest test suite for all backend endpoints
- Run Postman collections for API smoke testing
- Report bugs from testing in structured format to sub-leaders
- Achieve ≥ 15 automated test cases passing before freeze

**Files He Owns / Must Work On:**
```
backend/tests/test_e2e_scans.py              ← End-to-end scan flow tests
backend/tests/test_risk.py                   ← Risk engine output validation
backend/tests/test_risk_engine_manual.py     ← Manual risk score calculation tests
```

**Files He Must Create (Phase 3):**
```
backend/tests/test_endpoints.py              ← All REST endpoint tests (happy + error paths)
backend/tests/test_auth_flow.py              ← Login, token, protected route tests
backend/tests/test_websocket.py              ← WebSocket connection + message format tests
backend/tests/conftest.py                    ← Shared fixtures (test DB, test client, mock user)
postman/Found404_API.postman_collection.json ← Full Postman collection for manual testing
```

**What He Must Learn:**
- Pytest: fixtures, `@pytest.mark.parametrize`, `@pytest.mark.asyncio`
- FastAPI `TestClient` and `AsyncClient` (httpx) for endpoint testing
- Database fixtures: in-memory SQLite for tests, fixture teardown
- Postman: collection structure, environment variables, test scripts (`pm.test`)
- Code coverage: `pytest-cov` — target ≥ 70% coverage on backend services

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Set up `conftest.py` with test DB fixture; write 5 endpoint tests |
| 11 | Write auth flow tests + UAT participation (report all found bugs) |
| 12 | Reach ≥ 15 passing tests; add WebSocket test |
| 13 | Full regression run; generate coverage report; commit final test suite |

---

#### Mazin Alla — QA Engineer (E2E & Frontend Testing)

**Role:** Owns frontend and end-to-end testing — verifying the full user journey from browser to database.

**Responsibilities:**
- Test every UI flow manually and document results
- Write E2E tests covering critical user paths (login → scan → view results)
- Verify UI renders correctly across Chrome, Firefox, Edge
- UAT coordination: collect bug reports from all 11 members

**Files He Owns / Must Work On:**
```
backend/tests/test_e2e_scans.py              ← (shared with Yosef — contributes frontend flow scenarios)
```

**Files He Must Create (Phase 3):**
```
tests/e2e/test_login_flow.py                 ← Playwright: login → dashboard loads
tests/e2e/test_scan_trigger.py               ← Playwright: enter URL → scan → results appear
tests/e2e/test_report_export.py              ← Playwright: click export → PDF downloads
tests/e2e/conftest.py                        ← Playwright browser fixture
UAT_REPORT.md                                ← Structured bug report from all UAT sessions
BROWSER_COMPAT_REPORT.md                     ← Screenshot evidence across 3 browsers
```

**What He Must Learn:**
- Playwright for Python: `async_playwright`, `page.goto()`, `page.click()`, `expect()`
- Browser DevTools: Network tab (inspect API calls), Console (catch JS errors)
- Bug reporting: how to write a clear bug report (steps, expected, actual, screenshot)
- Cross-browser testing: launch Chromium / Firefox / WebKit from Playwright
- `pytest-playwright` plugin integration

**Phase 3 Targets (Weeks 10–13):**
| Week | Task |
|------|------|
| 10 | Set up Playwright; write `test_login_flow.py` |
| 11 | UAT session — test every tab, every button, log every bug found |
| 12 | Write `test_scan_trigger.py` and `test_report_export.py` |
| 13 | Cross-browser run; write `UAT_REPORT.md` and `BROWSER_COMPAT_REPORT.md` |

---

#### Omar Tarek — Documentation & Presentation Lead

**Role:** Owns all project documentation and the final university presentation materials.

**Responsibilities:**
- Maintain the project report (academic format)
- Write and organize presentation slides
- Coordinate demo video production (recording, editing)
- Ensure all API endpoints are documented in Swagger

**Files He Owns / Must Work On:**
```
FYP_Documentation.md                         ← Main academic project report
FYP_Figures.md                               ← Figures, diagrams, architecture images
PROJECT_OVERVIEW.md                          ← Non-technical project summary
HOW_TO_RUN.md                                ← Setup guide (keep in sync with actual setup)
HARDENING_PLAN.md                            ← Security hardening decisions + rationale
```

**Files He Must Create (Phase 3–4):**
```
FINAL_PRESENTATION.md                        ← Slide outline + talking points for each speaker
demo/demo_script.md                          ← Word-for-word demo script (what to click/say)
demo/demo_checklist.md                       ← Pre-demo checklist (docker up, lab ready, etc.)
docs/API_GUIDE.md                            ← Non-Swagger API guide for non-technical reviewers
docs/ARCHITECTURE_DIAGRAM.md                 ← Mermaid diagram of full system architecture
```

**What He Must Learn:**
- Swagger/OpenAPI: how to read and navigate the auto-generated FastAPI `/docs` page
- Mermaid.js: `flowchart`, `sequenceDiagram`, `classDiagram` syntax (for architecture docs)
- Academic report writing: abstract, methodology, evaluation, conclusion sections
- Screen recording tools: OBS Studio or Loom for demo video
- PowerPoint/Google Slides: slide design, font hierarchy, presenter notes

**Phase 3–4 Targets:**
| Week | Task |
|------|------|
| 10 | Write `ARCHITECTURE_DIAGRAM.md` (Mermaid full-system diagram) |
| 11 | Draft `FINAL_PRESENTATION.md` outline; assign each speaker their segment |
| 12 | Write `demo_script.md` — step-by-step what happens during the live demo |
| 13 | Update `FYP_Documentation.md` with Phase 3 work; complete API guide |
| 14 | Record demo video (3–5 min); first slide deck draft done |
| 15 | Incorporate dry-run feedback into slides; finalize everything |
| 16 | PRESENTATION DAY — manage slides, handle Q&A notes |

---

## Detailed Week-by-Week Timeline (Remaining Weeks)

### Week 10 — April 19–25, 2026 ← YOU ARE HERE
**Theme: RBAC + Auth + Lab Expansion**

| Sub-Team | Owner | Task |
|----------|-------|------|
| Backend | Reem | Implement RBAC: `role` field on User, JWT role claims, `require_role()` dependency |
| Backend | Yousef | Add `scoring_explainer.py`; improve Gemini prompt structure |
| Backend | Shaban | Verify Celery workers are stable; add task status endpoint |
| Frontend | Marize | Build `LoginPage.jsx`; store JWT in `AuthContext` |
| Frontend | Omnia | Real-time node color updates during scan (by risk score) |
| Frontend | Rahma | Polish `ScanButton.jsx` with animated scanning progress |
| Security | Shahd | Add DVWA + 2 more vulnerable lab nodes |
| Security | Mariz | Verify Wazuh log ingestion from all lab containers |
| DevOps/QA | Omar K | Set up GitHub Actions CI pipeline |
| DevOps/QA | Yosef | Set up `conftest.py`; write first 5 endpoint tests |
| DevOps/QA | Mazin | Set up Playwright; write `test_login_flow.py` |
| Docs | Omar T | Write Mermaid architecture diagram |

**Week 10 Deliverables:**
- [ ] RBAC working: admin can access all routes, viewer cannot trigger scans
- [ ] Login page live in frontend
- [ ] CI pipeline runs on every PR
- [ ] Lab has ≥ 7 active vulnerable containers

---

### Week 11 — April 26 – May 2, 2026
**Theme: Export Features + User Acceptance Testing**

| Sub-Team | Owner | Task |
|----------|-------|------|
| Backend | Reem | Wire PDF export: `GET /api/v1/reports/{id}/pdf` → `pdf_generator.py` |
| Backend | Yousef | Structured Gemini JSON output; add CVSS scoring per vulnerability |
| Backend | Shaban | Add `scan_reaper.py` for stalled scan cleanup |
| Frontend | Marize | Add `ProtectedRoute` + `RoleGuard` components |
| Frontend | Omnia | Build `SeverityDonut.jsx` with live data |
| Frontend | Rahma | Build `RemediationPanel.jsx` |
| Security | Shahd | Write 3 attack scenario docs (SQLi, XSS, Misconfig) |
| Security | Mariz | Build `alert_correlator.py` — Wazuh → Found 404 mapping |
| DevOps/QA | Omar K | **UAT Session** with all 11 members — collect bugs |
| DevOps/QA | Yosef | Auth + RBAC tests; UAT bug hunting |
| DevOps/QA | Mazin | UAT: test every dashboard tab and button |
| Docs | Omar T | Draft presentation outline + speaker assignments |

**Week 11 Deliverables:**
- [ ] PDF export button works end-to-end in browser
- [ ] IDS alerts from Wazuh appear on dashboard
- [ ] UAT completed — all bugs logged in GitHub Issues
- [ ] Role-based UI: viewers see read-only dashboard

---

### Week 12 — May 3–9, 2026
**Theme: Polish, Security Audit, Traffic Analysis**

| Sub-Team | Owner | Task |
|----------|-------|------|
| Backend | Reem | API cleanup: consistent error responses, structured logging, rate limiting |
| Backend | Yousef | OWASP framework tagging; write ≥ 10 agent + risk engine tests |
| Backend | Shaban | Docker healthchecks for all services; write `healthcheck.sh` |
| Frontend | Marize | Mobile responsiveness; loading skeletons; error boundaries |
| Frontend | Omnia | `ExposureMap.jsx` + empty state handling for all charts |
| Frontend | Rahma | `ScanHistory.jsx` table + final animation polish |
| Security | Shahd | TShark traffic capture during scan — generate PCAP for demo |
| Security | Mariz | Export Kibana dashboard to `sme_overview.ndjson` |
| DevOps/QA | Omar K | Run `trivy` on Docker images; write `SECURITY_AUDIT.md` |
| DevOps/QA | Yosef | Reach 15 passing tests; add coverage report |
| DevOps/QA | Mazin | Cross-browser E2E tests; `test_report_export.py` |
| Docs | Omar T | Write `demo_script.md`; update academic report |

**Week 12 Deliverables:**
- [ ] Platform passes self-security audit (no critical own-code vulns)
- [ ] ≥ 15 automated tests passing
- [ ] All charts have empty-state + loading-state handling
- [ ] Mobile layout works at 768px breakpoint

---

### Week 13 — May 10–16, 2026
**Theme: Final Bug Fixes + Feature Freeze**

| Sub-Team | Owner | Task |
|----------|-------|------|
| All | All | Fix all remaining UAT bugs (nothing new — only fixes) |
| Backend | Reem | Freeze API; finalize Swagger docs; deploy clean Alembic migration |
| Backend | Yousef | Final agent pipeline test on all lab targets |
| Backend | Shaban | Full stack smoke test; confirm all 10 lab containers scannable |
| Frontend | Marize | Final accessibility pass; freeze frontend codebase |
| Frontend | Omnia | Visual regression check on all charts |
| Frontend | Rahma | UX audit — contrast, spacing, font consistency |
| Security | Shahd | Full end-to-end scan on all 10 lab containers; verify findings in DB |
| Security | Mariz | Full SIEM pipeline test: attack → Wazuh alert → dashboard display |
| DevOps/QA | Omar K | Full regression test suite; confirm clean `main` branch |
| DevOps/QA | Yosef | Final test run; generate HTML coverage report |
| DevOps/QA | Mazin | Final UAT report; `BROWSER_COMPAT_REPORT.md` done |
| Docs | Omar T | Academic report final draft; API guide complete |

**Week 13 Deliverables (Feature Freeze Gate):**
- [ ] RBAC implemented and tested ✓
- [ ] PDF export working end-to-end ✓
- [ ] Platform passes security self-audit ✓
- [ ] All UAT bugs from Week 11 resolved ✓
- [ ] Swagger docs complete for all endpoints ✓
- [ ] ≥ 15 automated test cases passing ✓
- [ ] Lab environment fully operational (10 containers) ✓

> **After Week 13: NO new features. Only demo prep and bug fixes.**

---

### Week 14 — May 17–23, 2026
**Theme: Demo Video + Slide Preparation**

| Owner | Task |
|-------|------|
| Omar K | Write `FINAL_DEMO_SCRIPT.md`; coordinate recording session |
| Omar T | Record 3–5 min demo video (lab scan → results → report) |
| Reem | Prepare 5-min backend/AI walkthrough segment |
| Marize | Prepare 5-min frontend walkthrough segment |
| Shahd | Prepare 5-min security/lab walkthrough segment |
| Omar T | First complete slide deck draft done |
| All | Review slide deck as a team; submit feedback to Omar T |

**Week 14 Deliverables:**
- [ ] Demo video recorded and reviewed
- [ ] Slide deck first draft complete
- [ ] Each sub-leader has rehearsed their 5-min segment

---

### Week 15 — May 24–30, 2026
**Theme: Dry Run + Final Polish**

| Owner | Task |
|-------|------|
| All 11 | Full mock presentation (timed, recorded if possible) |
| Omar K | Collect feedback from university advisor (if available) |
| Omar T | Apply all slide feedback; finalize deck |
| Omar K | Prepare Q&A answers for likely examiner questions |
| All | Ensure GitHub repo is clean: no debug files, no TODO comments |
| Omar T | Final README.md and project report submitted for review |

**Week 15 Deliverables:**
- [ ] Dry-run presentation completed and timed (≤ 30 min total)
- [ ] Final slide deck locked — no more changes after this week
- [ ] GitHub repo clean and tagged `v1.0-final`

---

### Week 16 — June 1–July 2, 2026
**Theme: UNIVERSITY PRESENTATION**

| Task | Owner |
|------|-------|
| Pre-demo: `docker compose up -d` on presentation machine | Omar K + Shaban |
| Pre-demo: `lab_setup.ps1 start && lab_setup.ps1 seed` | Shahd |
| Pre-demo: verify dashboard at localhost:5173 | Marize |
| Presentation intro + project context (3 min) | Omar Kapil |
| Backend & AI walkthrough (5 min) | Reem Amin |
| Frontend & visualization walkthrough (5 min) | Marize Ehap |
| Security & scanning walkthrough (5 min) | Shahd Paher |
| Live demo: scan the lab, show results (10 min) | Omar Kapil |
| Q&A (10 min) | All sub-leaders |
| Submit final GitHub repo + report | Omar Tarek |

---

## What Every Member Must Know (Shared Knowledge)

Every team member regardless of sub-team must understand:

| Topic | Why |
|-------|-----|
| How to run `docker compose up -d` | Every member needs the stack running locally |
| What `http://localhost:5173` shows | Understand the product you built |
| What `http://localhost:8000/docs` shows | Understand the API your frontend calls |
| Git: branch, commit, PR workflow | All work goes through pull requests |
| How a scan works end-to-end | Required to answer examiner questions |
| What the risk score means | Required to defend the AI decision-making |
| OWASP Top 10 basics | Examiners will ask about vulnerability types |

---

## Sub-Leader Responsibilities

| Sub-Leader | Daily Duty | Presentation Duty | Gate Check |
|-----------|-----------|------------------|-----------|
| Reem Amin | Backend daily standup (10 min, Sub-Team 1) | Backend + AI demo (5 min) | Approve all backend PRs |
| Marize Ehap | Frontend daily standup (10 min, Sub-Team 2) | Frontend + UX demo (5 min) | Approve all frontend PRs |
| Shahd Paher | Lab environment health check (daily) | Security scanning demo (5 min) | Sign off on lab scenarios |
| Omar Kapil | Full-team kickoff (Monday, 30 min); Integration sync (Wednesday, 20 min) | Intro + live demo + Q&A | Approve merges to `main` |

---

## Weekly Ritual Calendar

| Ritual | Day | Time | Duration | Who |
|--------|-----|------|----------|-----|
| Weekly Kickoff | Monday | Morning | 30 min | All 11 members |
| Sub-team standup | Daily | Morning | 10 min | Within each sub-team |
| Integration sync | Wednesday | Afternoon | 20 min | Sub-leaders + Omar K |
| Demo & Review | Friday | Afternoon | 45 min | All 11 members |
| GitHub Issues triage | Friday | After demo | 15 min | Omar K + sub-leaders |

---

## Grading Breakdown

| Component | Weight | Who It Hits Hardest |
|-----------|--------|---------------------|
| Working platform (live demo) | 40% | All sub-teams — the demo must work |
| Code quality & documentation | 20% | Backend (Reem, Yousef), Docs (Omar T) |
| Individual learning & contribution | 20% | Every member — personal commits count |
| Presentation quality | 10% | Omar T (slides), Omar K (delivery) |
| Testing & reliability | 10% | Yosef, Mazin |

> **The live demo is 40% of the grade.** If the demo crashes, the project fails. All decisions about what to build in Phase 3 should be judged by: "does this make the demo more reliable?"

---

## Current Critical Blockers

| Blocker | Owner | Status |
|---------|-------|--------|
| Backend container crash loop (`google-generativeai` not installed) | Shaban | Fix: `docker compose build --no-cache backend && docker compose up -d --force-recreate backend` |
| RBAC not yet implemented | Reem | Week 10 target |
| Login page not yet built | Marize | Week 10 target |
| CI pipeline not yet set up | Omar K | Week 10 target |

---

## Key Local URLs (Development)

| Service | URL | Who Uses It |
|---------|-----|-------------|
| Dashboard | http://localhost:5173 | Everyone |
| API Docs (Swagger) | http://localhost:8000/docs | Backend team, Yosef |
| OpenVAS | http://localhost:9392 | Shahd |
| n8n SOAR | http://localhost:5678 | Shaban |
| Kibana | http://localhost:5601 | Mariz |
| Juice Shop (lab) | http://localhost:3000 | Shahd, Mazin |

---

## Technology Learning Resources

### Sub-Team 1 (Backend/AI)
- FastAPI: https://fastapi.tiangolo.com/tutorial/
- SQLAlchemy 2.0 (async): https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Celery: https://docs.celeryq.dev/en/stable/getting-started/introduction.html
- Gemini API (Python): https://ai.google.dev/gemini-api/docs/quickstart?lang=python
- Alembic migrations: https://alembic.sqlalchemy.org/en/latest/tutorial.html

### Sub-Team 2 (Frontend)
- React 18 docs: https://react.dev/learn
- Tailwind CSS: https://tailwindcss.com/docs/utility-first
- D3.js (Observable tutorials): https://observablehq.com/@d3/gallery
- Recharts: https://recharts.org/en-US/examples
- React Query: https://tanstack.com/query/latest/docs/framework/react/overview

### Sub-Team 3 (Security)
- Nmap book: https://nmap.org/book/man.html
- Nuclei docs: https://docs.projectdiscovery.io/tools/nuclei/overview
- Wazuh documentation: https://documentation.wazuh.com/current/index.html
- Elasticsearch Query DSL: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
- OWASP Top 10 (2021): https://owasp.org/Top10/

### Sub-Team 4 (DevOps/QA)
- GitHub Actions: https://docs.github.com/en/actions/writing-workflows
- Docker Compose: https://docs.docker.com/compose/compose-file/
- Pytest: https://docs.pytest.org/en/stable/how-to/index.html
- Playwright (Python): https://playwright.dev/python/docs/intro
- Trivy (container scanning): https://trivy.dev/latest/docs/

---

*Last Updated: April 19, 2026 | Team Leader: Omar Kapil | Version: 2.0*
