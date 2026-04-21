# agent_orchestrator.py — Documentation

## File Purpose

The **central intelligence engine** of the Orchestration Security Center platform. Implements a multi-agent AI pipeline using an abstract base class pattern. Each agent encapsulates a distinct phase of the penetration testing workflow. The `AgentOrchestrator` class coordinates the full sequential pipeline from reconnaissance to reporting. Every agent action is logged to the database for complete audit transparency.

---

## Key Classes

### `AgentState(str, Enum)`
Tracks the lifecycle state of an individual agent: `IDLE`, `RUNNING`, `COMPLETED`, `FAILED`.

---

### `BaseAgent(ABC)`
Abstract base class from which all specialized agents inherit. Provides shared infrastructure.

**Constructor `__init__(name, scan_id, db_session)`**
- Stores the agent name, the current scan UUID, and the async SQLAlchemy session.
- Initializes the Gemini LLM client if `settings.GEMINI_API_KEY` is set. Attempts `gemini-2.0-flash` first, falls back to `gemini-pro`.

**`log_action(action, reasoning, input_data, output_data)` — async**
Persists an `AgentLog` record to the database capturing the agent name, action type, structured reasoning JSON, input data, and output data. Also broadcasts the action string to all connected WebSocket clients via `ws_manager.manager.broadcast()`, enabling real-time log streaming in the dashboard.

**`llm_reason(prompt) → str`**
Synchronous wrapper for Gemini API calls. Sends the given prompt string and returns the text response. Returns a placeholder string if the LLM is not configured (demo mode) or if an API error occurs.

**`execute(context) → Dict` — abstract**
Each concrete subclass must implement this method, which receives a context dictionary and returns a results dictionary.

---

### `ReconAgent(BaseAgent)`
**Purpose:** Gather intelligence about the target before any attack payloads are sent.

**`execute(context)` — async**
Receives `{target_url, auth_credentials}` in context.

1. **Infrastructure Recon**: Parses the hostname from `target_url` and runs `NmapWrapper.scan_target()` to discover open ports and services.
2. **Playwright Crawl** (if a browser context is available): Opens the target URL in a headless browser, extracts all `<a href>` links and `<form>` elements using JavaScript evaluation, and detects the tech stack from HTTP response headers and page content.
3. **httpx Fallback**: If Playwright is unavailable or fails, uses `httpx.AsyncClient` to make a simple GET request and extract minimal tech information.
4. **Endpoint Persistence**: Saves discovered URLs as `Endpoint` records in the database, linked to the target. Limited to 50 endpoints.
5. Returns `{endpoints, tech_stack, forms, assets, total_discovered}`.

**`_detect_tech_stack(headers, content) → Dict`**
Analyzes HTTP response headers (looking for `Server`, `X-Powered-By`) and page HTML content (searching for framework signatures like `react`, `vue`, `angular`, `wordpress`) to build a technology fingerprint dictionary.

---

### `AttackAgent(BaseAgent)`
**Purpose:** Execute targeted payloads against discovered endpoints and assess infrastructure assets.

**Payload Library**:
A dictionary of attack type → payload strings covering: `sqli`, `xss`, `bola`, `ssrf`.

**Service-to-Template Map**:
A dictionary mapping Nmap-discovered service names (e.g., `"redis"`, `"http"`, `"ssh"`) to Nuclei template tag sets, enabling context-aware vulnerability scanning.

**`execute(context)` — async**
Receives `{endpoints, forms, assets, auth_token}`.

1. **Template Selection**: Maps discovered service names from Nmap results to Nuclei template tags. Logs the selection reasoning.
2. **Concurrent Payload Testing**: Uses `asyncio.Semaphore(10)` to limit concurrency to 10 simultaneous requests. For each endpoint, calls `_analyze_endpoint()` to determine applicable attack types, then fires payloads concurrently via `asyncio.gather()`.
3. **Infrastructure Heuristics**: Applies fixed rules to discovered network assets — port 6379 (Redis without auth) → Critical; port 3000 (Juice Shop) → High; port 80 with Nginx → Medium.
4. **Form Testing**: Tests up to 10 discovered HTML forms with XSS payloads via `_test_form()`.
5. **Persistence**: Saves all findings as `Vulnerability` records in the database.
6. Returns `{findings, tested_count, vulnerability_count}`.

