# trigger_lab_scans.ps1 / trigger_lab_scans.py — Documentation

## File Purpose

These two scripts (one PowerShell, one Python) serve the same function: **triggering automated AI scan jobs against the lab targets** to produce a realistic, populated dashboard for demonstration. They are used after `lab_setup.ps1` has already seeded the target records.

## Key Logic

### `trigger_lab_scans.ps1` (PowerShell)

**Step 1 — Retrieve Targets**: Sends a `GET` request to `/api/v1/targets/` to fetch the list of all registered targets and extracts their UUIDs.

**Step 2 — Trigger AI Scans**: For each retrieved target ID, sends a `POST` request to `/api/v1/scans/ai` with the `target_id` and a `"full"` scan type. This initiates the full AI agent pipeline (Recon → Attack → Validation → SIEM) for each target asynchronously.

**Step 3 — Wait and Poll**: Polls the `/api/v1/scans/` endpoint at regular intervals, displaying the running status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`) of each triggered scan until all complete.

### `trigger_lab_scans.py` (Python)

A Python equivalent of the PowerShell script, using the `requests` library. Provides the same functionality with more detailed error handling and formatted console output. Preferred in CI/CD pipeline contexts where Python is available.

**Functions:**
- `get_targets()` — Retrieves all registered target objects from the backend API.
- `trigger_scan(target_id)` — POSTs a new AI scan job for a given target ID and returns the created scan's ID.
- `poll_scan_status(scan_id)` — Polls a specific scan's status endpoint in a loop until a terminal state (`completed` or `failed`) is reached.
- `main()` — Orchestrates the full workflow: retrieve targets, trigger all scans, poll all scan statuses concurrently using `threading.Thread`.

## Dependencies

- **`trigger_lab_scans.ps1`**: PowerShell, Docker network, running lab stack.
- **`trigger_lab_scans.py`**: Python 3, `requests` library, running lab stack.
- **Interacts with**: Backend REST API (`/api/v1/targets/`, `/api/v1/scans/ai`, `/api/v1/scans/{id}`).
