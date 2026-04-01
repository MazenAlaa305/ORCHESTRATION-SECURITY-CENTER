# components/dashboard/ScanButton.jsx — Documentation

## File Purpose

Provides the **primary scan initiation UI** — a prominent interactive button that triggers an AI scan and shows visual feedback during the scanning process. The most frequently used interactive element in the dashboard.

## Key Components

### `ScanButton({ onScanStart, isScanning, targets })`
Renders a large call-to-action button with dynamic states.

**States:**
- **Idle**: Shows "Run AI Scan" with a play icon. Expandable panel allows selecting a target or entering a URL.
- **Scanning**: Shows a pulsing animation with "Scan in Progress…" text and a live elapsed-time counter.
- **Selecting Target**: When multiple targets exist, shows a dropdown list of registered targets to choose from.

**Logic:**
- `handleStart(target)` — Calls `onScanStart(target)` callback with the selected target URL. Disables the button while `isScanning` is true.
- Implements a client-side elapsed timer using `setInterval` to show how long the current scan has been running.

## Dependencies
- `react` — `useState`, `useEffect`
- `../ui/CyberButton` — Styled button primitive
