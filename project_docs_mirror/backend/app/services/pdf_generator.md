# pdf_generator.py — Documentation

## File Purpose

Generates **professional PDF security scan reports** programmatically from scan data stored in the database. Reports are formatted with an executive summary, vulnerability table, severity breakdown, risk score visualization, and AI-generated remediation recommendations. Used by the `reports` API endpoint.

## Key Classes

### `PDFReportGenerator`

**`generate_report(scan_id, db) → bytes`**
The main entry point. Accepts a scan UUID and a database session. Returns the final PDF as a byte string for HTTP response delivery.

**Logic:**
1. Retrieves the full `Scan` object with eagerly loaded `vulnerabilities`, `assets`, `agent_logs`, and `target` from the database.
2. Calls `_build_cover_page()` to render the report header with logo, organization name, date, and scan metadata.
3. Calls `_build_executive_summary()` to produce a non-technical summary paragraph describing the overall risk posture, total findings count, and critical issues.
4. Calls `_build_vulnerability_table()` to render an HTML-to-PDF table of all vulnerabilities sorted by severity, including URL, type, severity badge, and status.
5. Calls `_build_findings_detail()` to produce per-vulnerability detail sections with evidence, description, and remediation steps.
6. Calls `_build_asset_inventory()` to list all discovered network hosts and their open services.
7. Assembles all sections and renders the final PDF using the configured PDF library.
8. Returns the PDF byte content.

**`_build_cover_page(scan, target) → str`** (HTML fragment)
Renders the cover section with report title, project name, scan date range, target URL, and overall risk score with color-coded severity band.

**`_build_executive_summary(scan, vulnerabilities) → str`**
Generates plain-language summary text. Optionally calls the Gemini LLM to produce an AI-written executive paragraph if `GEMINI_API_KEY` is configured.

**`_build_vulnerability_table(vulnerabilities) → str`**
Renders an HTML table of all vulnerabilities, sorted by severity (Critical → Info). Includes SVG-based severity badges with color coding.

**`_build_findings_detail(vulnerabilities) → str`**
For each vulnerability, renders a detailed section block with type, URL, description, evidence JSON, remediation steps, and AI validation result.

**`_build_asset_inventory(assets) → str`**
Renders a table of all `ScanAsset` records with columns for IP, hostname, OS, device type, and a comma-separated list of open ports.

## Dependencies

### Internal
- `app.models.scan` — ORM model objects
- `app.core.config.settings` — Gemini API key

### External
- `weasyprint` or `reportlab` — PDF rendering from HTML/CSS
- `jinja2` — HTML template rendering for report sections
- `google.generativeai` — Optional Gemini LLM for AI-written summaries
