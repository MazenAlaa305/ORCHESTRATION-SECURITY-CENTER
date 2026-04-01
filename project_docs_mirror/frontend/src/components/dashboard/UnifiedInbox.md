# components/dashboard/UnifiedInbox.jsx — Documentation

## File Purpose

A **unified notification and alert inbox** (6,323 bytes) aggregating new device alerts, critical vulnerability discoveries, SIEM alerts, and action item reminders into a single priority-sorted list with acknowledge/dismiss controls.

## Key Components

### `UnifiedInbox({ alerts, onAcknowledge })`
Renders a list of notification items from multiple sources.

**Alert Sources:**
- New network devices (from `networkService.getNewDevices()`)
- Critical/High vulnerabilities discovered in the last scan
- Wazuh/Elasticsearch SIEM alerts
- Overdue action items

**Item Display:**
Each notification shows: icon (type-specific), title, timestamp, severity badge, and "Acknowledge" / "View Details" buttons.

**Acknowledge Logic:** Clicking "Acknowledge" marks the notification as read in local state (no full persistence — persists only for the session). Read notifications are dimmed and moved to the bottom of the list.

**Unread Count Badge:** The inbox renders an unread count that is also reflected as a badge on the Sidebar navigation icon.

## Dependencies
- `react`, `@tanstack/react-query`
- `../../services/api.js`
