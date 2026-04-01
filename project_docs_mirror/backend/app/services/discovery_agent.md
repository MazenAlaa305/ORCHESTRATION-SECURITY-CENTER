# discovery_agent.py — Documentation

## File Purpose

Implements an **automated target discovery mechanism** that scans a given domain or CIDR range to find web application endpoints that should be added as scan targets. Used to support the "Auto-Discover" feature in the Targets Manager UI.

## Key Classes

### `DiscoveryAgent`

**`discover_from_domain(domain) → List[Dict]`**
Given a domain name, performs subdomain enumeration and port discovery to identify potential web application targets.

**Logic:**
1. Resolves the domain to its IP addresses using DNS lookup.
2. Runs Nmap on the resolved IPs with HTTP/HTTPS specific port detection (80, 443, 8080, 8443, 3000, 5000).
3. For each discovered host with an open web port, constructs a candidate URL (`http://` or `https://` based on port/service).
4. Performs a connectivity check (`HTTP HEAD` request) on each candidate URL to confirm it is responsive.
5. Returns a list of confirmed target dictionaries: `{name, base_url, tech_stack, source: "discovery"}`.

**`discover_from_cidr(cidr_range, db) → List[Dict]`**
Performs a host sweep across a CIDR range (e.g., `192.168.1.0/24`) using Nmap's ping sweep (`-sn`). For each live host, performs port-specific checks for web services. Returns confirmed web targets.

**`save_discovered_targets(targets, db) → List[str]`**
Persists the discovered target dictionaries as `Target` ORM records in the database, avoiding duplicates by checking for existing `base_url` entries. Returns a list of newly created target IDs.

## Dependencies

### Internal
- `app.services.nmap_wrapper.NmapWrapper`
- `app.models.scan.Target`

### External
- `httpx` — Connectivity verification
- `socket` — DNS resolution
- `ipaddress` — CIDR range parsing
