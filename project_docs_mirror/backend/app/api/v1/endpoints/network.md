# endpoints/network.py — Documentation

## File Purpose

Provides the **network asset inventory API**, exposing data about discovered hosts, their services, and newly observed devices. Powers the `NetworkTopology` and `AssetDetailPanel` components.

## Key Endpoints

### `GET /network/assets` — `get_assets(status, db)`
Returns all `NetworkAsset` records from the persistent inventory table. Optionally filtered by `status` (`active`, `offline`). Each item includes IP, hostname, MAC, OS, device type, criticality, and risk score.

### `GET /network/assets/new` — `get_new_devices(db)`
Returns `ScanAsset` records from the most recent scan where `is_new = "true"`. Used to surface the "New Device Detected" notifications in the dashboard. Returns assets ordered by the scan timestamp.

### `GET /network/assets/{ip_address}` — `get_asset_detail(ip_address, db)`
Returns a detailed view of a specific network asset identified by its IP address, including its full service list and historical context. Returns HTTP 404 if the asset is not found in the inventory.

### `GET /network/activity` — `get_activity(limit, db)`
Returns a recent activity feed of scan events and asset changes. Queries the most recent `Scan` records with basic metadata and new device detections, assembled into a unified chronological list. The `limit` query parameter defaults to 20 items.

## Dependencies

### Internal
- `app.core.database.get_db`
- `app.models.scan` — NetworkAsset, ScanAsset, Scan

### External
- `fastapi` — APIRouter, Depends
- `sqlalchemy.orm.Session`
