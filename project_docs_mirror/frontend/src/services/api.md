# frontend/src/services/api.js — Documentation

## File Purpose

The **centralized HTTP client layer** for all communication between the React frontend and the FastAPI backend. Exports a pre-configured Axios instance and organized service objects grouping related API calls by domain. This single-file service layer prevents URL duplication and provides a consistent interface for all backend interactions.

## Key Components

### `api` (Axios Instance)
Created with `axios.create()` using:
- `baseURL`: Reads from `import.meta.env.VITE_API_URL` environment variable (configured in Docker Compose and Vite), falling back to `http://localhost:8000/api/v1` for local development.
- `headers: { 'Content-Type': 'application/json' }` — Sets JSON content type for all requests by default.

This instance is used as the HTTP transport by all service objects below.

---

### `scanService` (Legacy)
Provides backward-compatible wrappers for the original scan API:
- `startScan(target, type)` — `POST /scans/` with raw URL
- `getScans()` — `GET /scans/`
- `getScanDetails(id)` — `GET /scans/{id}`
- `getReport(id)` — `GET /reports/{id}`

---

### `networkService` (Legacy)
Provides network asset data access:
- `getAssets(status)` — `GET /network/assets` with optional status filter
- `getNewDevices()` — `GET /network/assets/new`
- `getActivity(limit)` — `GET /network/activity`

---

### `targetService`
Full CRUD and discovery for scan targets:
- `create(data)` — `POST /targets/`
- `list(params)` — `GET /targets/`
- `get(id)` — `GET /targets/{id}`
- `update(id, data)` — `PATCH /targets/{id}`
- `discover(domain)` — `POST /targets/discover?domain=...`
- `delete(id)` — `DELETE /targets/{id}`

---

### `pentesterService`
AI-powered scan control:
- `startAIScan(targetId, config)` — `POST /scans/ai` with target UUID
- `startAIScanByUrl(url, config)` — `POST /scans/ai` with direct URL
- `getScanWithLogs(scanId)` — `GET /scans/{id}` (full ScanDetail)
- `getAgentLogs(scanId)` — `GET /scans/{id}/logs`
- `stopScan(scanId)` — `POST /scans/{id}/stop`

---

### `vulnerabilityService`
Vulnerability management and workflow:
- `list(params)` — `GET /vulnerabilities/` with filter params
- `get(id)` — `GET /vulnerabilities/{id}`
- `update(id, data)` — `PATCH /vulnerabilities/{id}`
- `updateWorkflow(id, {ticket_id, assigned_to, status})` — `PATCH /vulnerabilities/{id}/workflow`
- `getPoc(id)` — `GET /vulnerabilities/{id}/poc`
- `revalidate(id)` — `POST /vulnerabilities/{id}/revalidate`
- `markFalsePositive(id)` — Sets status to `false_positive`
- `markFixed(id)` — Sets status to `fixed`

---

### `openvasService`
OpenVAS direct scan control:
- `startQuickScan(targetIp, targetName)` — `POST /openvas/scan/quick`
- `getScanStatus(taskId)` — `GET /openvas/status/{taskId}`
- `getScanResults(taskId)` — `GET /openvas/results/{taskId}`
- `scheduleScan(data)` — `POST /openvas/schedule`

---

### `dashboardService`
Dashboard aggregations:
- `getRiskOverview()` — `GET /dashboard/risk-overview`
- `getActionItems()` — `GET /dashboard/actions`
- `refreshRiskScores()` — `POST /dashboard/refresh-risk`

## Dependencies

### External
- `axios` — HTTP client library
- Vite environment variables via `import.meta.env`
