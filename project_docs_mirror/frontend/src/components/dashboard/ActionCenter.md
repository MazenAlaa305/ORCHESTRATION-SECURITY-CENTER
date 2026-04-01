# components/dashboard/ActionCenter.jsx — Documentation

## File Purpose

Displays **prioritized remediation action items** (5,640 bytes) derived from scan findings, presenting them as an actionable checklist for the security team. Bridges the gap between raw vulnerability data and concrete next steps.

## Key Components

### `ActionCenter({ actions })`
Renders a priority-sorted list of `ActionItem` records fetched from `GET /api/v1/dashboard/actions`.

**Action Item Display:**
Each item shows:
- Priority badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with color coding
- Title — Short, actionable description (e.g., "Patch Redis Authentication")
- Description — 1–2 sentences of context
- Type tag — `vulnerability_fix`, `configuration_change`, `monitoring`
- "Mark Done" checkbox — Updates item status via API

**Sorting:** Displayed in priority order: Critical → High → Medium → Low.

**Empty State:** Shows a "All clear — no pending actions" state with a success icon when all items are resolved.

## Dependencies
- `react`, `@tanstack/react-query`, `useMutation`
- `../../services/api.js` — `dashboardService.getActionItems`
