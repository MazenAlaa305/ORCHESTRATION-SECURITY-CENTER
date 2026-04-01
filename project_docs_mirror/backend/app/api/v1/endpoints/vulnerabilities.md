# endpoints/vulnerabilities.py — Documentation

## File Purpose

The **vulnerability management endpoint module**. Provides filtering, retrieval, status updates, PoC access, AI re-validation, and workflow management (ticket assignment, analyst assignment) for vulnerability records.

## Key Endpoints

### `GET /vulnerabilities/` — `list_vulnerabilities(scan_id, severity, status, host, limit, db)`
Returns a filtered list of `VulnerabilityResponse` objects. Supports multi-dimensional filtering:
- `scan_id` → Filter to a specific scan's findings
- `severity` → Filter by severity level (`critical`, `high`, `medium`, `low`, `info`)
- `status` → Filter by workflow status (`open`, `fixed`, `false_positive`, `accepted`)
- `host` → Filter by network host IP/hostname (legacy network scan findings)
- `limit` → Maximum results (default 100)

### `GET /vulnerabilities/{vuln_id}` — `get_vulnerability(vuln_id, db)`
Retrieves the full `VulnerabilityResponse` for a specific finding, including AI validation results, evidence, remediation steps, and confidence score.

### `PATCH /vulnerabilities/{vuln_id}` — `update_vulnerability(vuln_id, vuln_in, db)`
Partial-update endpoint using `VulnerabilityUpdate` schema. Updates only the fields explicitly provided in the request body (via `exclude_unset=True`). Primarily used to update `status` and `remediation` text.

### `GET /vulnerabilities/{vuln_id}/poc` — `get_proof_of_concept(vuln_id, db)`
Returns the `proof_of_concept` text and `remediation` text for a vulnerability. Powers the PoC download/copy feature in the `VulnerabilitiesPanel` component.

### `POST /vulnerabilities/{vuln_id}/revalidate` — `revalidate_vulnerability(vuln_id, db)` — async
Triggers an on-demand AI re-validation of a specific vulnerability finding.

**Logic:**
1. Fetches the `Vulnerability` record asynchronously.
2. Instantiates a `ValidationAgent` with the scan's database session.
3. Constructs a synthetic `finding` dictionary from the vulnerability's fields.
4. Calls `agent._validate_with_llm(finding)` to get a fresh LLM assessment.
5. Updates `vuln.ai_validation_result`, `vuln.confidence_score`, and optionally changes status to `FALSE_POSITIVE` if the LLM verdict is negative.
6. Returns the validation result dictionary.

### `PATCH /vulnerabilities/{vuln_id}/workflow` — `update_workflow(vuln_id, ticket_id, assigned_to, status, db)`
Manages the vulnerability remediation workflow. Accepts optional query parameters to update the `ticket_id` (e.g., Jira ticket number), `assigned_to` (email or analyst ID), and `status`. Only provided fields are updated.

## Dependencies

### Internal
- `app.core.database.get_db`, `get_async_db`
- `app.models.scan.Vulnerability`, `VulnStatus`
- `app.schemas.scan.VulnerabilityResponse`, `VulnerabilityUpdate`
- `app.services.agent_orchestrator.ValidationAgent`

### External
- `fastapi` — APIRouter, Depends, HTTPException, Query
- `sqlalchemy` — Session, AsyncSession, select
