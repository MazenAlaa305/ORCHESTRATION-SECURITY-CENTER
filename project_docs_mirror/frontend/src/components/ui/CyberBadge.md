# components/ui/CyberBadge.jsx — Documentation

## File Purpose

A **reusable severity/status badge primitive** (2,121 bytes) used across the entire dashboard to display standardized severity labels, scan status labels, and vulnerability status indicators with consistent color coding.

## Key Components

### `CyberBadge({ label, severity, size })`
Renders a small, pill-shaped badge.

**Severity-to-Color Mapping:**
| Severity | Background | Text |
|---|---|---|
| `critical` | Deep red | White |
| `high` | Orange | White |
| `medium` | Amber | Dark |
| `low` | Blue | White |
| `info` | Gray | White |
| `queued` | Gray | White |
| `running` | Blue with pulse | White |
| `completed` | Green | White |
| `failed` | Red | White |
| `open` | Red | White |
| `fixed` | Green | White |
| `false_positive` | Gray/strikethrough | White |

**Size Variants:** `sm` (text-xs, py-0.5), `md` (text-sm, py-1, default), `lg` (text-base, py-1.5).

## Dependencies
- `react`
