# Phase 5.1 — Lab Isolation Audit
**Date:** 2026-04-25
**Scope:** [docker-compose.lab.yml](../../docker-compose.lab.yml), [infra/](../../infra/), and [lab/](../../lab/).

## Audit methodology
- Read-through of every lab service: ports, networks, egress, DNS.
- Cross-reference with Phase 1 baseline (OffSec/SANS GPEN isolation guidance).
- Live runtime verification deferred to Phase 7 regression (Docker daemon not
  available in the current execution environment). Static findings below are
  actionable and testable when the daemon is up.

## Findings

### F-01 — Networks are NOT `internal: true` (blocker)
Every lab network (`dmz`, `corp`, `data`, `mgmt`) is declared as:
```yaml
dmz:
  driver: bridge
  ipam:
    config:
      - subnet: 10.10.10.0/24
```
None has `internal: true`. This means each network has a default NAT bridge to
the Docker host, which in turn reaches the user's LAN / internet.

**Impact:** a vulnerable container (e.g. Juice Shop, Redis with no auth) can
reach outbound services on the user's network if compromised.

**Required:** add `internal: true` to `dmz`, `corp`, `data`. The `mgmt` network
must keep bridge-out only for the `lab_log_shipper` (which needs to reach
Elasticsearch). See [infra/isolation/docker-compose.lab.isolation.override.yml](../../infra/isolation/docker-compose.lab.isolation.override.yml)
for the hardened override.

### F-02 — Every lab service publishes host ports (blocker)
Services publish ports directly to the host: 3000, 8081, 4445/1139, 5433, 6380, etc.
This is required for the scanner (running on the host-reachable backend network)
to reach its targets today. But it also means anyone on the user's LAN who can
reach the host can reach the vulnerable lab services.

**Required:** replace `ports:` with `expose:` on lab services. The scanner
service must be attached to the lab networks directly (dual-homed) rather than
reaching the lab via host-published ports. A transition period is acceptable
while the scanner is being moved onto the lab networks; during that window,
publish to `127.0.0.1` only: `- "127.0.0.1:3000:3000"`.

**Mitigation-in-place:** the `docker-compose.lab.isolation.override.yml` binds
every port to `127.0.0.1` so the publication is host-loopback only. This closes
the LAN-exposure hole without breaking the current scanner path.

### F-03 — Scanner has no dedicated control network (medium)
The plan calls for the scanner service to have exactly two NICs:
- scanner-control (talks to the dashboard / orchestrator)
- lab-target (talks to the vulnerable containers)

Today the Celery worker reaches lab services via host-published ports, not via
a dedicated NIC. The current topology therefore violates "scanner is the only
bridge" by virtue of the ports being everywhere. Documented; fix lands when
F-02 is resolved in full.

### F-04 — No host-level egress deny rule (blocker)
No `iptables` / Windows Firewall rule is present to deny egress from lab
subnets (10.10.10.0/24, 10.10.20.0/24, 10.10.30.0/24) to the internet or to the
LAN. The lab has internet access implicitly because every bridge network NATs.

**Required:** the rules in [infra/isolation/lab_isolation.sh](../../infra/isolation/lab_isolation.sh)
(Linux hosts) and [infra/isolation/lab_isolation.ps1](../../infra/isolation/lab_isolation.ps1)
(Windows hosts) deny-all egress from the lab subnets with a minimal allowlist
for the scanner-control path.

### F-05 — DNS leaks out (medium)
`lab_dns_server` (CoreDNS, profile `full-lab`) publishes UDP/TCP 15353 to the
host. Lab containers using public DNS (Docker default) will bypass it entirely.

**Required:** when F-01 is applied, `internal: true` forces lab containers to
use the Docker-internal DNS, which in turn forwards to the CoreDNS lab service.
External lookups (e.g. `curl https://1.1.1.1`) then fail because there is no
bridge-out.

## Summary table

| ID  | Severity | Finding | Remediation location |
|-----|----------|---------|----------------------|
| F-01 | Blocker | Networks are not `internal: true` | isolation override + egress scripts |
| F-02 | Blocker | Host ports published on every lab service | isolation override binds to 127.0.0.1 |
| F-03 | Medium  | Scanner not dual-homed yet | flagged; depends on F-02 |
| F-04 | Blocker | No egress deny rules at host firewall | lab_isolation.sh / lab_isolation.ps1 |
| F-05 | Medium  | DNS resolvable outside lab | resolved when F-01 applied |

## Deferred live-verification steps
When Docker Desktop is running, execute each and append output under this
directory:

1. `docker network inspect the-dashboard-project-_lab_dmz --format '{{.Internal}}'`
   → expect `true` after applying the override.
2. `docker compose -f docker-compose.lab.yml -f infra/isolation/docker-compose.lab.isolation.override.yml up -d`
3. `docker exec lab_webserver curl -m 5 https://1.1.1.1`
   → expect failure (egress denied).
4. `docker exec lab_webserver ping -c1 <host-gateway>`
   → expect failure.
5. Save outputs to [egress_denied.txt](egress_denied.txt).

## Phase 5.1 exit
- [x] Findings enumerated with severity and remediation path.
- [x] Override + egress scripts authored (static).
- [ ] Live runtime verification — deferred to Phase 7 regression (Docker daemon
      not available in the current execution environment).
