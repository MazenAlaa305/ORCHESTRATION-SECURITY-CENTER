# lab_setup.ps1 — Documentation

## File Purpose

A PowerShell automation script that performs the complete, one-command initialization of the Found 404 lab environment. It is designed to be run once on the host machine before any scanning demonstrations. It handles Docker network creation, container orchestration, database seeding, and health verification.

## Key Functions / Logic Blocks

### Docker Network Creation
Checks whether the `the-dashboard-project-_lab_network` Docker bridge network exists. If it does not, creates it using `docker network create`. This shared network allows the main application containers (backend, celery workers) and the vulnerable lab target containers to communicate.

### Stack Startup
Starts both Docker Compose stacks in sequence:
1. First starts the main application stack (`docker-compose.yml`) — bringing up the backend, frontend, database, Redis, and supporting services.
2. Then starts the lab target stack (`docker-compose.lab.yml`) — bringing up the vulnerable containers.
Uses `docker compose up -d` (detached mode) for both.

### Health Polling
After starting both stacks, polls the backend's API root endpoint (`GET http://localhost:8000/`) with a retry loop (typically 30 retries with 5-second delays). This ensures the backend is fully initialized and database tables are created before proceeding to the seeding step.

### Database Seeding
Once the backend is confirmed healthy, sends HTTP `POST` requests to `http://localhost:8000/api/v1/targets/` to register the vulnerable lab applications as scan targets. Creates entries for:
- `juiceshop` at `http://juiceshop:3000`
- Other configured lab targets

### Verification
Prints a final status summary showing the running containers, their port mappings, and the URLs to access the frontend dashboard and OpenVAS web UI.

## Dependencies

- **External Tools**: Docker CLI (`docker`), PowerShell with `Invoke-RestMethod` / `Invoke-WebRequest`.
- **Depends on**: `docker-compose.yml`, `docker-compose.lab.yml`.
- **Interacts with**: Backend REST API (`/api/v1/targets/`).
