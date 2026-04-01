# frontend/vite.config.js — Documentation

## File Purpose

The **Vite build tool configuration** for the frontend application. Configures the development server, plugins, and build options.

## Key Configuration

### Plugins
- `react()` — The `@vitejs/plugin-react` plugin enables JSX transformation and React Fast Refresh (HMR) during development.

### Server Configuration
- `port: 5173` — Development server port (matches the CORS allowed origins list in the backend)
- `proxy` — In development, API requests to `/api` can be proxied to `http://localhost:8000` to avoid CORS with `target: 'http://localhost:8000'`

### Build Configuration
- `outDir: 'dist'` — Output directory for production builds
- `sourcemap: true` (development) — Enables source maps for debugging

## Dependencies
- **`@vitejs/plugin-react`** — Vite React plugin
- **Node.js** runtime
