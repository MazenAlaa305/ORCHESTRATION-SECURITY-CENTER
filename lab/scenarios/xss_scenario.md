# Scenario: Reflected XSS on Juice Shop

## Goal
Demonstrate that the platform detects a reflected Cross-Site Scripting vulnerability on `lab_webserver` (OWASP Juice Shop) and surfaces a remediation plan with mapped references.

## Pre-conditions
- Main stack up: `docker compose up -d`
- Lab stack up: `docker compose -f docker-compose.lab.yml up -d`
- `lab_webserver` healthy on http://localhost:3000
- Logged into the dashboard at https://localhost
- Scope guard whitelist includes `lab_webserver`

## Attacker steps
1. Browse to http://localhost:3000.
2. In the search field at the top of the page, paste: `<iframe src="javascript:alert(1)">`.
3. Submit. Confirm the payload renders inside the result list (an alert dialog appears, or the iframe loads).
4. From the dashboard, trigger a `Standard` scan against `http://lab_webserver:3000`.

## Expected platform output
- **Backend pipeline:**
  - Attack stage: Nuclei finding `xss-reflected` (severity `HIGH`, CVSS 6.1).
  - Validation stage: confidence ≥ 0.6, finding retained.
  - Scoring stage: asset risk score increases.
- **SIEM:**
  - Custom rule `100102` (xss_detected) fires when the platform forwards the finding to Wazuh.
- **Dashboard:**
  - SeverityDonut increments HIGH count.
  - VulnerabilityList shows the new XSS finding in the top rows.
  - RemediationPanel shows: "Encode untrusted output in HTML, JS, and attribute contexts. Apply Content-Security-Policy header. Use a templating engine that auto-escapes by default."
  - References include OWASP XSS Prevention Cheat Sheet.

## Cleanup
```bash
docker compose -f docker-compose.lab.yml restart lab_webserver
```

## Acceptance
Running this scenario manually produces an XSS finding on the dashboard within 30 seconds of scan launch.
