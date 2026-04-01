# frontend/package.json — Documentation

## File Purpose

The **Node.js project manifest** for the React frontend. Defines project metadata, build and development scripts, and all NPM package dependencies.

## Key Sections

### `scripts`
| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Starts the Vite development server with HMR at `http://localhost:5173` |
| `build` | `vite build` | Produces an optimized production bundle in the `dist/` directory |
| `preview` | `vite preview` | Serves the production build locally for testing |
| `test` | `jest` or `vitest` | Runs the test suite |

### `dependencies` (Runtime)
- **`react`**, **`react-dom`** — Core React libraries
- **`@tanstack/react-query`** — Server-state management with caching, polling, and invalidation
- **`axios`** — HTTP client for all backend API communication
- **`lucide-react`** — Icon library used throughout the dashboard

### `devDependencies` (Build-Time)
- **`vite`** — Fast frontend build tool and dev server
- **`@vitejs/plugin-react`** — Vite plugin for React JSX and HMR support
- **`tailwindcss`** — Utility-first CSS framework
- **`postcss`**, **`autoprefixer`** — CSS processing pipeline for Tailwind
- **`@testing-library/react`** — React component testing utilities

## Dependencies

- **Node.js** ≥ 18
- **npm** or **yarn** as the package manager
