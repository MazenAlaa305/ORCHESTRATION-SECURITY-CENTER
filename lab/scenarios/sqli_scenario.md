# Scenario: SQL Injection on Juice Shop

## Goal
Demonstrate that the platform detects a SQLi vulnerability on `lab_webserver` (OWASP Juice Shop) and produces an actionable finding with a CVSS score, a Wazuh alert, and a dashboard update — end-to-end, with no operator expertise required.

## Pre-conditions
- Main stack up: `docker compose up -d`
- Lab stack up: `docker compose -f docker-compose.lab.yml up -d`
- `lab_webserver` healthy on http://localhost:3000
- Logged into the dashboard at https://localhost as an admin user
- Scope guard whitelist includes `lab_webserver` / `172.30.0.0/16`

## Attacker steps
1. Browse to http://localhost:3000/#/login.
2. Submit `email = ' OR 1=1--` and `password = anything`.
3. Confirm login bypass returns an admin session (look for the "Welcome back, admin@juice-sh.op" banner).
4. From the dashboard, trigger a `Standard` scan against `http://lab_webserver:3000`.

## Expected platform output
- **Backend pipeline:**
  - Recon stage: Nmap reports port 3000 open, service "Node.js Express".
  - Attack stage: Nuclei finding `sqli-detect` (CVSS ≥ 9.0, severity `CRITICAL`) on `/rest/user/login`.
  - Validation stage: confidence ≥ 0.6, finding retained.
  - Scoring stage: risk score increments by ≥ 25.
- **SIEM:**
  - Wazuh rule 5712 fires within 30 s of the attack request.
  - Custom rule `100101` (sqli_detected) fires when the platform forwards the finding to Wazuh.
- **Dashboard:**
  - `lab_webserver` node turns red on the Network Topology panel.
  - SeverityDonut updates with +1 CRITICAL.
  - RemediationPanel shows: "Use parameterised queries / prepared statements via the ORM. Validate and bind user input. Apply least-privilege DB credentials."

## Cleanup
```bash
docker compose -f docker-compose.lab.yml restart lab_webserver
docker compose exec backend python -c "from app.services.scan_dedup import reset_recent; reset_recent()"
```

## Acceptance
Running this scenario manually produces ≥ 1 finding visible on the dashboard within 30 seconds of scan launch.
