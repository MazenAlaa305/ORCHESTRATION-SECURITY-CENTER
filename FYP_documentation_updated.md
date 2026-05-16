# FYP Documentation — Updated 2026-05-16

> **Scope:** Full audit of `docs/FYP.md` against the live codebase as of commit `68a49f1`.
> Original file: `docs/FYP.md` (2,677 lines). This file documents every section that differs from the current codebase and adds new sections for features that have no documentation.
>
> **2026-05-16 delta:** A second pass found four additional divergences accumulated since the 2026-05-08 snapshot. Each is appended to its existing section under a `### ➕ Newly added 2026-05-16` block with explicit *Old → New* framing.

---

## Summary of Changes

- **RBAC + Authentication fully implemented** — listed as "out of scope" and a "limitation" in the original doc; it is now fully shipped with JWT login, three roles, and a dedicated Settings page.
- **Docker Compose now has 12 services** — Caddy reverse proxy and N8N (SOAR automation) were added; original doc counted 10 or 11 inconsistently.
- **N8N SOAR integration** — entirely undocumented new capability (SOAROrchestrator service + n8n container).
- **Findings API with compliance framework tagging** — new `/findings` endpoint mapping vulnerabilities to ISO 27001, OWASP Top 10, CWE, NIST CSF, and PCI DSS; not in original doc.
- **Audit chain verification** — tamper-evident SHA-256 hash chain on AgentLog records; not in original doc.
- **ScopeGuard** — per-target scope enforcement to prevent out-of-scope scanning; not in original doc.
- **CVSS v3.1 calculator** — proper CVSS v3.1 base and environmental score calculation; original doc only described custom penalty weights.
- **Living Lab API** — `/lab` endpoint with `lab_manager` service for simulation lab lifecycle management; not in original doc.
- **Alert Correlator** — correlates live Wazuh alerts with stored vulnerability records; not in original doc.
- **Wrong Python package name** — doc says `google-generativeai`; `requirements.txt` uses `google-genai>=0.8.0`.
- **Chart.js listed but not installed** — `package.json` contains only D3.js and Recharts, no Chart.js.
- **API renamed internally** — backend root returns `"PentesterFlow API v2.0"`, not "Orchestration Security Center API".
- **Significantly expanded frontend** — 15+ undocumented components, two new pages, two new contexts, three new hooks, one new Zustand store.
- **New ORM models** — `Finding`, `Report`, `RuntimeConfig` are present in the codebase but absent from the documented ERD.
- **Limitation §6.3.2 resolved** — "Single-User Mode / No RBAC" is no longer accurate.
- **Future enhancement §6.4.1 achieved** — RBAC was a listed future goal; it is now complete.

### Added in the 2026-05-16 delta

- **Docker Compose profile restructure (§3.7.3)** — only 6 services now run in lite/default mode; `celery_beat`, `openvas`, `elasticsearch`, `kibana`, `wazuh`, and `n8n` all moved to `--profile full`. The earlier "11 base + 1 optional" framing in this audit file is superseded.
- **New `AuditLog` model (§3.6)** — second audit table, distinct from the AgentLog hash chain. Records actor-attributed admin actions (user create / role change / disable / password reset) for RBAC compliance.
- **Four new RBAC endpoints (§3.7.4)** — `/rbac/users/{id}/enable`, `/rbac/users/{id}/reset-password`, `DELETE /rbac/users/{id}`, and `/rbac/audit-logs`; surfaced in the frontend through a dedicated `UserManagementPage.jsx` and a new `usePermission` hook.
- **New `topology_generator.py` service (§3.3.2)** — auto-builds a cached Mermaid network diagram from `NetworkAsset` rows; not in the service table added at the 2026-05-08 audit.

---

## Section: Chapter 1 — Introduction (§1.4 Project Scope)

### 📄 Current (from FYP_documentation.md)

> **Out of Scope:**
> - Role-Based Access Control (RBAC) with multi-user authentication (planned for future release)

### 🔄 Updated Version

**Out of Scope** (remove the RBAC bullet — it is now implemented):

- Authenticated scanning with session management (credential-based crawling)
- Mobile application penetration testing
- Static Application Security Testing (SAST) / source code analysis
- Compliance reporting (PCI-DSS, HIPAA, SOC 2) *as standalone report templates* — individual vulnerability-to-control mappings are now available via the Findings API
- Cloud-native deployment (AWS/Azure/GCP managed services)

**In Scope** (add):

- JWT-based authentication with three-role RBAC (Admin, Analyst, Viewer)
- Caddy reverse proxy providing HTTPS termination (ports 80/443)
- N8N SOAR automation integration (optional `--profile full`) for automated response playbooks
- Compliance framework tagging of findings (ISO 27001, OWASP Top 10, CWE, NIST CSF, PCI DSS)
- Tamper-evident audit chain on agent log records (SHA-256 hash chain)
- Per-target scope enforcement (ScopeGuard) preventing out-of-scope HTTP requests

### 📝 Reason for Update

`backend/app/api/v1/endpoints/auth.py` implements full JWT login/logout/me; `rbac.py` implements user CRUD and role assignment; `models/user.py` defines the `UserRole` enum (`VIEWER`, `ANALYST`, `ADMIN`). The frontend `LoginPage.jsx` and `SettingsPage.jsx` expose these capabilities to users. RBAC is no longer a future item.

---

## Section: Chapter 2 — Literature Review (§2.4.1 FastAPI / §2.4.6 Gemini)

### 📄 Current (from FYP_documentation.md)

> §2.4.6: "This project uses the `gemini-2.0-flash` model (with `gemini-pro` as fallback)..."
>
> §4.2 Table 4.2 lists `google-generativeai` as the package name.

### 🔄 Updated Version

The SDK package name changed upstream. The installed package is **`google-genai>=0.8.0`** (the new unified Google Gen AI SDK), not `google-generativeai`. The model identifiers (`gemini-2.0-flash`, `gemini-pro` fallback) remain the same.

Update Table 4.2 row:

| Package | Purpose |
|---|---|
| `google-genai` | Google Gemini AI SDK (replaces `google-generativeai`) |

### 📝 Reason for Update

