# intelligence_agent.py — Documentation

## File Purpose

Provides **AI-driven contextual intelligence enrichment** for discovered network assets, using the Gemini LLM to generate human-readable risk summaries and behavioral insights that are stored in the `ScanAsset.ai_insight` JSON field and displayed in the `AssetDetailPanel` on the dashboard.

## Key Classes

### `IntelligenceAgent`

**`enrich_asset(asset_dict) → Dict`**
Takes a normalized asset dictionary (containing IP, hostname, OS, and detected services) and generates an AI insight object.

**Logic:**
1. Constructs a prompt describing the asset's profile (hostname, OS, open ports, service versions).
2. Calls the Gemini API via `llm_reason()` with a prompt asking for: device classification, risk rating, behavioral notes for a security analyst, and specific CVE recommendations based on version information.
3. Parses the structured LLM response.
4. Returns an `ai_insight` dictionary containing:
   - `device_class` — Classification (e.g., `"Web Server"`, `"Database Server"`, `"IoT Device"`)
   - `risk_summary` — 2–3 sentence plain-language risk assessment
   - `cve_hints` — List of relevant CVE IDs based on detected service versions
   - `analyst_notes` — Behavioral observations for the security team

**`batch_enrich(assets, max_concurrent=5) → List[Dict]`**
Performs enrichment on a list of assets with controlled concurrency using `asyncio.Semaphore`. Updates each `ScanAsset.ai_insight` field in the database after enrichment.

## Dependencies

### Internal
- `app.services.agent_orchestrator.BaseAgent` — Inherits LLM access and logging

### External
- `google.generativeai` — Gemini API
- `asyncio` — Concurrency control
