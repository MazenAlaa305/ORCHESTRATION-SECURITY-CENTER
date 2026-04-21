# frontend/src/App.jsx — Documentation

## File Purpose

The **top-level React component** that serves as the root of the application component tree. In the current architecture, it is intentionally thin — it delegates entirely to the `Dashboard` page component, reflecting a single-page application design where all navigation is handled internally within the Dashboard.

## Key Components

### `App()`
A functional React component that renders `<Dashboard />` directly without any additional wrapping logic, layout, or routing. All state management, tab navigation, and feature panels are handled within the `Dashboard` page itself.

## Design Decision

The minimal `App.jsx` is a deliberate architectural choice: since Orchestration Security Center is a single-page dashboard application (not a multi-page site), there is no need for a router or page-level conditional rendering at this level. The `Layout` and `Sidebar` components are composed inside the `Dashboard` page rather than here, keeping this file purely as a React tree root marker.

## Dependencies

### Internal
- `./pages/Dashboard` — The consolidated dashboard page component

### External
- `react` — React library
