# Found 404 - Execution and Lab Guide

This guide provides the official instructions for running the **Found 404** dashboard, its integrated security lab environment, and the automated scanning scripts.

> [!IMPORTANT]
> **Docker Desktop must be running.**
> My initial checks indicate that the Docker daemon is currently stopped. Please start Docker Desktop before starting these steps.

## Quick Start (Step-by-Step)

### 1. Initialize the Lab Network
Create the external communication bridge required by both the dashboard and the lab containers.
```powershell
docker network create the-dashboard-project-_lab_network
```

### 2. Launch the Main Dashboard
Start all core architecture services (Backend, Frontend, Database, Redis, Celery, OpenVAS, Wazuh, etc.).
```powershell
docker compose up -d
```
*Wait about 30-60 seconds for the backend and database to fully initialize.*

### 3. Deploy the Lab Environment
Bring up the 6 vulnerable target containers (Juice Shop, Redis, API Gateway, etc.) using the Lab Manager script.
```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 start
```

### 4. Seed the Targets
Register the lab targets into the dashboard’s database so they can be discovered by the security agents.
```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 seed
```

### 5. Run Initial Security Scans
Execute the scanning script to trigger AI-driven discovery and vulnerability analysis across all targets.
```powershell
powershell -ExecutionPolicy Bypass -File .\trigger_lab_scans.ps1
```

---

## Service Access URLs

| Component | URL | Purpose |
| :--- | :--- | :--- |
| **User Dashboard** | [http://localhost:5173](http://localhost:5173) | Main SME security interface |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger API docs |
| **Juice Shop Target** | [http://localhost:3000](http://localhost:3000) | Vulnerable web application target |

---

## Lab Management Commands

### Check Environment Status
Verify if all containers and targets are healthy.
```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status
```

### Stream Container Logs
Follow the live logs for a specific service.
```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 logs
```

### Full System Cleanup
Stop all services and remove existing containers.
```powershell
docker compose down
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 stop
```

### Reset Labs (Fresh Start)
Wipe all volumes and database records for a completely clean re-run.
```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 reset
```

---

## Troubleshooting Guide

> [!CAUTION]
> **PowerShell Execution Policy**
> If you get "scripts are disabled" errors, always use the `-ExecutionPolicy Bypass` flag as shown throughout this guide.

- **500 Internal Server Error**: Usually means the backend is still starting or the database is not ready. Wait 30 seconds and refresh.
- **Nuclei Scan Timeouts**: If deep scans are taking too long, check your Docker RAM allocation (minimum 4GB recommended).
- **Target Not Reachable**: Ensure the `the-dashboard-project-_lab_network` was created correctly in step 1.
