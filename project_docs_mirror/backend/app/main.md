# main.py — Documentation

## File Purpose

The **application entry point** for the FastAPI backend. This module creates the FastAPI application instance, configures Cross-Origin Resource Sharing (CORS) middleware, registers the versioned API router, and defines the WebSocket endpoint for real-time log streaming. It is the first module loaded by the Uvicorn ASGI server.

## Key Functions / Classes

### Module-Level Setup

**`Base.metadata.create_all(bind=engine)`**
Called at module import time (before the app object is used). Uses the synchronous SQLAlchemy engine to automatically create all database tables defined in `app/models/scan.py` if they do not already exist. This is the development-mode table creation strategy; in production, Alembic migrations handle schema changes.

**`app = FastAPI(...)`**
Instantiates the main FastAPI application with:
- `title`: Pulled from `settings.PROJECT_NAME` ("SME Cyber Exposure Dashboard")
- `openapi_url`: Constructs the Swagger/OpenAPI documentation URL as `/api/v1/openapi.json`

### CORS Middleware Configuration

**`app.add_middleware(CORSMiddleware, ...)`**
Applied conditionally if `settings.BACKEND_CORS_ORIGINS` is non-empty. Configures the allowed origins list (default: `http://localhost:5173` for Vite dev server, `http://localhost:3000`). All methods and headers are permitted, and credentials (cookies) are allowed. This enables the React SPA to make authenticated API calls from a different port during development.

### `websocket_endpoint(websocket: WebSocket)`
**Route**: `GET /ws/logs` (WebSocket upgrade)

Manages a persistent WebSocket connection for real-time log streaming. Upon a client connecting, calls `manager.connect(websocket)` from `ws_manager.py` to register the socket. Enters an infinite `while True` loop that calls `websocket.receive_text()` to keep the connection alive (discarding incoming messages — it is a server-push channel). When the connection is broken or an exception is thrown, calls `manager.disconnect(websocket)` to clean up.

### `read_root()`
**Route**: `GET /`

A simple health-check endpoint returning a welcome JSON message. Used by automation scripts (e.g., `lab_setup.ps1`) to verify the backend is running before proceeding with database seeding.

## Dependencies

### Internal
- `app.core.config.settings` — Application configuration object
- `app.api.api.api_router` — Aggregated router containing all `/api/v1/*` routes
- `app.core.database.engine`, `Base` — SQLAlchemy engine and declarative base for table creation
- `app.services.ws_manager.manager` — WebSocket connection manager

### External
- `fastapi` — The ASGI web framework
- `fastapi.middleware.cors.CORSMiddleware` — CORS header injection middleware
