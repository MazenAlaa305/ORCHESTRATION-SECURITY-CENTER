# Phase 6 — Vulnerabilities Tab Refinement & Detection-Accuracy Audit — Run Summary
**Date:** 2026-04-25

## Changes landed

### Frontend
- [frontend/src/components/dashboard/VulnerabilitiesPanel.jsx](../../frontend/src/components/dashboard/VulnerabilitiesPanel.jsx)
  - **Phase 6.1 severity-first IA:** the existing panel already used severity-
    first ordering and a 5-color semantic palette (no rainbow); verified.
  - **Phase 6.3 alert-fatigue defaults:**
    - `minSeverity = 'medium'` by default (Info/Low hidden until the user opts in).
    - `hideClosed = true` by default (fixed + false-positive observations hidden).
    - `groupDups = true` by default — observations sharing `finding_id` collapse
      to a single canonical row with a `×N` count badge.
    - `NEW` chip on observations first seen since the user's last visit
      (localStorage `vulns.lastSeenAt`).
    - `UNCONFIRMED` warning chip when the ai_validation probe did not confirm
      the finding or confidence < 0.5 — surfaced as a second-tier warning, not
      as a new Critical.
  - New filter controls: Min-sev selector, Hide-closed checkbox, Group-duplicates
    checkbox (all user-overridable).
- [frontend/src/components/VulnerabilityList.jsx](../../frontend/src/components/VulnerabilityList.jsx)
  — **deleted** (orphaned stub that pointed at `localhost:5000/api/risks`, an
  endpoint that does not exist in the current backend).

### Backend
- No new endpoints, no new fields, no new scanners — per Phase 6 constraint.
- Data already exposed by the existing [backend/app/api/v1/endpoints/vulnerabilities.py](../../backend/app/api/v1/endpoints/vulnerabilities.py)
  is sufficient for the drawer enrichment: `finding_id`, `control_tags`,
  `ai_validation_result`, `confidence_score`, `raw_request`, `raw_response`,
  `template_id`, `detected_by`, `cvss_score`, `cvss_vector`, `remediation`.
  The drawer ([IncidentDetailDrawer.jsx](../../frontend/src/components/dashboard/IncidentDetailDrawer.jsx))
  was already wired against these fields — no code changes required.

## Drawer enrichment inventory (Phase 6.2)
Every field called out in the Phase 6.2 checklist maps to an existing backend
field; no stubs, no inventions:

| Drawer field | Backend source |
|---|---|
| CVE ID (linked to NVD) | `vulnerabilities.cve_id` |
| CVSS 3.1 vector + score | `vulnerabilities.cvss_vector`, `cvss_score` |
| Affected asset (host/port/service) | `vulnerabilities.host`, `port`, `service`, `url` |
| Detection source | `vulnerabilities.detected_by`, `template_id` |
| Evidence (raw req/resp) | `vulnerabilities.raw_request`, `raw_response`, `evidence` |
| AI remediation | `vulnerabilities.remediation` (AI-tagged in UI) |
| Duplicate/dedup info | `finding_id` + client-side count (Phase 6.3) |
| Validation status | `ai_validation_result.is_valid`, `confidence_score` |
| Framework mapping | `Finding.control_tags` via `.control_tags` pass-through |

## Golden dataset & accuracy (Phase 6.4)
- [golden_dataset.yaml](golden_dataset.yaml) — 11 planted entries (8 lite + 3
  full-lab), each with expected severity, CWE, and scanner+template signature.
- [accuracy_report.md](accuracy_report.md) — audit methodology, truth matrix
  template, metrics template, and the four tuning knobs available to close
  gaps **without adding a new scanner**.

## Exit criteria

| Criterion | Status |
|---|---|
| Severity-first IA + drawer enrichment | ✅ verified (existing + extended) |
| Default filters + dedup countermeasures active | ✅ |
| Golden dataset committed | ✅ |
| Truth matrix produced | ✅ template authored; live matrix values gated on Phase 7 regression scan run |
| Recall/precision targets met, or documented accepted-risk | ⏳ pending live run |
| No new detection capability added | ✅ |

## Deferred
- Live end-to-end scan run against the frozen lab to populate the matrix. The
  dataset is stable and the procedure in `accuracy_report.md` is deterministic.
