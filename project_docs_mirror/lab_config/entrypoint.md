# lab_config/entrypoint.sh — Documentation

## File Purpose

A **shell script executed as the Docker container entrypoint** for one or more lab-related containers. Handles initialization tasks that must run before the main process starts — such as waiting for dependencies to be ready, running database migrations, or seeding initial data.

## Key Logic

### Dependency Wait Loop
Uses a `while` loop with `curl` or `nc` (netcat) to poll a dependency service (e.g., the PostgreSQL database or Redis) until it is responsive. Prevents the main process from starting before its dependencies are available — a common problem in `docker compose up` where services start concurrently.

### Database Migration Run
If applicable, executes `alembic upgrade head` to apply all pending database migrations before the Uvicorn server starts. Ensures the database schema is always up-to-date when the container starts.

### Environment Variable Validation
Checks for required environment variables (e.g., `DATABASE_URL`, `REDIS_URL`) and exits with an error message if any are missing, providing clearer failure reasons than silent crashes.

### Main Process Handoff
Uses `exec "$@"` at the end to hand off to the command specified in the Docker Compose file's `command` field (e.g., `uvicorn app.main:app ...`). Using `exec` ensures the main process receives Unix signals (SIGTERM, SIGINT) correctly from Docker, enabling graceful shutdowns.

## Dependencies

- **Shell**: `bash` or `sh`
- **Tools**: `curl`, `nc`, `alembic`
- **Environment**: Docker container runtime
