# endpoints/scans.py — Documentation

## File Purpose

The **scan lifecycle management endpoint module**. Handles creation of both legacy Nmap-based scans and AI-powered agent scans, listing, detailed retrieval, agent log access, stopping, and deletion of scans.

## Key Endpoints

### `POST /scans/` — `create_scan(scan_in, db)`
Creates a standard scan using the legacy Celery/Nmap pipeline.

**Logic:**
1. Resolves the target URL — if `target_id` is provided, looks up the `Target` record and uses `base_url`; otherwise uses the `target_url` field directly.
2. Creates a `Scan` ORM record with `status=QUEUED` and commits it to the database.
3. Calls `run_scan_task.delay(scan_id=scan.id)` to enqueue the Celery task asynchronously.
4. Returns the `ScanResponse` schema for the created scan.

---

### `POST /scans/ai` — `create_ai_scan(scan_in, background_tasks, db)` — async
Creates an AI agent-powered scan using the full `AgentOrchestrator` pipeline.

**Logic:**
1. Resolves the target similar to `create_scan`, additionally extracting `auth_credentials` from the `Target` record for authenticated scans.
2. Creates a `Scan` record and commits it.
3. Re-fetches the scan with eager-loaded relationships (`selectinload`) to avoid missing-greenlet serialization errors in the async context.
4. Defines an inner async function `run_ai_scan(scan_id, url, creds)` that creates a new async session and runs `AgentOrchestrator.run_full_scan()`.
5. Adds `run_ai_scan` to FastAPI's `BackgroundTasks`, which executes it after the HTTP response is sent.
6. Returns the `ScanResponse` immediately while the AI pipeline runs in the background.

---

### `GET /scans/` — `list_scans(skip, limit, status, db)`
Returns a paginated list of `ScanSummary` objects, optionally filtered by status. Ordered by `started_at` descending (most recent first).

---

### `GET /scans/{scan_id}` — `get_scan(scan_id, db)` — async
Returns the full `ScanDetail` for a scan, including nested `vulnerabilities`, `assets` (with nested `services`), `agent_logs`, and `actions`. Uses `selectinload` for efficient eager loading of all relationships in a single async query.

---

### `GET /scans/{scan_id}/logs` — `get_scan_logs(scan_id, db)`
Returns the chronologically-ordered list of `AgentLogResponse` objects for a specific scan. Powers the `AgentLogViewer` component's live reasoning chain display.

---

### `POST /scans/{scan_id}/stop` — `stop_scan(scan_id, db)`
Immediately marks a `QUEUED` or `RUNNING` scan as `FAILED`. Note: does not actually interrupt a running Celery task or agent coroutine — it only updates the database record, serving as a soft-stop for UI purposes.

---

### `DELETE /scans/{scan_id}` — `delete_scan(scan_id, db)`
Hard-deletes a scan and all its cascade-linked records (vulnerabilities, agent logs, assets, actions) from the database.

## Dependencies

### Internal
- `app.core.database.get_db`, `get_async_db`, `async_session_maker`
- `app.models.scan.Scan`, `ScanStatus`, `Target`, `ScanAsset`
- `app.schemas.scan.ScanCreate`, `ScanResponse`, `ScanDetail`, etc.
- `app.services.scan_tasks.run_scan_task`
- `app.services.agent_orchestrator.AgentOrchestrator`

### External
- `fastapi` — APIRouter, Depends, HTTPException, BackgroundTasks
- `sqlalchemy` — Session, AsyncSession, select, selectinload
