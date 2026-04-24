# Phase 4 — History Tab Reorganization — Run Summary
**Date:** 2026-04-25

## Changes landed

### Backend
- [backend/app/schemas/scan.py](../../backend/app/schemas/scan.py) — new
  `ScanListPage` envelope `{items, total, page, page_size}`.
- [backend/app/api/v1/endpoints/scans.py](../../backend/app/api/v1/endpoints/scans.py)
  — `GET /scans/` rewritten:
  - DB-layer filters: `status`, `scan_type`, `target` (ILIKE), `date_from`,
    `date_to`.
  - DB-layer sort whitelist: `started_at | duration | risk_score`, `asc | desc`.
  - Pagination: `page` (1-indexed), `page_size` (max 200). Returns
    `ScanListPage`.
  - `total` = `COUNT(*)` on the filtered query.

### Frontend
- [frontend/src/services/api.js](../../frontend/src/services/api.js) —
  `scanService.getScans(params)` now accepts query params.
- [frontend/src/components/dashboard/ScanHistory.jsx](../../frontend/src/components/dashboard/ScanHistory.jsx)
  — complete rewrite:
  - 7 columns by default: Time · Target · Profile · Status · Findings
    (severity pill + count) · Duration · Actions.
  - Time is relative ("2h ago") with absolute UTC tooltip on hover.
  - Severity pill (one per row) bucketed from `risk_score`:
    critical/high/medium/low/info/none.
  - Status uses a left-border accent (green/blue/gray/red) plus lexical text.
  - Dense/Comfortable toggle.
  - Filters: target type-ahead, status, profile, date-range.
  - Sort: Time, Duration — always server-side.
  - Pagination: server-side, page-size selector (10/25/50/100),
    URL-synced via `hq, hstatus, hprofile, hfrom, hto, hsort, horder, hpage,
    hpsize, hdense`.
  - Row expansion: inline detail with scan summary, findings roll-up, and a
    command preview of the exact `POST /api/v1/scans/` body the backend received.
  - Empty / loading / error states implemented.
- [frontend/src/pages/Dashboard.jsx](../../frontend/src/pages/Dashboard.jsx) and
  [frontend/src/components/dashboard/Reports.jsx](../../frontend/src/components/dashboard/Reports.jsx)
  updated to read `r.data.items` from the new envelope.

## Exit criteria

| Criterion | Status |
|---|---|
| ≤ 7 default columns | ✅ exactly 7 |
| Server-side filter + sort + pagination, URL-synced | ✅ |
| Empty / loading / error states | ✅ |
| Perf budget captured | ✅ [perf_trace.json](perf_trace.json) |

## Deferred / follow-up
- Index on `Scan.started_at` — not needed at current row counts, flagged for when
  the table crosses 100k rows.
- `docker compose up` of the full stack for a live end-to-end validation run —
  still gated behind Phase 7 regression pass (same deferral as Phase 2).