`backend/requirements.txt` line: `google-genai>=0.8.0`. The old `google-generativeai` package is not listed.

---

## Section: Chapter 3 — System Design (§3.3.4 Real-Time Architecture)

### 📄 Current (from FYP_documentation.md)

> "The React frontend maintains a persistent WebSocket connection (`ws://localhost:8000/ws/logs`)..."
> No mention of authentication on the WebSocket.

### 🔄 Updated Version

The frontend now goes through the **Caddy reverse proxy** (`https://localhost/`). The default `VITE_API_URL` in `LoginPage.jsx` is `https://localhost/api/v1`, not `http://localhost:8000/api/v1`. Caddy terminates TLS and proxies to the backend container.

Additionally, all REST API routes (except `/config` and `/auth/login`) now require a **JWT Bearer token** sent in the `Authorization` header. The `RealTimeContext` WebSocket connection also passes the stored session token for validation.

### 📝 Reason for Update

`docker-compose.yml` includes a `caddy` service mapping ports 80/443. `LoginPage.jsx` uses `https://localhost/api/v1` as the default API URL. `api.py` wraps all routes except `config` and `auth` with `dependencies=[Depends(get_current_user)]`.

---

## Section: Chapter 3 — System Design (§3.3.2 Agent Orchestration Pipeline)

### 📄 Current (from FYP_documentation.md)

> "The pipeline executes **five agents** in sequence: ReconAgent, AttackAgent, ValidationAgent, UnifiedRiskEngine, ReportingAgent."

### 🔄 Updated Version

The documented 5-agent pipeline remains the core flow, but the `services/` layer has grown substantially. The following services now participate in or support the pipeline:

| Service | Role |
|---|---|
| `discovery_agent.py` | Extended host/endpoint discovery beyond basic Nmap |
| `infrastructure_agent.py` | Infrastructure-level analysis of discovered assets |
| `intelligence_agent.py` | Threat intelligence enrichment of findings |
| `validation_probe.py` | Active re-probe validation (replaces static confidence filtering) |
| `finding_dedup.py` | Deduplication of vulnerability records across repeated scans |
| `framework_tagger.py` | Automatically tags findings with compliance control IDs |
| `scoring_explainer.py` | Generates human-readable explanation for each risk score |
| `scan_reaper.py` | Cleans up stale/hung scans (RUNNING scans beyond timeout) |
| `task_monitor.py` | Monitors Celery task execution health |
| `sla.py` | SLA breach detection for open vulnerabilities |
| `report_signer.py` | Cryptographic signing of generated PDF reports |
| `llm_guard.py` | Rate-limiting and safety wrapper around Gemini calls |
| `cvss.py` | CVSS v3.1 base and environmental score calculator |
| `scope_guard.py` | Per-target scope enforcement for all outbound scanner requests |
| `alert_correlator.py` | Correlates Wazuh alerts to vulnerability records |
| `soar_orchestrator.py` | Triggers N8N SOAR playbooks via webhook |
| `lab_manager.py` | Manages living lab container lifecycle and telemetry |

### 📝 Reason for Update

All 17 files exist under `backend/app/services/`. The original doc documented only 11 services. The 6 new agents and 11 new support services represent significant hardening and capability expansion added after the original documentation was written.

### ➕ Newly added 2026-05-16

**What changed in §3.3.2:** one additional support service has appeared since the 2026-05-08 audit.

> **Old** (2026-05-08 service table): the listing ended at `lab_manager` and did not contain any topology-rendering service.
>
> **New** (current code): `backend/app/services/topology_generator.py` is now present and is invoked by `AssetMonitor` after every scan. Append this row to the service table:

| Service | Role |
|---|---|
| `topology_generator.py` | Auto-builds a Mermaid network diagram from `NetworkAsset` records and caches it in Redis (`osc:topology:mermaid`, TTL 1 h) so the topology API endpoint serves instantly |

**Evidence:**

- `backend/app/services/topology_generator.py:1-40` — module docstring states it is called by `AssetMonitor` after every scan; Redis key `osc:topology:mermaid` is declared at the top of the file.

---

## Section: Chapter 3 — System Design (§3.3.3 UnifiedRiskEngine)

### 📄 Current (from FYP_documentation.md)

> Documents only the custom penalty-weight scoring system with fixed CVSS-severity approximations.

### 🔄 Updated Version

The platform now also ships a **full CVSS v3.1 calculator** (`backend/app/services/cvss.py`) that implements the official FIRST CVSS v3.1 specification formula, including:

- Base Score (Attack Vector, Attack Complexity, Privileges Required, User Interaction, Scope, Confidentiality/Integrity/Availability Impact)
- Environmental Score (asset criticality, data sensitivity, network exposure modifiers)
- `parse_vector()` function for parsing Nuclei-provided CVSS vectors

The `UnifiedRiskEngine` custom weights (documented in Tables 3.6 and 3.7) remain in use for the platform's proprietary risk/health scores. The CVSS calculator is used separately for per-vulnerability CVSS enrichment.

### 📝 Reason for Update

`backend/app/services/cvss.py` exists with full implementation. The docstring references the FIRST CVSS v3.1 specification. This is distinct from the custom scoring tables in Table 3.6/3.7.

---

## Section: Chapter 3 — System Design (§3.6 Database Design)

### 📄 Current (from FYP_documentation.md)

> Documents **9 entities**: Target, Scan, Vulnerability, ScanAsset, AssetService, AgentLog, Endpoint, ActionItem, NetworkAsset.

### 🔄 Updated Version

The database now has **12 entities**. Add the following to Table 3.5:

| Entity | Description | Key Attributes |
|---|---|---|
| **Finding** | A deduplicated, framework-tagged security finding aggregating one or more Vulnerability records | id (PK), title, description, severity, status (FindingStatus), control_tags (JSON), cve_ids (JSON), remediation |
| **Report** | A generated security report linked to a scan | id (PK), scan_id (FK), format, content, file_path, signed (bool), created_at |
| **RuntimeConfig** | Key-value store for operator-configurable feature flags and runtime settings | id (PK), key (unique), value, description |

**FindingStatus enum:** `open`, `fixed`, `accepted`, `reopened`, `false_positive`

