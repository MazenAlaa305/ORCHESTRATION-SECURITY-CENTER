# components/dashboard/AgentLogViewer.jsx — Documentation

## File Purpose

Provides a **real-time AI agent reasoning chain viewer** (15,399 bytes) — a transparent, inspectable log of exactly what each AI agent did during a scan. This component is a key differentiator of the Orchestration Security Center platform, demonstrating AI transparency and explainability.

## Key Components

### `AgentLogViewer({ scanId, wsLogs })`
Renders a structured log timeline for a selected scan.

**Data Sources:**
1. **Persisted Logs**: Fetches `GET /api/v1/scans/{scanId}/logs` to retrieve the complete agent log history from the database. Displayed as a structured timeline.
2. **Live WebSocket Logs**: Renders `wsLogs` (the real-time array from WebSocket) at the top of the list for currently running scans.

**Log Entry Display:**
Each `AgentLog` entry is rendered as a timeline item:
- **Agent Name Badge**: Color-coded per agent (`recon_agent` → blue, `attack_agent` → red, `validation_agent` → yellow, `siem_agent` → purple).
- **Action Label**: The action string (e.g., `"recon_complete"`, `"template_selection"`).
- **Timestamp**: Relative time (e.g., "2 minutes ago").
- **Reasoning Accordion**: Expandable section showing the `reasoning` JSON in a human-readable key-value format.
- **Input/Output Data**: Collapsible sections showing input and output dictionaries.

**Agent Progress Tracker**: Shows the current stage of the pipeline (Recon → Attack → Validation → SIEM → Complete) with checkmarks for completed stages and a spinner for the active stage.

**Auto-Scroll**: Uses a `useEffect` with a `ref` on the log container to automatically scroll to the bottom when new log entries arrive.

## Dependencies
- `react` — `useState`, `useEffect`, `useRef`
- `@tanstack/react-query`
- `../../services/api.js` — `pentesterService.getAgentLogs`
