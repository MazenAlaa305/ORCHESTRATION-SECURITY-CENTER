# endpoints/targets.py — Documentation

## File Purpose

The **target management endpoint module**. Provides full CRUD operations for registered scan targets and a discovery endpoint that triggers automated subdomain/asset enumeration.

## Key Endpoints

### `POST /targets/` — `create_target(target_in, db)`
Registers a new scan target. Validates that no duplicate target exists with the same `base_url` (returns HTTP 400 if duplicate). Creates a `Target` ORM record from the `TargetCreate` schema and returns the persisted `TargetResponse`.

### `GET /targets/` — `list_targets(skip, limit, db)`
Returns a paginated list of all `Target` records ordered by `created_at` descending. Supports `skip` and `limit` query parameters for pagination.

### `GET /targets/{target_id}` — `get_target(target_id, db)`
Returns a `TargetDetail` response for a single target — includes the full list of discovered `Endpoint` records and `ScanSummary` list for all scans associated with this target. Returns HTTP 404 if not found.

### `PATCH /targets/{target_id}` — `update_target(target_id, target_update, db)`
Updates a target's name, base URL, auth method, and auth credentials. Overwrites all fields from the provided `TargetCreate` body.

### `DELETE /targets/{target_id}` — `delete_target(target_id, db)`
Deletes a target and all cascade-linked records (scans, vulnerabilities, endpoints) using SQLAlchemy's cascade configuration. Returns a confirmation message with the deleted target's ID.

### `POST /targets/discover` — `discover_targets(domain, db)` — async
Triggers the `DiscoveryAgent` to perform subdomain enumeration and web service discovery for a given domain. Instantiates the `DiscoveryAgent` and calls `process_discovery(domain)`. Returns the list of newly registered target objects.

## Dependencies

### Internal
- `app.core.database.get_db`
- `app.models.scan.Target`
- `app.schemas.scan.TargetCreate`, `TargetResponse`, `TargetDetail`
- `app.services.discovery_agent.DiscoveryAgent`

### External
- `fastapi` — APIRouter, Depends, HTTPException
- `sqlalchemy.orm.Session`
