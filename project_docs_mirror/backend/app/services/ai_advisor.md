# ai_advisor.py (services) — Documentation

## File Purpose

Provides the **AI Security Advisor service**, a standalone module that uses the Google Gemini API to generate context-aware, plain-language security recommendations and explanations. Separate from the agent pipeline's LLM usage — this module powers the interactive "Ask AI" advisory panel in the dashboard.

## Key Classes

### `AIAdvisor`

**`__init__()`**
Initializes the Gemini `GenerativeModel` client using `settings.GEMINI_API_KEY`. Sets a system instruction that primes the model to act as a cybersecurity expert focused on SME contexts and non-technical language.

**`get_remediation_advice(vulnerability_type, url, description) → str`**
Constructs a structured prompt asking Gemini for step-by-step remediation guidance for a specific vulnerability type. Returns the model's text response. Includes the vulnerability URL and description as context.

**`explain_risk(risk_score, vulnerability_summary) → str`**
Generates a plain-language explanation of the overall scan risk score for non-technical stakeholders. Takes the numeric score and a summary of the key vulnerabilities and returns a paragraph suitable for an executive summary.

**`suggest_scan_config(target_type, tech_stack) → Dict`**
Given a target type (e.g., `"APIs"`, `"web_application"`, `"network"`) and detected tech stack, generates a recommended scan configuration dictionary specifying which scan types and Nuclei template categories to enable.

**`chat(history, message) → str`**
Enables a multi-turn conversational interface. Accepts a `history` list of `{role, content}` dictionaries and a new `message` string. Maintains conversation context using Gemini's chat API (`start_chat()`). Returns the advisor's response text.

### Module-Level Instance

`ai_advisor = AIAdvisor()` — Singleton imported by the advisor API endpoint.

## Dependencies

### Internal
- `app.core.config.settings` — `GEMINI_API_KEY`

### External
- `google.generativeai` — Gemini SDK
- `logging`
