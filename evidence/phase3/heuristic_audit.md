# Heuristic Audit — ScanConfigModal (before rebuild)
**Date:** 2026-04-24
**Component:** [frontend/src/components/dashboard/ScanConfigModal.jsx](../../frontend/src/components/dashboard/ScanConfigModal.jsx)
**Reference:** Nielsen's 10 usability heuristics + Shneiderman's 8 golden rules.

## Summary
A flat 4-tab modal (Target / Scan Type / Tools / Schedule). Controls are functional but the flow fights the user in five specific ways; none require new features to fix.

## Findings

| # | Heuristic | Finding | Severity |
|---|---|---|---|
| 1 | Visibility of system status | Footer shows `STANDARD · 2 tools` — good. But there's no indication of *which step you're on* in a sequence (the tabs imply random-access but the mental model is sequential). | Medium |
| 2 | Match between system and the real world | "Tools" tab groups items as checkboxes without severity or cost hints. A pentester wants to know "will this actually find CVE-class findings". | Medium |
| 3 | User control & freedom | No "Review" step — the user submits blind. The only affordance for inspection is `STANDARD · 2 tools`. | **High** |
| 4 | Consistency & standards | "Target" field accepts any string — no inline validation, no warning when the target is out of the configured scope. | High |
| 5 | Error prevention | User can select `custom` scan type with zero tools and the button stays enabled (checked via `canSubmit`, but the rule lives separate from the UI). Works today by accident. | Low |
| 6 | Recognition over recall | Cron field is a raw text box with placeholder `0 2 * * *`. Users who don't speak cron must leave the modal to look it up. | Medium |
| 7 | Flexibility & efficiency | No presets for advanced users; no keyboard shortcuts to jump to Review. | Low |
| 8 | Aesthetic & minimalist design | Four equally-weighted tabs put "Schedule" on equal footing with "Target". In reality ≥80% of scans are one-off. | Medium |
| 9 | Help users recognize errors | Error surface is one red pill at the top. Per-field errors not rendered. | Medium |
| 10 | Help & documentation | No inline hints about what "Full" vs "Standard" does beyond one sentence; no "what will run" preview. | Medium |

## Rebuild IA (implemented in the refactor)

```
Stepper (horizontal, click-to-jump for already-visited steps):

  ① Target           → existing-target picker OR manual URL/IP
                       inline host regex check; scope hint
  ② Profile          → Quick | Standard | Full (Custom via "Advanced")
                       each card shows duration + what runs
  ③ Advanced (opt.)  → collapsed by default; tool toggles + SIEM + auto-report
  ④ Schedule         → One-off (default) | Recurring (cron helper presets)
  ⑤ Review           → human-readable summary; shows the exact /scans/ payload
                       "Launch Scan" is the only primary action
```

## Acceptance criteria (Phase 3)
- [x] Review step added; the exact JSON payload is shown before launch.
- [x] Advanced settings collapsed behind a single disclosure.
- [x] Target field has inline validation (URL, IP, or hostname patterns).
- [x] Stepper indicates current position; can move forward only when the step is valid.
- [x] `Tools` step removed as a peer tab; tools live inside Advanced (collapsed).
- [x] Schedule de-emphasised; cron presets replace free-form (presets still map to valid cron strings the backend already accepts).
- [x] No new backend capabilities added; payload shape is unchanged.
