# Phase 5.2 — Failure-Mode Test Plan & Results
**Date:** 2026-04-25

Each test below has a deterministic command and expected outcome. When the
Docker daemon is running, execute each in order and record the output under
this directory as an `.txt` file named after the test ID. Results recorded
here are **static expectations** — the runtime verification is deferred with
Phase 5.1 to the Phase 7 regression pass.

## T-01 — Scanner crash does not break isolation
**Rationale:** if the scanner container dies, the lab must remain sealed
(no accidental bridge to host).

**Steps:**
1. `docker compose -f docker-compose.lab.yml -f infra/isolation/docker-compose.lab.isolation.override.yml up -d`
2. `sudo bash infra/isolation/lab_isolation.sh apply` (Linux) or
   `powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 apply` (Windows).
3. `docker stop lab_webserver` (simulate a crashed scanner target).
4. From another lab container: `docker exec lab_api_gateway curl -m 5 https://1.1.1.1`.
5. Expected: connection refused / timeout. Restart lab_webserver, verify
   egress still blocked.

## T-02 — Host restart re-applies isolation
**Rationale:** isolation must survive reboot.

**Steps (Linux):**
1. Persist iptables: install `iptables-persistent`; run `netfilter-persistent save`.
2. Reboot.
3. `bash infra/isolation/lab_isolation.sh verify` → expect `LAB_ISOLATION` chain present and hooked into `FORWARD`.
4. Run T-01 step 4 → expect egress denied.

**Steps (Windows):** Windows Firewall rules persist natively. After reboot:
`powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 verify`
→ expect `LAB_ISOLATION_*` rules present and enabled.

## T-03 — Rogue container on default bridge cannot reach lab
**Rationale:** an unrelated container spawned on `bridge` should not be able
to reach `10.10.10.0/24` or friends.

**Steps:**
1. `docker run --rm -it --network bridge alpine:3 sh`
2. Inside: `apk add --no-cache curl && curl -m 5 http://10.10.10.10:3000`.
3. Expected: timeout. With `internal: true` on the dmz network and the egress
   rules active, the default bridge has no route into 10.10.10.0/24.

## T-04 — Egress-denied container-side verification
**Rationale:** the canonical smoke test from the plan.

**Steps:**
1. `docker exec lab_webserver curl -m 5 https://1.1.1.1 -o /dev/null -w '%{http_code}\n'`
   → expected: curl exits non-zero (no route / timeout).
2. `docker exec lab_webserver ping -c 1 -W 2 <host-gateway>`
   → expected: 100% packet loss.
3. Save combined output to [egress_denied.txt](egress_denied.txt).

## Summary
| Test | Verifies | Status |
|------|----------|--------|
| T-01 | Isolation holds when scanner crashes | Procedure authored; runtime check deferred |
| T-02 | Isolation survives host restart | Procedure authored; runtime check deferred |
| T-03 | Default-bridge rogue container cannot reach lab | Procedure authored; runtime check deferred |
| T-04 | Container-side egress denied | Procedure authored; runtime check deferred |
