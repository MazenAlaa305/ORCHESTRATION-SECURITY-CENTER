# components/ui/SkeletonPulse.jsx — Documentation

## File Purpose

A **loading skeleton placeholder component** (1,200 bytes) that renders animated gray placeholder shapes to fill content areas while data is being fetched. Improves perceived performance by showing the layout structure immediately.

## Key Components

### `SkeletonPulse({ width, height, className })`
Renders a `div` with a pulsing background animation (`animate-pulse` CSS class or equivalent). Accepts optional `width`, `height`, and additional `className` overrides.

### Common Usage Patterns
- `<SkeletonPulse height="h-4" width="w-3/4" />` — Placeholder for a text line
- `<SkeletonPulse height="h-32" />` — Placeholder for a card or chart
- Multiple `SkeletonPulse` components stacked to simulate a table or list

Used in every panel component during the `isLoading` state of `useQuery` hooks.

## Dependencies
- `react`
