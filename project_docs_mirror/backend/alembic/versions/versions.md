# alembic/versions/ — Migration Files Documentation

## Directory Purpose

Contains all **Alembic database migration revision files**. Each file represents a versioned schema change applied in sequence to evolve the database structure from the initial schema to the current state. Alembic tracks which migrations have been applied using the `alembic_version` table in the database.

---

## Migration Files

### `42961c8452a4_add_risk_fields.py`
**Adds risk scoring fields to the `scans` and `network_assets` tables.**

- Adds `risk_score FLOAT DEFAULT 0.0` to `scans`
- Adds `criticality ENUM('CRITICAL','HIGH','MEDIUM','LOW') DEFAULT 'MEDIUM'` to `network_assets`
- Adds `risk_score FLOAT DEFAULT 0.0` to `network_assets`

**Upgrade**: Adds columns with safe defaults. **Downgrade**: Drops the added columns.

---

### `8192bff0e1e0_add_openvas_fields.py`
**Adds OpenVAS-specific fields to the `vulnerabilities` table for storing GVM scan results.**

- Adds `cve_id VARCHAR` — CVE identifier from OpenVAS NVT results
- Adds `host VARCHAR`, `port INTEGER`, `protocol VARCHAR`, `service VARCHAR` — Network location fields for infrastructure-level findings
- Adds `description TEXT` — Full vulnerability description text from OpenVAS

**Upgrade**: Adds columns as nullable. **Downgrade**: Drops the added columns.

---

### `97af5de1cc55_add_mac_vendor_fields_and_asset_.py`
**Extends `scan_assets` with MAC address enrichment and AI insight fields.**

- Adds `mac_address VARCHAR` — Hardware MAC address discovered via Nmap ARP scanning
- Adds `mac_vendor VARCHAR` — Vendor name derived from MAC OUI lookup
- Adds `ai_insight JSON` — Structured field for AI-generated intelligence from `IntelligenceAgent`

Also adds `asset_services` table if not already present (for the `AssetService` model).

---

### `c8a2b1c3d4e5_cleanup_legacy_fields.py`
**Removes deprecated columns and cleans up legacy schema artifacts.**

- Drops obsolete columns that were replaced by the new relational model
- Ensures foreign key constraints are properly defined
- This migration is marked as a "cleanup" revision — downgrade is intentionally limited as restoring dropped columns may cause data inconsistencies

## How to Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Check current revision
alembic current

# Generate new migration from model changes
alembic revision --autogenerate -m "description"
```
