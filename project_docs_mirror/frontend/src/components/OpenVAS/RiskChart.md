# components/OpenVAS/RiskChart.jsx — Documentation

## File Purpose

Renders an **OpenVAS-specific risk distribution chart** (3,147 bytes) showing the breakdown of severity levels found in an OpenVAS scan as a visual bar or donut chart.

## Key Components

### `OpenVASRiskChart({ results })`
Accepts the list of OpenVAS result objects and renders a severity distribution chart.

**Chart Type:** A horizontal stacked bar or donut chart using SVG or a lightweight chart library (e.g., Recharts).

**Distribution:**
- Groups results by CVSS-based severity (High ≥ 7.0, Medium 4.0–6.9, Low < 4.0)
- Displays count and percentage for each severity band
- Color codes match the global severity palette

**Re-use:** Shares the `GaugeRing` component for an overall risk score representation derived from the OpenVAS results.

## Dependencies
- `react`
- `../ui/GaugeRing`
- Optional: `recharts` or similar chart library
