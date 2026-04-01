# components/dashboard/StatCards.jsx — Documentation

## File Purpose

Renders the **top-level KPI metric cards** displayed at the top of the dashboard and network tabs. Presents critical at-a-glance numbers: total vulnerabilities, critical findings count, active scans, total assets, and overall risk score.

## Key Components

### `StatCards({ data, variant })`
Accepts a `data` object from the risk overview query and a `variant` prop (`"security"` or `"network"`) to switch between vulnerability-focused and asset-focused metrics.

**Rendered Cards:**
- **Total Vulnerabilities** — Count of all non-dismissed findings
- **Critical Issues** — Count of `severity=critical` open vulnerabilities (highlighted in red)
- **Active Scans** — Number of scans with `status=running`
- **Assets Monitored** — Total count of unique network assets
- **Risk Score** — The aggregate risk score (0–100) with color-coded severity badge

Each card is an animated panel with a large number, label, trend indicator (up/down arrow with percentage change), and a subtle background icon. Cards use gradient fills matching the severity of the data they display.

## Dependencies
- `react` — Core hooks
- `../ui/CyberBadge` — Severity label display
- `../ui/GaugeRing` — Optional circular gauge for risk score card