**control_tags JSON structure** (example):
```json
{
  "owasp_top10": "A03:2021",
  "cwe": "CWE-89",
  "iso27001_annex_a": "A.12.6.1",
  "nist_csf_function": "DETECT",
  "pci_dss_requirement": "6.3.2"
}
```

**Updated ERD relationships:**
```
Scan     (1) ──→ (N) Finding      One scan can produce many deduplicated findings
Scan     (1) ──→ (N) Report       One scan can generate multiple report formats
```

### 📝 Reason for Update

`backend/app/models/scan.py` defines `class Finding(Base)` and `class Report(Base)`. `backend/app/models/config.py` defines `class RuntimeConfig(Base)`. None appear in the original ERD or Table 3.5.

### ➕ Newly added 2026-05-16

**What changed in §3.6:** a 13th entity has been added — and it is **not** the AgentLog hash chain that this audit file already covers. The new `AuditLog` model is a separate, RBAC-scoped action ledger.

> **Old** (2026-05-08 audit): the updated Table 3.5 added `Finding`, `Report`, and `RuntimeConfig`, bringing the entity count to 12. AgentLog (the SHA-256 hash chain) remained inside `models/scan.py`.
>
> **New** (current code): a dedicated `backend/app/models/audit_log.py` file now defines a separate `AuditLog` entity that records actor-attributed administrative actions. The entity count is now **13**. Append this row to Table 3.5:

| Entity | Description | Key Attributes |
|---|---|---|
| **AuditLog** | Actor-attributed RBAC action ledger — records who (admin user) did what (create user / change role / disable / reset password) and when. Distinct from `AgentLog`, which records agent decisions inside a scan. | id (PK, UUID), actor_id (FK→User), actor_email, action, target_id, detail, created_at (indexed) |

**Use case:** an admin reviewing the `/api/v1/rbac/audit-logs` endpoint can see a tamper-evident list of every RBAC mutation performed on the platform, satisfying ISO 27001 A.9.2 (user access management auditing) requirements.

**Evidence:**

- `backend/app/models/audit_log.py:1-17` — `class AuditLog(Base)` with `__tablename__ = "audit_logs"` and the columns listed above.
- `backend/app/api/v1/endpoints/rbac.py:199` — `@router.get("/audit-logs", response_model=list[AuditLogOut], dependencies=[admin_only])` consumes this model.

---

## Section: Chapter 3 — System Design (§3.7.3 Docker Compose Services)

### 📄 Current (from FYP_documentation.md)

> Table 3.3 lists **10 services**: backend, frontend, db, redis, celery_worker, celery_beat, openvas, elasticsearch, kibana, wazuh.
> Text alternates between "ten microservices" and "eleven services."

### 🔄 Updated Version

**Table 3.3 (Corrected):** Docker Compose Services and Port Mapping

| Service | Container Name | Port(s) | Technology | Purpose |
|---|---|:-:|---|---|
| caddy | sme_dashboard_caddy | 80, 443 | Caddy 2 Alpine | Reverse proxy + TLS termination |
| backend | sme_dashboard_backend | 8000 (internal) | FastAPI / Python 3.11 | REST API + WebSocket server |
| frontend | sme_dashboard_frontend | 5173 (internal) | React / Vite | Dashboard UI |
| db | sme_dashboard_db | 5432 | PostgreSQL 15 Alpine | Primary data store |
| redis | sme_dashboard_redis | 6379 | Redis 7 Alpine | Cache + message broker |
| celery_worker | sme_dashboard_celery | — | Celery 5.3 | Background task execution |
| celery_beat | sme_dashboard_beat | — | Celery Beat | Scheduled task execution |
| openvas | sme_dashboard_openvas | 9390, 9392 | OpenVAS (immauss) | Vulnerability scanner |
| elasticsearch | sme_dashboard_elastic | 9200 | Elasticsearch 8.11.1 | Log storage and search |
| kibana | sme_dashboard_kibana | 5601 | Kibana 8.11.1 | Log visualization |
| wazuh | sme_dashboard_wazuh | 1514, 1515, 55000 | Wazuh 4.7.2 | SIEM agent manager |
| n8n *(profile: full)* | sme_dashboard_n8n | 5678 | N8N latest | SOAR automation workflow engine |

**Total: 11 base services + 1 optional (`n8n`, activated with `--profile full`).**

All three — backend, celery_worker, celery_beat — receive `N8N_WEBHOOK_URL` and `SOAR_ENABLED` environment variables for SOAR integration.

### 📝 Reason for Update

`docker-compose.yml` service list: `caddy`, `backend`, `frontend`, `db`, `redis`, `celery_worker`, `celery_beat`, `openvas`, `elasticsearch`, `kibana`, `wazuh`, `n8n`. N8N has `profiles: ["full"]`.

### ➕ Newly added 2026-05-16

**What changed in §3.7.3:** the lite/full profile split has been broadened. The "11 base + 1 optional N8N" framing in the previous entry is no longer accurate.

> **Old** (2026-05-08 audit): only `n8n` carried `profiles: ["full"]`; every other service was treated as a base/lite service, giving "11 base services + 1 optional".
>
> **New** (current `docker-compose.yml`): **6 services** run in default/lite mode (`caddy`, `backend`, `frontend`, `db`, `redis`, `celery_worker`). The remaining **6 services** (`celery_beat`, `openvas`, `elasticsearch`, `kibana`, `wazuh`, `n8n`) all carry `profiles: ["full"]` and only start with `docker compose --profile full up`. This matches the RAM table in `HOW_TO_RUN.md` (16 GB lite vs 32 GB full).

Updated "Profile" column for Table 3.3:

| Service | Profile |
|---|---|
| caddy, backend, frontend, db, redis, celery_worker | base (lite) |
| celery_beat, openvas, elasticsearch, kibana, wazuh, n8n | `--profile full` only |

**Downstream impact:**

- **§6.2 Objective O6** should now read "6-service lite deployment, expandable to 12 with `--profile full`", not "11-service Docker Compose".
- **§3.7 capacity discussion** in the original doc claimed the stack runs on 16 GB; that is now true only because the heavy SIEM/SOAR services are profile-gated.
- Scheduled scanning (Celery Beat) is no longer running by default — the partially-achieved Future Enhancement 8 should be re-noted as "requires `--profile full` to be active".

