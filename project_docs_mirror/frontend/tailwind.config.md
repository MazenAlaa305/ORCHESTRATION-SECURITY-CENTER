# frontend/tailwind.config.js — Documentation

## File Purpose

The **Tailwind CSS configuration file** that extends the default Tailwind theme with custom design tokens specific to the Found 404 cybersecurity dashboard aesthetic.

## Key Configuration Sections

### `content`
Defines the files Tailwind scans to determine which utility classes are used:
```
["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
```
This enables Tailwind's JIT (Just-In-Time) compiler to purge unused CSS in production, keeping the bundle size minimal.

### `theme.extend`
Adds custom design tokens on top of the Tailwind defaults:

**Custom Colors:**
- Cybersecurity color palette: deep navy backgrounds, bright accent blues, severity-specific reds, ambers, and greens
- Semantic color aliases for `--color-critical`, `--color-high`, `--color-medium`, `--color-low`

**Custom Fonts:**
- Includes the Inter or Outfit sans-serif font referenced in the project

**Custom Animations:**
- `pulse-glow` — A CSS keyframe animation for the risk score glow effect
- `scan-sweep` — A sweeping animation for the scanning banner

**Custom Breakpoints:**
- If any custom responsive breakpoints are defined beyond Tailwind's defaults

### `plugins`
May include Tailwind plugins such as `@tailwindcss/forms` for better form styling or custom plugin definitions.

## Dependencies
- **`tailwindcss`** — Core framework
- **`postcss`** — CSS processing pipeline
