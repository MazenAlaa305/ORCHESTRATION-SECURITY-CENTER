# scan_tasks.py — Documentation

## File Purpose

Defines **Celery task functions** that bridge the FastAPI web layer and the background worker processes. These tasks are the execution units dispatched to the Celery worker queue, decoupling scan processing from the HTTP request cycle.

## Key Functions

### `run_scan_task(scan_id)` — `@celery_app.task`
**Purpose:** The primary Celery task for legacy Nmap-based network scanning.

**Logic:**
1. Creates a synchronous SQLAlchemy session using `SessionLocal()`.
2. Retrieves the `Scan` record by `scan_id` and updates its status to `RUNNING`, recording `start_time = datetime.utcnow()`.
3. Extracts the scan target (from `target_url` or associated `Target.base_url`).
4. Instantiates `NmapWrapper` and calls `scan_target(target, scan_type)` to perform the network scan.
5. Processes the Nmap results: for each discovered host, creates a `ScanAsset` record and associated `AssetService` records.
6. Calls `UnifiedRiskEngine.calculate_risk()` on the collected assets and vulnerabilities to compute a composite risk score.
7. Saves all asset records and the risk score to the database, then marks the scan `COMPLETED`.
8. On any exception, catches the error, marks the scan `FAILED`, and re-raises to allow Celery to record the failure.

### `trigger_periodic_scan(target)` — `@celery_app.task`
**Purpose:** Celery Beat-scheduled task for automated hourly network assessment.

**Logic:**
1. Creates a new `Scan` record with `target_url = target` (defaults to `"localhost"`).
2. Calls `run_scan_task.delay(scan.id)` to enqueue the actual scan as a separate task, keeping the Beat task lightweight.
3. Logs the triggered scan ID.

### Helper: `_process_nmap_results(scan_id, nmap_output, db)`
An internal helper that converts raw Nmap output dictionaries into ORM `ScanAsset` and `AssetService` instances and adds them to the provided database session (without committing — the caller is responsible for committing).

## Dependencies

### Internal
- `app.core.celery_app.celery_app` — The Celery application instance
- `app.core.database.SessionLocal` — Synchronous database session factory
- `app.models.scan` — ORM models (Scan, ScanStatus, ScanAsset, AssetService)
- `app.services.nmap_wrapper.NmapWrapper` — Infrastructure scanner
- `app.services.unified_risk_engine.UnifiedRiskEngine` — Risk score calculator

### External
- `celery` — Task decorator and execution context
- `datetime` — Timestamp generation
