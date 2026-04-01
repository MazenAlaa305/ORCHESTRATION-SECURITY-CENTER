# Found 404 — Project Architecture Overview

## System Mission

**Found 404** is an AI-driven cybersecurity exposure dashboard designed for Small and Medium Enterprises (SMEs). Its core mission is to allow non-expert users to discover, scan, prioritize, and remediate vulnerabilities across web applications and network infrastructure — all from a single, unified interface. It combines traditional penetration testing tools (Nmap, Nuclei, OpenVAS) with generative AI (Google Gemini) to validate findings and reduce alert fatigue.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│           React 18 SPA (Vite + TanStack Query + Tailwind)        │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP REST + WebSocket
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                              │
│   /api/v1/  →  targets | scans | vulnerabilities | reports       │
│              dashboard | network | openvas | siem                │
│                                                                  │
│   WebSocket: /ws/logs  →  real-time scan log streaming           │
└──────┬──────────────┬───────────────────────────────────────────┘
       │              │
       ▼              ▼
  ┌─────────┐   ┌─────────────────────────────────────────────┐
  │PostgreSQL│   │           CELERY WORKERS                    │
  │  (ORM)  │   │  scan_tasks.py → agent_orchestrator.py      │
  │SQLAlchemy│  │                                              │
  └─────────┘   │  ┌────────┐ ┌─────────┐ ┌──────────────┐   │
                │  │ Recon  │→│ Attack  │→│ Validation   │   │
                │  │ Agent  │ │ Agent   │ │ Agent (LLM)  │   │
                │  └────────┘ └─────────┘ └──────────────┘   │
                │        ↓           ↓            ↓           │
                │  ┌─────────────────────────────────────┐    │
                │  │      SIEM Agent + Risk Engine         │   │
                │  └─────────────────────────────────────┘    │
                └──────────────────────────────────────────────┘
                            │
          ┌─────────────────┼───────────────────────┐
          ▼                 ▼                       ▼
     ┌─────────┐      ┌──────────┐           ┌──────────┐
     │  Redis  │      │  Nmap /  │           │  OpenVAS │
     │ (Queue) │      │ Nuclei   │           │  (DAST)  │
     └─────────┘      └──────────┘           └──────────┘
          │
          ├──────────────────────────────────┐
          ▼                                  ▼
   ┌──────────────┐                  ┌──────────────┐
   │Elasticsearch │                  │    Wazuh     │
   │ (SIEM Logs)  │                  │ (Log Agent)  │
   └──────────────┘                  └──────────────┘
          │
          ▼
   ┌──────────────┐
   │   n8n SOAR   │
   │  (Webhooks)  │
   └──────────────┘
```

---

## Component Breakdown

### 1. Frontend (React SPA)

**Location:** `frontend/src/`

The frontend is a single-page application built with React 18 and bundled with Vite. It communicates with the backend exclusively through a centralized Axios-based HTTP client (`services/api.js`) and real-time WebSocket connection for live log streaming.

**Key pages and components:**
- `pages/Dashboard.jsx` — the consolidated, tab-based master page
- `layout/Layout.jsx` + `layout/Sidebar.jsx` — global navigation shell
- `components/dashboard/` — 19 specialized panels (vulnerability list, scan history, network topology, agent logs, etc.)
- `components/ui/` — reusable primitive UI components (badges, buttons, gauges, toasts)
- `components/OpenVAS/` — OpenVAS-specific scan UI (risk chart, scheduler, vuln list)

**State management:**
- `@tanstack/react-query` for server-state caching and polling
- React Context (`AuthContext`) for authentication state
- Component-local state for UI interactions

---

### 2. FastAPI Backend

**Location:** `backend/app/`

The backend is a FastAPI application providing a versioned REST API at `/api/v1/`. It is responsible for:
- Receiving scan requests from the frontend
- Persisting all data to PostgreSQL via SQLAlchemy
- Dispatching scan jobs to Celery workers
- Streaming real-time logs via WebSocket

**Router hierarchy:**
```
app (FastAPI instance)
└── api_router (/api/v1)
    ├── /targets      — CRUD for scan targets
    ├── /scans        — Scan lifecycle + AI scan endpoint
    ├── /vulnerabilities — Vuln management + workflow
    ├── /reports      — PDF report generation
    ├── /network      — Network asset inventory
    ├── /dashboard    — Risk overview aggregation
    ├── /openvas      — OpenVAS scan integration
    └── /siem         — SIEM alert retrieval
