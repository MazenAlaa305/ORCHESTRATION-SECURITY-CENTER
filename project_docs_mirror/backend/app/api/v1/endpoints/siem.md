# endpoints/siem.py — Documentation

## File Purpose

Exposes a minimal **SIEM data proxy layer**, forwarding dashboard requests for Wazuh/Elasticsearch alert data to the respective integration services and returning normalized summaries for display in the SIEM panel.

## Key Endpoints

### `GET /siem/alerts` — `get_alerts(time_range, severity, limit, db)`
Returns recent security alerts from the SIEM stack.

**Logic:**
1. Calls `wazuh_service.get_alerts(time_range, severity_level)` to query Wazuh for security events.
2. Falls back to `elastic_service.get_recent_alerts(size=limit)` if Wazuh is unreachable.
3. Returns a merged, normalized list with a consistent alert dictionary format.

### `GET /siem/summary` — `get_siem_summary()`
Returns aggregated SIEM statistics.

**Logic:**
Calls `wazuh_service.get_alert_count_by_severity()` and `elastic_service.get_alert_summary()` and merges both into a unified summary dictionary including: alert counts by severity, active agent count, and connection health status for both Wazuh and Elasticsearch.

### `GET /siem/agents` — `get_wazuh_agents()`
Returns the list of all registered Wazuh monitoring agents with their status (active/disconnected). Powers the agent health indicator in the SIEM panel.

## Dependencies

### Internal
- `app.services.wazuh_integration.wazuh_service`
- `app.services.elastic_integration.elastic_service`

### External
- `fastapi` — APIRouter, Depends, HTTPException