**Evidence:**

- `docker-compose.yml:170` — `celery_beat:` block begins with `profiles: ["full"]`.
- `docker-compose.yml:191, 210, 229, 242, 256` — `profiles: ["full"]` appears on `openvas`, `elasticsearch`, `kibana`, `wazuh`, and `n8n`.
- `HOW_TO_RUN.md:11-12` — the RAM table documents "Lite (default) … 6 main services" vs "Full … + OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, celery_beat".

---

## Section: Chapter 3 — System Design (§3.7.4 REST API Endpoint Catalogue)

### 📄 Current (from FYP_documentation.md)

> Table 3.4 lists 9 route prefixes plus `/health` and `/ws/logs`. No authentication or RBAC routes listed.

### 🔄 Updated Version

**Table 3.4 (Corrected):** REST API Endpoint Catalogue

| Route Prefix | Key Endpoints | Auth Required | Description |
|---|---|:-:|---|
| `/api/v1/auth` | `/login`, `/logout`, `/me`, `/change-password` | No (login) / Yes (others) | JWT authentication |
| `/api/v1/config` | `/` | No | Feature flag map (runtime config) |
| `/api/v1/targets` | `/`, `/{id}`, `/discover` | Yes | Target CRUD and auto-discovery |
| `/api/v1/scans` | `/`, `/{id}`, `/ai`, `/{id}/audit/verify` | Yes | Scan CRUD, AI orchestration, audit chain verification |
| `/api/v1/vulnerabilities` | `/`, `/{id}`, `/{id}/workflow`, `/{id}/revalidate` | Yes | Vulnerability listing, status updates, revalidation |
| `/api/v1/findings` | `/` | Yes | Deduplicated findings with compliance framework filtering |
| `/api/v1/reports` | `/`, `/{id}/pdf` | Yes | Report generation and PDF download |
| `/api/v1/network` | `/assets`, `/activity` | Yes | Network asset listing and activity feed |
| `/api/v1/dashboard` | `/kpi`, `/risk-overview`, `/action-items`, `/refresh-risk` | Yes | KPI snapshots, risk overview, action items |
| `/api/v1/openvas` | `/scan`, `/status/{id}`, `/results/{id}`, `/schedule` | Yes | OpenVAS scan management |
| `/api/v1/siem` | `/events`, `/alerts` | Yes | Wazuh/Elasticsearch event queries |
| `/api/v1/rbac` | `/users`, `/users/{id}/role`, `/users/{id}/disable` | Yes (Admin only) | User and role management |
| `/health` | `/health` | No | System liveness/readiness check |
| `/ws/logs` | WebSocket | Yes (token) | Real-time event streaming |

**New: `/api/v1/lab`** (from `lab.py`, not yet registered in `api.py` — see Questions section):

| Route | Method | Description |
|---|---|---|
| `/lab/status` | GET | Get living lab container states and telemetry |
| `/lab/seed` | POST | Register lab targets in the database (idempotent) |
| `/lab/events` | GET | Fetch recent lab events from Elasticsearch |

### 📝 Reason for Update

`backend/app/api/api.py` now includes routers for `auth`, `rbac`, `findings`, `config`, and `audit`. These are completely absent from the original Table 3.4.

### ➕ Newly added 2026-05-16

**What changed in §3.7.4:** the `/rbac` row has grown — four more admin endpoints have been added since the 2026-05-08 audit, and a dedicated frontend page now consumes them.

> **Old** (2026-05-08 audit): the `/rbac` row in Table 3.4 listed only `/users`, `/users/{id}/role`, `/users/{id}/disable` (3 endpoints), and the corresponding RBAC system section listed the same three.
>
> **New** (current code): the `/rbac` router exposes **eight** endpoints. Append these four to the `/rbac` row:

| Endpoint | Method | Description |
|---|---|---|
| `/rbac/users/{id}/enable` | POST | Re-enable a previously disabled user (counterpart to `/disable`) |
| `/rbac/users/{id}/reset-password` | POST | Admin-initiated password reset; sets `force_password_change=True` on the target user |
| `/rbac/users/{id}` | DELETE | Hard-delete a user (204 No Content) |
| `/rbac/audit-logs` | GET | List recent `AuditLog` rows (admin RBAC action history — see §3.6 entry) |

All four require the `admin_only` dependency.

**Frontend surface:** a new page `frontend/src/pages/UserManagementPage.jsx` consumes the full `/rbac` API, replacing the inline admin table that previously lived inside `SettingsPage.jsx`. A new `frontend/src/hooks/usePermission.js` hook centralises the role-rank logic (`canManageUsers`, `canTriggerScan`, `canDeleteTarget`, `canExportReport`, `canEditVuln`) so components no longer hard-code role strings.

**Evidence:**

- `backend/app/api/v1/endpoints/rbac.py:146` — `@router.post("/users/{user_id}/enable", … admin_only)`
- `backend/app/api/v1/endpoints/rbac.py:162` — `@router.post("/users/{user_id}/reset-password", … admin_only)`
- `backend/app/api/v1/endpoints/rbac.py:182` — `@router.delete("/users/{user_id}", … admin_only)`
- `backend/app/api/v1/endpoints/rbac.py:199` — `@router.get("/audit-logs", … admin_only)`
- `frontend/src/pages/UserManagementPage.jsx:10-19` — `rbac` helper object wires all eight endpoints
- `frontend/src/hooks/usePermission.js:1-21` — role-rank table and capability booleans

---

## Section: Chapter 4 — Implementation (§4.1 Line Count)

### 📄 Current (from FYP_documentation.md)

> "The implementation spans approximately 10,000 lines of Python backend code and 8,000 lines of React/JavaScript frontend code."

### 🔄 Updated Version

These figures are significantly understated given the scope of post-documentation additions. The backend `services/` directory alone grew from 11 to 28 files. The frontend `components/` directory grew from approximately 30 to 50+ components. Updated estimates are not calculated here — provide actual `wc -l` counts in the final submission.

### 📝 Reason for Update

