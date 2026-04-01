# components/dashboard/TopologyLegend.jsx — Documentation

## File Purpose

A **legend component** (2,124 bytes) rendered alongside the `NetworkTopology` diagram, explaining the meaning of different node shapes, colors, and edge styles.

## Key Components

### `TopologyLegend()`
A static informational component (no dynamic data).

**Legend Sections:**
- **Node Shapes**: Router (diamond), Server (rectangle), Workstation (circle), Unknown (question mark)
- **Risk Colors**: Green (Low), Yellow (Medium), Orange (High), Red (Critical)
- **Edge Types**: Solid line (direct connection), dashed line (inferred connection)

Displayed as a compact card either overlaid on the topology canvas or positioned beside it.

## Dependencies
- `react`
