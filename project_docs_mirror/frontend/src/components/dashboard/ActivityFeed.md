# components/dashboard/ActivityFeed.jsx — Documentation

## File Purpose

Displays a **chronological timeline of recent security events** (8,643 bytes) combining scan completions, new device detections, new critical vulnerability discoveries, and SIEM alert triggers into a unified activity stream.

## Key Components

### `ActivityFeed({ scans, newAssets, recentVulns })`
Renders a time-ordered list of security event tiles.

**Event Types and Visual Design:**
- **Scan Completed** — Green check icon, scan target name, completion timestamp
- **New Device Detected** — Amber alert icon, IP address, hostname if available
- **Critical Vulnerability Found** — Red shield icon, vulnerability type, affected URL
- **SIEM Alert** — Purple lightning icon, alert rule description, agent name

**Data Assembly:** The component merges events from multiple data sources (passed as props or fetched via `useQuery`), sorts them by timestamp descending, and renders the most recent `limit` items (default 20).

**Time Formatting:** Timestamps are displayed as relative strings ("3 minutes ago", "2 hours ago") using a utility function.

**Empty State:** When no events are present, displays a centered illustration with "No recent activity" message.

## Dependencies
- `react`, `@tanstack/react-query`
- `../../services/api.js` — `networkService.getActivity`
