# unified_risk_engine.py — Documentation

## File Purpose

Implements the **composite risk scoring algorithm** that produces a single normalized risk score (0–100) for each scan, incorporating vulnerability severity weights, asset criticality, infrastructure exposure, and business context data. This score drives the dashboard's primary risk indicator and prioritized action items.

## Key Classes

### `UnifiedRiskEngine`
The main risk calculation class. Stateless and instantiated fresh for each calculation.

**`calculate_risk(vulnerabilities, assets, target=None) → float`**
The primary entry point. Accepts lists of `Vulnerability` ORM objects, `ScanAsset` ORM objects, and an optional `Target` ORM object.

**Algorithm:**

1. **Base Vulnerability Score**  
   Iterates through all vulnerabilities with `status != FALSE_POSITIVE`. Maps severity levels to weights: `CRITICAL=40`, `HIGH=25`, `MEDIUM=10`, `LOW=3`, `INFO=0.5`. Multiplies each weight by the vulnerability's `confidence_score` (0–1). Sums all weighted scores.

2. **Infrastructure Exposure Bonus**  
   Adds additional points based on high-risk open ports discovered on scan assets: port 6379 (Redis) +20, port 3306 (MySQL) +15, port 22 (SSH to internet) +10, port 3000 +10. This reflects the real-world risk of exposed network services.

3. **Asset Criticality Multiplier**  
   If a `Target` object is provided with `asset_value = "CRITICAL"`, the score is multiplied by `1.3`. For `"HIGH"`, multiplied by `1.15`. This ensures that vulnerabilities in critical business systems receive proportionally higher scores.

4. **Data Sensitivity Bonus**  
   If the target's `data_sensitivity` is `"PII"` or `"FINANCIAL"`, adds a fixed bonus of 10 points to reflect the regulatory and reputational risk of a breach.

5. **Normalization**  
   Clamps the final computed score to the range `[0.0, 100.0]` using `min(100.0, max(0.0, score))`.

6. **Returns** the normalized floating-point risk score.

**`get_risk_category(score) → str`**
Maps a numeric score to a human-readable category label:
- 0–25 → `"LOW"`
- 26–50 → `"MEDIUM"`
- 51–75 → `"HIGH"`
- 76–100 → `"CRITICAL"`

**`generate_action_items(vulnerabilities, assets) → List[Dict]`**
Analyzes the vulnerability and asset lists to produce a prioritized list of remediation recommendations. Each action item includes a `title`, `description`, `priority`, and `type`. Generates specific actions for critical vulnerabilities, exposed services, and unpatched CVEs.

## Dependencies

### Internal
- `app.models.scan` — ORM model types for type hints

### External
- `typing` — Standard library type hints
