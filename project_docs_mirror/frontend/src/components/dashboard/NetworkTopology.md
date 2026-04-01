# components/dashboard/NetworkTopology.jsx — Documentation

## File Purpose

Renders an **interactive network topology visualization** (15,876 bytes) showing discovered hosts as nodes and their service connections as edges. Provides a visual representation of the network attack surface discovered during scans.

## Key Components

### `NetworkTopology({ assets, onAssetSelect })`
An interactive graph visualization component.

**Visualization Library**: Uses either D3.js force simulation or a lightweight canvas-based renderer to position nodes.

**Node Types:**
- **Gateway/Router** — Central hub node (diamond shape)
- **Server** — Rectangular node with port count displayed
- **Workstation** — Circular node
- **IOT/Unknown** — Question mark node

**Node Coloring:**
Nodes are colored by risk level derived from their open ports and vulnerability associations: `CRITICAL` → red, `HIGH` → orange, `MEDIUM` → yellow, `LOW` → green.

**Interaction:**
- Hovering a node shows a tooltip with IP, hostname, OS, and open services.
- Clicking a node calls `onAssetSelect(asset)`, opening the `AssetDetailPanel`.
- Nodes can be dragged to rearrange the layout.

**Edge Rendering:**
Edges connect nodes based on network proximity (same subnet). Port labels on edges show shared service connections.

**Legend:**
Renders a `TopologyLegend` component listing node shape and color meanings.

## Dependencies
- `react` — `useState`, `useEffect`, `useRef`
- `d3` or equivalent visualization library
- `./TopologyLegend`
