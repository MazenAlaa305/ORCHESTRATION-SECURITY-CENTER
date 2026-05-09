# Demo & Presentation — Orchestration Security Center

> Single source for everything related to the live demo and the FYP presentation.
> Merged from: `FINAL_DEMO_SCRIPT.md`, `FINAL_PRESENTATION.md`, `MANUAL_LIVE_DEMO.md`,
> `demo/demo_script.md`, `demo/demo_checklist.md`, `docs/PRESENTATION_PLAN.md`.

---

## Part A — Pre-Demo Checklist (run T-30 minutes)

### Stack
- [ ] `docker compose down -v && docker compose up -d`
- [ ] `docker compose -f docker-compose.lab.yml up -d`
- [ ] `infra/healthcheck.sh` returns exit 0

### App
- [ ] Browser: open https://localhost — page loads, no console errors
- [ ] Login as admin · password change works
- [ ] Trigger a throwaway scan against `http://lab_webserver:3000` — completes within 90 s
- [ ] Wazuh dashboard at https://localhost:5601 reachable (login `admin / SecretPassword`)
- [ ] PDF export works on the throwaway scan

### Data reset (so the demo starts clean)
- [ ] Reset DB:
  ```bash
  docker compose exec backend python -c "from app.core.database import Base, engine; Base.metadata.drop_all(engine); Base.metadata.create_all(engine)"
  ```
- [ ] Re-seed admin (auto on first login attempt)

### Stage logistics
- [ ] HDMI / projector tested on stage laptop
- [ ] External display mirroring at 1920×1080
- [ ] Sound output tested (for backup video)
- [ ] Slide deck open + presenter notes ready
- [ ] Backup demo video (`evidence/demo_recording.mp4`) opens and plays sound
- [ ] Phone hotspot ready as Wi-Fi backup
- [ ] Charger plugged in

### Speakers
- [ ] All speakers present and mic-checked
- [ ] Q&A answers reviewed (Part D below)

---

## Part B — Live Demo Script (10 min · Driver: Omar Kapil)

### 0:00 Opening (15 s)
- "We are about to scan a small business network in real time. The platform you are about to see is fully autonomous — no human input after the URL."

### 0:15 Trigger scan
- Open https://localhost.
- Sidebar → "+ New Scan".
- Target: `http://lab_webserver:3000` · Profile: `Standard`.
- Click **Launch Scan**.
- "Notice the WebSocket connection light turn green — every event you'll see is real-time."

### 0:45 Recon stage commentary
- Point to the OrchestrationFeed: "Stage 1: Recon — Nmap is mapping the surface."
- Wait for the "Recon complete" event.

### 2:00 Attack stage
- Point to the Vulnerabilities panel filling up.
- "Stage 2: Attack. Each finding here is a Nuclei template that matched."

### 4:00 Validation + Scoring
- Point to the RiskScore widget incrementing.
- "Stage 3 validates each finding to remove false positives. Stage 4 weights by CVSS, asset value, and exposed ports — deterministic, no LLM in the scoring path."

### 6:00 Drill into a finding
- Click the top CRITICAL row.
- Show RemediationPanel, AssetTimeline, and evidence references.

### 7:30 SIEM correlation
- Switch to the "SIEM" tab.
- "This Wazuh alert was raised by the same scan — the platform correlates them automatically."

### 8:30 Generate report
- Click "Export PDF" — download starts.
- Open the PDF: title page, executive summary, detailed findings.

### 9:30 Close
- "Five hundred raw events became five prioritised actions, in 90 seconds, with zero security expertise needed from the operator."

### Backup if anything fails
- Pre-recorded demo video in `evidence/demo_recording.mp4` — switch to it if a stage hangs > 30 s.

---

## Part C — 30-Minute Presentation Plan (FYP Committee)

### Time Allocation
| Phase | Duration | Members |
|---|---|---|
| Opening & Problem | 4 min | 1, 2 |
| Architecture & Tech | 6 min | 3, 4 |
| AI Brain & Risk Engine | 5 min | 5, 6 |
| Frontend & DevOps | 5 min | 7, 8 |
| Live Demo | 8 min | 9, 10 |
| Closing & Q&A | 2 min | 11 |
| **Total** | **30 min** | **11 members** |

### Speaker Order & Talking Points

**1. Team Lead — Opening (2 min)** — project name, HITU FYP 2025–2026, agenda, introduce next speaker.
> "Today we present an AI-Driven DAST platform built specifically for SMEs. We will walk you through the problem, the solution, and a live demonstration."

**2. Business Analyst — Problem (2 min)** — SMEs lack security teams, drowning in alerts. Solution: thousands of alerts → 5 prioritized actions. Example: Nmap finds port 445 → triggers SMB-specific Nuclei templates.

