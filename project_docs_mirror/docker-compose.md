# docker-compose.yml — Documentation

## File Purpose

This is the **primary production deployment manifest** for the Orchestration Security Center platform. It defines and orchestrates all 11 Docker containers that comprise the system, establishing their networking, resource limits, environment variable injection, and inter-service dependencies.

## Key Services Defined

### `backend`
The FastAPI application container. Built from `./backend/Dockerfile`. Exposes port `8000`. Depends on `db` and `redis` being healthy before starting. Receives all sensitive configuration (database URL, Redis URL, Gemini API key, OpenVAS credentials, Elasticsearch URL, Wazuh credentials) via environment variables injected at runtime. Connected to both the default Docker network and the isolated `lab_network` for accessing vulnerable lab targets.

### `frontend`
The React/Vite SPA container. Built from `./frontend/Dockerfile`. Exposes port `5173`. Depends on `backend`. Mounts the local `./frontend` directory as a volume with `node_modules` excluded, enabling live-reload in development.

### `db`
PostgreSQL 15 (Alpine variant) for persistent data storage. Resource caps are enforced: 1 CPU core, 1 GB RAM. The database is initialized with a user/password/db name from environment variables and data is persisted through a named volume `postgres_data`.

### `redis`
Redis 7 (Alpine variant) serving as both the Celery message broker and task result backend. Resource caps: 0.5 CPU, 256 MB RAM. Exposes port `6379`.

### `celery_worker`
A second instance of the backend Docker image, started with the Celery worker command instead of Uvicorn. Inherits all the same environment variables as the backend. Responsible for executing queued scan tasks asynchronously. Resource allocation: 1.5 CPUs, 1 GB RAM.

### `celery_beat`
A third instance of the backend image, started with the Celery beat command. Acts as the distributed scheduler, responsible for firing the periodic hourly network scan task defined in `celery_app.py`. Does not have resource limit overrides in this config.

### `openvas`
The `immauss/openvas` image providing the OpenVAS vulnerability scanner. Exposes GMP protocol on port `9390` and the web UI on port `9392`. Uses a custom entrypoint to fix permissions and remove stale lock files before starting. Persists scan data to the `gvm_data` named volume.

### `elasticsearch`
Elasticsearch 8.11.1 running in single-node mode with security (`xpack.security`) disabled for internal network use. JVM heap capped at 512 MB. Log/index data persisted to `elastic_data` volume.

### `kibana`
Kibana 8.11.1 for Elasticsearch log visualization. Connected to Elasticsearch via internal Docker DNS. Exposes port `5601`.

### `wazuh`
Wazuh SIEM manager 4.7.2. Exposes ports for agent connection (`1514`), agent enrollment (`1515`), and the Wazuh REST API (`55000`).

### `n8n`
The n8n workflow automation engine serving as the SOAR platform. Exposes port `5678`. Persists workflow definitions to the `n8n_data` volume.

## Networks

Two Docker networks are defined:
- **`default`**: Standard Docker bridge network for internal service communication.
- **`lab_network`**: An externally pre-created network (`the-dashboard-project-_lab_network`) that bridges the main application services to the vulnerable lab target containers.

## Dependencies

- **Internal**: All services depend on each other through Docker Compose `depends_on` directives (e.g., `backend` waits for `db` and `redis`).
- **External**: Relies on a `GEMINI_API_KEY` environment variable being present in the host shell (injected via `${GEMINI_API_KEY}` syntax).
- **Volumes**: `postgres_data`, `gvm_data`, `elastic_data`, `n8n_data` — all Docker-managed named volumes.
