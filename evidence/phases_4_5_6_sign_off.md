# Phases 4 · 5 · 6 — Combined Sign-Off
**Date:** 2026-04-25
**Scope:** Stabilization/Refinement plan ([newplan24/4/2026.md](../newplan24/4/2026.md)) phases 4, 5, 6.
**Build verification:** `npm run build` — ✓ 3201 modules transformed, 9.92s.

## What shipped

### Phase 4 — History Tab
- Backend `GET /api/v1/scans/` returns uniform `{items, total, page, page_size}`
  envelope; DB-layer filters (status, profile, target, date range) and sort
  (started_at / duration / risk_score).
- Frontend `ScanHistory.jsx` rewritten: 7 columns, severity pill, relative time,
  status left-border accent, dense toggle, server filters + pagination, URL
  sync (`hq, hstatus, hprofile, hfrom, hto, hsort, horder, hpage, hpsize, hdense`),
  row expansion with command preview.
- `Dashboard.jsx` and `Reports.jsx` updated to consume the envelope.
- Evidence: [phase4/data_model_review.md](phase4/data_model_review.md),
  [phase4/perf_trace.json](phase4/perf_trace.json),
  [phase4/run_summary.md](phase4/run_summary.md).

### Phase 5 — Lab Isolation & Simplified Workflow
- New [infra/isolation/](../infra/isolation/):
  - `docker-compose.lab.isolation.override.yml` — `internal: true` on dmz/corp/data;
    all published ports bound to 127.0.0.1.
  - `lab_isolation.sh` (Linux iptables, idempotent).
  - `lab_isolation.ps1` (Windows Firewall, persistent).
- `LabEnvironment.jsx` — docker daemon errors translated to plain English; retry
  banner; status polling reduced to 10s.
- `HOW_TO_RUN.md` — new 3-click workflow + "Lab Network Isolation" section
  (dated 2026-04-25).
- Evidence: [phase5/isolation_audit.md](phase5/isolation_audit.md) (5 findings),
  [phase5/failure_modes.md](phase5/failure_modes.md),
  [phase5/egress_denied.txt](phase5/egress_denied.txt),
  [phase5/run_summary.md](phase5/run_summary.md).

### Phase 6 — Vulnerabilities Tab & Detection Accuracy
- `VulnerabilitiesPanel.jsx`: alert-fatigue defaults (min-sev = medium,
  hide-closed, group-duplicates ×N badge), `NEW` chip for findings first seen
  since last visit (localStorage), `UNCONFIRMED` second-tier chip when the
  validation probe did not confirm.
- Drawer `IncidentDetailDrawer.jsx` — all enrichment fields already wired
  against existing backend columns (no new fields, no stubs).
- Orphan `components/VulnerabilityList.jsx` deleted.
- [phase6/golden_dataset.yaml](phase6/golden_dataset.yaml) — 11 planted entries
  frozen with image digests.
- [phase6/accuracy_report.md](phase6/accuracy_report.md) — audit procedure,
  matrix template, tuning knobs (no new scanner).
- [phase6/run_summary.md](phase6/run_summary.md).

## Constraints honored
- No new endpoints, no new screens, no new scanners, no new DB fields.
- Every UI refinement maps to existing backend data.
- Lab isolation strengthened (not weakened) by compose override + host firewall.
- One deletion (orphan `VulnerabilityList.jsx`); no drive-by refactors outside
  scope.

## Deferred to Phase 7 regression
- `docker compose up` of the full stack for a live end-to-end scan and the
  populated accuracy matrix (same deferral recorded in Phase 2 summary).
- Runtime capture of the isolation smoke tests (T-01..T-04) — procedures are
  deterministic and authored in [phase5/failure_modes.md](phase5/failure_modes.md).
