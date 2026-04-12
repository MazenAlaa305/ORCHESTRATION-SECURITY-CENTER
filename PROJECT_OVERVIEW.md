# Found 404 — Complete Project Overview

> **An AI-assisted, deterministic cybersecurity orchestration platform for Small and Medium Enterprises (SMEs).**
> Graduation project — Team of 11 | Team Leader: Omar Kapil

---

## Table of Contents

1. [What is Found 404?](#what-is-found-404)
2. [The Problem It Solves](#the-problem-it-solves)
3. [Architecture Overview](#architecture-overview)
4. [Technology Stack](#technology-stack)
5. [Backend — Deep Dive](#backend--deep-dive)
6. [Frontend — Deep Dive](#frontend--deep-dive)
7. [Lab Environment](#lab-environment)
8. [The 4-Stage Scan Pipeline](#the-4-stage-scan-pipeline)
9. [Risk Scoring System](#risk-scoring-system)
10. [AI Advisory Role](#ai-advisory-role)
11. [SIEM Integration](#siem-integration)
12. [Docker Services Map](#docker-services-map)
13. [Database Schema](#database-schema)
14. [Team Structure](#team-structure)

---

## What is Found 404?

Found 404 is a **deterministic cybersecurity orchestration dashboard** built for IT administrators at SMEs who need professional-grade threat visibility without a dedicated Security Operations Center (SOC). It chains multiple open-source security tools together automatically, scores risk in business terms, and presents everything in a single unified dashboard.

The name "Found 404" is a play on the HTTP 404 error — the system finds the vulnerabilities that other tools miss or bury in noise.

---

## The Problem It Solves

SMEs face a "protection gap":
- They lack the budget for a full SOC
- Existing tools generate hundreds of raw alerts with little context
- IT admins spend hours manually correlating Nmap output, Nuclei results, and SIEM logs
- CVSS scores don't translate into business impact

**Found 404's answer: Deterministic Orchestration.**

Instead of firing every test at every target, Found 404 uses a rule-based chaining engine. When Nmap finds port 445 open, it runs SMB-specific Nuclei templates — not web SQL injection tests. When a vulnerability is confirmed, it generates a single, plain-language action item for the admin. The result: 1,000 raw logs become 5 prioritized action items.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│              React 18 + Vite  (localhost:5173)                   │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP REST + WebSocket
┌─────────────────────────▼────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
│                    (localhost:8000)                               │
│   ┌─────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│   │  REST API   │  │   WebSocket    │  │   /health endpoint  │  │
│   │  /api/v1/*  │  │   /ws/events   │  │   system status     │  │
│   └──────┬──────┘  └───────┬────────┘  └─────────────────────┘  │
│          │                 │                                       │
│   ┌──────▼─────────────────▼────────────────────────────────┐    │
│   │              AgentOrchestrator                          │    │
│   │   (the brain — 4-stage deterministic pipeline)          │    │
│   └──────┬───────────────────────────────────────────────────┘    │
└──────────│──────────────────────────────────────────────────────┘
           │ async tasks via Celery
┌──────────▼──────────────────────────────────────────────────────┐
│                    TASK QUEUE LAYER                              │
│         Redis (message broker) + Celery (workers)               │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                   SCANNING TOOLS                                 │
│   Nmap (ReconAgent)  →  Nuclei (AttackAgent)                    │
│   OpenVAS (deep CVE scans)  →  UnifiedRiskEngine (scoring)      │
└──────────┬──────────────────────────────────────────────────────┘
           │ results stored in
┌──────────▼──────────────────────────────────────────────────────┐
│                   DATA LAYER                                     │
│      PostgreSQL (primary DB)  +  SQLite (dev fallback)          │
└─────────────────────────────────────────────────────────────────┘
           │ logs & events forwarded to
┌──────────▼──────────────────────────────────────────────────────┐
│                   SIEM LAYER                                     │
│    Wazuh (EDR/IDS)  →  Elasticsearch  →  Kibana               │
└─────────────────────────────────────────────────────────────────┘
           │ automation via
┌──────────▼──────────────────────────────────────────────────────┐
│                   SOAR / AUTOMATION                              │
│                    n8n (workflow automation)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, Tailwind CSS | Dashboard UI |
| **Visualization** | D3.js, Recharts, Chart.js | Network topology, trend charts |
| **Backend** | FastAPI (Python 3.10) | REST API + WebSocket server |
| **Task Queue** | Celery + Redis | Async scan execution |
| **Database** | PostgreSQL (prod), SQLite (dev) | Persistent data storage |
| **ORM / Migrations** | SQLAlchemy + Alembic | Database models & migrations |
| **Recon** | Nmap | Network port discovery |
| **Vulnerability Scanning** | Nuclei | Template-based vuln detection |
| **Deep CVE Scanning** | OpenVAS/GVM | Comprehensive CVE database scans |
| **SIEM** | Wazuh + Elasticsearch + Kibana | Log aggregation & threat detection |
| **SOAR** | n8n | Workflow automation & playbooks |
| **AI Advisory** | Google Gemini 1.5 Flash | Risk explanation (advisory only) |
| **Infrastructure** | Docker + Docker Compose | Containerized deployment |
| **DNS** | CoreDNS | Lab internal name resolution |

---

## Backend — Deep Dive

### Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry, WebSocket manager, lifespan
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (env vars, API keys)
│   │   ├── database.py      # SQLAlchemy engine + SessionLocal
│   │   └── celery_app.py    # Celery configuration
│   ├── api/
│   │   └── v1/endpoints/
│   │       ├── dashboard.py     # KPI snapshot, risk refresh
│   │       ├── scans.py         # Create/list/get scans
│   │       ├── targets.py       # Target CRUD
│   │       ├── vulnerabilities.py  # Vulnerability data
│   │       ├── network.py       # Network asset discovery
│   │       ├── openvas.py       # OpenVAS scan management
│   │       ├── reports.py       # PDF report generation
│   │       ├── siem.py          # Wazuh/Elasticsearch queries
│   │       └── lab.py           # Lab environment management
│   ├── models/
│   │   └── scan.py          # SQLAlchemy: Scan, Vulnerability, ScanAsset,
│   │                        #             ActionItem, NetworkAsset, Recommendation
│   ├── schemas/
│   │   └── scan.py          # Pydantic request/response schemas
│   └── services/            # All business logic lives here
│       ├── agent_orchestrator.py   # 4-stage pipeline engine (CRITICAL)
│       ├── unified_risk_engine.py  # Risk Score + Health Score + ActionItems
│       ├── scan_tasks.py           # Celery task definitions
│       ├── discovery_agent.py      # Nmap-based network recon
│       ├── nmap_wrapper.py         # Nmap subprocess wrapper
│       ├── nuclei_wrapper.py       # Nuclei subprocess wrapper
│       ├── openvas.py              # OpenVAS API client
│       ├── intelligence_agent.py   # Gemini AI advisory
│       ├── elastic_integration.py  # Elasticsearch client
│       ├── wazuh_integration.py    # Wazuh REST API client
│       ├── infrastructure_agent.py # Infrastructure health monitoring
│       ├── asset_monitor.py        # Asset tracking & alerting
│       ├── soar_orchestrator.py    # SOAR workflow triggers
│       ├── pdf_generator.py        # PDF report generation
│       ├── lab_manager.py          # Lab container lifecycle
│       ├── ws_manager.py           # WebSocket connection management
│       └── event_publisher.py      # Redis pub/sub event broadcasting
├── alembic/                 # Database migrations
│   └── versions/            # 4 migration files
├── scripts/
│   ├── full_system_check.py # Health check script
│   └── simulate_attack.py   # Attack simulation for testing
├── tests/
│   ├── test_e2e_scans.py    # End-to-end scan tests
│   ├── test_risk.py         # Risk engine unit tests
│   └── test_risk_engine_manual.py
├── utils.py                 # Shared utility functions
├── requirements.txt         # Python dependencies
├── Dockerfile               # Python 3.10 + Nmap container
└── alembic.ini
```

### Key Services Explained

**`agent_orchestrator.py`** — The core engine. Manages the 4-stage pipeline: Recon → Targeted Chaining → Validation → Risk Scoring. Uses a `SERVICE_TO_TEMPLATE` map to deterministically route findings to the right Nuclei templates.

**`unified_risk_engine.py`** — Converts raw vulnerability data into two scores:
- **Risk Score (0–100):** Based on CVSS severity weights × asset criticality multiplier
- **Health Score (100–0):** Deductions for each critical/high vulnerability and dangerous open port

**`scan_tasks.py`** — Celery task definitions. Wraps the orchestrator in async-safe execution using `asyncio.new_event_loop()` to avoid conflicts inside Celery workers.

**`intelligence_agent.py`** — Advisory-only Gemini 1.5 Flash integration. Returns `risk_explanation`, `business_impact`, `remediation_advice`, and `response_priority`. Falls back gracefully when no API key is set.

---

## Frontend — Deep Dive

### Directory Structure

```
frontend/
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Root component, routing
│   ├── index.css            # Global styles
│   ├── gradient-styles.css  # Cyber gradient theme
│   ├── context/
│   │   ├── AuthContext.jsx        # Authentication state
│   │   └── RealTimeContext.jsx    # WebSocket state (scans, KPIs, logs)
│   ├── layout/
│   │   ├── Layout.jsx       # TopBar + Sidebar wrapper
│   │   └── Sidebar.jsx      # Navigation sidebar
│   ├── pages/
│   │   └── Dashboard.jsx    # Main dashboard page (tab controller)
│   ├── components/
│   │   ├── LoginPage.jsx    # Auth UI
│   │   ├── MetricCard.jsx   # Reusable metric display
│   │   ├── ReportGenerator.jsx
│   │   ├── SecurityAdvisor.jsx
│   │   ├── TabNavigation.jsx
│   │   ├── ToastProvider.jsx
│   │   ├── VulnerabilityList.jsx
│   │   ├── DeviceDetailModal.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── OpenVAS/         # OpenVAS-specific UI components
│   │   ├── dashboard/       # 26 dashboard panel components
│   │   │   ├── StatCards.jsx         # KPI metrics (top row)
│   │   │   ├── ScanButton.jsx        # Scan initiation + pipeline progress
│   │   │   ├── NetworkTopology.jsx   # D3.js interactive network graph
│   │   │   ├── VulnerabilitiesPanel.jsx
│   │   │   ├── VulnTrend.jsx         # Historical vulnerability chart
│   │   │   ├── RiskHeatmap.jsx       # Risk severity matrix
│   │   │   ├── RiskScore.jsx         # Gauge ring visualization
│   │   │   ├── UptimeGauge.jsx       # Health score gauge
│   │   │   ├── ActionCenter.jsx      # Action items list
│   │   │   ├── ActivityFeed.jsx      # Recent events
│   │   │   ├── AgentLogViewer.jsx    # Agent execution logs
│   │   │   ├── OrchestrationFeed.jsx # Real-time pipeline events
│   │   │   ├── ScanHistory.jsx       # Past scan results
│   │   │   ├── ScanPipelinePanel.jsx # 4-stage pipeline visual
│   │   │   ├── TargetsManager.jsx    # Target CRUD
│   │   │   ├── LabEnvironment.jsx    # Lab status display
│   │   │   ├── Reports.jsx           # Report viewer
│   │   │   ├── AssetDetailPanel.jsx  # Asset info + AI advice
│   │   │   ├── IncidentDetailDrawer.jsx
│   │   │   ├── LiveConsole.jsx       # Real-time console output
│   │   │   ├── UnifiedInbox.jsx      # Notifications inbox
│   │   │   └── ...
│   │   └── ui/              # Reusable UI primitives
│   │       ├── CyberButton.jsx
│   │       ├── CyberBadge.jsx
│   │       ├── GaugeRing.jsx
│   │       ├── SkeletonPulse.jsx
│   │       ├── SubTabBar.jsx
│   │       ├── Tabs.jsx
│   │       └── Toast.jsx
│   └── services/
│       └── api.js           # Axios client + all API service functions
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile               # Node 20 Alpine + Vite build
```

### Real-Time Data Flow

The `RealTimeContext.jsx` maintains a persistent WebSocket connection to `ws://localhost:8000/ws/events`. All components that need live data consume this context:

```
WebSocket Message → useReducer dispatch → context state update → re-render
```

Message types handled: `KPI_UPDATE`, `SCAN_STATUS`, `LOG_MESSAGE`, `ORCHESTRATION_EVENT`, `ASSET_UPDATE`

---

## Lab Environment

The lab is a self-contained, multi-subnet network of intentionally vulnerable Docker containers that simulates a realistic SME enterprise topology. It now spans **4 subnets and 10 active containers** across DMZ, Corporate, Data, and Management zones, used to demonstrate and test Found 404's scanning capabilities.

### Lab Target Personas

| Zone | Container Name | Hostname | Service / Ports | Vulnerabilities | CVSS |
|------|---------------|----------|-----------------|-----------------|------|
| `dmz` | `lab_webserver` | `webserver.sme-lab.local` | OWASP Juice Shop (`:3000`) | SQLi, XSS, BOLA, IDOR, broken-auth, SSRF | **9.5** |
| `dmz` | `lab_api_gateway` | `api-gw.sme-lab.local` | Nginx legacy API (`:8081`) | Info disclosure, header leak, directory listing, exposed Swagger | **6.0** |
| `dmz` | `lab_dns_server` | `dns.sme-lab.local` | CoreDNS (`:5353` udp/tcp) | DNS zone transfer, DNS amplification | **5.0** |
| `corp` | `lab_fileserver` | `fileserver.sme-lab.local` | Samba (`:1139`, `:4445`) | Weak credentials (`admin:admin123`), SMB enum, sensitive HR data exposure | **8.0** |
| `corp` | `lab_mailserver` | `mail.sme-lab.local` | GreenMail SMTP/POP3/IMAP (`:3025`, `:3110`, `:3143`, `:8082`) | Plaintext protocols, weak credentials, user enumeration | **7.0** |
| `corp` | `lab_workstation` | `ws01.sme-lab.local` | Nginx HR workstation (`:8083`) | Info disclosure, internal network leak | **4.0** |
| `data` | `lab_database` | `db.sme-lab.local` | PostgreSQL 13 (`:5433`) | Weak password (`password123`), no SSL, sensitive employee/financial data | **9.0** |
| `data` | `lab_redis_cache` | `cache.sme-lab.local` | Redis 6 (`:6380`) | No authentication, protected-mode disabled, cross-subnet reachable | **8.5** |

### Lab Support Services

| Zone | Container | Purpose |
|------|-----------|---------|
| `mgmt` | `lab_traffic_gen` | Generates realistic background traffic across all lab subnets for SIEM data |
| `mgmt` | `lab_log_shipper` | Ships lab events and traffic logs to Elasticsearch and Wazuh |

### Lab Network Topology

```
the-dashboard-project-_lab_network (external bridge)
│
├── dmz subnet (10.10.10.0/24) — Internet-facing services
│   ├── lab_webserver      10.10.10.10  → :3000   (Juice Shop)
│   ├── lab_api_gateway    10.10.10.20  → :8081   (Nginx legacy API)
│   └── lab_dns_server     10.10.10.30  → :5353   (CoreDNS)
│
├── corp subnet (10.10.20.0/24) — Internal office network
│   ├── lab_fileserver     10.10.20.10  → :1139, :4445  (Samba)
│   ├── lab_mailserver     10.10.20.20  → :3025, :3110, :3143, :8082
│   └── lab_workstation    10.10.20.40  → :8083   (HR workstation)
│
├── data subnet (10.10.30.0/24) — Database and cache tier
│   ├── lab_database       10.10.30.10  → :5433   (PostgreSQL)
│   └── lab_redis_cache    10.10.30.20  → :6380   (Redis)
│
└── mgmt subnet (10.10.40.0/24) — Monitoring & utilities
    ├── lab_traffic_gen    10.10.40.10  (multi-homed: dmz, corp, data)
    └── lab_log_shipper    10.10.40.20
```

---

## The 4-Stage Scan Pipeline

This is the core of Found 404. Initiated from the dashboard UI, the full pipeline runs asynchronously via Celery.

```
Stage 1: RECON (ReconAgent + Nmap)
   Target IP/hostname → Nmap scan → discovered ports & services
   → Stored in ScanAsset table

Stage 2: TARGETED CHAINING (AttackAgent + Nuclei)
   For each discovered service:
   - Port 80/443 → Nuclei web templates (SQLi, XSS, BOLA)
   - Port 445     → Nuclei SMB templates (enum, default-login)
   - Port 22/21   → Nuclei SSH/FTP default credentials
   - Port 6379    → Nuclei Redis unauthenticated access
   - Port 8080+   → Nuclei API/HTTP misconfiguration templates

Stage 3: VALIDATION (confidence filter ≥ 0.6)
   Filters out low-confidence findings before scoring
   → Reduces false positives without blocking true positives

Stage 4: RISK SCORING (UnifiedRiskEngine)
   For each confirmed vulnerability:
   - Calculates Risk Score (0–100) using CVSS × asset criticality
   - Calculates Health Score (100 → deductions)
   - Generates ActionItems: REMEDIATION | REVIEW | CONFIGURATION
   - Stores results → broadcasts via WebSocket → dashboard updates live
```

---

## Risk Scoring System

### Risk Score Formula

```
Risk Score = sum(severity_weight × occurrence) × asset_criticality_multiplier

Severity Weights:
  CRITICAL = 10.0
  HIGH     = 7.0
  MEDIUM   = 4.0
  LOW      = 1.5
  INFO     = 0.1

Asset Criticality Multipliers:
  database_server = 1.5x
  web_server      = 1.3x
  workstation     = 1.0x
  (normalized to 0–100 scale)
```

### Health Score Formula

```
Health Score = 100
  - (critical_count × 25)
  - (high_count × 15)
  - (dangerous_port_penalties)
  → clamped to 0–100
```

### Action Item Generation Rules

| Condition | Action Type | Priority |
|-----------|------------|----------|
| Critical or High vulnerability | `REMEDIATION` | Immediate |
| Medium vulnerability | `REVIEW` | Scheduled |
| Dangerous open port (22, 445, 3389, 6379) | `CONFIGURATION` | High |

---

## AI Advisory Role

Found 404 uses **Gemini 1.5 Flash** as a **Technical Educator**, not a decision-maker.

The AI does NOT make scan decisions. It only provides explanations after the deterministic engine has already scored the risk. For each top-3 critical asset, the `IntelligenceAgent` generates:

```json
{
  "risk_explanation": "Why this vulnerability is dangerous",
  "business_impact": "What it means for your business",
  "remediation_advice": "Exact steps to fix it",
  "response_priority": "immediate | scheduled | monitor"
}
```

This output is displayed in the `AssetDetailPanel` component under "SME Security Advisor". The system works fully without a Gemini API key — it falls back to generic advisory text.

---

## SIEM Integration

### Wazuh (EDR / IDS)
- Receives agent events from lab containers via `lab_log_shipper`
- Detects suspicious activity patterns (brute force, port scans)
- Alerts forwarded to the Found 404 dashboard via `wazuh_integration.py`

### Elasticsearch + Kibana
- Receives forwarded logs from Wazuh and direct lab container output
- Powers the "SIEM Events" tab in the dashboard
- Kibana available at `localhost:5601` for raw log exploration

### n8n (SOAR)
- Available at `localhost:5678`
- Pre-configured for remediation playbooks (e.g., auto-block IP on critical alert)
- Triggered by ActionItem events from the backend

---

## Docker Services Map

### Main Stack (`docker-compose.yml`)

| Service | Port | Purpose |
|---------|------|---------|
| `frontend` | 5173 | React dashboard UI |
| `backend` | 8000 | FastAPI + WebSocket server |
| `db` | 5432 | PostgreSQL database |
| `redis` | 6379 | Message broker for Celery |
| `celery_worker` | — | Background task worker |
| `openvas` | 9390 | OpenVAS vulnerability scanner |
| `elasticsearch` | 9200 | Log storage & search |
| `kibana` | 5601 | Log visualization |
| `wazuh` | 1514, 55000 | EDR / SIEM agent |
| `n8n` | 5678 | SOAR workflow automation |

### Lab Stack (`docker-compose.lab.yml`)

| Service | Subnet | Port(s) | Purpose |
|---------|--------|---------|---------|
| `lab_webserver` | dmz | 3000 | OWASP Juice Shop — primary web app target |
| `lab_api_gateway` | dmz | 8081 | Nginx legacy API with info disclosure |
| `lab_dns_server` | dmz | 5353 | CoreDNS with zone transfer / amplification |
| `lab_fileserver` | corp | 1139, 4445 | Samba with weak credentials |
| `lab_mailserver` | corp | 3025, 3110, 3143, 8082 | GreenMail SMTP/POP3/IMAP target |
| `lab_workstation` | corp | 8083 | HR workstation info disclosure |
| `lab_database` | data | 5433 | PostgreSQL with weak credentials |
| `lab_redis_cache` | data | 6380 | Unauthenticated Redis cache |
| `lab_traffic_gen` | mgmt | — | Background traffic simulation |
| `lab_log_shipper` | mgmt | — | Log forwarding to Elasticsearch/Wazuh |

---

## Database Schema

### Core Tables

```
Scan
  id, target, status, created_at, completed_at
  risk_score (0–100), health_score (0–100)
  agent_thoughts (JSON), scan_metadata (JSON)

ScanAsset
  id, scan_id → Scan
  ip_address, hostname, os_info
  open_ports (JSON), services (JSON)
  criticality, last_seen

Vulnerability
  id, scan_id → Scan, asset_id → ScanAsset
  title, description, severity (CRITICAL/HIGH/MEDIUM/LOW/INFO)
  cvss_score, cve_id, port, service
  confidence_score (0.0–1.0), validated, false_positive
  remediation, evidence

ActionItem
  id, scan_id → Scan
  action_type (REMEDIATION/REVIEW/CONFIGURATION)
  title, description, priority
  status (PENDING/IN_PROGRESS/COMPLETED)

NetworkAsset
  id, ip_address, mac_address, hostname, vendor
  device_type, os_info, open_ports (JSON)
  last_seen, is_active

Recommendation
  id, scan_id → Scan
  title, description, impact, effort
  category, status
```

---

## Team Structure

| Sub-Team | Members | Responsibility |
|----------|---------|----------------|
| **Backend & AI** | Reem Amin (lead), Yousef Abdel Hady, Mohamed Shaban | FastAPI, UnifiedRiskEngine, AI Advisory, Celery/Redis |
| **Frontend & Visualization** | Marize Ehap (lead), Omnia Helmy, Rahma Ebrahem | React dashboard, D3.js topology, component architecture |
| **Security & Scanning** | Shahd Paher (lead), Mariz Ehap | Nmap, Nuclei, OpenVAS, Wazuh, Elasticsearch |
| **DevOps & QA** | Omar Kapil (Team Leader + lead), Yosef Ali, Mazin Alla, Omar Tarek | Docker, CI/CD, testing, documentation, presentation |

---

*Last updated: April 12, 2026*
