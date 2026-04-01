# openvas.py (services) — Documentation

## File Purpose

Provides a **Python client for the OpenVAS/GVM (Greenbone Vulnerability Management) platform** using the GMP (Greenbone Management Protocol) XML-based API. Enables the backend to programmatically create scan targets, launch scan tasks, poll for completion, and retrieve structured vulnerability results from OpenVAS.

## Key Classes

### `OpenVASClient`

**`__init__()`**
Reads OpenVAS connection parameters from `settings` (host, port, username, password). Initializes the GMP connection object but does not connect until a method is called.

**`connect() → bool`**
Establishes a TLS connection to the OpenVAS GMP service on the configured host and port. Authenticates using the configured credentials. Returns `True` on success, `False` on connection failure. Called before any scan operation.

**`create_target(name, hosts) → str`**
Sends `create_target` GMP XML command to register the target IP/hostname in OpenVAS. Returns the UUID of the created GVM target object.

**`create_scan_task(target_id, config_id=None) → str`**
Creates an OpenVAS scan task using the `create_task` GMP command, linking it to the target UUID. Optionally accepts a scan configuration UUID (defaults to the "Full and Fast" scan configuration). Returns the task UUID.

**`start_task(task_id) → str`**
Sends the `start_task` GMP command to initiate scanning. Returns the report UUID generated for this scan run.

**`get_task_status(task_id) → Dict`**
Queries task status using `get_tasks`. Returns a dictionary with `status` (e.g., `"Running"`, `"Done"`), `progress` (integer 0–100), and `last_error` if applicable.

**`get_results(task_id) → List[Dict]`**
Retrieves vulnerability results from the completed scan using `get_results`. Parses the GMP XML response and normalizes each NVT (Network Vulnerability Test) result into a standard finding dictionary:
- `type` → NVT name
- `severity` → CVSS-mapped severity level
- `cve_id` → Associated CVE identifier if available
- `host`, `port`, `protocol` → Network location of the finding
- `description` → NVT description text

**`quick_scan(target_ip, target_name) → Dict`**
A convenience method that orchestrates a complete quick scan in one call: creates target → creates task → starts task → polls status → retrieves results. Returns `{task_id, report_id, status, results}`.

**`close()`**
Cleanly disconnects the GMP session.

## Dependencies

### Internal
- `app.core.config.settings` — OpenVAS connection parameters

### External
- `python-gvm` — Official Greenbone Python GVM/GMP client library
- `xml.etree.ElementTree` — For supplementary XML parsing
- `logging`
