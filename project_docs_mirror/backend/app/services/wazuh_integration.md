# wazuh_integration.py — Documentation

## File Purpose

Provides a **client for the Wazuh SIEM REST API**, enabling the backend to query active Wazuh agents, retrieve security alerts indexed with severity levels, and check agent health status. Used by the `SIEMAgent` for threat correlation and by the `siem` API endpoint for dashboard data display.

## Key Classes

### `WazuhService`

**`__init__()`**
Reads Wazuh API connection parameters from `settings` (URL, user, password). Initializes the internal HTTP session. SSL certificate verification is typically disabled for internal deployments (`verify=False`).

**`authenticate() → str`**
Sends `POST /security/user/authenticate` with Basic Auth credentials to the Wazuh API. Returns the JWT bearer token which is used in all subsequent requests via the `Authorization: Bearer` header.

**`get_agents(status=None) → List[Dict]`**
Queries `GET /agents` with an optional `status` filter (`active`, `disconnected`, `never_connected`). Returns a list of agent dictionaries containing `id`, `name`, `ip`, `os.name`, `status`, and `version`.

**`get_alerts(time_range="1h", severity_level=3, limit=20) → List[Dict]`**
Queries the Wazuh API for recent security alerts filtered by minimum rule severity level. Normalizes each alert into: `agent_name`, `timestamp`, `rule_description`, `rule_level`, `rule_id`, and raw `data` fields.

**`get_alert_count_by_severity() → Dict`**
Aggregates a count of alerts per severity level over the last 24 hours. Returns a dictionary mapping severity labels to counts, used for the dashboard's SIEM statistics panel.

**`check_connection() → bool`**
Tests the Wazuh API connectivity and authentication. Returns `True` if the token is successfully obtained.

### Module-Level Instance

`wazuh_service = WazuhService()` — A singleton client instance imported by the SIEMAgent and the SIEM endpoint.

## Dependencies

### Internal
- `app.core.config.settings` — Wazuh API credentials and URL

### External
- `httpx` or `requests` — HTTP client for API communication
- `logging`
