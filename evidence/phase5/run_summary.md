# Phase 5 — Lab Isolation & Simplified Workflow — Run Summary
**Date:** 2026-04-25

## Changes landed

### Infrastructure (new artifacts under [infra/isolation/](../../infra/isolation/))
- `docker-compose.lab.isolation.override.yml` — marks `dmz`/`corp`/`data`
  networks `internal: true` and rebinds every published lab port to
  `127.0.0.1` (loopback-only).
- `lab_isolation.sh` — idempotent Linux iptables script that denies egress
  from lab subnets to everything except intra-lab peers.
- `lab_isolation.ps1` — Windows Firewall equivalent (persistent, survives
  reboot natively).

### Frontend
- [frontend/src/components/dashboard/LabEnvironment.jsx](../../frontend/src/components/dashboard/LabEnvironment.jsx)
  - `humanizeLabError` translates Docker daemon errors into plain-English
    messages (`"Docker Desktop is not running. Start Docker Desktop and press Refresh."`).
  - Visible error banner with a **Retry** button surfaces any failure from
    lab-status, seed, or scan mutations.
  - `refetchInterval` reduced from 30s → 10s for status (still sane, not
    per-second).

### Documentation
- [HOW_TO_RUN.md](../../HOW_TO_RUN.md)
  - Non-expert 3-click workflow (sign in → Lab tab → Seed + Scan).
  - New **Lab Network Isolation** section with start / verify / recover
    commands.
  - Dated 2026-04-25.

## Evidence artifacts
- [isolation_audit.md](isolation_audit.md) — 5 findings (F-01..F-05) with
  severity + remediation path.
- [failure_modes.md](failure_modes.md) — T-01..T-04 test procedures.
- [egress_denied.txt](egress_denied.txt) — canonical smoke test procedure;
  runtime capture deferred.

## Exit criteria

| Criterion | Status |
|---|---|
| Network isolation verified by egress-denied test | Procedure authored. Runtime verification deferred to Phase 7 regression (Docker daemon not available in current environment). |
| Isolation persists across host restart / scanner crash | Scripts idempotent; Windows rules persist natively; Linux persistence via iptables-persistent documented. |
| Non-expert user can complete Start-Lab → Scan → Stop-Lab without CLI | ✅ documented and UI error-translated. |
| HOW_TO_RUN dated within stabilization window | ✅ 2026-04-25. |

## Deferred
- Live runtime verification of T-01..T-04 when Docker Desktop is running; the
  smoke-test commands are in [egress_denied.txt](egress_denied.txt) and
  [failure_modes.md](failure_modes.md).
- Scanner dual-homing (F-03) — depends on moving the Celery worker onto the
  lab networks. Out of scope for Phase 5; tracked separately.
