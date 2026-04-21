# elastic_integration.py — Documentation

## File Purpose

Provides a **client for Elasticsearch** enabling the backend to index scan findings as SIEM events and query existing security alerts. Used by the `SIEMAgent` for alert retrieval and threat correlation.

## Key Classes

### `ElasticService`

**`__init__()`**
Initializes the Elasticsearch Python client using `settings.ELASTICSEARCH_URL`. Applies a connection test on initialization and logs a warning if Elasticsearch is unreachable.

**`get_recent_alerts(index="wazuh-alerts-*", size=20, time_range="1h") → List[Dict]`**
Queries Elasticsearch for recent security alert documents using the DSL query API. Filters by the `@timestamp` field within the specified time range using a `range` query. Returns a normalized list of alert dictionaries extracted from the `_source` field of each hit.

**`index_scan_result(scan_id, vulnerability) → bool`**
Indexes a single vulnerability finding into Elasticsearch as a structured document in the `osc-findings` index. The document includes scan ID, timestamp, vulnerability type, severity, URL, and confidence score. Returns `True` on successful indexing.

**`get_alert_summary() → Dict`**
Performs an Elasticsearch aggregation query to count alerts grouped by severity level and rule category over the last 24 hours. Returns a summary dictionary used by the dashboard SIEM panel.

**`check_connection() → bool`**
Calls `client.ping()` and returns the result. Used for health checks.

### Module-Level Instance

`elastic_service = ElasticService()` — A singleton imported by the SIEM agent.

## Dependencies

### Internal
- `app.core.config.settings` — `ELASTICSEARCH_URL`

### External
- `elasticsearch` — Official Elasticsearch Python client
- `logging`
