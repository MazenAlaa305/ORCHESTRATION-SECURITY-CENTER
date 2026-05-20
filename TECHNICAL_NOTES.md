# TECHNICAL_NOTES — Orchestration Security Center

Technical reference for the platform: architectural decisions, API contracts, data model, environment variables, security posture, integrations, performance, and known limitations.

This file is the canonical place for technical documentation that must survive after individual conversations and code comments.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Architectural Decisions](#2-architectural-decisions)
3. [Scanning Pipeline (4 Stages)](#3-scanning-pipeline-4-stages)
4. [Risk & Health Scoring](#4-risk--health-scoring)
5. [Data Model](#5-data-model)
6. [API Surface](#6-api-surface)
7. [Authentication & RBAC](#7-authentication--rbac)
8. [Real-Time Events (WebSocket / Pub-Sub)](#8-real-time-events-websocket--pub-sub)
9. [Integrations](#9-integrations)
10. [Environment Variables](#10-environment-variables)
11. [Lab Environment & Network Isolation](#11-lab-environment--network-isolation)
12. [Security Posture](#12-security-posture)
13. [Performance & Scaling](#13-performance--scaling)
14. [Testing Strategy](#14-testing-strategy)
15. [Operational Runbook](#15-operational-runbook)
16. [Known Issues & Limitations](#16-known-issues--limitations)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Vite)                                          │
│   ├─ Dashboard (D3.js, Recharts)                                    │
│   ├─ AuthContext (JWT)                                              │
│   └─ RealTimeContext (WebSocket subscriber)                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS (Caddy TLS)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI (backend/app/main.py)                                      │
│   ├─ /api/v1/auth, /scans, /vulnerabilities, /network, …            │
│   ├─ /ws/events (WebSocket fan-out)                                 │
│   └─ Pydantic schemas, SQLAlchemy ORM                               │
└──────────┬──────────────────────────────────┬──────────────────────┘
           │ enqueue                          │ persist
           ▼                                  ▼
┌────────────────────────┐         ┌────────────────────────────────┐
│ Celery workers         │         │ PostgreSQL 15                  │
│  ├─ scan_tasks         │         │  (Scan, Vulnerability,         │
│  ├─ agent_orchestrator │         │   ActionItem, NetworkAsset,    │
│  ├─ scan_reaper        │         │   User, AuditLog)              │
│  └─ task_monitor       │         └────────────────────────────────┘
└─────┬──────────────────┘
      │ tool subprocess              ┌────────────────────────────────┐
      ├──────────► Nmap               │ Redis (broker + pub/sub)       │
      ├──────────► Nuclei v3.3.8      └──────────────┬────────────────┘
      └──────────► OpenVAS (GMP)                     │
                                                     │ events fan-out
┌─────────────────────────────────────┐              │
│ SIEM / SOAR (optional)              │              ▼
│  ├─ Wazuh (EDR)                     │      back to FastAPI WS
│  ├─ Elasticsearch (logs)            │
│  ├─ Kibana (raw exploration)        │
│  └─ n8n (SOAR webhooks)             │
└─────────────────────────────────────┘
```

A Mermaid-rendered version of this diagram should be added to this section when it stabilizes.

---

## 2. Architectural Decisions

| # | Decision | Rationale |
|---|---|---|
| **AD-1** | **Deterministic orchestration over ML-driven tool selection** | Auditable, unit-testable, reproducible. Required for defensive justification in security work. |
| **AD-2** | **Service-aware template chaining (Nmap → service → Nuclei subset)** | Cuts noise ~60–70%; reduces Nuclei runtime by an order of magnitude per target. |
| **AD-3** | **AI used as explainer, not decider** | Gemini produces remediation prose only. All scan/score actions are deterministic. Keeps the system functional without an API key. |
| **AD-4** | **Risk score multiplied by asset criticality** | CVSS alone doesn't reflect business impact; multipliers (db 1.5×, web 1.3×, workstation 1.0×) translate to plain-language priority. |
| **AD-5** | **Evidence-based finding deduplication via SHA-256 of proof** | Multiple tools converging on the same vulnerability collapse to one finding; analysts trust findings they can inspect. |
| **AD-6** | **Celery + Redis instead of RabbitMQ** | Redis already needed for pub/sub; one fewer moving part. |
| **AD-7** | **Monorepo with backend, frontend, lab, infra** | Single source of truth, atomic cross-cutting changes, simpler CI. |
| **AD-8** | **WebSocket fan-out via Redis pub/sub, not direct from worker** | Workers don't hold WebSocket connections; FastAPI subscribes once and broadcasts to clients. |
| **AD-9** | **Lab networks `internal: true` + host firewall rules** | Defense-in-depth; meets OffSec/SANS-style lab isolation. |
| **AD-10** | **JWT with 30-minute expiry, no refresh token** | Smaller attack surface; simpler logic; UX cost is acceptable for an internal tool. |
| **AD-11** | **PDF reports cryptographically signed (RSA-4096)** | Tamper-evident artifacts for audit trail. |
| **AD-12** | **Three top-level Markdown files only (README, TEAM_PLAN, TECHNICAL_NOTES)** | Avoid documentation sprawl; deeper material under `docs/`. |

---

## 3. Scanning Pipeline (4 Stages)

Located in `backend/app/services/agent_orchestrator.py`. Each stage logs its decisions into `Scan.agent_thoughts` (JSON), which feeds the `OrchestrationFeed` UI.

### Stage 1 — Recon
- **Tool:** Nmap (`nmap_wrapper.py`)
- **Output:** open ports, service banners, OS guess
- **Persisted:** `ScanAsset` rows with `open_ports`, `services`, `criticality`

### Stage 2 — Attack
- **Tool:** Nuclei (`nuclei_wrapper.py`), filtered by service map.
  Example: port 445 (SMB) → SMB templates only; port 80/443 → web templates.
- **Output:** raw findings with template_id, request/response evidence

### Stage 3 — Validation
- **Tool:** `validation_probe.py`
- **Logic:** re-checks each finding, assigns `confidence_score` (0.0–1.0)
- **Threshold:** findings below **0.6** are stored but not surfaced

### Stage 4 — Risk Scoring
- **Tool:** `unified_risk_engine.py`
- **Output:** `Scan.risk_score`, `Scan.health_score`, derived `ActionItem` rows
- **Side effects:** emits `RISK_UPDATE`, `SCAN_COMPLETED` events

### Pipeline failure handling
- If any stage raises, the orchestrator persists partial findings, sets `Scan.status = FAILED`, writes the error into `agent_thoughts`, and emits `SCAN_STATUS`.

---

## 4. Risk & Health Scoring

### Risk Score (0–100, higher = worse)

```
risk_score = Σ over findings:
    cvss_weight(severity) × occurrence_factor × asset_criticality_multiplier
```

| Severity | Weight |
|---|---|
| CRITICAL | 25 |
| HIGH | 15 |
| MEDIUM | 8 |
| LOW | 3 |
| INFO | 1 |

| Asset type | Multiplier |
|---|---|
| `database_server` | 1.5× |
| `web_server` | 1.3× |
| `mail_server` | 1.2× |
| `workstation` | 1.0× |
| `unknown` | 1.0× |

Score is clamped to `[0, 100]`.

### Health Score (0–100, higher = better)

```
health_score = 100
             − (critical_count × 25)
             − (high_count × 15)
             − dangerous_port_penalty
             − stale_asset_penalty
```

Clamped to `[0, 100]`.

### ActionItem auto-generation

| Finding profile | Generated ActionItem |
|---|---|
| Critical or High with high confidence | `REMEDIATION`, priority `IMMEDIATE` |
| Medium confidence or medium severity | `REVIEW`, priority `HIGH` |
| Open port outside policy | `CONFIGURATION`, priority `SCHEDULED` |

SLA deadlines come from `sla.py` per severity (e.g., critical = 48h).

---

## 5. Data Model

Defined in `backend/app/models/`. Key entities:

### `Scan`
- `id` (UUID), `target_url`, `target_id` (FK)
- `status`: `QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED`
- `created_at`, `started_at`, `completed_at`
- `risk_score`, `health_score` (int, 0–100)
- `agent_thoughts` (JSON), `scan_metadata` (JSON)
- `celery_task_id`

### `ScanAsset`
- `id`, `scan_id` (FK), `asset_id` (FK → `NetworkAsset`)
- `ip_address`, `hostname`, `os_info`
- `open_ports` (JSON list), `services` (JSON map)
- `criticality` (enum string)
- `last_seen`

### `Vulnerability`
- `id`, `scan_id` (FK), `asset_id` (FK → `ScanAsset`)
- `title`, `description`, `cve_id`, `cvss_score`
- `severity`: `CRITICAL | HIGH | MEDIUM | LOW | INFO`
- `confidence_score` (float, 0.0–1.0)
- `port`, `service`, `template_id`
- `evidence` (JSON: `raw_request`, `raw_response`), `evidence_hash` (SHA-256)
- `remediation` (text)
- `status`: `OPEN | IN_REVIEW | REMEDIATED | FALSE_POSITIVE`
- `validated` (bool), `false_positive` (bool)

### `ActionItem`
- `id`, `scan_id` (FK)
- `title`, `description`
- `action_type`: `REMEDIATION | REVIEW | CONFIGURATION`
- `priority`: `IMMEDIATE | HIGH | SCHEDULED`
- `status`: `PENDING | IN_PROGRESS | COMPLETED`
- `due_date`

### `NetworkAsset`
- `id`, `ip_address`, `mac_address`, `hostname`
- `device_type`: `server | workstation | network_device | unknown`
- `os_info`, `vendor`
- `open_ports` (JSON), `last_seen`, `is_active`

### `User`
- `id`, `email`, `hashed_password`
- `role`: `VIEWER | ANALYST | ADMIN`
- `is_active`, `force_password_change`
- `created_at`, `last_login`

### `AuditLog`
- `id`, `user_id` (FK), `action`, `resource`, `resource_id`
- `old_value`, `new_value` (JSON)
- `timestamp`, `ip_address`

Migrations live in [backend/alembic/versions/](backend/alembic/versions/).

---

## 6. API Surface

Base prefix: `/api/v1`. Full interactive reference at `http://localhost:8000/docs` (Swagger UI) and `/redoc`.

Representative endpoints:

| Method | Path | Min Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | — | Obtain JWT |
| GET | `/auth/me` | VIEWER | Current user profile |
| POST | `/auth/change-password` | VIEWER | Change own password |
| GET | `/rbac/users` | ADMIN | List users |
| POST | `/rbac/users` | ADMIN | Create user |
| PATCH | `/rbac/users/{id}/role` | ADMIN | Change role |
| GET | `/dashboard/summary` | VIEWER | Aggregated KPIs |
| GET | `/dashboard/kpi-snapshot` | VIEWER | Real-time KPI snapshot |
| POST | `/scans` | ANALYST | Start a scan |
| GET | `/scans` | VIEWER | List scans (paginated) |
| GET | `/scans/{id}` | VIEWER | Scan detail + findings |
| POST | `/scans/{id}/stop` | ANALYST | Cancel scan |
| GET | `/vulnerabilities` | VIEWER | List findings |
| PATCH | `/vulnerabilities/{id}` | ANALYST | Update status / mark FP |
| POST | `/vulnerabilities/{id}/revalidate` | ANALYST | Re-probe |
| GET | `/network/assets` | VIEWER | Asset inventory |
| GET | `/network/topology` | VIEWER | D3-compatible JSON |
| POST | `/targets` | ADMIN | Create target |
| DELETE | `/targets/{id}` | ADMIN | Remove target |
| POST | `/reports/{scan_id}/generate` | ANALYST | Generate signed PDF |
| GET | `/siem/alerts` | VIEWER | Recent Wazuh alerts |
| GET | `/lab/status` | VIEWER | Lab container health |
| POST | `/lab/seed` | ADMIN | Seed lab targets |
| GET | `/audit` | ADMIN | Audit log search |
| WS | `/ws/events` | VIEWER | Real-time event stream |

Endpoint modules live in [backend/app/api/v1/endpoints/](backend/app/api/v1/endpoints/).

---

## 7. Authentication & RBAC

**Mechanism.** OAuth2 password flow → JWT (HS256, 30-minute expiry).

**Roles.**

| Role | Capabilities |
|---|---|
| `VIEWER` | Read dashboard, view findings, view scan results |
| `ANALYST` | All VIEWER + start/stop scans, update finding status, mark false-positive, revalidate, generate reports |
| `ADMIN` | All ANALYST + manage users, manage targets, configure system, view audit log |

**Enforcement.** FastAPI dependency `require_role(min_role)` on every mutating route. See [backend/app/api/v1/deps.py](backend/app/api/v1/deps.py).

**Audit.** All RBAC mutations (user create, role change, target create/delete) write an `AuditLog` row in the same transaction.

**Password policy.** bcrypt via `passlib`; minimum 12 chars enforced at the schema layer; `force_password_change` flag set on user creation and after admin password reset.

---

## 8. Real-Time Events (WebSocket / Pub-Sub)

**Channel:** `wss://<host>/ws/events` (or `ws://localhost:8000/ws/events` in dev).

**Auth:** JWT passed as query parameter or `Sec-WebSocket-Protocol`.

**Fan-out path:** Celery worker → Redis pub/sub → FastAPI `ws_manager` → connected clients.

**Event types:**

| Event | Payload |
|---|---|
| `SCAN_STARTED` | `{scan_id, target}` |
| `SCAN_STATUS` | `{scan_id, status, stage}` |
| `FINDING_ADDED` | `{scan_id, vulnerability_id, severity}` |
| `RISK_UPDATE` | `{scan_id, risk_score, health_score}` |
| `SCAN_COMPLETED` | `{scan_id, summary}` |
| `SIEM_ALERT` | `{alert_id, asset_id, severity}` |
| `ACTION_ITEM_CHANGED` | `{action_item_id, status}` |

Frontend integration: [frontend/src/context/RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx).

---

## 9. Integrations

### Nmap
- Subprocess via `python-nmap`. Sweeps configurable; default = top 1000 TCP ports + service detection.
- Output normalized into `ScanAsset.open_ports` and `services` map.

### Nuclei
- **Pinned to v3.3.8.** Templates pre-baked into the backend container image.
- Service-to-template map lives in `nuclei_wrapper.py`.
- Concurrency cap + per-host rate limit applied.

### OpenVAS / GVM
- GMP protocol client in `openvas.py`.
- Optional — `OPENVAS_ENABLED=false` disables and the service is hidden.
- Slow (full CVE sweep is 30–60 minutes); used for deep checks only.

### Google Gemini 1.5 Flash
- Advisory only. Disabled if `GEMINI_API_KEY` is missing or invalid.
- Outputs scrubbed by `llm_guard.py` before persistence.
- Per-asset fields: `risk_explanation`, `business_impact`, `remediation_advice`, `response_priority`.

### Wazuh
- REST API client in `wazuh_integration.py`; basic auth.
- Endpoints used: agent inventory, alert search.

### Elasticsearch + Kibana
- Client in `elastic_integration.py`.
- Index patterns: `wazuh-alerts-*`, `lab-traffic-*`.
- Kibana exposed only when SIEM is enabled.

### n8n (SOAR)
- Trigger via webhook URL; best-effort post.
- Workflows: auto-block IP, ticket creation, Slack notification.

---

## 10. Environment Variables

Centralized in `.env` and parsed by `backend/app/core/config.py`.

### Core

| Variable | Type | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | string | yes | PostgreSQL DSN (SQLite fallback in dev) |
| `REDIS_URL` | string | yes | Redis URL (broker + result + pub/sub) |
| `JWT_SECRET` | string | yes | HS256 signing secret (≥ 32 bytes) |
| `CREDENTIAL_ENCRYPTION_KEY` | string | yes | Fernet key for credential storage |
| `BACKEND_CORS_ORIGINS` | list | yes | Allowed origins |

### Optional integrations

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | unset | Enables AI advisory |
| `OPENVAS_ENABLED` | `false` | Enables OpenVAS endpoints/tasks |
| `OPENVAS_HOST`, `OPENVAS_PORT` | — | OpenVAS server |
| `SIEM_ENABLED` | `false` | Enables Wazuh/Elastic |
| `ELASTICSEARCH_URL` | — | ES endpoint |
| `WAZUH_API_URL`, `WAZUH_API_USER`, `WAZUH_API_PASSWORD` | — | Wazuh credentials |
| `SOAR_ENABLED` | `false` | Enables n8n SOAR |
| `N8N_WEBHOOK_URL` | — | n8n base webhook |

### Lab

| Variable | Description |
|---|---|
| `LAB_ENABLED` | Toggle lab endpoints |
| `LAB_COMPOSE_FILE` | Lab compose file path |
| `LAB_NETWORK_NAME` | Lab Docker network |
| `LAB_DNS_SUFFIX` | Lab DNS suffix |
| `LAB_TRAFFIC_INTENSITY` | Traffic generator intensity (low/med/high) |

---

## 11. Lab Environment & Network Isolation

**Topology** (10 containers across 4 simulated subnets):

| Subnet | Containers |
|---|---|
| DMZ | Juice Shop (web), API mock, DNS |
| Corp | Samba file server, mail, workstation |
| Data | PostgreSQL, Redis |
| Mgmt | traffic-generator, log-shipper |

**Vulnerabilities planted:** SQLi (Juice Shop), reflected/stored XSS, BOLA, weak SMB credentials, default PostgreSQL password, unauthenticated Redis, DNS zone transfer, Nginx info leak.

**Isolation layers:**

1. **Docker network** marked `internal: true` — no bridge to host.
2. **Host firewall** rules (`iptables` Linux / `netsh` Windows) deny lab → LAN egress.
3. **CoreDNS** scoped to lab suffix, prevents DNS exfiltration.
4. **Caddy** does **not** proxy lab subnets — they are accessible only via the backend's internal client.

Apply isolation: `infra/isolation/lab_isolation.{ps1,sh} apply`.

Walkthrough scenarios are demonstrated live during the demo; see the `demo/` folder for the rehearsed flow.

---

## 12. Security Posture

| Control | Implementation |
|---|---|
| Transport security | Caddy TLS (auto cert in dev, real cert in prod) |
| Auth | JWT HS256, 30-min expiry, bcrypt password hashing |
| Authorization | `require_role` dependency on every mutating endpoint |
| Audit | `AuditLog` for all RBAC mutations + scan triggers |
| Input validation | Pydantic v2 schemas; SQLAlchemy ORM parameterization |
| Credential storage | Fernet-encrypted in DB |
| Report integrity | RSA-4096 signed PDFs; verification endpoint |
| Scope enforcement | `scope_guard.py` prevents out-of-scope scans |
| LLM safety | `llm_guard.py` scrubs prompts and outputs |
| Lab isolation | `internal: true` networks + host firewall |
| CORS | Hardcoded allowlist (`localhost:5173`, `localhost:3000`, `https://localhost`) |
| Secrets | Loaded from `.env`; never committed |

---

## 13. Performance & Scaling

- **Scan throughput.** Single Celery worker handles roughly 2–3 concurrent scans of a /24 lab subnet.
- **Topology rendering ceiling.** ~500 nodes in the D3 view before performance degrades; beyond that, cluster.
- **Result pagination.** Listing endpoints (`/scans`, `/vulnerabilities`, `/network/assets`) are paginated; default 50/page.
- **WebSocket fan-out** is O(connected clients); design assumes < 50 simultaneous viewers.
- **Database indexes** on `scan_id`, `asset_id`, `evidence_hash` for dedup and lookup hot paths.

---

## 14. Testing Strategy

| Layer | Tool | Location | Owner |
|---|---|---|---|
| Backend unit + integration | pytest | [backend/tests/](backend/tests/) | Yosef Ali |
| Extended pytest suite | pytest | [all_tests/](all_tests/) | Yosef Ali |
| API contract | Postman | [postman/](postman/) | Yosef Ali |
| Frontend unit | Vitest | [frontend/src/tests/](frontend/src/tests/) | Mazin Alla |
| End-to-end (browser) | Playwright | [tests/](tests/) | Mazin Alla |
| System smoke | `backend/scripts/full_system_check.py` | scripts | Yosef Ali |

Run all: `python run_tests.py` then `python generate_test_report.py`.

**Pytest tactics:**
- Integration tests use a disposable database; **do not mock the ORM**.
- Celery `task_always_eager=True` for sync test execution.
- WebSocket tests via FastAPI's `TestClient(...).websocket_connect(...)`.

**Playwright tactics:**
- Web-first assertions; no `sleep`.
- Fresh DB per run.
- Screenshots-on-failure to `test_reports/screenshots/`.

---

## 15. Operational Runbook

### First-time setup

```powershell
git clone <repo>
cd the-dashboard-project--main
copy .env.example .env   # or create from the variables table above
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
```

### Common operations

| Need | Command |
|---|---|
| Tail backend logs | `docker compose logs -f backend` |
| Tail Celery logs | `docker compose logs -f worker` |
| Apply a migration | `docker compose exec backend alembic upgrade head` |
| Create new migration | `docker compose exec backend alembic revision --autogenerate -m "..."` |
| Reset lab | `docker compose -f docker-compose.lab.yml down -v && docker compose -f docker-compose.lab.yml up -d` |
| Apply lab isolation | `pwsh infra/isolation/lab_isolation.ps1 apply` |
| Rebuild a service | `docker compose up -d --build <service>` |
| Full shutdown | `pwsh stop-all.ps1` |

### Diagnostics

| Symptom | First check |
|---|---|
| Scan stuck in `RUNNING` | Celery worker logs, Redis queue depth, `scan_reaper` schedule |
| 401 spam in browser | JWT expiry — check clock skew between client and Caddy |
| Empty topology | `/network/topology` 200 with empty body usually means no completed scans yet |
| Nuclei templates not loading | Container build did not bake templates — rebuild `backend` |
| OpenVAS unreachable | `OPENVAS_ENABLED=true` but container down; check `docker compose ps` |

### Backups

- DB: `docker compose exec db pg_dump ...` (out of scope for academic deploy, but should be set up before any real-world use).
- Reports: PDFs are deterministic and re-generable from the DB; no separate backup required.

---

## 16. Known Issues & Limitations

- **Single-tenant.** No multi-tenant data isolation. One organization per deployment.
- **Refresh tokens not implemented.** 30-minute JWT expiry forces re-login.
- **Nuclei templates pinned to v3.3.8.** Newer versions are not validated against the service-template map.
- **OpenVAS** is resource-heavy and disabled by default. Full sync takes 30–60 minutes.
- **Topology** caps at ~500 nodes without clustering.
- **Lab isolation tested on Docker Desktop** (Windows + Mac). Behavior on Kubernetes / Podman not validated.
- **No mobile UI.** Designed for 1366px+ desktop.
- **Dark mode only.** No light theme.
- **CORS allowlist is static.** Production deploy needs to update `BACKEND_CORS_ORIGINS`.
- **Gemini quota** is per project; under heavy demo load the advisor may rate-limit. System functions without it.
- **SOAR (n8n) calls are fire-and-forget.** Failures are logged but not retried.

---

## Change Log Pointer

This file should be updated alongside any architectural change, new integration, new environment variable, or new known issue. The git history of this file is the authoritative change log; do not maintain a separate one.
