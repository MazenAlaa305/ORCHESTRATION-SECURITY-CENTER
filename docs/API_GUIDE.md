# API Guide — Orchestration Security Center

Base URL (prod via Caddy): `https://localhost/api/v1`
Base URL (dev): `http://localhost:8000/api/v1`

Interactive Swagger / OpenAPI: `https://localhost/docs` (or `http://localhost:8000/docs` in dev).
This guide mirrors the Swagger schema in plain Markdown so reviewers can browse without launching the stack.

## Authentication
All routes (except `/health` and `/auth/login`) require `Authorization: Bearer <token>`.
Tokens are JWTs that expire after 30 minutes; obtain a new one via `/auth/login`.

## Conventions
- All request and response bodies are JSON.
- Errors return `{ "detail": string }` with the appropriate HTTP status.
- Every response carries an `X-Request-ID` header for log correlation.
- Pagination uses `?page=<n>&page_size=<m>` query params; responses include `total` and `items`.

## Endpoints

### Auth
- `POST /auth/login` — `{ email, password }` → `{ access_token, role, force_password_change }`
- `POST /auth/logout` — 204
- `GET  /auth/me` — current user
- `POST /auth/change-password` — `{ old_password, new_password }`

### RBAC (admin only)
- `GET   /rbac/users` — list every user
- `POST  /rbac/users` — `{ email, password, role }`
- `PATCH /rbac/users/{id}/role` — `{ role }`
- `POST  /rbac/users/{id}/disable` — soft-disable login

### Targets (admin only for create/delete)
- `GET    /targets/` — list scope-managed targets
- `POST   /targets/` — `{ name, url|cidr, kind }`
- `GET    /targets/{id}`
- `DELETE /targets/{id}`

### Scans
- `GET  /scans/` — paginated scan list
- `POST /scans/` — `{ target_url|target_id, scan_type, tools?, schedule? }`
- `GET  /scans/{id}` — full scan detail incl. findings
- `GET  /scans/{id}/task-status` — Celery task status
- `POST /scans/{id}/stop` — cancel an in-flight scan

### Findings & Vulnerabilities
- `GET  /findings/` — paginated findings (filter by `severity`, `scan_id`, `asset_id`)
- `GET  /findings/{id}` — full finding incl. remediation, references, CVSS
- `POST /findings/{id}/false-positive` — mark a finding as FP

### Reports
- `GET  /reports/` — list available reports
- `POST /reports/` — `{ scan_id, format }` (format: `pdf` | `json` | `html`)
- `GET  /reports/{id}/download` — binary download

### Network
- `GET  /network/assets` — list discovered assets
- `GET  /network/assets/{id}` — asset detail (incl. timeline if available)
- `GET  /network/topology` — graph suitable for D3 rendering

### SIEM
- `GET  /siem/alerts` — recent Wazuh alerts (paginated)
- `GET  /siem/correlations` — alerts ↔ findings linkage

### Audit
- `GET /audit/log` — paginated, hash-chained audit entries
- `GET /audit/verify` — confirms the chain has not been tampered with

### Lab
- `GET  /lab/services` — health of lab containers
- `POST /lab/scenarios/{name}/run` — kick off a scripted scenario

### OpenVAS (admin only)
- `POST /openvas/tasks` — create a deep-scan task
- `GET  /openvas/tasks/{id}` — task status + findings

### Health
- `GET /health` — public liveness; returns `{ status: "ok", commit: <sha> }`

## WebSocket
`wss://localhost/ws/events` — pushes envelopes shaped:
```json
{ "type": "SCAN_STATUS", "payload": { ... }, "seq": 42, "ts": "2026-04-26T12:34:56Z" }
```
Event types currently emitted:
- `SCAN_STARTED`
- `SCAN_STATUS` (stage transitions)
- `RISK_UPDATE`
- `FINDING_ADDED`
- `SCAN_COMPLETED`
- `SIEM_ALERT`

## Errors
All errors return `{ detail: string }` with the appropriate HTTP status. Common codes:
| Code | Meaning |
|------|---------|
| 400  | Validation failure (Pydantic) |
| 401  | Missing or invalid JWT |
| 403  | Authenticated but lacks the required role |
| 404  | Not found |
| 409  | Conflict (e.g. duplicate email on user create) |
| 429  | Rate-limited (auth endpoints) |
| 500  | Unhandled server error — log via `X-Request-ID` |

## See also
- [docs/ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) — system diagrams
- [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) — OWASP Top 10 mapping
