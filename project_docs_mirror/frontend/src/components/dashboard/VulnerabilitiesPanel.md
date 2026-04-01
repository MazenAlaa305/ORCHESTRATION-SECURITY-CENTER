# components/dashboard/VulnerabilitiesPanel.jsx — Documentation

## File Purpose

The **primary vulnerability management panel** (16,840 bytes) — the most feature-rich component in the dashboard. Provides a comprehensive interface for viewing, filtering, searching, and managing the full vulnerability list, with severity-based grouping and workflow controls.

## Key Components

### `VulnerabilitiesPanel({ scanId, onVulnSelect })`
Renders the full vulnerability management interface.

**Features:**
- **Filter Bar**: Buttons for All, Critical, High, Medium, Low, Info, and Open/Fixed/False Positive status filters. Multiple filters can be combined.
- **Search**: Real-time text search across vulnerability type, URL, and description fields (client-side filtering over the fetched dataset).
- **Vulnerability Table**: Columns include Severity badge, Type, Affected URL, Status, Confidence score, and Actions.
- **Row Actions**: Each vulnerability row has action buttons for:
  - "View Details" → calls `onVulnSelect(vuln)` to open `IncidentDetailDrawer`
  - "Mark Fixed" → calls `vulnerabilityService.markFixed(id)` and invalidates query
  - "Mark False Positive" → calls `vulnerabilityService.markFalsePositive(id)`
  - "AI Re-validate" → calls `vulnerabilityService.revalidate(id)` with loading indicator
- **Severity Summary Bar**: A horizontal bar at the top showing the count per severity level with colored segments.
- **Export**: A button to download the filtered vulnerability list as a CSV for external reporting.

**Data Query**: Uses `useQuery(['vulnerabilities', { scanId }], ...)` with an optional `scanId` filter. Polls every 10 seconds during active scans.

## Dependencies
- `react`, `@tanstack/react-query`, `useMutation`
- `../../services/api.js` — `vulnerabilityService`
- `../ui/CyberBadge`, `../ui/SkeletonPulse`
