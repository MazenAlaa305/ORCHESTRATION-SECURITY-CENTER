# components/ui/GaugeRing.jsx — Documentation

## File Purpose

An **SVG circular gauge component** (3,147 bytes) that renders an animated ring chart for displaying scores on a 0–100 scale. Used by `RiskScore` and `OpenVAS/RiskChart` components.

## Key Components

### `GaugeRing({ score, size, strokeWidth, color })`
Renders an SVG-based circular progress ring.

**SVG Construction:**
- A background circle in a muted color
- A foreground arc whose length is proportional to `score / 100 * circumference`
- The score value displayed as text in the center

**Animation:** On mount, uses CSS transitions (`stroke-dashoffset`) to animate the arc from 0 to the target score over 800ms with an ease-out curve.

**Color Override:** If `color` is not provided, the color is automatically derived from the score range (green/yellow/orange/red).

**Size:** `size` prop controls the SVG viewBox dimensions. Default is 120x120px.

## Dependencies
- `react` — `useEffect`, `useRef`