File count: `find backend/app -name "*.py" | wc -l` vs the list in Appendix A. The directory listing shows 28 service files vs the 11 documented.

---

## Section: Chapter 4 — Implementation (§4.2 Development Tools — Table 4.1)

### 📄 Current (from FYP_documentation.md)

> Table 4.1 lists "Chart.js, D3.js, Recharts" under Charting.

### 🔄 Updated Version

**Chart.js is not installed.** Remove it from Table 4.1.

| Category | Tool / Technology | Version | Purpose |
|---|---|---|---|
| Charting | D3.js + Recharts | Latest | Data visualization (D3 for topology/heatmap, Recharts for trend charts) |

All other rows in Table 4.1 remain accurate.

### 📝 Reason for Update

`frontend/package.json` dependencies: `d3-ease`, `d3-force`, `d3-hierarchy`, `d3-selection`, `d3-transition`, `recharts`. No `chart.js` entry exists.

---

## Section: Chapter 4 — Implementation (§4.3.5 Frontend Dashboard Architecture)

### 📄 Current (from FYP_documentation.md)

> Describes a single `Dashboard.jsx` page with no authentication layer. No mention of login flow, protected routes, or settings page.

### 🔄 Updated Version

The frontend now has a **full authentication flow** before the dashboard is accessible:

**Route Structure (`App.jsx`):**
```
/login                              → LoginPage (public)
/dashboard/:tab?/:subTab?           → ProtectedRoute → Dashboard
*                                   → redirect to /dashboard/overview
```

`ProtectedRoute` checks for a valid JWT token in `sessionStorage` (not `localStorage` — intentional XSS mitigation). Unauthenticated users are redirected to `/login`.

**LoginPage (`pages/LoginPage.jsx`):**
- Cybersecurity-themed dark UI with radial gradient background
- Posts to `/api/v1/auth/login` with email + password
- On success: stores token and user (role, email) in `sessionStorage` via `AuthContext`
- Detects `force_password_change` flag and prompts user to update password

**SettingsPage (`pages/SettingsPage.jsx`):**
- Account info section (email, role display, logout button)
- Change password form (calls `/auth/change-password`)
- Admin-only user management table (calls `/rbac/users`, hidden via `RoleGuard` for non-admins)

### 📝 Reason for Update

`frontend/src/App.jsx` shows the full route tree including `ProtectedRoute`. `frontend/src/pages/LoginPage.jsx` and `SettingsPage.jsx` exist with full implementations. `frontend/src/context/AuthContext.jsx` manages JWT state in `sessionStorage`.

---

## Section: Chapter 4 — Implementation (§4.3.6 Frontend Real-Time Context Provider)

### 📄 Current (from FYP_documentation.md)

> "The `RealTimeContext` manages WebSocket state and real-time event dispatching."
> Only one context (`RealTimeContext`) is mentioned.

### 🔄 Updated Version

The frontend now has **three React context providers**, all wrapping the application in `main.jsx`:

| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `context/AuthContext.jsx` | JWT token, user profile (email, role), login/logout actions. Uses `sessionStorage` for XSS resilience. |
| `RealTimeContext` | `context/RealTimeContext.jsx` | WebSocket connection, KPI state, orchestration log, alerts, scan status. (As documented.) |
| `ConfigContext` | `context/ConfigContext.jsx` | Runtime feature flags loaded from `/api/v1/config` endpoint, used throughout the UI for conditional rendering. |

**New Hooks:**

| Hook | File | Purpose |
|---|---|---|
| `useAuth` | `hooks/useAuth.js` | Convenience wrapper around `AuthContext` |
| `useGlobalShortcuts` | `hooks/useGlobalShortcuts.js` | Keyboard shortcut registration (used by `CommandPalette`) |
| `useSavedViews` | `hooks/useSavedViews.js` | Persists user-customized dashboard view configurations |

**New Zustand Store:**

| Store | File | Purpose |
|---|---|---|
| `envStore` | `stores/envStore.js` | Global state for the lab environment panel (selected lab profile, target list) |

### 📝 Reason for Update

All three context files exist. All three hook files and the store file exist in `frontend/src/`.

---

## Section: Chapter 4 — Implementation (§4.3 — Backend Directory Structure in Appendix A)

### 📄 Current (from FYP_documentation.md)

> Appendix A lists 11 service files and 8 endpoint files.

### 🔄 Updated Version

**Updated Backend Directory Structure:**
```
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── api.py
│   │   ├── deps.py                    # JWT auth dependency injection
│   │   └── v1/endpoints/
│   │       ├── auth.py                # NEW — JWT login/logout/me/change-password
│   │       ├── rbac.py                # NEW — Admin user & role management
│   │       ├── config.py              # NEW — Feature flag endpoint
│   │       ├── audit.py               # NEW — Agent log hash-chain verification
│   │       ├── findings.py            # NEW — Compliance-tagged findings
│   │       ├── lab.py                 # NEW — Living lab management
│   │       ├── dashboard.py
│   │       ├── scans.py
│   │       ├── targets.py
│   │       ├── vulnerabilities.py
│   │       ├── reports.py
│   │       ├── network.py
│   │       ├── openvas.py
│   │       └── siem.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── celery_app.py
│   │   ├── crypto.py                  # NEW — Credential encryption utilities
│   │   ├── security.py                # NEW — JWT creation + password hashing
│   │   └── request_id.py              # NEW — Request ID middleware
│   ├── models/
│   │   ├── scan.py                    # Updated — added Finding, Report models
│   │   ├── user.py                    # NEW — User + UserRole
│   │   └── config.py                  # NEW — RuntimeConfig model
│   ├── data/
│   │   └── control_mappings.json      # NEW — Framework control ID mappings
│   └── services/
│       ├── agent_orchestrator.py
│       ├── unified_risk_engine.py
│       ├── ws_manager.py
│       ├── nmap_wrapper.py
│       ├── nuclei_wrapper.py
│       ├── openvas.py
│       ├── pdf_generator.py
│       ├── ai_advisor.py
│       ├── wazuh_integration.py
│       ├── scan_tasks.py
│       ├── event_publisher.py
│       ├── elastic_integration.py
│       ├── asset_monitor.py
│       ├── alert_correlator.py        # NEW
│       ├── cvss.py                    # NEW — CVSS v3.1 calculator
│       ├── discovery_agent.py         # NEW
│       ├── finding_dedup.py           # NEW
│       ├── framework_tagger.py        # NEW
│       ├── infrastructure_agent.py    # NEW
│       ├── intelligence_agent.py      # NEW
│       ├── lab_manager.py             # NEW
│       ├── llm_guard.py               # NEW
│       ├── report_signer.py           # NEW
│       ├── scan_reaper.py             # NEW
│       ├── scope_guard.py             # NEW
│       ├── scoring_explainer.py       # NEW
│       ├── sla.py                     # NEW
│       ├── soar_orchestrator.py       # NEW
│       ├── task_monitor.py            # NEW
│       └── validation_probe.py        # NEW
├── alembic/                           # DB migrations
├── tests/                             # 12 test files
├── Dockerfile
└── requirements.txt
```

