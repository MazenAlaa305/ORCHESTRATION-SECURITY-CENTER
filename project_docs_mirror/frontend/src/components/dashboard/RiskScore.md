# components/dashboard/RiskScore.jsx — Documentation

## File Purpose

Renders the **overall organization risk score visualization** (2,551 bytes) — a central visual KPI for the dashboard. Displays the composite risk score as a large animated gauge or ring chart with contextual labels.

## Key Components

### `RiskScore({ score, category })`
Accepts the numeric `score` (0–100) and `category` string from the dashboard risk overview query.

**Visual Elements:**
- `<GaugeRing score={score} />` — An SVG circular gauge animating on mount from 0 to the target score
- Large numeric score display
- Category label (LOW / MEDIUM / HIGH / CRITICAL) with appropriate color
- Trend arrow compared to the previous scan's score (stored in local state or fetched)

**Color Mapping:**
- 0–25 → Green gradient
- 26–50 → Yellow/amber gradient
- 51–75 → Orange gradient
- 76–100 → Red gradient with pulsing glow effect

## Dependencies
- `react`
- `../ui/GaugeRing`
