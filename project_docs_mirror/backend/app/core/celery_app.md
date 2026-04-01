# celery_app.py — Documentation

## File Purpose

Instantiates and configures the **Celery distributed task queue**, connecting it to Redis as both the message broker and the result backend. Also defines the Celery Beat periodic task schedule, enabling automated hourly network scans without any user intervention.

## Key Components

### `celery_app = Celery(...)`

Creates the Celery application instance with:
- **Name**: `"worker"` — the application name used in log messages and task routing.
- **`broker`**: Set to `settings.REDIS_URL` — Redis acts as the message broker, receiving and distributing task messages from the FastAPI backend to worker processes.
- **`backend`**: Also set to `settings.REDIS_URL` — Redis stores task results (status, return values, exceptions) so callers can poll for completion.
- **`include`**: `['app.services.scan_tasks']` — Explicitly registers the `scan_tasks` module so Celery discovers the `run_scan_task` and `trigger_periodic_scan` tasks at worker startup.

### `celery_app.conf.beat_schedule`

Configures the **Celery Beat** periodic task schedule. Defines one scheduled job:

**`"hourly-network-scan"`**
- **Task**: `app.services.scan_tasks.trigger_periodic_scan` — The Celery task function to execute.
- **Schedule**: `crontab(minute=0)` — Runs once per hour, at the top of every hour (XX:00).
- **Args**: `("localhost",)` — Passes `"localhost"` as the target to scan, meaning the host machine running the containers is periodically assessed for open ports and new services.

This periodic scan is executed by the `celery_beat` Docker service running in parallel with the `celery_worker` service. The beat scheduler is responsible only for enqueuing the task; the worker processes it.

## Dependencies

### Internal
- `app.core.config.settings` — Provides `REDIS_URL` for broker and backend configuration

### External
- `celery.Celery` — The distributed task queue framework
- `celery.schedules.crontab` — Cron-expression-based scheduling helper
