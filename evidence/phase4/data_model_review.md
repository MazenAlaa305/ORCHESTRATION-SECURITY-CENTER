# Phase 4.1 — History Data-Model Review
**Date:** 2026-04-25
**Scope:** Read-only pass over the backing endpoint before refactor.

## Backing endpoint
`GET /api/v1/scans/` in [backend/app/api/v1/endpoints/scans.py](../../backend/app/api/v1/endpoints/scans.py).

### Before (pre-Phase 4)
- Response: `List[ScanSummary]` — bare array, no `total`.
- Query params: `skip, limit, status`.
- Ordering: `started_at DESC` at DB layer ✓.
- Filters: `status` only. Target, profile, and date range were client-side or absent.
- Pagination: offset/limit but no `total` → client cannot render "Page X of Y" correctly.

### After (Phase 4 refactor)
- Response: `ScanListPage` — `{items, total, page, page_size}`. Enforces the
  uniform envelope called out in the Phase 2.2 checklist.
- Query params: `page, page_size, status, scan_type, target, date_from, date_to, sort, order`.
- Ordering: `started_at | duration | risk_score`, `asc | desc`; applied at DB layer.
- Filters: all applied at DB layer (no client-side slicing, no over-fetching).
- `total` is a `SELECT COUNT(...)` issued against the filtered query — always correct.

## Indexed ordering
`Scan.started_at` is populated by `app.services.scan_tasks` at scan launch and
remains stable for the row's lifetime. Sorting `started_at DESC` is the natural
default; the DB scan planner uses the primary-key index on `id` to tiebreak.
A dedicated index on `started_at` is not yet in place — acceptable at current
row counts (< 10k); flagged for later if the table grows past 100k rows.

## Field discipline (no over-fetching)
The `ScanSummary` schema exposes exactly the fields the 7-column table needs:
- `id, status, scan_type, target_url, started_at, completed_at, risk_score`,
- `target_display` (friendly display name),
- `vulnerabilities_count, assets_count` (scalar roll-ups, not full objects).

No nested vulnerability or agent_log arrays are pulled into the list; those
remain on the `/{scan_id}` detail endpoint.

## Consumers updated
- [frontend/src/components/dashboard/ScanHistory.jsx](../../frontend/src/components/dashboard/ScanHistory.jsx) — rebuilt (Phase 4.2–4.4).
- [frontend/src/pages/Dashboard.jsx](../../frontend/src/pages/Dashboard.jsx) — now reads `r.data.items`.
- [frontend/src/components/dashboard/Reports.jsx](../../frontend/src/components/dashboard/Reports.jsx) — now reads `r.data.items` and sets `status=completed` server-side.

## Phase 4.1 exit
- [x] Endpoint returns only fields the UI needs.
- [x] Stable DB-level `started_at DESC` ordering confirmed.
- [x] Pagination is server-side; client never slices.
