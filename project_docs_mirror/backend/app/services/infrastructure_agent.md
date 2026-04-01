# infrastructure_agent.py — Documentation

## File Purpose

A specialized agent that focuses exclusively on **network infrastructure assessment**, separate from web application attack logic. Maps open network ports and running services against known vulnerability patterns and security best practices for SME environments.

## Key Classes

### `InfrastructureAgent`

**`assess_infrastructure(assets) → List[Dict]`**
Primary method receiving the Nmap-discovered asset list and producing infrastructure-specific findings.

**Logic:**
Iterates through each asset and its services, applying a rule-based risk assessment:

| Condition | Finding Type | Severity |
|---|---|---|
| Redis (port 6379) without auth | Unprotected Redis | Critical |
| MongoDB (port 27017) exposed | Exposed MongoDB | Critical |
| Telnet (port 23) open | Insecure Protocol (Telnet) | High |
| FTP (port 21) open | Unencrypted File Transfer | High |
| SMBv1 detected | EternalBlue Exposure | Critical |
| RDP (port 3389) exposed | Exposed Remote Desktop | High |
| HTTP without HTTPS redirect | Unencrypted Web Traffic | Medium |
| SSH default port (22) with old version | Outdated SSH | Medium |

Each finding follows the standard vulnerability dictionary format, and all infrastructure findings are assigned a confidence of `0.9` or higher since they are based on definitive service detection rather than heuristic response analysis.

**`check_default_credentials(host, service) → Optional[Dict]`**
Attempts to authenticate to common services (FTP, SSH, HTTP admin panels) using a list of known default credential pairs. Returns a finding if default credentials are accepted.

## Dependencies

### Internal
- `app.services.nmap_wrapper.NmapWrapper` — For targeted re-scan if needed

### External
- `paramiko` — For SSH default credential checks
- `ftplib` — For FTP default credential checks
- `httpx` — For HTTP admin panel checks
