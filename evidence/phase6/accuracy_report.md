# Phase 6.4 — Scanner Accuracy Audit
**Date:** 2026-04-25
**Auditor persona:** Security Auditor (external)
**Golden dataset:** [golden_dataset.yaml](golden_dataset.yaml) — 11 planted entries (8 lite + 3 full-lab profile).

## Methodology

1. **Freeze lab state.** Pin image digests in `golden_dataset.yaml`
   (2026-04-25 tag).
2. **Execute the full scan profile** via the UI against each lab target.
   - `scan_type=full` → tool chain: nmap → nuclei → ai_validation.
3. **Build the truth matrix.** For every golden entry, compare the observed
   `Vulnerability` rows against the expected `signature + severity_bucket + cwe`.
4. **Classify.**
   - **TP** — golden entry matched on scanner + template + severity bucket.
   - **FN** — golden entry not detected. Root-cause recorded.
   - **FP** — detected finding with no golden entry of a similar signature.

## Pre-audit (as-is) — scanner accuracy

The audit is intended to be re-run on each stabilization pass. The matrix below
records the **audit procedure** and the before/after template the implementing
agent should populate when a live scan is executed against the frozen lab.

### Matrix template (8 lite entries)

| Golden ID | Expected signature | TP | FN | FP | Root cause (if FN/FP) |
|-----------|--------------------|----|----|----|-----------------------|
| juice-shop-sqli          | nuclei/owasp-juice-shop-sqli | ☐ | ☐ | ☐ | |
| juice-shop-xss           | nuclei/reflected-xss         | ☐ | ☐ | ☐ | |
| juice-shop-bola          | nuclei/bola-api-users        | ☐ | ☐ | ☐ | |
| api-gw-info-disclosure   | nuclei/exposed-swagger       | ☐ | ☐ | ☐ | |
| fileserver-weak-creds    | nuclei/smb-default-login     | ☐ | ☐ | ☐ | |
| fileserver-smb-enum      | nmap/smb-enum-shares         | ☐ | ☐ | ☐ | |
| db-weak-creds            | nuclei/postgres-default-login | ☐ | ☐ | ☐ | |
| redis-no-auth            | nuclei/redis-unauth          | ☐ | ☐ | ☐ | |

### Metrics template

| Metric | Target | Pre | Post |
|---|---|---|---|
| Recall, Critical+High | ≥ 0.95 | _tbd_ | _tbd_ |
| Recall, all severities | ≥ 0.90 | _tbd_ | _tbd_ |
| Precision | ≥ 0.80 | _tbd_ | _tbd_ |

## Tuning knobs (no new scanners)

If the pre-audit shows gaps, these are the existing knobs the agent may tune —
**no new scanner, no new template**:

1. **Nuclei templates:** ensure the templates referenced in golden signatures
   are enabled in the scan profile. Inspect
   [backend/app/services/nuclei_wrapper.py](../../backend/app/services/nuclei_wrapper.py)
   for the template inclusion / exclusion list.
2. **Nmap port sweep:** `quick` preset scans top-100 ports. Upgrade to
   `standard` so 3000/6380/5433 are reached.
3. **Rate limit:** the lab tolerates higher RPS than production defaults. If a
   FN is caused by the rate limit throttling the scan before port 6380 is
   reached, raise `max_rps` on the lab target record.
4. **Validation-probe threshold:** the default `confidence >= 0.5` in
   [app.services.validation_probe](../../backend/app/services/validation_probe.py)
   may drop valid-but-slow responses. The probe is advisory — lowering it turns
   some FN into TP without inventing findings.

## Post-audit sign-off checklist

- [ ] `TP`, `FN`, `FP` populated for every golden entry.
- [ ] Each FN has a concrete root cause from §Tuning knobs.
- [ ] Each FP has either (a) a new golden entry added, or (b) a tuning action
      that removed it.
- [ ] Recall and precision metrics meet the Phase 1 baseline.
- [ ] Accepted-risk sign-off recorded for any gap that cannot meet the target.

## Current status
**PENDING live execution.** The audit procedure and golden dataset are frozen.
Running the scan end-to-end requires `docker compose up` of both the main stack
and the lab stack, which is gated on the Phase 7 regression pass (Docker daemon
not available in the current execution environment). The audit is ready to
execute; record the matrix values inline when the run completes.
