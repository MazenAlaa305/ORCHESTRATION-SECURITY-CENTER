# Scenario: Service Misconfigurations (SMB null session + unauthenticated Redis)

## Goal
Demonstrate that the platform detects two classic misconfigurations on the lab subnet — an SMB null-session on `lab_smb` and an open Redis instance on `lab_redis` — and turns each into a prioritised, actionable finding.

## Pre-conditions
- Main stack up: `docker compose up -d`
- Lab stack up: `docker compose -f docker-compose.lab.yml up -d`
- `lab_smb` reachable on TCP/445 from the worker container
- `lab_redis` reachable on TCP/6379 from the worker container
- Logged into the dashboard at https://localhost
- Scope guard whitelist includes `172.30.0.0/16`

## Attacker steps
1. From a host with `smbclient`:
   ```bash
   smbclient -N -L //lab_smb
   ```
   Confirm shares are listed without credentials.
2. From a host with `redis-cli`:
   ```bash
   redis-cli -h lab_redis -p 6379 INFO
   ```
   Confirm `INFO` returns without `AUTH`.
3. From the dashboard, trigger a `Deep` scan against `172.30.0.0/16`.

## Expected platform output
- **Backend pipeline:**
  - Recon stage: Nmap NSE scripts `smb-enum-shares` and `redis-info` populate the asset detail page.
  - Attack stage:
    - Nuclei `redis-unauth-detect` finding (severity `HIGH`).
    - Custom Nmap-derived finding "SMB null session permitted" (severity `MEDIUM`).
  - Scoring stage: both findings appear under the same scan.
- **SIEM:**
  - Custom rule `100103` (SMB null session) fires when the platform forwards the finding.
- **Dashboard:**
  - `lab_smb` and `lab_redis` nodes turn orange/red on Network Topology.
  - VulnerabilityList shows both findings.
  - RemediationPanel for Redis: "Enable `requirepass` (or ACLs in 6+); bind to loopback; place behind firewall."
  - RemediationPanel for SMB: "Disable null sessions in `RestrictAnonymous`; require authentication; restrict access by source subnet."

## Cleanup
```bash
docker compose -f docker-compose.lab.yml restart lab_smb lab_redis
```

## Acceptance
Both findings appear on the dashboard within 60 seconds of scan completion.
