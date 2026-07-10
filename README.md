# Orchestration Security Center

A deterministic cybersecurity orchestration dashboard for Small and Medium Enterprises (SMEs).

Final Year Project, Helwan International Technological University.

[![Status](https://img.shields.io/badge/status-active-success)]()
[![License](https://img.shields.io/badge/license-Academic-blue)]()
[![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-informational)]()

## Overview

Orchestration Security Center unifies open-source security tools into one analyst-friendly platform. It chains Nmap, Nuclei, OpenVAS, SIEM, SOAR, and optional AI guidance into a deterministic pipeline that discovers assets, validates findings, scores risk, and produces audit-ready reports.

The project is designed for SMEs that need practical vulnerability management without the cost and operational complexity of enterprise SIEM/SOAR products.

## Key Capabilities

| Area | Capability |
|---|---|
| Authentication | JWT authentication, role-based access control, user management, audit trails |
| Scanning | Recon, attack, validation, and risk-scoring pipeline |
| Tool orchestration | Service-aware chaining across Nmap, Nuclei, and OpenVAS |
| Risk management | Business-facing risk and health scores with severity breakdowns |
| Vulnerability workflow | Finding states, false-positive handling, revalidation, and remediation tracking |
| Visualization | Real-time dashboard, vulnerability trends, topology graph, and operational feed |
| AI advisory | Optional Gemini-based remediation guidance with graceful fallback |
| SIEM/SOAR | Wazuh, Elasticsearch, Kibana, and n8n integration support |
| Reporting | Signed PDF and JSON exports for scan evidence and audit review |
| Lab environment | Vulnerable Docker lab across isolated simulated subnets |

## Screenshots

Screenshots below are captured from the final project presentation.

| Title | Login | Topology |
|---|---|---|
| ![Presentation title slide](docs/screenshots/presentation-title.png) | ![Login page slide](docs/screenshots/presentation-login.png) | ![Network topology slide](docs/screenshots/presentation-topology.png) |

| Full report | Analyst profile |
|---|---|
| ![Report generation slide](docs/screenshots/presentation-report.png) | ![Analyst profile slide](docs/screenshots/presentation-profile.png) |

## Technology Stack

**Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, D3.js, Recharts, React Router, React Query, Zustand, Vitest.

**Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic, Celery, Redis, PostgreSQL, JWT authentication, and pytest.

**Security and infrastructure:** Nmap, Nuclei, OpenVAS/GVM, Wazuh, Elasticsearch, Kibana, n8n, Docker Compose, Caddy, and CoreDNS.

## Project Structure

```text
.
|-- backend/                 FastAPI application, services, models, migrations, tests
|-- frontend/                React and Vite dashboard
|-- infra/                   Caddy, isolation, and OpenVAS infrastructure files
|-- lab/                     Vulnerable lab containers and scenarios
|-- lab_config/              Lab bootstrap configuration
|-- postman/                 API collection
|-- tests/                   End-to-end test suite
|-- all_tests/               Extended backend and frontend tests
|-- docs/screenshots/        README screenshots
|-- docker-compose.yml       Main application stack
|-- docker-compose.lab.yml   Vulnerable lab stack
|-- start-lite.ps1/.sh       Lite stack launcher
|-- start-full.ps1/.sh       Full stack launcher
|-- stop-all.ps1/.sh         Shutdown scripts
|-- TEAM_PLAN.md             Team roles and responsibilities
|-- TECHNICAL_NOTES.md       Architecture and implementation notes
|-- FYP_Documentation.md     Full academic documentation
|-- FYP_Figures.md           Figure catalogue
`-- Orchestration_Security_Center_Presentation.pptx.pdf
```

## Quick Start

### Prerequisites

- Docker Desktop with Docker Compose v2
- PowerShell 5.1+ on Windows or Bash on Linux/macOS
- 16 GB RAM minimum for Lite mode
- 32 GB RAM recommended for Full mode
- 20 GB free disk space

### Lite Mode

```powershell
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
```

```bash
bash start-lite.sh
```

Open `https://localhost` and accept the local development certificate warning.

### Full Mode

```powershell
powershell -ExecutionPolicy Bypass -File .\start-full.ps1
```

Full mode enables heavier integrations such as OpenVAS, SIEM, and SOAR components.

### Manual Docker Compose

```bash
docker network create the-dashboard-project-_lab_network
docker compose up -d --build
docker compose -f docker-compose.lab.yml up -d
```

## Service Ports

| Service | Port | URL |
|---|---:|---|
| Frontend dev server | 5173 | `http://localhost:5173` |
| Backend API | 8000 | `http://localhost:8000/docs` |
| Caddy | 80 / 443 | `https://localhost` |
| PostgreSQL | 5432 | Internal |
| Redis | 6379 | Internal |
| Elasticsearch | 9200 | `http://localhost:9200` |
| Kibana | 5601 | `http://localhost:5601` |
| n8n | 5678 | `http://localhost:5678` |

## Configuration

Configuration is loaded from the project-root `.env` file. Do not commit real secrets.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis broker URL |
| `JWT_SECRET` | Token signing secret |
| `CREDENTIAL_ENCRYPTION_KEY` | Encryption key for stored credentials |
| `GEMINI_API_KEY` | Optional AI advisory key |
| `OPENVAS_HOST`, `OPENVAS_PORT`, `OPENVAS_ENABLED` | OpenVAS integration settings |
| `ELASTICSEARCH_URL`, `SIEM_ENABLED` | SIEM integration settings |
| `WAZUH_API_URL`, `WAZUH_API_USER`, `WAZUH_API_PASSWORD` | Wazuh API credentials |
| `N8N_WEBHOOK_URL`, `SOAR_ENABLED` | SOAR webhook settings |
| `LAB_ENABLED`, `LAB_COMPOSE_FILE`, `LAB_NETWORK_NAME` | Lab environment settings |

Optional integrations fail gracefully when disabled.

## Testing

```bash
pytest backend/tests/ -v --cov=backend/app
npm --prefix frontend test
python run_tests.py
```

Postman collection: `postman/OrchestrationSecurityCenter_API.postman_collection.json`.

## Quality Notes

- Deterministic scanner orchestration with service-aware tool selection.
- Isolated vulnerable lab networks for safe demonstrations and repeatable testing.
- Signed PDF and JSON reporting for audit evidence.
- Backend, frontend, and end-to-end test suites are kept in version control.
- Secrets are loaded from environment configuration and should not be committed.

## Documentation

| File | Purpose |
|---|---|
| [TEAM_PLAN.md](TEAM_PLAN.md) | Team ownership, roles, responsibilities, and onboarding notes |
| [TECHNICAL_NOTES.md](TECHNICAL_NOTES.md) | Architecture, API, data model, and operational notes |
| [FYP_Documentation.md](FYP_Documentation.md) | Academic project documentation |
| [FYP_Figures.md](FYP_Figures.md) | Figure list and capture guidance |
| [Orchestration_Security_Center_Presentation.pptx.pdf](Orchestration_Security_Center_Presentation.pptx.pdf) | Final presentation PDF |

## Team

Eleven members across leadership, backend, AI, frontend, visualization, scanning, QA, and documentation tracks. Full ownership details are maintained in [TEAM_PLAN.md](TEAM_PLAN.md).

## License

Academic project, Helwan International Technological University. All rights reserved by the project team. External reuse requires written permission from the team lead.