**3. Solution Architect — Architecture (3 min)** — full diagram. Flow: React → FastAPI → Celery → Redis → 4-Stage Pipeline → PostgreSQL. Tech choices: FastAPI (async), Celery (orchestration), Redis (pub/sub).

**4. Backend Lead — API & DB (3 min)** — 13 API route groups; ORM models (Target → Scan → Vulnerability / Endpoint / AgentLog / ScanAsset); JWT + bcrypt + RBAC; Fernet for credential encryption; WebSocket `/ws/events`.

**5. AI / Agent Engineer — The Brain (3 min)** ⭐ — The pipeline:
1. Recon: Nmap + Subfinder
2. Attack: Nuclei templates with service-aware chaining
3. Validation: InfrastructureAgent (Trivy/CVE) + IntelligenceAgent (Gemini 2.0 Flash)
4. Scoring: UnifiedRiskEngine → deterministic 0–100

Trust & safety: SHA-256 hash-chained agent logging; LLM Guard daily/per-scan token budgets.

**6. Security / Risk Engineer — Scoring (2 min)** — Formula:
```
Score = (vuln_penalties × confidence) + port_penalties
      × asset_multiplier × exposure_modifier
```
Severity weights: CRITICAL 25, HIGH 15, MEDIUM 7, LOW 2. High-risk ports: SMB(20), FTP(15), RDP(15), Redis(10). Internal IPs: 0.6× modifier. Compliance auto-tagging: PCI-DSS, HIPAA, ISO-27001, GDPR.

**7. Frontend Lead — UX (3 min)** — React 18 + Vite + Tailwind (custom cyber/dark theme); 4 contexts (Auth, RealTime, Config, Toast); 25+ panels in 8 tabs; NetworkTopology (D3 force-directed), RiskHeatmap (D3 treemap), OrchestrationFeed (virtualized via react-window).

**8. DevOps Engineer — Deployment & Lab (2 min)** — Docker Compose (6 core + 6 optional). Caddy TLS proxy. Lab: 6 containers across 4 zones (DMZ / Corp / Data / Mgmt). Network isolation via `lab_network` external bridge.

**9. Demo Driver #1 (4 min)** — Login → KPIs → Quick Scan → ScanPipelinePanel → OrchestrationFeed → LiveConsole.

**10. Demo Driver #2 (4 min)** — NetworkTopology → RiskHeatmap → VulnerabilitiesPanel → IncidentDetailDrawer → SecurityAdvisor (Gemini) → PDF Report → AgentLogViewer (hash chain).

**11. QA / Closer (2 min)** — Testing strategy (unit + integration vs lab); future work (SOAR via n8n, Wazuh SIEM, Celery Beat scheduled scans).
> "We transformed thousands of alerts into 5 actionable items, powered by transparent and auditable AI."

---

## Part D — Q&A Prepared Answers

1. **"How do you prevent the LLM from hallucinating?"**
   Advisory-only; scoring is deterministic. `llm_guard` blocks destructive output, daily token budget enforced. Platform runs end-to-end with the LLM disabled.

2. **"Why not commercial tools (Tenable, Rapid7, Qualys)?"**
   Cost (open-source, free for SME), explainability (we show the why), customization for SME context (small footprint, single laptop).

3. **"How do you handle false positives?"**
   Validation drops findings with confidence < 0.6; `finding_dedup` deduplicates across runs; admins mark FPs and the engine learns suppressions.

4. **"What about scope creep / out-of-scope assets?"**
   `scope_guard` enforces an admin-managed allow-list; out-of-scope rejected before any tool invocation, with audit-log entry.

5. **"How do you secure the platform itself?"**
   See [docs/REPORTS.md](../docs/REPORTS.md). JWT + bcrypt + RBAC + force password change + Caddy TLS + Trivy gate in CI.

6. **"What's the stretch roadmap?"**
   Postman collection P3, cosign image signing, agent autoscaling, cloud asset discovery (AWS/GCP), expanded SOAR playbooks via n8n.

---

## Part E — Manual UI Walkthrough (no auto-scan)

> Use this section to demo every feature **by hand**, without `trigger_lab_scans.ps1` or `lab_setup.ps1 seed`. Prereq: main stack up, `/health` returns ok.

### 0. Pre-flight
```powershell
docker compose ps
```
Expected: `sme_dashboard_caddy/backend/frontend/db/redis/celery` all Up.

Open: **https://localhost** (accept self-signed cert) and **http://localhost:8000/docs**.

### 1. Log in
1. Sign in with admin (default seeded user).
2. Verify top bar shows three green health pills: **API · Redis · Workers** (auto-refresh every 30 s).

