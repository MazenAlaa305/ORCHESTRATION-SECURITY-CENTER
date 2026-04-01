# components/ui/Toast.jsx — Documentation

## File Purpose

Implements the **toast notification system** (2,320 bytes) for displaying transient in-app alerts (success confirmations, error messages, informational notices) that appear and auto-dismiss.

## Key Components

### `Toast({ message, type, onDismiss })`
Renders a single toast notification item.

**Types:** `"success"` (green with checkmark), `"error"` (red with X), `"warning"` (amber with alert), `"info"` (blue with i).

**Auto-Dismiss:** Uses `useEffect` with `setTimeout` to call `onDismiss()` after a configurable duration (default 4000ms).

**Animation:** Slides in from the bottom-right corner on mount and slides out on dismiss using CSS keyframe animations.

### `ToastProvider` (in `components/ToastProvider.jsx`)
The companion context provider that manages the queue of active toast notifications. Provides a `useToast()` hook that components use to fire toasts: `const { toast } = useToast(); toast.success("Scan started!")`.

## Dependencies
- `react` — `useEffect`, `useState`
