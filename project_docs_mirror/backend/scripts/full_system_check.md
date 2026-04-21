# backend/scripts/full_system_check.py — Documentation

## File Purpose

A **comprehensive system health verification script** that validates the end-to-end connectivity and functionality of all Orchestration Security Center platform components before a demonstration or deployment. Provides a clear pass/fail status for each system component.

## Key Functions

### `check_backend()`
Sends `GET http://localhost:8000/` and verifies a 200 response with the expected welcome message. Returns `True` on success.

### `check_database()`
Sends `GET http://localhost:8000/api/v1/targets/` and verifies that the endpoint is reachable (indicating database connectivity is working). Returns `True` on success.

### `check_redis()`
Uses the `redis` Python library to connect to Redis and call `ping()`. Returns `True` if Redis responds.

### `check_celery()`
Sends a test task to Celery using `celery_app.control.inspect().active_queues()` and verifies a response. Returns `True` if at least one worker is active.

### `check_openvas()`
Attempts to connect to OpenVAS on port 9390 using a TCP socket. Returns `True` if the port is open.

### `check_elasticsearch()`
Calls `GET http://localhost:9200/_cluster/health` and verifies the cluster status is `green` or `yellow`. Returns `True` on reachable state.

### `check_wazuh()`
Calls the Wazuh API health endpoint. Returns `True` if the API responds.

### `run_all_checks()`
Runs all check functions in sequence and prints a formatted report to the console with a ✓ or ✗ for each component. Exits with code 1 if any critical check fails (backend, database, redis).

## Dependencies

### External
- `requests` — For HTTP health checks
- `redis` — For Redis connectivity check
- `socket` — For TCP port check
