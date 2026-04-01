# backend/tests/test_e2e_scans.py — Documentation

## File Purpose

**End-to-end integration tests** for the scan lifecycle API. Tests the full flow from creating a scan via the REST API through to verifying that the scan results appear in the database correctly.

## Key Test Functions

### `test_create_legacy_scan()`
Tests `POST /api/v1/scans/` with a `target_url` body. Verifies:
- HTTP 200 response
- Response body includes `id`, `status: "queued"`, and `target_url`
- The scan record exists in the database with correct fields

### `test_create_ai_scan()`
Tests `POST /api/v1/scans/ai` with a `target_url` pointing to a local test server. Verifies:
- HTTP 200 response immediately (background task initiated)
- Response `status` is `"queued"` (not yet processed)

### `test_list_scans()`
Tests `GET /api/v1/scans/` and verifies:
- HTTP 200 response with a JSON array
- Each item contains the required `ScanSummary` fields

### `test_get_scan_detail()`
Creates a scan, then fetches `GET /api/v1/scans/{id}`. Verifies:
- The `ScanDetail` schema fields are present
- Nested arrays (`vulnerabilities`, `assets`, `agent_logs`, `actions`) are present as empty lists for a fresh scan

### `test_stop_scan()`
Creates a scan and immediately calls `POST /api/v1/scans/{id}/stop`. Verifies:
- HTTP 200 response
- The scan status in the database is updated to `"failed"`

### `test_delete_scan()`
Creates a scan, then deletes it. Verifies:
- HTTP 200 response
- Subsequent `GET /api/v1/scans/{id}` returns HTTP 404

## Dependencies

### External
- `pytest` — Test runner
- `httpx` / `requests` — HTTP client for API calls
- `fastapi.testclient.TestClient` — In-process test client for synchronous endpoint testing
