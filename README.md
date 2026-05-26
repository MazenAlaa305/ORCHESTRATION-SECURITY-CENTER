# Orchestration Security Center

> A deterministic cybersecurity orchestration dashboard for Small and Medium Enterprises (SMEs).
> Codename: **Found 404** — Final Year Project, Helwan Institute of Technology.

[![Status](https://img.shields.io/badge/status-active-success)]()
[![License](https://img.shields.io/badge/license-Academic-blue)]()
[![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-informational)]()

---

## Table of Contents

- [What is this?](#what-is-this)
- [Why this project exists](#why-this-project-exists)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Lab Environment](#lab-environment)
- [Screenshots / Demo](#screenshots--demo)
- [Documentation Map](#documentation-map)
- [Team](#team)
- [Contributing](#contributing)
- [License](#license)

---

## What is this?

**Orchestration Security Center** is a unified web dashboard that automatically chains multiple open-source security tools (Nmap, Nuclei, OpenVAS) through a **4-stage deterministic pipeline**, scores risk in **business terms (0–100)**, and presents findings with **AI-assisted remediation guidance**.

It is designed for SMEs that lack a dedicated Security Operations Center (SOC) and cannot afford enterprise SIEM/SOAR licenses.

---

## Why this project exists

Small and medium businesses face a **protection gap**:

- Enterprise security tools (Splunk, Qualys, Tenable) cost tens of thousands of dollars per year.
- Open-source tools (Nmap, Nuclei, OpenVAS) are free but require expert tuning.
- Most SMEs lack dedicated security staff — IT generalists are flooded with thousands of raw alerts.

This platform solves the gap by:

1. **Chaining tools intelligently** — Nmap finds port 445 open → only SMB-targeted Nuclei templates run (no web-SQLi noise).
2. **Translating CVSS into business impact** — A 0–100 *Risk Score* and complementary *Health Score* that non-security managers can act on.
3. **Explaining findings in plain language** — Optional Gemini AI advisor produces remediation steps a generalist IT admin can follow.
4. **Unifying signal sources** — Network scans, SIEM (Wazuh + Elasticsearch), and SOAR (n8n) in one dashboard.

---

## Key Features

| Area | Capability |
|---|---|
| **Authentication & RBAC** | JWT auth, 3 roles (VIEWER, ANALYST, ADMIN), full audit log |
| **Scanning Pipeline** | 4 stages: Recon → Attack → Validation → Risk Scoring |
| **Service-Aware Chaining** | Templates auto-selected per discovered service (reduces noise ~60–70%) |
| **Risk Scoring** | Risk (0–100) and Health (0–100) with business-context multipliers |
| **Vulnerability Workflow** | OPEN → IN_REVIEW → REMEDIATED → CLOSED; false-positive marking; revalidation probes |
| **Network Topology** | Interactive D3.js graph with per-asset detail panels |
| **AI Advisory** | Optional Gemini integration (advisory-only, graceful fallback) |
| **SIEM** | Wazuh + Elasticsearch + Kibana integration |
| **SOAR** | n8n webhook workflows (auto-block, ticket, notify) |
| **Reports** | Cryptographically signed PDF/JSON exports |
| **Real-Time** | WebSocket event stream (SCAN_STATUS, FINDING_ADDED, RISK_UPDATE …) |
| **Lab Environment** | 10 vulnerable Docker containers across 4 isolated subnets |

---

## Tech Stack

**Frontend**
- React 18 + Vite + JSX
- Tailwind CSS, Framer Motion
- D3.js, Recharts, Chart.js (visualizations)
- React Router v7, Axios, React Query v5, Zustand
- Vitest (unit testing)

**Backend**
- FastAPI (Python 3.10) on Uvicorn
- SQLAlchemy 2 + Alembic migrations
- Pydantic v2 (validation), python-jose + passlib[bcrypt] (auth)
- Celery + Redis (async tasks, pub/sub)

**Data & SIEM**
- PostgreSQL 15 (primary), SQLite (dev fallback)
- Elasticsearch + Kibana (log search/visualization)
- Wazuh (EDR / log collection)
- n8n (SOAR automation)

**Security Tools**
- Nmap (network discovery, service fingerprinting)
- Nuclei v3.3.8 (template-driven DAST)
- OpenVAS / GVM (CVE scanning)
- Google Gemini 1.5 Flash (optional advisory)

**Infrastructure**
- Docker + Docker Compose v2
- Caddy (TLS reverse proxy)
- CoreDNS (internal lab DNS)

---

## Project Structure

```
the-dashboard-project--main/
├── backend/                FastAPI app, services, models, Alembic migrations
│   ├── app/
│   │   ├── core/           Config, DB, Celery, security helpers
│   │   ├── api/v1/         REST endpoints (auth, scans, rbac, dashboard …)
│   │   ├── models/         SQLAlchemy ORM (Scan, User, Vulnerability, AuditLog …)
│   │   ├── schemas/        Pydantic request/response schemas
│   │   └── services/       Orchestration engine, scanners, integrations (~33 modules)
│   ├── tests/              Pytest unit + integration tests
│   ├── alembic/            DB migrations
│   └── Dockerfile
├── frontend/               React + Vite dashboard
│   ├── src/
│   │   ├── pages/          Top-level pages
│   │   ├── components/     26+ dashboard panels and shared UI
│   │   ├── context/        Auth + real-time WebSocket contexts
│   │   ├── services/       API client (Axios)
│   │   └── stores/         Zustand state stores
│   └── Dockerfile.prod
├── infra/
│   ├── caddy/              TLS reverse proxy config
│   ├── isolation/          Host firewall + Docker network isolation
│   └── openvas/            OpenVAS NVT sync script
├── lab/                    Vulnerable lab containers + scenarios
├── lab_config/             Lab-side bootstrap scripts
├── tests/                  Playwright + E2E test suite
├── all_tests/              Extended pytest suite
├── postman/                Postman API collection
├── docker-compose.yml      Main application stack
├── docker-compose.lab.yml  Lab vulnerability stack
├── start-lite.ps1 / .sh    Launch lite stack (≈3–4 GB RAM)
├── start-full.ps1          Launch full stack (OpenVAS + SIEM + SOAR)
├── stop-all.ps1 / .sh      Shutdown scripts
├── run_tests.py            Test runner entrypoint
├── README.md               This file
├── TEAM_PLAN.md            Team roles, responsibilities, Q&A
└── TECHNICAL_NOTES.md      Architecture decisions, API, data models
```

---

## Quick Start

### Prerequisites

- **Docker Desktop** (latest) with Docker Compose v2
- **PowerShell 5.1+** (Windows) or **Bash** (Linux/macOS)
- **16 GB RAM** minimum for Lite mode; **32 GB** recommended for Full mode
- **20 GB** free disk space

### Lite Mode (recommended first run)

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
```

```bash
# Linux / macOS
bash start-lite.sh
```

Then open **https://localhost** and accept the self-signed certificate.

### Full Mode (with OpenVAS + SIEM + SOAR)

```powershell
powershell -ExecutionPolicy Bypass -File .\start-full.ps1
```

### Manual Docker Compose

```bash
# 1. Create lab network (one-time)
docker network create the-dashboard-project-_lab_network

# 2. Build and start main stack
docker compose up -d --build

# 3. (Optional) Start vulnerable lab stack
docker compose -f docker-compose.lab.yml up -d
```

### Default Service Ports

| Service        | Port        | URL                                            |
|----------------|-------------|------------------------------------------------|
| Frontend (dev) | 5173        | http://localhost:5173                          |
| Backend (dev)  | 8000        | http://localhost:8000 — Swagger at `/docs`     |
| Caddy (prod)   | 80 / 443    | https://localhost                              |
| PostgreSQL     | 5432        | internal                                       |
| Redis          | 6379        | internal                                       |
| Elasticsearch  | 9200        | http://localhost:9200 (full mode)              |
| Kibana         | 5601        | http://localhost:5601 (full mode)              |
| n8n            | 5678        | http://localhost:5678 (full mode)              |

### Shutdown

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all.ps1
```

---

## Configuration

Configuration is loaded from a project-root `.env` file. **Do not commit real secrets.** Variable names (values redacted):

| Variable                       | Purpose                                            |
|--------------------------------|----------------------------------------------------|
| `DATABASE_URL`                 | PostgreSQL connection string                       |
| `REDIS_URL`                    | Redis broker URL                                   |
| `JWT_SECRET`                   | HS256 token signing secret (≥ 32 bytes)            |
| `CREDENTIAL_ENCRYPTION_KEY`    | Fernet key for stored credentials                  |
| `GEMINI_API_KEY`               | *Optional* Google Gemini key for AI advisor        |
| `OPENVAS_HOST` / `OPENVAS_PORT` / `OPENVAS_ENABLED` | OpenVAS server + feature flag |
| `ELASTICSEARCH_URL`            | Elasticsearch endpoint                             |
| `SIEM_ENABLED`                 | Toggle Wazuh + Elasticsearch features              |
| `WAZUH_API_URL` / `WAZUH_API_USER` / `WAZUH_API_PASSWORD` | Wazuh REST credentials   |
| `N8N_WEBHOOK_URL` / `SOAR_ENABLED` | n8n SOAR endpoint + feature flag                |
| `LAB_ENABLED` / `LAB_COMPOSE_FILE` / `LAB_NETWORK_NAME` / `LAB_DNS_SUFFIX` / `LAB_TRAFFIC_INTENSITY` | Lab settings |

All optional integrations (Gemini, OpenVAS, SIEM, SOAR) fail gracefully when disabled.

---

## Running Tests

```bash
# Backend unit + integration tests
pytest backend/tests/ -v --cov=backend/app

# Full E2E suite (Playwright)
pytest tests/ --headed

# One-shot runner
python run_tests.py

# Aggregated HTML report
python generate_test_report.py
```

Postman collection: `postman/OrchestrationSecurityCenter_API.postman_collection.json`

---

## Lab Environment

The platform ships with a self-contained vulnerable lab:

- **10 containers** spread across **4 simulated subnets**: DMZ, Corp, Data, Mgmt.
- Intentional vulnerabilities: SQLi (Juice Shop), XSS, BOLA, weak SMB credentials, default PostgreSQL password, unauthenticated Redis, DNS zone transfer, Nginx info leak.
- **Network isolation** is production-grade: lab Docker networks are marked `internal: true`, with host-level firewall rules (`iptables` on Linux, `netsh` on Windows) blocking lab → LAN egress.

Apply isolation rules (one-time):

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 apply
```

Pre-scripted scenarios live under `lab/scenarios/`.

---

## Screenshots / Demo

> Add screenshots under `docs/screenshots/` and reference them here.
> Demo recordings live under `demo/`.

Capture screenshots from a running instance (`https://localhost`) and place them next to this README.

---

## Documentation Map

| File | Purpose |
|---|---|
| [README.md](README.md) | This file — overview, setup, structure |
| [TEAM_PLAN.md](TEAM_PLAN.md) | Per-member roles, files owned, Q&A, recent updates |
| [TECHNICAL_NOTES.md](TECHNICAL_NOTES.md) | Architecture, API, data models, security, ops notes |

API reference is auto-generated at runtime: `http://localhost:8000/docs` (Swagger) and `/redoc`.

---

## Team

Eleven members across four sub-teams. Full responsibilities, file ownership, and onboarding Q&A are in [TEAM_PLAN.md](TEAM_PLAN.md).

| Sub-team | Members |
|---|---|
| **Leadership / DevOps** | Omar Kapil (Team Lead) |
| **Backend & AI Core** | Reem Ameen Mahmoud, Youssef Abdelhady, Mohamed Shaban |
| **Frontend & Visualization** | Omnia Helmy, Rahma Ibrahim |
| **Security & Scanning** | Shahd Baher Hussien, Mariz Ehab |
| **QA & Documentation** | Youssef Ali, Mazen Alaa, Omar Elshafey |

---

## Contributing

1. Branch from `main` using `feature/<area>-<short-name>` or `fix/<area>-<short-name>`.
2. Run `pytest backend/tests/` and `npm test` (frontend) before opening a PR.
3. Add or update tests for any new behavior.
4. Follow existing code conventions — no new top-level Markdown files (use `docs/` for additions).
5. PRs require review from the sub-team lead listed in [TEAM_PLAN.md](TEAM_PLAN.md).

---

## License

Academic project — Helwan Institute of Technology. All rights reserved by the project team. External reuse requires written permission from the team lead.
