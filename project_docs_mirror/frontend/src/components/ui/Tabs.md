# components/ui/Tabs.jsx — Documentation

## File Purpose

A **lightweight tab switching primitive** (920 bytes) providing a reusable tab bar component used within panels that need sub-tab navigation (e.g., the IncidentDetailDrawer's Evidence / Remediation / AI Assessment tabs).

## Key Components

### `Tabs({ tabs, activeTab, onTabChange })`
Renders a horizontal tab bar.
- `tabs` — Array of `{ id, label }` objects
- `activeTab` — Currently active tab ID
- `onTabChange(id)` — Callback when a tab is clicked

The selected tab gets an active indicator (underline or filled background). This is a pure presentational component — state is managed by the parent.

## Dependencies
- `react`
