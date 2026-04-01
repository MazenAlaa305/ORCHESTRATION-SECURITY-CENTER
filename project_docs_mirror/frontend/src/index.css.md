# frontend/src/index.css — Documentation

## File Purpose

The **global stylesheet** for the React application. Establishes the base design system, CSS custom properties (design tokens), typographic defaults, and shared utility classes used across all components. This file is imported once in `main.jsx` and applies globally to the entire application.

## Key Sections

### CSS Custom Properties (Design Tokens)
Defines CSS variables on the `:root` selector establishing the design system foundation:
- **Color Palette**: Background shades (`--bg-primary`, `--bg-secondary`, `--bg-card`), text colors, accent colors, severity colors
- **Typography**: Font size scale, font weight tokens
- **Spacing**: Custom spacing multiples if any extend Tailwind's scale
- **Border Radius**: Consistent rounding values
- **Shadows**: Box shadow recipes for card depth effects

### Base Reset & Typography
- Applies `box-sizing: border-box` globally
- Sets the base body font to the configured Google Font (e.g., Inter, Outfit)
- Sets the background color to the dark dashboard background (`var(--bg-primary)`)
- Sets default text color

### Scrollbar Styling
Custom scrollbar styles (`::-webkit-scrollbar`) to match the dark theme — the thin, dark-toned scrollbars that maintain the dashboard aesthetic rather than using the OS default.

### Global Animations
Defines `@keyframes` for:
- `fadeIn` — Used by toast and drawer components
- `slideInRight` — Used by the IncidentDetailDrawer
- `pulse` — Used by status indicators
- `shimmer` — Used by SkeletonPulse loading placeholders

### Gradient Utilities
Supplemented by `gradient-styles.css` (separate import) for complex gradient class definitions.

## Dependencies
- **Tailwind CSS base directives**: `@tailwind base; @tailwind components; @tailwind utilities;`
- **Google Fonts**: Imported via `@import url(...)` at the top of the file
