# asset_monitor.py — Documentation

## File Purpose

Provides **continuous network asset change detection** by comparing the results of the most recent scan against previously recorded `NetworkAsset` inventory records. Identifies newly discovered assets and assets that have disappeared from the network.

## Key Classes

### `AssetMonitor`

**`check_for_new_assets(scan_id, current_assets, db) → List[Dict]`**
Compares a list of newly discovered `ScanAsset` records against the persistent `NetworkAsset` inventory table.

**Logic:**
1. Fetches all existing `NetworkAsset` records from the database.
2. Builds a set of known IP addresses from the persistent inventory.
3. For each asset in `current_assets`, checks if its `ip_address` exists in the known set.
4. If an asset's IP is not in the known set, it is a **new device**:
   - Creates a new `NetworkAsset` record with current timestamp values for both `first_seen` and `last_seen`.
   - Sets `is_new = "true"` on the corresponding `ScanAsset` record for the current scan.
   - Adds the new asset to the return list.
5. For known assets, updates their `last_seen` timestamp.
6. Returns a list of newly discovered asset dictionaries.

**`get_new_devices_since(cutoff_timestamp, db) → List[NetworkAsset]`**
Queries the `NetworkAsset` table for records where `first_seen > cutoff_timestamp`. Used by the `GET /api/v1/network/assets/new` endpoint to power the "New Devices" alert panel in the dashboard.

**`get_disappeared_assets(current_ips, db) → List[Dict]`**
Identifies `NetworkAsset` records with an IP not present in the current scan's IP list and `last_seen` older than a configurable threshold. Returns them as potential offline or removed devices.

## Dependencies

### Internal
- `app.models.scan.NetworkAsset`, `ScanAsset` — ORM models

### External
- `sqlalchemy.orm.Session` — Database session
- `datetime` — Timestamp comparison
