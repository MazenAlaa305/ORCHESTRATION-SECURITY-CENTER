# backend/tests/test_risk.py — Documentation

## File Purpose

**Unit tests** for the `UnifiedRiskEngine`, verifying that risk score calculations produce expected values for various vulnerability and asset configurations.

## Key Test Functions

### `test_empty_scan_risk()`
Calls `UnifiedRiskEngine.calculate_risk([], [])` with no vulnerabilities or assets. Verifies the returned score is `0.0`.

### `test_critical_vuln_score()`
Creates a mock `Vulnerability` object with `severity=CRITICAL` and `confidence_score=1.0`. Verifies the returned score is `40.0` (the critical weight).

### `test_multiple_vulns_score()`
Creates one critical and two high vulnerabilities. Verifies the score equals `40 + 25 + 25 = 90.0` (capped at 100 if exceeded).

### `test_risk_capping()`
Creates enough vulnerabilities to theoretically exceed 100. Verifies the returned score is exactly `100.0` (the normalization cap).

### `test_redis_exposure_bonus()`
Creates a mock `ScanAsset` with a service on port 6379. Verifies the infrastructure exposure bonus of `+20` is applied.

### `test_risk_categories()`
Tests `get_risk_category()` with scores 0, 30, 65, 90. Verifies returned categories are `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` respectively.

## Dependencies

### Internal
- `app.services.unified_risk_engine.UnifiedRiskEngine`
- `app.models.scan.Vulnerability`, `ScanAsset`, `SeverityLevel`

### External
- `pytest`
- `unittest.mock.MagicMock` — For creating mock ORM objects without a real database