**`_analyze_endpoint(url) → List[str]`**
Determines attack types by matching URL patterns: `/id/`, `/user/` → BOLA; `search`, `q=` → XSS + SQLi; `/api/` → SQLi + BOLA; default → XSS.

**`_analyze_response(url, attack_type, payload, status_code, body) → Optional[Dict]`**
Detects vulnerability indicators in HTTP responses: SQL error strings → SQLi; unencoded payload reflection → XSS; 200 response with large body to a traversal path → potential BOLA.

**`_test_form(client, form) → List[Dict]` — async**
Submits XSS payloads to a discovered form's action URL via POST or GET, checks if the payload appears unencoded in the response body.

---

### `ValidationAgent(BaseAgent)`
**Purpose:** Filter false positives and increase confidence in genuine findings before they are presented to users.

**`execute(context)` — async**
Receives `{findings}` from the AttackAgent output.

1. **Confidence Gating**: Any finding with `confidence >= 0.6` passes the first gate.
2. **LLM Second-Pass**: For findings that passed the confidence gate, optionally sends each to `_validate_with_llm()`. The LLM can override the validity determination and adjust the confidence score.
3. **Database Update**: Marks false positives with `VulnStatus.FALSE_POSITIVE` in the database.
4. Returns `{validated, false_positives, validated_count, filtered_count}`.

**`_validate_with_llm(finding) → Dict` — async**
Constructs a structured prompt asking Gemini to classify a finding as `REAL` or `FALSE_POSITIVE` with a confidence score and brief reasoning. Parses the LLM response with regex to extract the verdict and confidence value.

---

### `SIEMAgent(BaseAgent)`
**Purpose:** Analyze SIEM platform data and trigger automated SOAR responses.

**`execute(context)` — async**
1. Checks for `ELASTIC_URL` and `WAZUH_URL` environment variables. Logs an error if missing.
2. If Elasticsearch alerts are available, sends each to Gemini for threat classification — verdict (`THREAT/BENIGN`), confidence, and action recommendation (`BLOCK_IP/ISOLATE_HOST/NONE`).
3. For confirmed threats, triggers the appropriate n8n SOAR webhook.
4. Returns `{findings, actions_taken}`.

---

### `AgentOrchestrator`
**Purpose:** Coordinates the full agent pipeline for a given scan.

**`__init__(scan_id, db_session)`**
Stores the scan ID and database session. Instantiates all specialized agents.

**`run_full_scan(target_url, auth_credentials)` — async**
Top-level pipeline execution method:
1. Updates the `Scan` record status to `RUNNING`.
2. Calls `ReconAgent.execute()` → passes result to `AttackAgent.execute()`.
3. Passes attack findings to `ValidationAgent.execute()`.
4. Calls `SIEMAgent.execute()` (if SIEM is configured).
5. Computes the final risk score using `UnifiedRiskEngine`.
6. Updates the `Scan` record with final status (`COMPLETED` or `FAILED`), risk score, and agent thoughts summary.

## Dependencies

### Internal
- `app.core.config.settings` — API key access
- `app.models.scan` — ORM models (AgentLog, Scan, Vulnerability, Endpoint, etc.)
- `app.services.unified_risk_engine.UnifiedRiskEngine` — Final risk scorer
- `app.services.ws_manager.manager` — WebSocket broadcast
- `app.services.nmap_wrapper.NmapWrapper` — Infrastructure scanner

### External
- `google.generativeai` — Gemini LLM SDK
- `httpx` — Async HTTP client for payload delivery
- `playwright.async_api` — Headless browser for JavaScript-rendered crawling
- `sqlalchemy.ext.asyncio` — Async database session
