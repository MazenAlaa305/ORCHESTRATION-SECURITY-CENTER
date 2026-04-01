# frontend/src/pages/Dashboard.jsx — Documentation

## File Purpose

The **master page component** — the single most important React file in the frontend. This 31,928-byte file acts as the consolidated application controller, managing all top-level state, orchestrating data fetching for every section, and rendering the correct content panel based on the active navigation tab. It composes the `Layout`, `Sidebar`, and all dashboard panel components into the complete user interface.

## Key Architecture

### Tab-Based Navigation Model
The Dashboard's primary UX pattern is a tab system. A `activeTab` state variable (initialized to `"dashboard"`) determines which content panel is rendered in the main area. The `Sidebar` component receives `activeTab` and `setActiveTab` to drive navigation.

Available tabs include: `dashboard`, `scans`, `vulnerabilities`, `network`, `topology`, `targets`, `reports`, `siem`, `openvas`, `advisor`, `settings`.

---

## Key State Variables

| State | Purpose |
|---|---|
| `activeTab` | Currently selected navigation section |
| `activeScan` | The most recently triggered or selected scan object |
| `selectedScanId` | UUID of the scan to show details for |
| `isScanning` | Boolean flag controlling the `ScanningBanner` display |
| `wsLogs` | Array of real-time log messages received via WebSocket |
| `selectedAsset` | The network asset to display in `AssetDetailPanel` |
| `selectedVuln` | The vulnerability to display in `IncidentDetailDrawer` |

---

## Data Fetching (TanStack Query)

The Dashboard uses `useQuery` hooks to fetch and cache all backend data:

- `useQuery(['scans'], scanService.getScans)` — Polls the scan list every 5 seconds while a scan is running
- `useQuery(['targets'], targetService.list)` — Fetches registered targets
- `useQuery(['vulnerabilities'], vulnerabilityService.list)` — Fetches all open vulnerabilities
- `useQuery(['network-assets'], networkService.getAssets)` — Fetches network inventory
- `useQuery(['dashboard'], dashboardService.getRiskOverview)` — Fetches risk overview metrics
- Active scan detail polling via `useQuery(['scan', selectedScanId])` when a scan is selected

---

## WebSocket Integration

On mount, `useEffect` establishes a WebSocket connection to `ws://localhost:8000/ws/logs`. Incoming messages are appended to the `wsLogs` state array. The connection is closed on component unmount. The `wsLogs` array is passed to `LiveConsole` for real-time display.

---

## Key Sub-Component Rendering

The Dashboard conditionally renders different panel sets based on `activeTab`:

| Tab | Rendered Components |
|---|---|
| `dashboard` | `StatCards`, `ScanningBanner`, `RiskScore`, `ActivityFeed`, `ActionCenter`, `UnifiedInbox` |
| `scans` | `ScanButton`, `ScanHistory`, `ScanPipelinePanel`, `AgentLogViewer`, `LiveConsole` |
| `vulnerabilities` | `VulnerabilitiesPanel`, `IncidentDetailDrawer` |
| `network` | `StatCards` (asset variant), `AssetDetailPanel` |
| `topology` | `NetworkTopology`, `TopologyLegend` |
| `targets` | `TargetsManager` |
| `reports` | `Reports`, `ReportGenerator` |
| `siem` | SIEM panel (Wazuh/Elastic alerts view) |
| `openvas` | `OpenVAS/ScanButton`, `OpenVAS/VulnerabilitiesList`, `OpenVAS/RiskChart`, `OpenVAS/Scheduler` |

---

## Key Event Handlers

**`handleStartScan(target)`**  
Calls `pentesterService.startAIScanByUrl(target)`. Sets `isScanning = true` and `activeScan` to the returned scan object. Invalidates the `scans` query to trigger a refresh.

**`handleScanSelect(scanId)`**  
Sets `selectedScanId` to enable the scan detail polling query. Switches `activeTab` to `"scans"` to show the detail view.

**`handleVulnSelect(vuln)`**  
Sets `selectedVuln` and opens the `IncidentDetailDrawer`.

**`handleAssetSelect(asset)`**  
Sets `selectedAsset` and opens the `AssetDetailPanel`.

---

## Dependencies

### Internal
All dashboard component imports (19 dashboard components, OpenVAS components, layout components, service objects from `services/api.js`)

### External
- `react` — Core hooks: `useState`, `useEffect`, `useCallback`
- `@tanstack/react-query` — `useQuery`, `useQueryClient`, `useMutation`