```

---

### 3. Data Layer

**Location:** `backend/app/models/scan.py` + `backend/app/schemas/scan.py`

All persistent entities are defined as SQLAlchemy ORM models:

| Model | Description |
|---|---|
| `Target` | A registered web application or IP to scan |
| `Scan` | A scan session, linked to a target |
| `Vulnerability` | A discovered finding, linked to a scan |
| `AgentLog` | AI agent action log for full transparency |
| `Endpoint` | Discovered API endpoint on a target |
| `ScanAsset` | Network host discovered during infrastructure scan |
| `AssetService` | A running service on a discovered host |
| `NetworkAsset` | Persistent network inventory record |
| `ActionItem` | Remediation action generated from scan results |

Pydantic schemas in `schemas/scan.py` provide strict request validation and response serialization for the API layer.

---

### 4. AI Agent Pipeline

**Location:** `backend/app/services/agent_orchestrator.py`

The heart of the platform. When an AI scan (`POST /api/v1/scans/ai`) is triggered, the `AgentOrchestrator` coordinates a sequential pipeline of specialized agents:

| Agent | Role |
|---|---|
| `ReconAgent` | Crawls the target (Playwright/httpx), discovers endpoints, runs Nmap |
| `AttackAgent` | Tests endpoints with payloads (SQLi, XSS, BOLA, SSRF), maps Nuclei templates |
| `ValidationAgent` | Filters false positives using confidence thresholds + Gemini LLM |
| `SIEMAgent` | Pulls and analyzes Elasticsearch/Wazuh alerts, triggers SOAR actions |
| `ReportingAgent` | Compiles all findings into a structured final report |

Each agent logs every action to the `agent_logs` table, enabling full transparency and audit of the AI's reasoning chain.

---

### 5. Task Queue

**Location:** `backend/app/core/celery_app.py` + `backend/app/services/scan_tasks.py`

Celery with Redis as both broker and result backend handles:
- **On-demand scans**: triggered immediately via `.delay()` when a scan is created
- **Periodic scans**: `celery_beat` service runs an hourly network scan on `localhost` automatically

---

### 6. Security Tool Integrations

| Tool | Integration File | Function |
|---|---|---|
| Nmap | `services/nmap_wrapper.py` | Network port discovery, OS fingerprinting, service detection |
| Nuclei | `services/nuclei_wrapper.py` | Template-based CVE and misconfiguration scanning |
| OpenVAS | `services/openvas.py` | Full DAST vulnerability scanning via GMP protocol |
| Elasticsearch | `services/elastic_integration.py` | SIEM log querying and alert retrieval |
| Wazuh | `services/wazuh_integration.py` | Agent monitoring and security event collection |
| n8n | `services/soar_orchestrator.py` | Automated remediation playbook triggering via webhooks |

---

### 7. Deployment Infrastructure

**Location:** `docker-compose.yml` + `docker-compose.lab.yml`

The production stack is fully containerized. `docker-compose.yml` defines **11 services**:

| Service | Image / Source | Exposed Port |
|---|---|---|
| `backend` | Built from `./backend` | 8000 |
| `frontend` | Built from `./frontend` | 5173 |
| `db` | `postgres:15-alpine` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |
| `celery_worker` | Built from `./backend` | — |
| `celery_beat` | Built from `./backend` | — |
| `openvas` | `immauss/openvas` | 9390, 9392 |
| `elasticsearch` | `elasticsearch:8.11.1` | 9200 |
| `kibana` | `kibana:8.11.1` | 5601 |
| `wazuh` | `wazuh-manager:4.7.2` | 1514, 55000 |
| `n8n` | `n8nio/n8n` | 5678 |

The lab stack (`docker-compose.lab.yml`) adds intentionally vulnerable targets (e.g., OWASP Juice Shop) connected via an isolated `lab_network` Docker network for safe testing.

---

## Data Flow: End-to-End Scan Lifecycle

```
1. User clicks "Run AI Scan" in the React dashboard
   → POST /api/v1/scans/ai (with target_id or target_url)

2. FastAPI creates a Scan record (status: QUEUED) in PostgreSQL
   → Dispatches AgentOrchestrator as a BackgroundTask

3. ReconAgent runs
   → Crawls target with Playwright (or httpx fallback)
   → Runs Nmap on the host for infrastructure recon
   → Logs all actions to agent_logs table
   → Broadcasts progress to frontend via WebSocket (/ws/logs)

4. AttackAgent runs
   → Maps discovered services to Nuclei templates
   → Injects SQLi, XSS, BOLA, SSRF payloads concurrently
   → Saves raw findings as Vulnerability records (status: OPEN)

5. ValidationAgent runs
   → Applies confidence threshold (≥ 0.6 = valid)
   → Sends ambiguous findings to Gemini LLM for validation
   → Marks false positives in database (status: FALSE_POSITIVE)

6. SIEMAgent runs
   → Queries Elasticsearch for recent alerts
   → Queries Wazuh agent status
   → Triggers n8n SOAR playbooks for critical threats

7. Scan marked COMPLETED in PostgreSQL
   → Frontend polling via TanStack Query detects status change
   → Dashboard updates vulnerability counts, risk score, timeline
```

---

## Key Design Principles

- **AI-Augmented, Not AI-Dependent**: All agents degrade gracefully if the Gemini API key is absent, operating in a deterministic rule-based mode.
- **Dual-Mode Database**: Supports SQLite for local development and PostgreSQL for production without code changes.
- **Full Audit Trail**: Every agent action is persisted in `agent_logs` with input/output/reasoning — enabling complete traceability of the AI's decisions.
- **Backward Compatibility**: Legacy endpoints and field naming conventions are preserved alongside the new AI-powered API to avoid breaking existing integrations.
- **SME-First UX**: Vulnerability descriptions use simplified language; the dashboard presents prioritized action items over raw technical data.
