# endpoints/openvas.py — Documentation

## File Purpose

Exposes the **OpenVAS vulnerability scanner integration** as a REST API, allowing the frontend to trigger OpenVAS scans, poll their status, retrieve results, and schedule recurring scans — all through the Orchestration Security Center backend without requiring direct user access to the OpenVAS web interface.

## Key Endpoints

### `POST /openvas/scan/quick` — `start_quick_scan(scan_in, db)`
Initiates a quick OpenVAS vulnerability scan.

**Logic:**
1. Validates the `OpenVASScanCreate` request body (target IP and name).
2. Instantiates `OpenVASClient` and calls `quick_scan(target_ip, target_name)`.
3. Returns an `OpenVASScanResponse` containing the `task_id` and `report_id` for subsequent status polling.

### `GET /openvas/status/{task_id}` — `get_scan_status(task_id)`
Polls the status of a running OpenVAS scan task.

**Logic:**
Calls `OpenVASClient.get_task_status(task_id)` and returns the status dictionary including progress percentage (0–100) and current state string.

### `GET /openvas/results/{task_id}` — `get_scan_results(task_id, db)`
Retrieves completed vulnerability results from an OpenVAS scan.

**Logic:**
1. Calls `OpenVASClient.get_results(task_id)` to fetch normalized findings.
2. Optionally persists the OpenVAS findings as `Vulnerability` records in the database (mapped to the associated scan session if available).
3. Returns the list of normalized findings.

### `POST /openvas/schedule` — `schedule_scan(schedule_data, db)`
Schedules a recurring OpenVAS scan at a specified interval (e.g., daily, weekly). Creates an OpenVAS schedule object via the GMP API and associates it with an OpenVAS task.

## Dependencies

### Internal
- `app.core.database.get_db`
- `app.services.openvas.OpenVASClient`
- `app.schemas.scan.OpenVASScanCreate`, `OpenVASScanResponse`

### External
- `fastapi` — APIRouter, Depends, HTTPException