### 2. Global chrome
- **2.1 Command palette** — Press `Ctrl + K`, type `vu`, Enter → navigates to Vulnerabilities.
- **2.2 Keyboard cheat-sheet** — Press `?` to open shortcut modal.
- **2.3 Skip-link & focus rings** — Refresh, press `Tab` once → skip-to-main link appears, focus rings (`:focus-visible`) on every control.
- **2.4 Notifications bell** — unread count clears on open (persisted via `localStorage[notif.lastSeenAt]`).
- **2.5 Environment scope switcher** — All / Lab / Prod pill in top bar; pick Prod → Vulnerabilities refetches with `?environment=production`.

### 3. Targets Manager
1. Sidebar → **Operations → Nodes**.
2. **Add Target**: name `Demo Web App`, URL `http://example.com`, env `production`. Save.
3. New row appears with inline **Scan** button (zap icon) — do not click for this demo.

### 4. Vulnerabilities Panel (the triage flow)
- **4.1 Filters & saved views** — Severity=High, Status=Open, sort CVSS desc → **Save view** as `Critical & Open`. Appears under Pinned views in sidebar; clicking restores filters instantly. (Dispatches `osc:views-changed`.)
- **4.2 Single-finding drawer** — click row → drawer slides in. `J/K` or arrows step through. URL hash updates (`#finding=F-1234`); paste in new tab → drawer reopens. `Esc` closes.
- **4.3 Bulk actions + Undo** — tick 3 rows (or Shift-click range). Sticky bulk toolbar appears. Status → Accepted-risk → toast with **Undo** (10 s window). Backed by `PATCH /api/v1/vulnerabilities/bulk` returning previous statuses.
- **4.4 Inline chips** — hover row → OWASP A03 · CWE-89 · ×14 hosts · CVSS 9.1. Click any chip → adds as filter, URL updates.

### 5. Scan History
1. Sidebar → **Operations → Scan History** (server-side paginated, 25/page).
2. Switch env scope to **Lab** → list refetches with `?environment=lab`.
3. Click **Explain score** → Risk Breakdown drawer shows each contributor as a horizontal bar (severity × CVSS × confidence × % contribution). Bars sum to ~100 %.

### 6. Threat Center
- **6.1 KPI cards** on Command Center: Total Assets · Critical Findings · Health Score · Action Items · **SLA Overdue**. Red & pulsing for 1.2 s on WS update; click → Vulnerabilities filtered to `SLA Overdue` view.
- **6.2 Unified Inbox (SIEM)** — 10 s polling. If Wazuh/Elastic not running in lite mode, panel shows empty-state CTA pointing to Settings.
- **6.3 Action Center** — sorted Remediation > Investigate > Watch.

### 7. Reports
1. Sidebar → **Reports** → pick a completed scan → **Generate PDF Report**.
2. Open PDF: executive summary, asset inventory, full vuln list, prioritized actions, topology snapshot.

### 8. Settings & RBAC
- Toggle **SIEM enabled** off in Settings → Threat Center → SIEM sub-tab disappears immediately. Toggle on → returns.
- **Settings → RBAC** as admin → add a viewer test user. Sign in as viewer → privileged sub-tabs render `RoleGuard` "you need role X" instead of blank.

### 9. Deep links
- Drawer-open URL: `https://localhost/dashboard/threats/vulns#finding=F-1234`. Paste in new window → drawer restores. Browser Back/Forward toggle the drawer.

### 10. Stop cleanly
```powershell
docker compose down
docker compose -f docker-compose.lab.yml down
```
Volumes preserved by default.

### Cheat-sheet
| Shortcut | Action |
|---|---|
| `Ctrl + K` | Command palette |
| `?` | Keyboard cheat-sheet |
| `Esc` | Close any modal / drawer / palette |
| `J/K` or `↑/↓` | Step through findings in drawer |
| `Tab` (before clicking) | Skip-to-main link |
| `Shift-click` checkbox | Range-select for bulk actions |

### What this manual demo does NOT do
- ❌ No `trigger_lab_scans.ps1` — every scan started manually if at all.
- ❌ No `lab_setup.ps1 seed` — targets added one at a time in the UI.
- ❌ No `docker compose -f docker-compose.lab.yml up` — intentional-lab containers never booted.
- ❌ No quick-scan from the top bar without confirmation popover.

---

## Part F — Rehearsal & Execution Tips

- **Full rehearsal twice** with a stopwatch — demos always overrun.
- **Backup demo video** ready in case the live scan fails.
- **One slide per speaker**, max 3 bullet points.
- **Members 5, 9, and 10 are the stars** — assign your strongest speakers.
- Smooth transitions: each speaker introduces the next by name and role.
- Dress code: business formal for all 11 members.
- Test the venue setup: projector, network for live demo, audio.
- Run Part A checklist T-30 minutes from stage time.

---

*Last updated: 2026-05-07 — merged from 6 source files for single-source-of-truth.*
