# components/ui/CyberButton.jsx — Documentation

## File Purpose

A **reusable styled button primitive** (2,360 bytes) providing consistent button styling across the dashboard with multiple variants, loading states, and icon support.

## Key Components

### `CyberButton({ children, variant, size, loading, disabled, onClick, icon })`

**Variants:**
- `"primary"` — Solid accent color (blue/indigo gradient) — for primary actions
- `"danger"` — Solid red — for destructive actions (stop scan, delete)
- `"ghost"` — Transparent with border — for secondary actions
- `"success"` — Green — for confirmations

**Loading State:** When `loading={true}`, replaces `children` with a spinning loader SVG and disables pointer events.

**Icon Support:** Accepts an `icon` prop (React element) rendered to the left of the label text.

**Disabled State:** Reduces opacity and sets `cursor: not-allowed` when `disabled={true}`.

## Dependencies
- `react`
