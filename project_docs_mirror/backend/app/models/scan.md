# models/scan.py — Documentation

## File Purpose

Defines all **SQLAlchemy ORM database models** (table schemas) for the Orchestration Security Center platform. This is the single source of truth for the relational data structure, mapping Python classes to database tables and their columns, types, constraints, and relationships.

## Key Enumerations

### `ScanStatus(str, enum.Enum)`
Represents the lifecycle state of a scan job.
- `QUEUED` — Created but not yet started by a worker
- `RUNNING` — Actively being processed by the AI agent pipeline
- `COMPLETED` — Successfully finished; results are available
- `FAILED` — Terminated with an error

### `SeverityLevel(str, enum.Enum)`
CVSS-aligned severity classification for vulnerabilities.
- `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`

### `VulnStatus(str, enum.Enum)`
Tracks the remediation workflow status of a vulnerability.
- `OPEN` — Newly discovered, not yet addressed
- `FIXED` — Remediation confirmed
- `FALSE_POSITIVE` — Marked invalid by validation agent or analyst
- `ACCEPTED` — Risk accepted by the organization

## Key Models (Database Tables)

### `Target` → table `targets`
Represents a registered application or network endpoint to be scanned.

**Key Columns:**
- `id` (UUID string, PK) — Auto-generated UUID primary key
- `name` — Human-readable label for the target
- `base_url` — The root URL or IP address of the target
- `source` — How the target was registered (`manual`, `discovery`, `aws`)
- `tech_stack` (JSON) — Detected technology fingerprint (populated by ReconAgent)
- `auth_method` / `auth_credentials` (JSON) — Authentication configuration for authenticated scans
- `asset_value` / `data_sensitivity` — Business context classifications using database Enum types

**Relationships:** One-to-many with `Scan` and `Endpoint` (both cascade-delete on target removal).

---

### `Scan` → table `scans`
Represents a single scan session, tracking the lifecycle from queued to completed.

**Key Columns:**
- `id` (UUID string, PK) — Auto-generated UUID primary key
- `target_id` — Foreign key to `targets.id` (nullable for legacy url-only scans)
- `target_url` — Legacy field storing the URL string directly (backward compatibility)
- `status` (Enum `ScanStatus`) — Current state of the scan
- `scan_type` — `"full"`, `"quick"`, or `"custom"`
- `agent_thoughts` (JSON) — Stores the AI reasoning chain summary
- `configuration` (JSON) — Optional scan configuration overrides
- `risk_score` (Float) — Aggregated risk score computed by `UnifiedRiskEngine`

**Properties:**
- `vulnerabilities_count` — Dynamically counts related vulnerabilities
- `assets_count` — Dynamically counts related scan assets
- `target_display` — Returns the effective display URL (from `target_url` or the related `Target.base_url`)

**Relationships:** One-to-many with `Vulnerability`, `AgentLog`, `ScanAsset`, and `ActionItem` (all cascade-delete).

---

### `Vulnerability` → table `vulnerabilities`
Stores every security finding discovered by the attack and validation agents.

**Key Columns:**
- `type` — Vulnerability class (e.g., `"SQL Injection"`, `"XSS"`, `"BOLA"`, `"Unprotected Redis Database"`)
- `severity` (Enum `SeverityLevel`) — Severity rating
- `status` (Enum `VulnStatus`) — Remediation workflow status
- `url` — The affected URL
- `evidence` (JSON) — HTTP request/response pair or port evidence
- `confidence_score` (Float, 0–1) — Confidence rating from the AttackAgent
- `ai_validation_result` (JSON) — Full LLM validation response from ValidationAgent
- `proof_of_concept` — Reproducible attack demonstration
- `remediation` / `remediation_steps` — AI-generated fix guidance
- `ticket_id` — External issue tracker ID (Jira/Linear) for workflow integration
- `simplified_description` — AI-generated plain-language explanation for non-technical users

---

### `AgentLog` → table `agent_logs`
Provides an immutable audit trail of every action taken by every AI agent during a scan.

**Key Columns:**
- `agent_name` — Which agent created this log (`recon_agent`, `attack_agent`, `validation_agent`, `siem_agent`)
- `action` — Specific action identifier (e.g., `"start_recon"`, `"recon_complete"`, `"attack_failed"`)
- `reasoning` (JSON) — The agent's chain-of-thought for transparency
- `input_data` / `output_data` (JSON) — Structured input and output of the agent action
- `timestamp` — When the action occurred

---

### `Endpoint` → table `endpoints`
Discovered API endpoints on a registered target, populated by the ReconAgent.

**Key Columns:**
- `url`, `method` — The endpoint URL and HTTP method
- `parameters` (JSON) — Discovered query or body parameters
- `authentication_required` (Boolean) — Whether the endpoint requires authentication
- `discovered_at`, `last_tested` — Discovery and test timestamps

---

### Legacy Models (Backward Compatibility)

**`ScanAsset`** → table `scan_assets`: Network hosts discovered during Nmap scans (IP, hostname, MAC, OS fingerprint, device type).

**`AssetService`** → table `asset_services`: Running services on a `ScanAsset` (port, protocol, service name, version, CPE string).

**`NetworkAsset`** → table `network_assets`: Persistent network inventory across scan sessions.

**`ActionItem`** → table `action_items`: Remediation action items generated from a scan, with priority and status tracking.

## Dependencies

### Internal
- `app.core.database.Base` — The declarative base class

### External
- `sqlalchemy` — Column types, relationships, ORM decorators
- `datetime`, `enum`, `uuid` — Standard library modules for defaults
