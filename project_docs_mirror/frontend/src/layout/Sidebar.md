# frontend/src/layout/Sidebar.jsx — Documentation

## File Purpose

The **primary navigation component** for the Found 404 dashboard. Renders a vertical sidebar with icon+label navigation links for all major dashboard sections. Supports a collapsible mode for more screen real estate on smaller displays.

## Key Logic

### `Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse })`
Receives the current active tab, a tab-change callback, and the collapse state from the parent `Layout`.

**Navigation Items:**
The sidebar renders a list of navigation entries. Each entry has:
- An icon (typically from a library like `lucide-react` or `heroicons`)
- A label string
- A `tab` identifier string (e.g., `"dashboard"`, `"scans"`, `"vulnerabilities"`, `"network"`, `"targets"`, `"reports"`, `"siem"`, `"openvas"`, `"advisor"`)

Clicking an item calls `onTabChange(tab)`, which updates the Dashboard page's active tab state, causing the corresponding content panel to render.

**Active State Highlighting:**
The navigation item matching `activeTab` receives a highlighted CSS class (active background color, accent border, bright text) to indicate the current section.

**Collapse Toggle:**
A toggle button at the top or bottom of the sidebar calls `onToggleCollapse()`. In collapsed mode, only icons are shown (labels are hidden). Width transitions smoothly via CSS.

**Footer Section:**
The sidebar includes a footer area with system status indicators (e.g., backend connection status) and a user profile summary showing the logged-in user's name.

### Responsive Behavior
On smaller viewports, the sidebar may auto-collapse or be hidden behind a hamburger-menu toggle. The `Layout` applies the appropriate content margin based on the sidebar's current width.

## Dependencies

### Internal
- Icon library imports (e.g., `lucide-react`)
- Tailwind CSS utility classes for styling

### External
- `react` — React core with `useState`