**Updated Frontend Directory Structure:**
```
frontend/src/
├── main.jsx
├── App.jsx                            # Updated — auth routes + ProtectedRoute
├── pages/
│   ├── Dashboard.jsx
│   ├── LoginPage.jsx                  # NEW
│   └── SettingsPage.jsx               # NEW
├── components/
│   ├── dashboard/
│   │   ├── StatCards.jsx
│   │   ├── NetworkTopology.jsx
│   │   ├── RiskHeatmap.jsx
│   │   ├── VulnTrend.jsx
│   │   ├── UptimeGauge.jsx
│   │   ├── ScanButton.jsx
│   │   ├── OrchestrationFeed.jsx
│   │   ├── ActionCenter.jsx
│   │   ├── VulnerabilitiesPanel.jsx
│   │   ├── ScanHistory.jsx
│   │   ├── TargetsManager.jsx
│   │   ├── AgentLogViewer.jsx
│   │   ├── ScanPipelinePanel.jsx
│   │   ├── UnifiedInbox.jsx
│   │   ├── Reports.jsx
│   │   ├── AssetDetailPanel.jsx
│   │   ├── ActivityFeed.jsx           # NEW
│   │   ├── AssetTimeline.jsx          # NEW
│   │   ├── EnvironmentWizard.jsx      # NEW
│   │   ├── ExposureMap.jsx            # NEW
│   │   ├── IncidentDetailDrawer.jsx   # NEW
│   │   ├── LabEnvironment.jsx         # NEW
│   │   ├── LiveConsole.jsx            # NEW
│   │   ├── RemediationPanel.jsx       # NEW
│   │   ├── RiskBreakdownDrawer.jsx    # NEW
│   │   ├── RiskScore.jsx              # NEW
│   │   ├── ScanConfigModal.jsx        # NEW
│   │   ├── ScanningBanner.jsx         # NEW
│   │   ├── SettingsPanel.jsx          # NEW
│   │   ├── SeverityDonut.jsx          # NEW
│   │   ├── Taskbar.jsx                # NEW
│   │   └── TopologyLegend.jsx         # NEW
│   ├── OpenVAS/
│   │   ├── ScanButton.jsx
│   │   ├── RiskChart.jsx
│   │   ├── Scheduler.jsx
│   │   └── VulnerabilitiesList.jsx
│   ├── ui/
│   │   ├── CyberButton.jsx
│   │   ├── CyberBadge.jsx
│   │   ├── SkeletonPulse.jsx
│   │   ├── Tabs.jsx
│   │   ├── SubTabBar.jsx
│   │   ├── Toast.jsx
│   │   ├── GaugeRing.jsx
│   │   ├── ConfirmDialog.jsx          # NEW
│   │   ├── EmptyState.jsx             # NEW
│   │   ├── ProtectedRoute.jsx         # NEW
│   │   └── RoleGuard.jsx              # NEW
│   ├── CommandPalette.jsx             # NEW
│   ├── DeviceDetailModal.jsx          # NEW
│   ├── ErrorBoundary.jsx              # NEW
│   ├── MetricCard.jsx                 # NEW
│   ├── NotificationsBell.jsx          # NEW
│   ├── QuickScanPopover.jsx           # NEW
│   ├── ReportGenerator.jsx            # NEW
│   ├── SecurityAdvisor.jsx            # NEW
│   ├── ShortcutCheatsheet.jsx         # NEW
│   └── ToastProvider.jsx              # NEW
├── context/
│   ├── AuthContext.jsx                # NEW
│   ├── ConfigContext.jsx              # NEW
│   └── RealTimeContext.jsx
├── hooks/
│   ├── useAuth.js                     # NEW
│   ├── useGlobalShortcuts.js          # NEW
│   └── useSavedViews.js               # NEW
├── stores/
│   └── envStore.js                    # NEW
├── services/
│   └── api.js
└── layout/
    ├── Layout.jsx
    └── Sidebar.jsx
```

---

## Section: Chapter 6 — Conclusion (§6.2 Achievement of Objectives)

### 📄 Current (from FYP_documentation.md)

> O6: "10-service Docker Compose with PostgreSQL, Redis, Celery, Elasticsearch, Wazuh"

### 🔄 Updated Version

| Objective | Status | Evidence |
|---|:-:|---|
| **O6:** Containerized microservices deployment | **Exceeded** | 11-service Docker Compose (+ optional N8N on `--profile full`), including new Caddy reverse proxy for production-grade HTTPS |

---

## Section: Chapter 6 — Conclusion (§6.3 Limitations)

### 📄 Current (from FYP_documentation.md)

> **Limitation 2:** "Single-User Mode: The platform lacks Role-Based Access Control (RBAC), operating in single-user mode without authentication or user-specific dashboards."

### 🔄 Updated Version

**Limitation 2 is resolved.** Remove it from the limitations list.

The platform now implements full multi-user authentication and RBAC with three roles:

| Role | Permissions |
|---|---|
| **ADMIN** | Full access + target CRUD + user management |
| **ANALYST** | Read + trigger scans + update vulnerability status |
| **VIEWER** | Read-only access to all dashboard data |

Replace with a revised limitation:

