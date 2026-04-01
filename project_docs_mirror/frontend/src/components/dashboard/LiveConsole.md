# components/dashboard/LiveConsole.jsx — Documentation

## File Purpose

Renders a **terminal-style real-time log console** (11,023 bytes) displaying incoming WebSocket messages from the AI scan pipeline. Provides the "live feed" experience showing exactly what is happening during an active scan.

## Key Components

### `LiveConsole({ wsLogs, isConnected })`
A scrollable, fixed-height console panel styled to look like a terminal window.

**Visual Design**: Dark background with monospace font. Log messages are color-coded:
- `[RECON_AGENT]` prefix → cyan text
- `[ATTACK_AGENT]` prefix → red/orange text
- `[VALIDATION_AGENT]` prefix → yellow text
- `[SIEM_AGENT]` prefix → purple text
- System messages → gray text

**Auto-Scroll**: A `useEffect` with a bottom-ref automatically scrolls the console to the latest log entry when `wsLogs` updates.

**Connection Status Indicator**: A green/red pulsing dot indicating whether the WebSocket connection is active. Shows "Disconnected — Reconnecting..." if `isConnected` is false.

**Clear Button**: Clears the displayed log history (client-side only — does not affect the database).

**Pause/Resume**: A toggle that pauses auto-scrolling to allow the user to inspect earlier log entries without being interrupted by new messages.

**Log Replay**: For completed scans, fetches the agent log history from the API and replays it in the console at accelerated speed for demonstration purposes.

## Dependencies
- `react` — `useEffect`, `useRef`, `useState`
