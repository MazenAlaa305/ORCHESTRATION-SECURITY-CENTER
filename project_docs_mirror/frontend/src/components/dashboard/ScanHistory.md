# components/dashboard/ScanHistory.jsx — Documentation

## File Purpose

Displays a **chronological table of all past and current scans**, providing status tracking, risk scores, and quick-access actions for each scan entry. Allows users to navigate to a scan's detail view.

## Key Components

### `ScanHistory({ scans, onScanSelect, activeScanId })`
Renders a sortable, filterable table of scan records.

**Columns:** Date/Time, Target, Scan Type, Status badge, Risk Score, Vulnerabilities Count, Actions.

**Logic:**
- Status badges are color-coded: `QUEUED` → gray, `RUNNING` → blue with pulse animation, `COMPLETED` → green, `FAILED` → red.
- Clicking a scan row calls `onScanSelect(scanId)`, which updates the Dashboard's `selectedScanId` state and triggers the detail polling query.
- The `activeScanId` prop highlights the currently selected scan with a distinct background.
- Completed scans show a "View Report" link that triggers report download.
- Running scans show a "Stop" button that calls `pentesterService.stopScan()`.

## Dependencies
- `react`, `@tanstack/react-query`
- `../../services/api.js` — `pentesterService.stopScan`
- `../ui/CyberBadge`