> **Limitation 2:** "Role Propagation in WebSocket Events: WebSocket broadcast events are sent to all connected clients without per-role filtering. An ANALYST and a VIEWER receive identical event streams; role-based UI suppression is enforced client-side only."

---

## Section: Chapter 6 — Conclusion (§6.4 Future Enhancements)

### 📄 Current (from FYP_documentation.md)

> **Future Enhancement 1:** "RBAC Implementation: Add multi-user authentication with role-based access control (Admin, Analyst, Viewer) to support team-based security operations."
>
> **Future Enhancement 8:** "Scheduled Scanning: Enhance the Celery Beat scheduler to support user-configurable recurring scan schedules."

### 🔄 Updated Version

**Enhancement 1 is achieved** — RBAC is now fully implemented. Remove it from the future work list.

**Enhancement 8 is partially achieved** — Celery Beat is running (`celery_beat` service), and `croniter==3.0.3` is installed in `requirements.txt`. Remove the "scheduled scanning" item or reclassify as "user-facing schedule UI not yet exposed."

Replace with new future enhancement:

> **New Enhancement:** "SOAR Playbook Library: Expand the N8N SOAR integration with pre-built playbooks for common response actions (block IP, notify Slack, create Jira ticket, quarantine asset) so SME administrators can configure automated responses without N8N workflow expertise."

---

## ➕ New Sections (Not in Original Doc)

---

### NEW SECTION: Authentication & RBAC System

#### Overview

The platform implements a full JWT-based authentication system added during Phase 3.1 of the hardening plan.

#### Backend Implementation

**JWT Token Management (`app/core/security.py`):**
- `create_access_token()` — creates HS256-signed JWT with configurable expiry
- `hash_password()` / `verify_password()` — bcrypt-based password hashing (bcrypt==4.0.1)
- `get_current_user()` dependency used by all protected routes

**User Model (`app/models/user.py`):**

```python
class UserRole(str, enum.Enum):
    VIEWER  = "VIEWER"   # GET everything, no mutations
    ANALYST = "ANALYST"  # GET + trigger scans + update vuln status
    ADMIN   = "ADMIN"    # Everything + target CRUD + user management

class User(Base):
    id                   = Column(String(36), PK, UUID v4)
    email                = Column(String(255), unique, indexed)
    password_hash        = Column(String(255))
    role                 = Column(Enum(UserRole), default=VIEWER)
    created_at           = Column(DateTime)
    last_login_at        = Column(DateTime, nullable)
    force_password_change = Column(Boolean, default=False)
    disabled             = Column(Boolean, default=False)
```

**Auth Endpoints (`/api/v1/auth`):**

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/login` | POST | No | Returns JWT + role + force_password_change flag |
| `/auth/logout` | POST | Yes | Stateless no-op (client discards token) |
| `/auth/me` | GET | Yes | Returns current user profile |
| `/auth/change-password` | POST | Yes | Change own password |

**RBAC Endpoints (`/api/v1/rbac`, Admin only):**

| Endpoint | Method | Description |
|---|---|---|
| `/rbac/users` | GET | List all users |
| `/rbac/users` | POST | Create a new user |
| `/rbac/users/{id}/role` | PATCH | Change a user's role |
| `/rbac/users/{id}/disable` | POST | Soft-disable a user's login |

#### Frontend Implementation

- **`AuthContext`** stores token in `sessionStorage` (not `localStorage`) to limit XSS token-theft risk; tokens clear on browser tab close.
- **`ProtectedRoute`** wraps the entire dashboard; unauthenticated requests redirect to `/login`.
- **`RoleGuard`** component renders children only when `user.role` matches the required role; used to hide admin-only UI sections.
- **`LoginPage`** provides a cybersecurity-themed login form with error handling and force-password-change detection.
- **`SettingsPage`** provides account management (change password, logout) and admin user table.

#### Seeding the Initial Admin

`backend/seed_user.py` creates the initial admin user. The default credentials are stored in `backend/.env`.

---

### NEW SECTION: Compliance Framework Tagging (Findings API)

#### Overview

Added during Phase 5.3 of the hardening plan. The Findings API provides a deduplicated, compliance-aware view of vulnerabilities, mapping each finding to control IDs from five security frameworks.

#### Backend Implementation

**`Finding` ORM Model:**
- Aggregates one or more `Vulnerability` records into a single deduplicated finding
- `control_tags` (JSON) stores framework control IDs:
  - `owasp_top10` — e.g., `"A03:2021"` (Injection)
  - `cwe` — e.g., `"CWE-89"` (SQL Injection)
  - `iso27001_annex_a` — e.g., `"A.12.6.1"`
  - `nist_csf_function` — e.g., `"DETECT"`, `"RESPOND"`
  - `pci_dss_requirement` — e.g., `"6.3.2"`

**`framework_tagger.py`:**
Reads `backend/app/data/control_mappings.json` and automatically assigns control IDs to findings based on vulnerability type.

**`/api/v1/findings` Query Parameters:**

| Parameter | Description |
|---|---|
| `framework` | Filter by framework (`iso27001`, `owasp_top10`, `cwe`, `nist`, `pci_dss`) |
| `control` | Specific control ID to match |
| `scan_id` | Only findings observed in this scan |
| `status` | FindingStatus filter (`open`, `fixed`, `accepted`, etc.) |
| `limit` / `offset` | Pagination (default 50, max 200) |

#### Use Case

An SME preparing for a PCI DSS audit can query `GET /api/v1/findings?framework=pci_dss&status=open` to get a filtered list of all open findings that map to PCI DSS requirements, ready for inclusion in an audit report.

---

### NEW SECTION: SOAR Integration (N8N)

#### Overview

The platform optionally integrates with **N8N**, an open-source workflow automation tool, to trigger automated security response playbooks when critical events are detected. This capability is disabled by default (`SOAR_ENABLED=false`) and requires the `--profile full` Docker Compose flag.

#### Architecture

```
Scan Event / Alert
    → SOAROrchestrator.trigger_playbook(playbook_id, action, data)
    → POST https://n8n:5678/webhook/{playbook_id}
    → N8N Workflow Execution
    → Response Action (e.g., block IP, send Slack alert, create ticket)
