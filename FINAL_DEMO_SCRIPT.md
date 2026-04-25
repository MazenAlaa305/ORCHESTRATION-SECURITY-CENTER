# Final Demo Script — Orchestration Security Center
**Total time:** 10 min · **Driver:** Omar Kapil

> Mirror of [demo/demo_script.md](demo/demo_script.md) — kept at repo root for reviewer visibility. **Keep both files in sync** when editing.

## 0:00 Opening (15 s)
- "We are about to scan a small business network in real time. The platform you are about to see is fully autonomous — no human input after the URL."

## 0:15 Trigger scan
- Open https://localhost.
- Sidebar → "+ New Scan".
- Target: `http://lab_webserver:3000` · Profile: `Standard`.
- Click **Launch Scan**.
- "Notice the WebSocket connection light turn green — every event you'll see is real-time."

## 0:45 Recon stage commentary
- Point to the OrchestrationFeed: "Stage 1: Recon — Nmap is mapping the surface."
- Wait for the "Recon complete" event.

## 2:00 Attack stage
- Point to the Vulnerabilities panel filling up.
- "Stage 2: Attack. Each finding here is a Nuclei template that matched."

## 4:00 Validation + Scoring
- Point to the RiskScore widget incrementing.
- "Stage 3 validates each finding to remove false positives. Stage 4 weights by CVSS, asset value, and exposed ports — deterministic, no LLM in the scoring path."

## 6:00 Drill into a finding
- Click the top CRITICAL row.
- Show RemediationPanel, AssetTimeline, and evidence references.

## 7:30 SIEM correlation
- Switch to the "SIEM" tab.
- "This Wazuh alert was raised by the same scan — the platform correlates them automatically."

## 8:30 Generate report
- Click "Export PDF" — download starts.
- Open the PDF: title page, executive summary, detailed findings.

## 9:30 Close
- "Five hundred raw events became five prioritised actions, in 90 seconds, with zero security expertise needed from the operator."

## Backup if anything fails
- Pre-recorded demo video in `evidence/demo_recording.mp4` — switch to it if a stage hangs > 30 s.
