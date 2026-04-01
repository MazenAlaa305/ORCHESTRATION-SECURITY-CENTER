# components/ErrorBoundary.jsx — Documentation

## File Purpose

A **React class component error boundary** (1,286 bytes) that catches JavaScript errors in any child component tree and displays a fallback UI instead of crashing the entire application. Placed at strategic points in the component hierarchy to isolate failures.

## Key Components

### `ErrorBoundary extends React.Component`

**`static getDerivedStateFromError(error)`**
A static lifecycle method called when a descendant component throws. Returns `{ hasError: true }` to trigger the fallback render.

**`componentDidCatch(error, info)`**
Called after an error is caught. Logs the `error` and `info.componentStack` to the console for debugging. In production, this could send error reports to a monitoring service (e.g., Sentry).

**`render()`**
If `hasError` is `true`, renders a user-friendly error panel with: an error icon, "Something went wrong" heading, optional error message (in development mode), and a "Reload" button that calls `window.location.reload()`. Otherwise, renders `this.props.children` normally.

## Dependencies
- `react` — React Class Component (must be a class component — functional components cannot be error boundaries)