```

#### Backend (`app/services/soar_orchestrator.py`)

```python
class SOAROrchestrator:
    async def trigger_playbook(
        self,
        playbook_id: str,   # N8N webhook path
        action: str,        # Human-readable action name
        data: dict          # Contextual data (IP, vuln_id, severity, etc.)
    ) -> bool
```

Sends a structured JSON payload to the N8N webhook URL. Returns `True` on HTTP 200/201, `False` on failure. All errors are logged but do not propagate to the calling scan pipeline.

#### Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `N8N_WEBHOOK_URL` | `http://n8n:5678/webhook/` | Base URL for N8N webhooks |
| `SOAR_ENABLED` | `false` | Master toggle for SOAR integration |

---

### NEW SECTION: Audit Chain Verification

#### Overview

Added during Phase 5.1 of the hardening plan. Every `AgentLog` record is linked in a SHA-256 hash chain, creating a tamper-evident audit trail for all agent actions during a scan.

#### How It Works

1. When each `AgentLog` row is created, a SHA-256 hash is computed over: `(prev_hash || agent_name || action || reasoning || input_data || output_data || timestamp)`.
2. This hash is stored in the row's `this_hash` field; the previous row's `this_hash` becomes `prev_hash` for the next row.
3. The verification endpoint recomputes the chain from scratch and checks that each stored hash matches.

#### Verification Endpoint

```
GET /api/v1/scans/{scan_id}/audit/verify
```

**Response:**
```json
{
  "valid": true,
  "broken_at": null,
  "chain_length": 42,
  "scan_id": "abc-123"
}
```

If a database administrator tampers with a row, `broken_at` will contain the ID of the first invalid log entry.

#### Academic Significance

This feature directly supports the academic claim that all agent actions are deterministic and attributable. A valid chain proves that no agent log was modified after scan completion, providing forensic integrity guarantees for security assessments.

---

### NEW SECTION: ScopeGuard — Out-of-Scope Scan Prevention

#### Overview

Added during Phase 2.4 of the hardening plan. The `ScopeGuard` enforces a per-target allowlist for all outbound HTTP requests made by scanner agents, preventing:
- **Legal risk:** following open redirects to third-party domains outside the scanning target
- **Operational risk:** accidentally scanning infrastructure beyond the authorized scope

#### Implementation (`app/services/scope_guard.py`)

```python
guard = ScopeGuard(scope_allowlist=["example.com", "10.0.0.0/8"])
guard.assert_in_scope("http://example.com/admin")   # passes
guard.assert_in_scope("http://evil.com/redirect")   # raises ScopeViolation
```

When `scope_allowlist` is `None`, the guard derives scope from the scan target's `base_url` (only the target's own hostname is allowed). This is the correct default for a single-URL scan.

`ScopeViolation` exceptions are caught by the calling agent and logged as `scope_violation` agent log entries rather than aborting the scan.

---

### NEW SECTION: CVSS v3.1 Calculator

#### Overview

The platform now includes a full implementation of the CVSS v3.1 base and environmental score formula (`app/services/cvss.py`), conforming to the FIRST specification.

#### Usage

```python
from app.services.cvss import base_score, environmental_score, parse_vector

# Parse a Nuclei-provided CVSS vector
vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
bs  = base_score(vec)                         # → 10.0 (Critical)
es  = environmental_score(
          vec,
          asset_value="CRITICAL",
          data_sensitivity="PII",
          exposure="external"
      )                                       # → adjusted environmental score
```

#### Relationship to UnifiedRiskEngine

These are **two distinct scoring systems**:

| System | Purpose | Formula |
|---|---|---|
| CVSS v3.1 Calculator | Per-vulnerability standard score | Official FIRST formula |
| UnifiedRiskEngine | Platform-level risk/health scores | Custom penalty-weight model (Tables 3.6/3.7) |

CVSS scores are attached to individual `Finding` records for compliance reporting. The UnifiedRiskEngine scores remain the primary dashboard KPI metrics.

---

### NEW SECTION: Living Lab API

#### Overview

The Living Lab API provides programmatic management of the `docker-compose.lab.yml` simulation environment from within the dashboard itself, eliminating the need to run Docker CLI commands manually.

#### Endpoints (`/api/v1/lab`)

| Endpoint | Method | Description |
|---|---|---|
| `/lab/status` | GET | Returns container states, network info, and Elasticsearch telemetry stats |
| `/lab/seed` | POST | Registers all HTTP-accessible lab targets in the database (idempotent — skips existing) |
| `/lab/events` | GET | Fetches recent lab events from Elasticsearch (filterable by category: web, dns, database, suspicious) |

#### Frontend

`LabEnvironment.jsx` and `EnvironmentWizard.jsx` provide a GUI for:
- Viewing container health status
- One-click target seeding
- Browsing live event telemetry from lab targets

---

## ❓ Questions / Needs Clarification

1. **`lab.py` not registered in `api.py`:** `backend/app/api/v1/endpoints/lab.py` exists but is not included in `backend/app/api/api.py`. Is the `/lab` endpoint disabled intentionally, or was it accidentally omitted from the router registration?

2. **API internal name:** `api.py` root returns `{"message": "PentesterFlow API is running", "version": "2.0"}`. The project was described throughout the FYP as "Orchestration Security Center." Is "PentesterFlow" an internal development name, a rebrand, or an error? The FYP submission should use consistent naming.

3. **`AlembicMigrations`:** `backend/alembic/` exists but it is unclear whether all new models (`User`, `Finding`, `Report`, `RuntimeConfig`) have corresponding migration scripts, or whether `init_db.py` creates tables via `Base.metadata.create_all()` at startup. For academic submission, clarify which approach is authoritative.

4. **Test coverage for new features:** `backend/tests/` contains `test_auth.py`, `test_auth_flow.py`, `test_rbac.py` — these should be incorporated into the testing chapter (Chapter 5) test case tables. The original Tables 5.1 and 5.2 do not include any auth/RBAC test cases.

5. **`google-genai` API surface:** The new `google-genai` SDK has a different import path and method names compared to `google-generativeai`. The code snippet in §4.3.2 uses `genai.configure()` and `genai.GenerativeModel()` which are from the old SDK. Verify the actual import style used in `agent_orchestrator.py` matches the installed package.
