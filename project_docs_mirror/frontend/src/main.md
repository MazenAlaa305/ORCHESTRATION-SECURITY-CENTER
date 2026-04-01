# frontend/src/main.jsx — Documentation

## File Purpose

The **React application entry point**. Mounts the root React component tree into the HTML DOM and configures global providers that wrap the entire application.

## Key Logic

### QueryClient Initialization
Creates a `QueryClient` instance from `@tanstack/react-query` with customized default options:
- `refetchOnWindowFocus: false` — Prevents data refetching when the browser window regains focus, avoiding disruptive UI refreshes in a long-running dashboard session.
- `retry: 1` — Failed queries are retried once before throwing an error, balancing resilience with user feedback speed.

### Application Render
Uses `ReactDOM.createRoot()` (React 18 concurrent API) to mount the root `<App>` component into the DOM element with id `"root"` (defined in `frontend/index.html`).

### Provider Hierarchy
The render tree is wrapped in:
1. **`React.StrictMode`** — Enables development-mode checks (double-invoking effects, detecting deprecated APIs). Has no effect in production builds.
2. **`QueryClientProvider client={queryClient}`** — Makes the TanStack Query client available to all descendant components via the `useQuery` and `useMutation` hooks. This is the global server-state management context.

## Dependencies

### Internal
- `./App.jsx` — Root component
- `./index.css` — Global stylesheet

### External
- `react`, `react-dom` — Core React libraries
- `@tanstack/react-query` — Server-state management with caching and polling
