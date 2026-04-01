# api.py — Documentation

## File Purpose

The **central API router aggregator**. This module creates a single `api_router` object and attaches all domain-specific sub-routers to it with their respective URL prefixes and OpenAPI tags. The resulting router is then mounted on the FastAPI application in `main.py` under the `/api/v1` prefix.

## Key Logic

### `api_router = APIRouter()`
Creates the root router object that will be registered with the FastAPI app. All endpoint routers are included into this object.

### Router Registration (Core Endpoints)
Three primary PentesterFlow routers are registered as the main API surface:
- `targets.router` at `/targets` (tag: `targets`) — CRUD for registered scan targets
- `scans.router` at `/scans` (tag: `scans`) — Scan lifecycle management + AI scan initiation
- `vulnerabilities.router` at `/vulnerabilities` (tag: `vulnerabilities`) — Vulnerability management and workflow

### Router Registration (Legacy/Supplementary Endpoints)
Five additional routers support dashboard features and external tool integrations:
- `reports.router` at `/reports` — PDF report generation
- `network.router` at `/network` — Network asset inventory management
- `dashboard.router` at `/dashboard` — Risk overview and action item aggregation
- `openvas.router` at `/openvas` — Direct OpenVAS scan control
- `siem.router` at `/siem` — SIEM alert retrieval

### `root()` — `GET /`
A simple version check endpoint returning a confirmation message and API version number (`"2.0"`).

## Interaction with Other Files
- Imported and registered by `app/main.py`: `app.include_router(api_router, prefix=settings.API_V1_STR)`
- References all 8 endpoint modules from `app/api/v1/endpoints/`

## Dependencies

### Internal
- `app.api.v1.endpoints.{scans, reports, network, targets, vulnerabilities, dashboard, openvas, siem}` — All endpoint routers

### External
- `fastapi.APIRouter` — Router composition class
