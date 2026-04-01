# components/dashboard/ScanningBanner.jsx — Documentation

## File Purpose

Displays a **full-width animated notification banner** (5,215 bytes) that appears at the top of the dashboard during an active AI scan. Provides real-time scan progress feedback to keep users informed without requiring them to navigate to the Scans tab.

## Key Components

### `ScanningBanner({ isScanning, scanTarget, elapsedTime, latestLog })`
Conditionally renders a banner div at the top of the dashboard layout when `isScanning` is `true`.

**Visual Elements:**
- Animated pulsing background with a gradient shimmer effect
- "AI Scan In Progress" headline with a spinning scan icon
- `scanTarget` URL displayed as the current target
- `elapsedTime` counter (formatted as MM:SS)
- `latestLog` — The most recent WebSocket log message, shown as a live status update (e.g., "[ATTACK_AGENT] start_attack — Testing 12 endpoints with SQLi payloads")
- A progress estimation bar (indeterminate animation since scan duration is unpredictable)
- "Stop Scan" button that calls the stop scan API

**Animation:** The banner uses CSS keyframe animations for the background shimmer and a rotating scan icon, providing strong visual feedback that background work is occurring.

**Dismissal:** The banner disappears automatically when `isScanning` transitions to `false` (scan completed or failed), with a brief success/failure flash animation.

## Dependencies
- `react`
- `../ui/CyberButton`
