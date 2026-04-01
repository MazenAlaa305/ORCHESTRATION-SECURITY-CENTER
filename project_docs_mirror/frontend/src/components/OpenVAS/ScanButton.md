# components/OpenVAS/ScanButton.jsx — Documentation

## File Purpose

A specialized **scan initiation button for OpenVAS scans** (3,805 bytes), distinct from the main AI scan button. Allows users to trigger a direct OpenVAS vulnerability assessment against a specific IP address from the OpenVAS tab.

## Key Components

### `OpenVASScanButton({ onScanStart })`
Renders a form with an IP address input and a "Start OpenVAS Scan" button.

**Logic:**
- Validates the entered IP address format before enabling the button.
- On submit, calls `openvasService.startQuickScan(ip, name)` from `services/api.js`.
- Shows the returned `task_id` and begins polling via `openvasService.getScanStatus(taskId)` on a 5-second interval.
- Displays scan progress percentage.
- On completion, calls `onScanStart(taskId)` so the parent can load the results.

## Dependencies
- `react` — `useState`, `useEffect`
- `../../services/api.js` — `openvasService`
