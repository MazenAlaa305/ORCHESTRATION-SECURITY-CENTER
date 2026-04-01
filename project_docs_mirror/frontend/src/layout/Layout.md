# frontend/src/layout/Layout.jsx — Documentation

## File Purpose

The **application shell layout component**. Provides the consistent outer structure for all dashboard views — combining the `Sidebar` navigation with the main content area. All page content is rendered as children within this layout's main content slot.

## Key Logic

### `Layout({ children })`
A functional component that renders the two-panel layout structure.

**Structure:**
- A root container `div` fills the full viewport (`min-h-screen`).
- `<Sidebar />` is rendered as the fixed left-side navigation panel.
- A main content `<div>` receives all `{children}` passed to the layout. Has a left margin matching the sidebar width to prevent content from being hidden behind the sidebar. Applies the page background color and overflow scrolling.

### Sidebar Collapse Handling
If the `Sidebar` supports a collapsed mode (icon-only), the `Layout` responds to a `collapsed` state — switching the content area's left margin between a narrow (icon-only) and wide (full text) value. This typically uses a shared state managed with a callback passed from `Layout` to `Sidebar`.

### Toast Mount Point
The `Layout` also renders the `<ToastProvider />` component if not already mounted at the app root, ensuring toast notifications are available globally within the layout.

## Dependencies

### Internal
- `./Sidebar` — Navigation sidebar component
- `../components/ToastProvider` — Global toast notification container

### External
- `react` — React core
