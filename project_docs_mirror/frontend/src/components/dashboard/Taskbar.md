# components/dashboard/Taskbar.jsx — Documentation

## File Purpose

Renders the **horizontal top application bar** (3,404 bytes) displayed above the main content area — containing the organization name, current section title, search functionality, and quick-action buttons.

## Key Components

### `Taskbar({ currentTab, onSearch })`
A horizontal bar component at the top of the main content region.

**Elements:**
- **Page Title**: Dynamic label matching the current active tab (e.g., "Vulnerabilities", "Network Topology")
- **Search Input**: A global search field. On submission, calls `onSearch(query)` which the Dashboard uses to filter the current panel's data.
- **Notification Bell**: Shows the unread alert count from `UnifiedInbox`. Clicking opens the inbox drawer.
- **Refresh Button**: Calls `queryClient.invalidateQueries()` to force a data refresh of all queries.
- **User Avatar**: Displays the current user's initials. Clicking shows a dropdown with "Logout" option.

## Dependencies
- `react`
- `@tanstack/react-query` — for `useQueryClient`
