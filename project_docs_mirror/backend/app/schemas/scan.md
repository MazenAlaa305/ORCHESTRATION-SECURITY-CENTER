# schemas/scan.py — Documentation

## File Purpose

Defines all **Pydantic validation and serialization schemas** used by the FastAPI API layer. These schemas act as contracts between the HTTP layer and the application logic — validating incoming request bodies and structuring outgoing response payloads. They are deliberately separate from the SQLAlchemy ORM models to allow independent evolution of the API surface and the database schema.

## Key Enumerations (Schema Layer)

Mirror of the model-layer enums, re-defined here for use in Pydantic serialization:
- `ScanStatus`, `SeverityLevel`, `VulnStatus` — Same values as in `models/scan.py`

## Key Schema Classes

### Target Schemas

**`TargetCreate(BaseModel)`**
Request body schema for `POST /api/v1/targets/`. Requires `name` (1–255 chars) and `base_url`. Optionally accepts `auth_method` and `auth_credentials`.

**`TargetResponse(BaseModel)`**
Response schema for single target retrieval. Includes all core fields plus `tech_stack`, `created_at`, `updated_at`. The `Config: from_attributes = True` setting enables building this schema from an ORM model object.

**`TargetDetail(TargetResponse)`**
Extended response that includes nested lists of `EndpointResponse` and `ScanSummary` objects. Used for the detailed target view including scan history.

---

### Scan Schemas

**`ScanCreate(BaseModel)`**
Request body for creating a new scan. Accepts either `target_id` (preferred, UUID reference) or `target_url` (legacy, raw URL string). Also accepts `scan_type` (default `"full"`) and `configuration` (optional JSON object for custom scan parameters).

**`ScanSummary(BaseModel)`**
Lightweight scan representation for list views. Includes `id`, `status`, `scan_type`, `started_at`, `completed_at`, `risk_score`, `target_display`, `vulnerabilities_count`, and `assets_count`. The last three are computed ORM properties serialized by `from_attributes = True`.

**`ScanResponse(ScanSummary)`**
Full scan response for individual scan retrieval. Extends `ScanSummary` with `target_id`, `target_url`, and `configuration`.

**`ScanDetail(ScanResponse)`**
Maximum detail level, used for `GET /api/v1/scans/{id}`. Includes all of `ScanResponse` plus nested `agent_thoughts`, `vulnerabilities`, `agent_logs`, `assets`, and `actions` lists — enabling the frontend to show the complete picture of a scan in one API call.

---

### Vulnerability Schemas

**`VulnerabilityBase(BaseModel)`**
Shared base with `type`, `severity`, `url`, `parameter`, and `description`.

**`VulnerabilityCreate(VulnerabilityBase)`**
Extends the base with `scan_id` (required) and `evidence` for creating new findings.

**`VulnerabilityResponse(VulnerabilityBase)`**
Full response schema including `id`, `scan_id`, `status`, `confidence_score`, `ai_validation_result`, `proof_of_concept`, `remediation`, `created_at`, and legacy compatibility fields (`host`, `port`, `service`, `cve_id`).

**`VulnerabilityUpdate(BaseModel)`**
Partial update schema for PATCH operations — accepts only `status` and `remediation`.

---

### Agent Log Schemas

**`AgentLogCreate(BaseModel)`** / **`AgentLogResponse(BaseModel)`**
Create and response schemas for the `agent_logs` table. The response includes all fields (`id`, `scan_id`, `agent_name`, `action`, `reasoning`, `input_data`, `output_data`, `timestamp`) and is used by the `GET /api/v1/scans/{id}/logs` endpoint to expose the AI reasoning chain to the frontend.

---

### Legacy / Compatibility Schemas

**`ScanAssetResponse`** — Serializes a `ScanAsset` ORM object including nested `services` list of `AssetServiceResponse`.

**`OpenVASScanCreate`** / **`OpenVASScanResponse`** — Request/response for the OpenVAS direct scan endpoint.

**`ActionItemResponse`** — Serializes `ActionItem` records for dashboard action center display.

### Forward References

At the end of the file, `TargetDetail.model_rebuild()` and `ScanDetail.model_rebuild()` are called to resolve forward references in the schema graph (Pydantic v2 requirement when schemas reference each other).

## Dependencies

### External
- `pydantic.BaseModel`, `Field`, `HttpUrl` — Core validation library
- `typing` — `List`, `Optional`, `Dict`, `Any`
- `datetime`, `enum` — Standard library types
