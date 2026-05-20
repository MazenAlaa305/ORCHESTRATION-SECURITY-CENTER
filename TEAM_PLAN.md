# TEAM_PLAN — Orchestration Security Center

This document is the **authoritative team plan**: each member's role, the exact files and folders they own, the critical points they must keep in mind, recent updates affecting their area, and an onboarding Q&A.

Project codename: **Found 404** · Helwan Institute of Technology · 11-member team.

---

## Table of Contents

1. [Sub-team Map](#sub-team-map)
2. [Omar Kapil — Team Lead & DevOps](#1-omar-kapil--team-lead--devops)
3. [Reem Amin — Backend Lead (Auth, RBAC, Models)](#2-reem-amin--backend-lead-auth-rbac-models)
4. [Yousef Abdel Hady — AI Agent Pipeline & Risk Engine](#3-yousef-abdel-hady--ai-agent-pipeline--risk-engine)
5. [Mohamed Shaban — Task Queue & Docker Orchestration](#4-mohamed-shaban--task-queue--docker-orchestration)
6. [Marize Ehap — Frontend Lead](#5-marize-ehap--frontend-lead)
7. [Omnia Helmy — Data Visualization](#6-omnia-helmy--data-visualization)
8. [Rahma Ebrahem — Dashboard UI / UX](#7-rahma-ebrahem--dashboard-ui--ux)
9. [Shahd Paher — Security Scanning Lead](#8-shahd-paher--security-scanning-lead)
10. [Mariz Ehap — SIEM & Log Analytics](#9-mariz-ehap--siem--log-analytics)
11. [Yosef Ali — QA: API & Integration](#10-yosef-ali--qa-api--integration)
12. [Mazin Alla — QA: E2E & Frontend](#11-mazin-alla--qa-e2e--frontend)
13. [Omar Tarek — Documentation & Presentation](#12-omar-tarek--documentation--presentation)
14. [Shared Working Agreements](#shared-working-agreements)

---

## Sub-team Map

| Sub-team | Lead | Members |
|---|---|---|
| Leadership / DevOps | Omar Kapil | — |
| Backend & AI Core | Reem Amin | Yousef Abdel Hady, Mohamed Shaban |
| Frontend & Visualization | Marize Ehap | Omnia Helmy, Rahma Ebrahem |
| Security & Scanning | Shahd Paher | Mariz Ehap |
| QA & Documentation | (shared) | Yosef Ali, Mazin Alla, Omar Tarek |

---

## 1. Omar Kapil — Team Lead & DevOps

**Role summary.** Owns project delivery end to end: schedule, dependencies between sub-teams, deployment, infrastructure, isolation, CI, and external coordination with supervisors. Acts as escalation point for blocked work.

**Files & folders owned**

- [docker-compose.yml](docker-compose.yml) — main application stack
- [docker-compose.lab.yml](docker-compose.lab.yml) — vulnerable lab stack
- [start-lite.ps1](start-lite.ps1), [start-full.ps1](start-full.ps1), [start-lite.sh](start-lite.sh) — startup orchestration
- [stop-all.ps1](stop-all.ps1), [stop-all.sh](stop-all.sh) — shutdown
- [lab_setup.ps1](lab_setup.ps1), [trigger_lab_scans.ps1](trigger_lab_scans.ps1)
- [infra/](infra/) — Caddy reverse proxy, isolation scripts, OpenVAS sync
- [infra/isolation/lab_isolation.ps1](infra/isolation/lab_isolation.ps1), [infra/isolation/lab_isolation.sh](infra/isolation/lab_isolation.sh)
- [infra/caddy/Caddyfile](infra/caddy/Caddyfile)
- [.github/](.github/) — GitHub Actions workflows
- [.env](.env) (template / non-secret defaults)

**Critical points**

- **Single source of truth for ports and env vars.** If a service needs a new port or env var, it goes through Omar Kapil first to prevent collisions.
- **Lab isolation is non-negotiable.** Lab Docker networks are `internal: true` and host firewall rules must be applied before any vulnerable container is started.
- **Reproducible startup.** All paths through `start-*.ps1` / `.sh` must work on a clean clone with only Docker installed.
- **No secret values in Git.** `.env` may contain placeholder names only; real values are shared out-of-band.
- **Defense-day rehearsal.** The full stack must boot in < 10 minutes from cold on demo hardware.

**Recent updates (since last sync)**

- `docker-compose.lab.yml` last updated to refine subnet allocation and `internal: true` flags.
- `start-full.ps1` updated to handle Caddy cert provisioning on Windows.

**Q&A**

1. *Q: Where do I add a new backend service container?*
   A: `docker-compose.yml`. Define the service, attach it to the same `app_network`, and add any env vars to `.env` with safe defaults.
2. *Q: A teammate's container fails to reach Postgres — what do I check first?*
   A: Check it is on the `app_network`, not `lab_network`. Lab networks are `internal: true` and have no DB.
3. *Q: How do I add a new GitHub Actions job?*
   A: Add a workflow under `.github/workflows/`; keep CI minimal — lint, build, unit tests. Heavy E2E runs locally.
4. *Q: How is HTTPS handled?*
   A: Caddy auto-generates a self-signed cert in dev. For production, replace the Caddyfile site block with a real domain.
5. *Q: A new firewall rule is needed for the lab — where does it go?*
   A: Add to both `infra/isolation/lab_isolation.sh` (Linux iptables) **and** `infra/isolation/lab_isolation.ps1` (Windows netsh). They must stay in sync.
6. *Q: How do I roll back a broken deploy?*
   A: `docker compose down` then `git checkout <previous-tag>` and `docker compose up -d --build`. There are no DB migration rollbacks past a release tag — coordinate with Reem Amin first.

---

## 2. Reem Amin — Backend Lead (Auth, RBAC, Models)

**Role summary.** Owns the backend foundation: FastAPI application bootstrap, database layer, authentication, role-based access control, and shared dependencies used by all other endpoint authors.

**Files & folders owned**

- [backend/app/main.py](backend/app/main.py) — FastAPI app, lifespan hooks, WebSocket manager wiring
- [backend/app/core/config.py](backend/app/core/config.py) — Pydantic Settings
- [backend/app/core/database.py](backend/app/core/database.py) — SQLAlchemy engine + `SessionLocal`
- [backend/app/core/security.py](backend/app/core/security.py) — JWT, password hashing
- [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py)
- [backend/app/api/v1/endpoints/rbac.py](backend/app/api/v1/endpoints/rbac.py)
- [backend/app/api/v1/deps.py](backend/app/api/v1/deps.py) — `get_current_user`, `require_role`
- [backend/app/models/user.py](backend/app/models/user.py), [backend/app/models/audit.py](backend/app/models/audit.py)
- [backend/app/schemas/](backend/app/schemas/) (auth + user schemas)
- [backend/alembic/](backend/alembic/) — migrations
- [backend/alembic.ini](backend/alembic.ini)

**Critical points**

- **Never bypass `require_role` on a mutating endpoint.** Every endpoint that writes data must be guarded.
- **Audit logging is mandatory** for any RBAC-touching action (create user, change role, disable user). Use the `AuditLog` model.
- **Schema changes need a migration.** Update model → `alembic revision --autogenerate -m "..."` → review the generated file → commit migration with the model change.
- **JWT secret rotation breaks all sessions.** Coordinate with Omar Kapil before changing `JWT_SECRET` in any environment.
- **Password hashing is bcrypt via passlib.** Do not introduce a second hashing scheme.

**Recent updates**

- RBAC endpoints added: create / disable / enable / reset-password / change-role. See [RBAC_IMPLEMENTATION_PLAN.md history in git for context].
- `force_password_change` flag added to `User` — flows must respect it on login.

**Q&A**

1. *Q: How do I add a new role-protected endpoint?*
   A: Add `current_user: User = Depends(require_role(UserRole.ANALYST))` in the route signature.
2. *Q: A migration conflicts with another branch's migration — how do I resolve?*
   A: Rebase, regenerate by stamping the head, and squash to a single migration on the merged branch. Never edit a migration after it has been deployed.
3. *Q: Where are users seeded for first boot?*
   A: A lifespan hook in `main.py` creates the default admin if no users exist. The default credentials are documented internally and must be changed on first login (`force_password_change=True`).
4. *Q: How long is a JWT valid?*
   A: 30 minutes, no refresh token. Frontend must handle 401 and redirect to login.
5. *Q: How do I add a new auditable action?*
   A: Insert an `AuditLog` row in the same DB transaction as the change. Include `user_id`, `action`, `resource`, `resource_id`, and a JSON diff.
6. *Q: SQLAlchemy session leaking — how do I debug?*
   A: All endpoints must use `Depends(get_db)` and not open sessions manually. Look for places that bypass DI.

---

## 3. Yousef Abdel Hady — AI Agent Pipeline & Risk Engine

**Role summary.** Owns the deterministic 4-stage orchestrator and the unified risk/health engine — the most architecturally distinctive parts of the system.

**Files & folders owned**

- [backend/app/services/agent_orchestrator.py](backend/app/services/agent_orchestrator.py) — 4-stage pipeline (Recon → Attack → Validation → Risk Scoring)
- [backend/app/services/unified_risk_engine.py](backend/app/services/unified_risk_engine.py) — Risk/Health scores, ActionItem generation
- [backend/app/services/intelligence_agent.py](backend/app/services/intelligence_agent.py) — Gemini integration (advisory)
- [backend/app/services/ai_advisor.py](backend/app/services/ai_advisor.py)
- [backend/app/services/scoring_explainer.py](backend/app/services/scoring_explainer.py)
- [backend/app/services/llm_guard.py](backend/app/services/llm_guard.py) — LLM safety / bias checks
- [backend/app/services/cvss.py](backend/app/services/cvss.py)
- [backend/app/services/sla.py](backend/app/services/sla.py)
- [backend/app/services/scope_guard.py](backend/app/services/scope_guard.py)

**Critical points**

- **Determinism first, AI second.** Scan-control and scoring decisions must be made by deterministic logic. The LLM is **explanatory only**.
- **Graceful fallback when Gemini is offline.** If `GEMINI_API_KEY` is missing or the API errors, the system must still produce findings and scores.
- **Asset criticality multipliers are core IP.** Database = 1.5×, Web = 1.3×, Workstation = 1.0× — these tune the whole product. Change them only with team review.
- **Pipeline thoughts are persisted.** `agent_thoughts` JSON on `Scan` is used by `OrchestrationFeed` UI; keep its schema stable.
- **Confidence threshold ≥ 0.6** to surface a finding. Lower findings are stored but not shown.

**Recent updates**

- Confidence-score filter added at the Validation stage.
- Risk Score now includes a per-asset port-exposure penalty.

**Q&A**

1. *Q: How is the pipeline triggered?*
   A: `POST /scans` enqueues a Celery task that calls `agent_orchestrator.run(scan_id)`. The orchestrator advances through 4 stages, persisting `agent_thoughts` after each.
2. *Q: Can I add a new tool to the Attack stage?*
   A: Yes — implement a service wrapper (mirror `nuclei_wrapper.py`), register it in the orchestrator's tool map, and add a service→template mapping.
3. *Q: What happens if a stage fails?*
   A: The orchestrator marks the scan `FAILED`, persists the partial findings, emits a `SCAN_STATUS` WebSocket event, and surfaces the error via `agent_thoughts`.
4. *Q: How is risk score recomputed after an analyst marks a finding false-positive?*
   A: The endpoint calls `unified_risk_engine.recompute(scan_id)`, which re-emits a `RISK_UPDATE` event.
5. *Q: Why not use the AI to choose templates?*
   A: Auditability and reproducibility. A deterministic mapping can be unit-tested; an LLM cannot.
6. *Q: What does `llm_guard` actually guard against?*
   A: Prompt-injection in scan output that could otherwise leak into the LLM, plus output sanitization (no executable suggestions).

---

## 4. Mohamed Shaban — Task Queue & Docker Orchestration

**Role summary.** Owns Celery, Redis, async task reliability, and the container-level wiring that lets backend services talk to scanners and to each other.

**Files & folders owned**

- [backend/app/core/celery_app.py](backend/app/core/celery_app.py)
- [backend/app/services/scan_tasks.py](backend/app/services/scan_tasks.py)
- [backend/app/services/task_monitor.py](backend/app/services/task_monitor.py)
- [backend/app/services/scan_reaper.py](backend/app/services/scan_reaper.py)
- [backend/app/services/event_publisher.py](backend/app/services/event_publisher.py)
- [backend/app/services/ws_manager.py](backend/app/services/ws_manager.py)
- [backend/Dockerfile](backend/Dockerfile)
- [backend/docker-entrypoint.sh](backend/docker-entrypoint.sh)
- Celery worker service definitions in [docker-compose.yml](docker-compose.yml) (shared with Omar Kapil)

**Critical points**

- **Idempotent tasks only.** A task may be retried; running it twice must not double-count findings.
- **Stale task cleanup.** `scan_reaper` must run on a schedule; orphaned `RUNNING` scans block the dashboard.
- **WebSocket fanout via Redis pub/sub.** Never push directly from a Celery worker into a FastAPI websocket — go through the publisher.
- **Worker concurrency vs. scanner resource use.** Nmap/Nuclei are CPU- and network-heavy; concurrency must stay below host capacity.
- **Container restart policy.** All long-lived services use `restart: unless-stopped`.

**Recent updates**

- `task_monitor` added to surface Celery health on the dashboard.
- WebSocket event channel names standardized.

**Q&A**

1. *Q: A scan is stuck in RUNNING — what do I check?*
   A: `task_monitor` for Celery liveness, then Redis for queue depth, then logs of the worker container.
2. *Q: How do I add a new background job?*
   A: Add a `@celery_app.task` in an appropriate module, route it to a queue, and add the queue to the worker service in `docker-compose.yml`.
3. *Q: How does the frontend subscribe to scan events?*
   A: Through `ws_manager` at `/ws/events`. The frontend connects with the JWT and receives events filtered by scope.
4. *Q: Why Redis and not RabbitMQ?*
   A: Redis already in stack for pub/sub. One fewer service.
5. *Q: How is back-pressure handled?*
   A: Bounded queues; the API returns 429 when a tenant has too many in-flight scans.
6. *Q: Where are Celery task results stored?*
   A: Redis as the result backend, but task outcomes are persisted to Postgres via the task itself.

---

## 5. Marize Ehap — Frontend Lead

**Role summary.** Owns React app architecture, routing, the API client, auth context, and the contract between frontend and backend.

**Files & folders owned**

- [frontend/src/App.jsx](frontend/src/App.jsx)
- [frontend/src/main.jsx](frontend/src/main.jsx)
- [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)
- [frontend/src/context/RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/layout/](frontend/src/layout/)
- [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)
- [frontend/src/components/LoginPage.jsx](frontend/src/components/LoginPage.jsx)
- [frontend/src/components/ErrorBoundary.jsx](frontend/src/components/ErrorBoundary.jsx)
- [frontend/vite.config.js](frontend/vite.config.js)
- [frontend/package.json](frontend/package.json)

**Critical points**

- **Single API client.** All HTTP calls go through `services/api.js`. No `fetch()` scattered through components.
- **Auth token handled centrally.** Axios interceptors attach JWT and handle 401 → redirect.
- **WebSocket events update React Query caches**, not local state — so panels stay in sync without refetching.
- **No global state for server data.** Use React Query. Use Zustand only for UI-only state (open panels, filters).
- **Defensive rendering.** Every panel must handle loading / error / empty / partial states.

**Recent updates**

- React Query upgraded to v5 (query keys schema changed).
- Real-time context now exposes a typed event subscription helper.

**Q&A**

1. *Q: Where do I add a new API call?*
   A: `services/api.js` — add a function, type the response, export it. Consume via React Query in the component.
2. *Q: How do I protect a route by role?*
   A: Wrap with `<RequireRole role="ADMIN">`. The component reads `AuthContext.user.role`.
3. *Q: A panel needs to update on WebSocket events — pattern?*
   A: Subscribe in `useEffect`, invalidate the related React Query key. Do not setState from the event.
4. *Q: How do I add a new dashboard tab?*
   A: Register it in `Dashboard.jsx` tab map; create the panel component under `components/dashboard/`.
5. *Q: How are environment-specific URLs handled?*
   A: Vite env vars (`import.meta.env.VITE_API_URL`). Defaults route through Caddy in prod.
6. *Q: Token refresh strategy?*
   A: None — 30-minute hard expiry; interceptor redirects to login on 401.

---

## 6. Omnia Helmy — Data Visualization

**Role summary.** Owns the visual representations of scan results: the network topology graph, time-series charts, heat maps, and KPI gauges.

**Files & folders owned**

- [frontend/src/components/dashboard/NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx)
- [frontend/src/components/dashboard/VulnTrend.jsx](frontend/src/components/dashboard/VulnTrend.jsx)
- [frontend/src/components/dashboard/RiskHeatmap.jsx](frontend/src/components/dashboard/RiskHeatmap.jsx)
- [frontend/src/components/dashboard/RiskScore.jsx](frontend/src/components/dashboard/RiskScore.jsx)
- [frontend/src/components/dashboard/UptimeGauge.jsx](frontend/src/components/dashboard/UptimeGauge.jsx)
- [frontend/src/components/dashboard/ScanPipelinePanel.jsx](frontend/src/components/dashboard/ScanPipelinePanel.jsx)
- [frontend/src/components/dashboard/AssetDetailPanel.jsx](frontend/src/components/dashboard/AssetDetailPanel.jsx)
- [frontend/src/components/ui/GaugeRing.jsx](frontend/src/components/ui/GaugeRing.jsx)

**Critical points**

- **D3 lives inside React responsibly.** Mount D3 in a `useEffect`, clean up the SVG on unmount, never let D3 manage React-owned DOM.
- **Topology data shape is locked** — the backend emits a `{nodes, links}` JSON via `/network/topology`. Coordinate with Yousef before changing it.
- **Performance ceiling: 500 nodes.** Beyond that, switch to clustered rendering.
- **Color = severity, not aesthetics.** Use the agreed palette (critical→red, high→orange, medium→yellow, low→blue, info→gray).
- **Accessibility.** Provide a textual summary alongside every chart.

**Recent updates**

- Severity color palette unified with Rahma's tokens.
- Network topology now supports click-to-open `AssetDetailPanel`.

**Q&A**

1. *Q: Topology is laggy with many nodes — what do I do?*
   A: Switch the force simulation to `forceSimulation().alphaMin(0.05)` and freeze positions after stabilization.
2. *Q: How do I add a new chart?*
   A: Use Recharts unless you need force-directed or custom math; reach for D3 only when necessary.
3. *Q: Where do chart filters live?*
   A: Zustand UI store; the chart selects from query data based on the filter.
4. *Q: Can I fetch data inside the chart component?*
   A: No — accept data as props or via React Query hook colocated with the panel.
5. *Q: How do I show a "no data" state?*
   A: A dimmed placeholder SVG with a short message; never an empty white box.

---

## 7. Rahma Ebrahem — Dashboard UI / UX

**Role summary.** Owns the look-and-feel: tokens, theming, layout polish, responsive behavior, and accessibility across the dashboard.

**Files & folders owned**

- [frontend/src/index.css](frontend/src/index.css)
- [frontend/src/gradient-styles.css](frontend/src/gradient-styles.css)
- [frontend/tailwind.config.js](frontend/tailwind.config.js)
- [frontend/src/components/ui/](frontend/src/components/ui/) — shared primitives (`CyberButton`, `Tabs`, `Toast`, `GaugeRing`, etc.)
- [frontend/src/components/ToastProvider.jsx](frontend/src/components/ToastProvider.jsx)
- [frontend/src/components/TabNavigation.jsx](frontend/src/components/TabNavigation.jsx)
- [frontend/src/layout/Sidebar.jsx](frontend/src/layout/Sidebar.jsx)

**Critical points**

- **Design tokens, not inline styles.** Spacing, color, radius, shadow live in `tailwind.config.js`. Components consume tokens.
- **Mobile / tablet are best-effort.** Primary target is 1366px+ desktop. Don't over-invest in narrow viewports.
- **Accessibility target: WCAG 2.2 AA.** Color contrast and focus rings are mandatory; keyboard navigation must work on every interactive element.
- **No emojis in product UI** unless explicitly requested by the design.
- **Loading skeletons over spinners** for any panel that takes > 200 ms to render.

**Recent updates**

- Gradient theme finalized; legacy ad-hoc gradients removed.
- Toast system unified through a single `ToastProvider`.

**Q&A**

1. *Q: How do I add a new color?*
   A: Extend `tailwind.config.js` `theme.extend.colors`. Don't hardcode hex in components.
2. *Q: When do I create a new UI primitive vs. inline a styled element?*
   A: Used in ≥ 2 places → primitive in `components/ui/`. One-off → inline.
3. *Q: Focus ring spec?*
   A: 2px outline, brand color, 4px offset, not removed.
4. *Q: How do I ensure a new panel matches the look?*
   A: Wrap content in the existing `PanelCard` and use the `Heading` and `Subheading` primitives.
5. *Q: Dark mode?*
   A: Out of scope for v1. The base theme is dark already.

---

## 8. Shahd Paher — Security Scanning Lead

**Role summary.** Owns the actual security tooling integration: how Nmap, Nuclei and OpenVAS are called, tuned, and converted into normalized findings. Also owns the lab's intentional vulnerabilities.

**Files & folders owned**

- [backend/app/services/nmap_wrapper.py](backend/app/services/nmap_wrapper.py)
- [backend/app/services/nuclei_wrapper.py](backend/app/services/nuclei_wrapper.py)
- [backend/app/services/openvas.py](backend/app/services/openvas.py)
- [backend/app/services/discovery_agent.py](backend/app/services/discovery_agent.py)
- [backend/app/services/validation_probe.py](backend/app/services/validation_probe.py)
- [backend/app/services/finding_dedup.py](backend/app/services/finding_dedup.py)
- [backend/app/services/framework_tagger.py](backend/app/services/framework_tagger.py)
- [backend/app/api/v1/endpoints/scans.py](backend/app/api/v1/endpoints/scans.py)
- [backend/app/api/v1/endpoints/vulnerabilities.py](backend/app/api/v1/endpoints/vulnerabilities.py)
- [backend/app/api/v1/endpoints/openvas.py](backend/app/api/v1/endpoints/openvas.py)
- [lab/](lab/) — vulnerable containers and scenario stacks
- [infra/openvas/sync.sh](infra/openvas/sync.sh)

**Critical points**

- **Nuclei templates pinned to v3.3.8.** Do not auto-pull `latest`. Version drift breaks signatures.
- **Service → template mapping is the IP of the project.** Edit `nuclei_wrapper.py` carefully; every change needs a test.
- **No real targets in CI.** Only scan the lab containers — never the internet.
- **Evidence is mandatory.** Every finding must include a request/response (or proof string) and an `evidence_hash` (SHA-256). Without evidence, the finding is dropped.
- **False-positive review is a workflow, not a delete.** When an analyst flags a finding, it stays in the DB with `false_positive=true`.

**Recent updates**

- Confidence-score filter (≥ 0.6) added at the validation probe stage.
- OpenVAS made optional behind `OPENVAS_ENABLED`.

**Q&A**

1. *Q: How do I add a new scanner tool?*
   A: Implement a wrapper module that returns the normalized finding schema (title, description, severity, evidence, confidence). Register in `agent_orchestrator`.
2. *Q: How are findings deduplicated?*
   A: `finding_dedup.py` keys on `(asset_id, evidence_hash)` — same evidence from two tools is collapsed.
3. *Q: How are CVEs tagged?*
   A: `framework_tagger.py` maps tool output to CVE, CWE, OWASP Top 10 categories.
4. *Q: How is Nuclei rate-limited?*
   A: `nuclei_wrapper.py` enforces a concurrency cap and per-host rate limit.
5. *Q: How are credentials for OpenVAS / Wazuh stored?*
   A: Encrypted with `CREDENTIAL_ENCRYPTION_KEY` (Fernet) before DB write.
6. *Q: What happens when a Nuclei template fails to parse?*
   A: It is logged and skipped; the scan proceeds. We do not fail-closed on a single template error.

---

## 9. Mariz Ehap — SIEM & Log Analytics

**Role summary.** Owns the SIEM side: Wazuh integration, Elasticsearch query layer, alert correlation with scan findings, and the SIEM-facing dashboards.

**Files & folders owned**

- [backend/app/services/wazuh_integration.py](backend/app/services/wazuh_integration.py)
- [backend/app/services/elastic_integration.py](backend/app/services/elastic_integration.py)
- [backend/app/services/alert_correlator.py](backend/app/services/alert_correlator.py)
- [backend/app/services/asset_monitor.py](backend/app/services/asset_monitor.py)
- [backend/app/services/soar_orchestrator.py](backend/app/services/soar_orchestrator.py)
- [backend/app/api/v1/endpoints/siem.py](backend/app/api/v1/endpoints/siem.py)
- Lab-side Wazuh / log-shipper configs under [lab/wazuh/](lab/wazuh/) and [lab/log-shipper/](lab/log-shipper/)

**Critical points**

- **All SIEM features are behind `SIEM_ENABLED`.** The system must work without Wazuh/Elasticsearch present.
- **No raw log forwarding to the UI.** Aggregate and summarize server-side; never proxy a 10-MB log page.
- **Correlation is heuristic.** A SIEM alert and a finding share an asset and a time window → they are linked, not merged.
- **Time zones.** Always store and emit UTC; the frontend localizes.
- **SOAR triggers are best-effort.** A failed n8n call must not block a status transition.

**Recent updates**

- Alert correlator added; surfaces SIEM context in vulnerability detail.
- SOAR feature gated behind `SOAR_ENABLED`.

**Q&A**

1. *Q: A new Elasticsearch index is needed — where do I add it?*
   A: Index pattern + parser in `elastic_integration.py`; the endpoint layer reads through that module only.
2. *Q: How do I trigger an n8n workflow from a status change?*
   A: Call `soar_orchestrator.trigger(event)`. It posts to the webhook configured by `N8N_WEBHOOK_URL`.
3. *Q: Wazuh API auth?*
   A: Basic auth with `WAZUH_API_USER` / `WAZUH_API_PASSWORD`. Token caching done in the integration module.
4. *Q: How do I add a new correlation rule?*
   A: Add a matcher in `alert_correlator.py` and a test fixture pair (alert + finding) under `backend/tests/`.
5. *Q: Why not push to Wazuh's own dashboard?*
   A: We want a unified view; the dashboard is the integration point.

---

## 10. Yosef Ali — QA: API & Integration

**Role summary.** Owns API correctness: unit tests, contract tests, integration tests, and the Postman collection used by the team for manual verification.

**Files & folders owned**

- [backend/tests/](backend/tests/) — entire pytest suite for backend
- [all_tests/](all_tests/) — extended / legacy pytest suite
- [run_tests.py](run_tests.py)
- [generate_test_report.py](generate_test_report.py)
- [postman/](postman/) — Postman collection
- [backend/scripts/full_system_check.py](backend/scripts/full_system_check.py)
- [backend/scripts/simulate_attack.py](backend/scripts/simulate_attack.py)

**Critical points**

- **Integration tests hit a real DB.** Pytest fixtures spin up SQLite or a disposable Postgres; **do not mock** the ORM layer.
- **Every new endpoint needs a test.** Reject PRs without one.
- **Postman collection mirrors Swagger.** Whenever Reem or Shahd add an endpoint, the collection is updated in the same PR.
- **Test data is seeded, not committed.** No fixtures larger than ~1 KB inside the repo.
- **CI runs unit + integration; not E2E.** E2E lives with Mazin.

**Recent updates**

- Test suite reorganized; `all_tests/` is the consolidated runner.

**Q&A**

1. *Q: How do I run a single test file?*
   A: `pytest backend/tests/test_auth.py -v`.
2. *Q: How do I write a test that needs a real Celery worker?*
   A: Use the eager-mode fixture in `conftest.py`; tasks run synchronously in the test process.
3. *Q: A test is flaky — process?*
   A: Mark it `xfail` with a TODO referencing the issue, fix root cause, then re-enable. Do not just rerun.
4. *Q: How do I add coverage for the WebSocket layer?*
   A: Use `TestClient(app).websocket_connect("/ws/events")` with an injected token.
5. *Q: When does the Postman collection get regenerated?*
   A: Manually after API changes; export from Postman and overwrite the file.

---

## 11. Mazin Alla — QA: E2E & Frontend

**Role summary.** Owns end-to-end flows: real browser automation against the full stack, plus frontend unit/component tests.

**Files & folders owned**

- [tests/](tests/) — Playwright + E2E pytest suite
- [tests/test_login_flow.py](tests/test_login_flow.py)
- [tests/test_scan_trigger.py](tests/test_scan_trigger.py)
- [tests/test_target_management.py](tests/test_target_management.py)
- [tests/test_vulnerability_workflow.py](tests/test_vulnerability_workflow.py)
- [tests/test_report_export.py](tests/test_report_export.py)
- [frontend/src/tests/](frontend/src/tests/) — Vitest tests
- [tests/conftest.py](tests/conftest.py)
- [test_reports/](test_reports/) (output)

**Critical points**

- **E2E runs against the lab stack**, never production targets.
- **Tests must be deterministic** — no `sleep(N)`; use Playwright's `expect(...).toBeVisible()`.
- **Screenshots on failure are mandatory** — saved under `test_reports/`.
- **One assertion focus per test.** Don't chain entire user journeys into a single test unless it's a smoke test.
- **Fresh DB per run** to keep results stable.

**Recent updates**

- E2E suite expanded to cover report export and revalidation probes.

**Q&A**

1. *Q: How do I run E2E locally?*
   A: `pytest tests/ --headed` after `start-lite.ps1` is up.
2. *Q: A test fails only in CI — why?*
   A: Almost always timing or seed data; use Playwright's web-first assertions and check fixtures.
3. *Q: Where do screenshots go?*
   A: `test_reports/screenshots/<test_name>.png`.
4. *Q: How do I add a new E2E?*
   A: New file `tests/test_<flow>.py`; reuse fixtures from `conftest.py`.
5. *Q: Frontend unit tests — Vitest or Jest?*
   A: Vitest only.

---

## 12. Omar Tarek — Documentation & Presentation

**Role summary.** Owns external-facing materials: this repo's documentation, the FYP write-up, presentation decks, and demo narrative.

**Files & folders owned**

- [README.md](README.md), [TEAM_PLAN.md](TEAM_PLAN.md), [TECHNICAL_NOTES.md](TECHNICAL_NOTES.md) — the three repo docs
- Presentation generators: [generate_presentation.py](generate_presentation.py), [generate_fyp_doc.py](generate_fyp_doc.py), [build_presentation.py](build_presentation.py)
- [demo/](demo/) — demo scripts and narrative
- Final presentation deck: `FINAL_PRESENTATION.pptx`
- FYP documentation source: `FYP_Documentation.docx`

**Critical points**

- **Three top-level docs only.** README, TEAM_PLAN, TECHNICAL_NOTES. Deeper material goes under `docs/`.
- **No duplicated truth.** API details belong in Swagger + `docs/API_GUIDE.md`. Don't re-paste them here.
- **Diagrams as Mermaid**, embedded directly inside `TECHNICAL_NOTES.md` so they render in GitHub.
- **Demo script is rehearsed weekly** in the run-up to defense.
- **Generators are reproducible.** `generate_fyp_doc.py` must produce the current FYP doc from current source.

**Recent updates**

- Repo docs consolidated from ~13 root MDs into the three above.
- `docs/audit/baseline_2026-04-24.md` added for industry-standard comparison.

**Q&A**

1. *Q: Where does a new architectural decision get recorded?*
   A: `TECHNICAL_NOTES.md`, under "Architecture Decisions".
2. *Q: A teammate wants a new top-level `.md` — what do I say?*
   A: Add a section to one of the three docs, or a file under `docs/`. No new root MDs.
3. *Q: How do I update the API guide?*
   A: Swagger UI at `http://localhost:8000/docs` is the canonical reference, auto-generated from FastAPI. Prose-style notes about the API go in `TECHNICAL_NOTES.md`.
4. *Q: Where do screenshots for the README live?*
   A: Project root or a new `screenshots/` folder next to the README. Reference with relative paths.
5. *Q: How is the FYP document built?*
   A: `python generate_fyp_doc.py` — outputs `.docx`. Source content lives in this repo's documentation.

---

## Shared Working Agreements

- **Branch naming:** `feature/<area>-<short-name>` or `fix/<area>-<short-name>`.
- **PR review:** at least one approval from the sub-team lead listed above.
- **Tests required:** every PR adds or updates tests for changed behavior.
- **Commits:** present-tense, imperative ("add scan-reaper schedule"), reference issue if applicable.
- **Secrets:** never commit `.env` with real values. Shared out-of-band.
- **Communication:** sync standups twice weekly; written status in the team channel daily.
- **Defense readiness:** every member can give a 5-minute live walkthrough of their files at any time.
