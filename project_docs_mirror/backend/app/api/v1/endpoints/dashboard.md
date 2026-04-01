# endpoints/dashboard.py — Documentation

## File Purpose

Aggregates and exposes high-level **risk and action item data** consumed by the dashboard's summary panels. Provides computed metrics rather than raw scan/vulnerability records, allowing the frontend to display actionable intelligence without heavy client-side processing.

## Key Endpoints

### `GET /dashboard/risk-overview` — `get_risk_overview(db)`
Computes and returns the overall risk posture of the organization.

**Logic:**
1. Queries all completed scans and averages their `risk_score` values.
2. Counts total vulnerabilities grouped by severity level.
3. Counts total assets across all scans.
4. Returns a structured dictionary with: `overall_risk_score`, `risk_category`, `total_vulnerabilities`, `by_severity` (counts per severity), `total_assets`, `active_scans`, `completed_scans`.

### `GET /dashboard/actions` — `get_action_items(db)`
Returns current open remediation action items.

**Logic:**
Queries all `ActionItem` records with `status = "OPEN"`, ordered by `priority`. Serializes them using the `ActionItemResponse` schema. Used by the `ActionCenter` and `UnifiedInbox` components.

### `POST /dashboard/refresh-risk` — `refresh_risk_scores(db)`
On-demand risk recalculation endpoint. Re-runs `UnifiedRiskEngine.calculate_risk()` for all completed scans that have been updated since their last risk calculation. Updates the `Scan.risk_score` field for each. Returns a summary of how many scans were recalculated and their new scores.

## Dependencies

### Internal
- `app.core.database.get_db`
- `app.models.scan` — Scan, Vulnerability, ScanAsset, ActionItem
- `app.services.unified_risk_engine.UnifiedRiskEngine`
- `app.schemas.scan.ActionItemResponse`

### External
- `fastapi` — APIRouter, Depends
- `sqlalchemy.orm.Session`
