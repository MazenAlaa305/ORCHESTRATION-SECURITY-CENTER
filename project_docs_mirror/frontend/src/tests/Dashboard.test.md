# frontend/src/tests/Dashboard.test.js — Documentation

## File Purpose

A **basic smoke test suite** for the Dashboard component. Verifies that the main page renders without crashing and that key UI elements are present on initial load.

## Key Test Functions

### `test('renders without crashing')`
Renders the `<App />` component wrapped in `QueryClientProvider` and `AuthContext`. Asserts that no exceptions are thrown and that the component tree renders.

### `test('shows loading state initially')`
Asserts that skeleton loading placeholders are present immediately on render, before any API responses arrive. Verifies the presence of loading shimmer elements.

### `test('renders sidebar navigation')`
Asserts that the sidebar navigation links are rendered, verifying the keys tabs (Dashboard, Scans, Vulnerabilities, Network) are present in the DOM.

## Dependencies

### External
- `@testing-library/react` — `render`, `screen`
- `@testing-library/jest-dom` — Custom matchers (`toBeInTheDocument`)
- `@tanstack/react-query` — `QueryClient`, `QueryClientProvider`
- `jest` or `vitest` — Test runner
