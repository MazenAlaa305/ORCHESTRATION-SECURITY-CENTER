# Orchestration Security Center — UI Walkthrough

A complete, page-by-page tour of the dashboard. This document explains every tab, sub-tab, section, card, chart, and button in plain language so a non-developer (course evaluator, end user, or new operator) can understand what every part of the application does.

> **Source map:** the dashboard's main router lives in [Dashboard.jsx](frontend/src/pages/Dashboard.jsx). The chrome (top bar, sidebar, command palette) lives in [Layout.jsx](frontend/src/layout/Layout.jsx) and [Sidebar.jsx](frontend/src/layout/Sidebar.jsx). All panel components live in [frontend/src/components/dashboard/](frontend/src/components/dashboard/).

---

## Table of Contents

1. [Global Chrome (always on screen)](#1-global-chrome-always-on-screen)
2. [Persistent KPI Strip (always on screen)](#2-persistent-kpi-strip-always-on-screen)
3. [Tab 1 — Command Center](#3-tab-1--command-center-overview)
4. [Tab 2 — Operations](#4-tab-2--operations)
   - [4.1 Operations › Scan](#41-operations--scan-scanner)
   - [4.2 Operations › History](#42-operations--history)
   - [4.3 Operations › Nodes (Targets)](#43-operations--nodes-targets)
   - [4.4 Operations › Lab](#44-operations--lab)
5. [Tab 3 — Threat Center](#5-tab-3--threat-center)
   - [5.1 Threat Center › SIEM](#51-threat-center--siem-conditional)
   - [5.2 Threat Center › Vulns](#52-threat-center--vulns-vulnerabilities)
   - [5.3 Threat Center › Topology](#53-threat-center--topology-network)
6. [Tab 4 — AI Brain](#6-tab-4--ai-brain)
7. [Tab 5 — Reports](#7-tab-5--reports)
8. [Tab 6 — Settings](#8-tab-6--settings)
9. [Modal & Drawer reference](#9-modal--drawer-reference)
10. [Real-time behavior summary](#10-real-time-behavior-summary)

---

## 1. Global Chrome (always on screen)

The frame around every page consists of a left **Sidebar**, a top **TopBar**, and a floating **LiveConsole** at the bottom-right. It is implemented in [Layout.jsx](frontend/src/layout/Layout.jsx).

### 1.1 Sidebar — [Sidebar.jsx](frontend/src/layout/Sidebar.jsx)

Vertical navigation rail. Three logical sections:

| Section | Item | Icon | Goes to |
|---|---|---|---|
| **Security** | Command Center | 🟦 LayoutDashboard | Tab 1 — Command Center |
| **Security** | Threat Center | 🟦 Activity | Tab 3 — Threat Center |
| **Operations** | Scanner | 🟦 Scan | Tab 2 — Operations |
| **Operations** | AI Brain | 🟦 Brain | Tab 4 — AI Brain |
| **System** | Reports | 🟦 FileText | Tab 5 — Reports |
| **System** | Settings | 🟦 Settings | Tab 6 — Settings |

**Sidebar controls / visuals:**
- **Logo header** — `OSC` logomark; clicking the chevron collapses the sidebar (state persisted in `localStorage` under `sidebar-collapsed`).
- **Active accent bar** — a small cyan glow on the left of the active item.
- **AI Brain pulse badge** — a pulsing cyan dot appears on the **AI Brain** entry while a scan is running.
- **Threat Center red badge** — a numeric pill counts SLA-overdue findings (from the live KPI feed); shows `99+` when ≥ 100.
- **Pinned Views (sub-list)** — appears nested under **Threat Center** when the user has saved any vulnerability filter views (bookmark icon). Clicking jumps to Vulns and re-applies the saved filter.
- **User card** — avatar (first letter of email), email, role.
- **Logout button** — clears JWT, redirects to login.
- **Connection dot** — green pulsing `Live` if the WebSocket is connected, red `Offline` otherwise.

### 1.2 TopBar — [Layout.jsx:64-127](frontend/src/layout/Layout.jsx#L64-L127)

Slim 48 px header with:

| Control | What it does |
|---|---|
| **Search bar (⌘K / Ctrl K)** | Opens the [Command Palette](frontend/src/components/CommandPalette.jsx) for quick navigation, filtering, and command execution. |
| **Health pills** (`API`, `Redis`, `Workers`) | Probe results from `/health` (re-checked every 30 s). Green = up, red = down. |
| **Environment switcher** (`All` / `Lab` / `Prod`) | Filters Targets/History/Vulns by `environment_type`. State stored in [envStore.js](frontend/src/stores/envStore.js). |
| **Notifications bell** | Opens the [Notifications dropdown](frontend/src/components/NotificationsBell.jsx) — alerts pushed via WebSocket. |
| **Quick Scan popover** | Confirmation popover. **Run** launches a default-profile scan immediately; **Configure** opens the full multi-step Scan Config modal. |

### 1.3 Page header (per page)

Each page renders a thin header below the TopBar:
- Title `Security Ops` (cyan accent on "Ops")
- Status pill: cyan **`ACTIVE ORCHESTRATION`** while scans are running, green **`MONITORING`** otherwise (driven by `isScanning` from the realtime context).

### 1.4 LiveConsole (floating) — [LiveConsole.jsx](frontend/src/components/dashboard/LiveConsole.jsx)

A collapsible bottom-right console showing the raw WebSocket log stream, available on every page. Useful for debugging the agent pipeline.

### 1.5 ShortcutCheatsheet & CommandPalette

- **CommandPalette** (`⌘K`) — fuzzy-search jump menu.
- **ShortcutCheatsheet** (`?`) — displays a cheat sheet of every keyboard shortcut.

---

## 2. Persistent KPI Strip (always on screen)

Rendered above the tab bar by [StatCards.jsx](frontend/src/components/dashboard/StatCards.jsx). Six animated counter cards, all driven by the live KPI feed (`useRealTime().kpi`):

| Card | Source | Visual |
|---|---|---|
| **Security Health** | `100 - risk_score`, color-coded (green > 50 > orange > red) | Number + horizontal bar fill |
| **Vulnerabilities** | `critical+high+medium+low` count | Number + multi-segment severity bar (red/orange/yellow/cyan) |
| **In Progress** | Findings currently being remediated | Purple counter + bar |
| **SLA Overdue** | Findings past their SLA deadline | Red counter, **pulses** when > 0 |
| **Assets** | Distinct discovered hosts | Cyan counter + asset-density bar |
| **Status** | `IDLE` / `RUN` / `OK` / `FAIL` engine status | Text status + pulse during scans |

Numbers animate from 0 on mount via the `useCountUp` hook (~0.9 s).

---

## 3. Tab 1 — Command Center (`overview`)

**Route:** `/dashboard/overview/overview`
**Purpose:** The single-glance security operations dashboard. The first thing an operator sees when they log in.
**Layout:** 12-column grid split into three rails (3 / 6 / 3).

### 3.1 Left Rail — Health, Quick Scan, Trend

| Section / Card | What it shows | Component |
|---|---|---|
| **Health Score** (gauge) | Circular SVG arc, 0–100 %. Color goes green > cyan > orange > red as the score drops. Center shows the % and a ▲/▼ trend arrow vs the previous reading. Bottom label: `OPERATIONAL` / `DEGRADED` / `AT RISK` / `CRITICAL`. | [UptimeGauge.jsx](frontend/src/components/dashboard/UptimeGauge.jsx) |
| **Orchestration / Quick Scan** | Target text input (`localhost` default), **Scan** launch button, and a 5-step pipeline indicator: *Queued → Nmap → Nuclei → Risk Eng → AI*. Each step is grey (pending) → cyan (active, pulsing) → green ✓ (done). The **Advanced** link (top right) opens the multi-step Scan Config modal. | [ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx) |
| **Exposure Trend** (chart) | 14-day Recharts area chart of vulnerabilities discovered per day; cyan stroke on a faded gradient fill. Hovering shows a custom tooltip with the date and count. Empty state: dashed box with "No scan history yet". | [VulnTrend.jsx](frontend/src/components/dashboard/VulnTrend.jsx) |

### 3.2 Center Rail — Heatmap & Topology

| Section / Card | What it shows | Component |
|---|---|---|
| **Vulnerability Severity Distribution** (heatmap) | Five horizontal animated bars (Critical / High / Medium / Low / Info), each with severity-colored gradient fill, in-bar `count (pct%)` label, and right-side count badge. A thin gradient strip at the bottom sums all severities into one ribbon. Empty state: a dashed circle with ✓ "No Open Vulnerabilities". | [RiskHeatmap.jsx](frontend/src/components/dashboard/RiskHeatmap.jsx) |
| **Network Topology** (force graph) | Force-directed graph (`react-force-graph-2d`) of discovered assets in compact mode. Central cyan **hub** node with rays to each asset. Node color = risk band (red ≥75, orange ≥50, amber ≥20, green low). Each node is drawn as a custom canvas icon (server rack, router, etc). Pan / zoom / drag enabled. Click a node to open the **AssetDetailPanel** drawer. | [NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx) |

### 3.3 Right Rail — Live Log & Action Queue

| Section / Card | What it shows | Component |
|---|---|---|
| **Orchestration Log** (live feed) | Virtualized terminal-style log (react-window). Each row shows agent icon (Recon=shield, Attack=alert, Validate=brain, Report=check, Vuln=bug), timestamp, and message colored by level (info=cyan, warn=amber, error=red). Header counter: `Live // N Events`. Empty state: "Waiting for events…". | [OrchestrationFeed.jsx](frontend/src/components/dashboard/OrchestrationFeed.jsx) |
| **Action Queue** (`ActionCenter`) | Prioritized remediation queue from `dashboardService.getActionItems()`. Each item is a left-bordered tile colored by priority (`CRITICAL` red, `HIGH` orange, `MEDIUM` yellow, `LOW` blue) with a relative timestamp ("3m ago"). Header shows an `N URGENT` badge for `CRITICAL+HIGH`. Auto-refreshes every 30 s. Empty state: "Status: Clear". | [ActionCenter.jsx](frontend/src/components/dashboard/ActionCenter.jsx) |

---

## 4. Tab 2 — Operations

**Route:** `/dashboard/operations/<sub>`
**Purpose:** Run scans, review past scans, manage targets, and operate the lab.
**Sub-tabs:** Scan • History • Nodes • Lab.

### 4.1 Operations › Scan (`scanner`)

Default sub-tab. A 3-column grid for running scans.

#### Left column

| Card | Purpose | Buttons |
|---|---|---|
| **Quick Scan** ([ScanButton.jsx](frontend/src/components/dashboard/ScanButton.jsx)) | Same as the Command Center quick scan. | `Scan` (launch), `Advanced` (open ScanConfigModal). |
| **Scheduler** ([Scheduler.jsx](frontend/src/components/OpenVAS/Scheduler.jsx)) | Configure recurring OpenVAS scans (cron presets). | Add / edit / delete schedules. |

#### Right column (spans 2 cols)

| Card | What it shows |
|---|---|
| **Risk Chart** ([RiskChart.jsx](frontend/src/components/OpenVAS/RiskChart.jsx)) | Severity distribution from the latest scan: a Recharts donut/bar of `CRITICAL / HIGH / MEDIUM / LOW`. |
| **Vulnerabilities List** ([VulnerabilitiesList.jsx](frontend/src/components/OpenVAS/VulnerabilitiesList.jsx)) | Most recent OpenVAS scan results table: CVE, host, severity, score. |

### 4.2 Operations › History

Component: [ScanHistory.jsx](frontend/src/components/dashboard/ScanHistory.jsx). Server-side paginated, filterable scan log.

**Filter bar (top):**
- **Search** — type-ahead against `target` (URL or hostname).
- **Status** dropdown — `Any / queued / running / completed / failed`.
- **Profile** dropdown — `Any / quick / standard / full / custom`.
- **From / To** date pickers — date-range filter (UTC-safe).
- **Density** toggle — `Compact` ↔ `Comfortable` row spacing.
- **Clear** — wipes filters (only visible when any filter is set).
- **Refresh** — re-fetches; auto-refreshes every 30 s and on `dashboard:scan-complete` events.

**Table columns:**
1. **Time** — relative ("2h ago"), tooltip shows full ISO timestamp; sortable ▲▼.
2. **Target** — URL/IP, truncated.
3. **Profile** — `quick / standard / full`.
4. **Status** — icon + label (✓ green completed, ⚠ red failed, ⏱ blue running, grey queued).
5. **Findings** — severity pill (highest band) + numeric vuln count.
6. **Duration** — `1m 24s`; sortable ▲▼.
7. **Actions** — two buttons:
   - **Explain** (cyan) — opens [RiskBreakdownDrawer](frontend/src/components/dashboard/RiskBreakdownDrawer.jsx) showing how the risk score was calculated. Disabled until status = `completed`.
   - **Report** (purple) — generates and downloads a signed PDF report. Disabled until status = `completed`.

Clicking a row expands an inline detail panel ([RowDetail](frontend/src/components/dashboard/ScanHistory.jsx#L476-L523)) with three sub-blocks: **Scan Summary** (id, target, profile, started/completed, duration), **Findings** (risk score, vuln count, asset count, auto-report flag, SIEM forward flag), and **Command Preview** (the actual JSON payload sent to `POST /api/v1/scans/`).

**Pagination footer** — page X of Y, rows-per-page selector (10/25/50/100), Prev/Next.

**Empty states:**
- No scans + no filters → "No scans yet" + a `Start your first scan` CTA that jumps to the Scan sub-tab.
- No scans + filters set → "No scans match the current filters" + `Clear filters`.

### 4.3 Operations › Nodes (Targets)

Component: [TargetsManager.jsx](frontend/src/components/dashboard/TargetsManager.jsx). Wrapped in an [ErrorBoundary](frontend/src/components/ErrorBoundary.jsx).

**Internal tabs:** `list` (default) and `discover`.

**Buttons / actions:**
- **+ Add Target** — opens the [EnvironmentWizard](frontend/src/components/dashboard/EnvironmentWizard.jsx) (multi-step form: URL/IP → asset value → compliance tags → scope → confirm).
- **🗑 Delete** (per-row) — confirms then calls `targetService.delete()`.
- **⚡ AI Scan** (per-row) — triggers `pentesterService.startAIScan(targetId)` and dispatches `dashboard:scan-started`.
- **🔍 Discover** (Discover tab) — runs subdomain/asset discovery against a domain.

**Visuals:** Each target row shows its name, URL/IP, environment tag, asset value, and last-scan badge.

**Top-of-panel error banner** — red dismissable banner if a scan launch fails (e.g. backend down, target unreachable).

### 4.4 Operations › Lab

Component: [LabEnvironment.jsx](frontend/src/components/dashboard/LabEnvironment.jsx). Living-lab Docker container control plane.

**Sections:**
1. **Friendly error banner** (conditional) — shown when Docker is unreachable. Plain-English messages: "Docker Desktop is not running…", "Backend lacks Docker socket permission…", etc. Has a **Retry** button.
2. **Lab Status Header** — 4 KPI cells:
   - **Containers** (running / total)
   - **Events** (telemetry events count)
   - **Alerts** (critical telemetry alerts)
   - **Traffic Intensity** (`low` / `medium` / `high`)
   - Header status badge: `HEALTHY` (green) / `DEGRADED` (amber) / `OFFLINE` (red).
   - **🔄 Refresh** button.
3. **Actions Bar** — single button: **Seed Targets** (re-creates lab targets from the manifest).
4. **Network Map by Zone** — 4 colored zones (`DMZ` red, `CORP` yellow, `DATA` purple, `MGMT` blue). Each zone lists its containers as cards with: name, protocol icon (HTTP, SMTP, SMB, DNS, Postgres, Redis), `Running/Offline/Unknown` status badge, top-3 vuln tags, port, CVSS, hostname, and a **▶ Scan** button (HTTP only, while running).
5. **Live Event Feed** — last 30 telemetry events: timestamp, category, action, outcome (success/fail), severity dot.

Lab status auto-refreshes every 10 s; events every 15 s.

---

## 5. Tab 3 — Threat Center

**Route:** `/dashboard/threat-center/<sub>`
**Purpose:** Central console for triaging alerts, vulnerabilities, and the live network map.
**Sub-tabs:** SIEM (conditional) • Vulns • Topology.

### 5.1 Threat Center › SIEM (conditional)

Component: [UnifiedInbox.jsx](frontend/src/components/dashboard/UnifiedInbox.jsx). Only rendered when `siem_enabled` (set in Settings) is `true`.

**Purpose:** Aggregated SIEM alert inbox (Wazuh + Elasticsearch).

**Controls:**
- **Severity filter** — `ALL / HIGH / MEDIUM / LOW` chips (level ≥ 10 → HIGH, ≥ 5 → MEDIUM, else LOW).
- **Pause/Resume** stream button (stops the 10 s polling loop).
- **Refresh** — manual fetch + clears the "new since…" counter.
- **`+N new`** badge — pulses when new alerts arrive while paused.

**Alert list:**
Each row shows an icon mapped from rule keywords (Lock=auth, Globe=web, ShieldAlert=intrusion, Activity=network, Terminal=command, AlertTriangle=error, Info=fallback), the rule description, MITRE/Wazuh groups as small chips, the source agent, and a timestamp. Clicking a row opens a side detail drawer with the raw Elasticsearch document.

**Empty / error states:**
- SIEM disabled → "SIEM disabled — enable it in Settings".
- Backend unreachable → red banner.

### 5.2 Threat Center › Vulns (`vulnerabilities`)

Component: [VulnerabilitiesPanel.jsx](frontend/src/components/dashboard/VulnerabilitiesPanel.jsx). The flagship triage view.

**Toolbar (top):**
- **Search** — text search across title / type / endpoint.
- **Severity filter** — `Any / Critical / High / Medium / Low / Info`.
- **Status filter** — `Any / open / in_progress / fixed / false_positive / accepted`.
- **Min severity** — alert-fatigue floor; defaults to `info` (everything).
- **Hide closed** toggle — hides `fixed` and `false_positive` (default ON).
- **Group duplicates** toggle — collapses repeats by template+endpoint (default ON).
- **Sort** — by `severity / cvss / discovered_at` ▲▼.
- **Saved Views** menu — load, save, or delete named filter combinations. Saved views appear under "Threat Center" in the sidebar as quick-jump pins.
- **Bulk select** — header checkbox + per-row checkboxes.
- **Bulk actions** (visible when ≥1 selected): `Mark Fixed`, `Mark False Positive`, `Mark Accepted`, `Delete`.
- **Export** — CSV download of the current filtered list.

**Row content:** color-coded severity left-border + inset shadow, severity badge, title, endpoint URL, CVSS score, status badge, framework chips (`OWASP`, `CWE`, `ISO`, `NIST`, `PCI`, `MITRE`), and a "🆕 NEW" pill for findings discovered since the user's `lastSeenAt` mark.

**Click a row** → opens [IncidentDetailDrawer](frontend/src/components/dashboard/IncidentDetailDrawer.jsx).

### 5.3 Threat Center › Topology (`network`)

Same component as the Command Center mini-graph but rendered full-screen ([NetworkTopology.jsx](frontend/src/components/dashboard/NetworkTopology.jsx)).

**Controls (overlay):**
- **🔍+ / 🔍−** — Zoom in / out.
- **⛶ / ⛶** (Maximize/Minimize) — Toggle full-viewport mode.
- **🔄 Refresh** — re-fetch network assets.
- **➕ Move** — toggle drag-to-pan vs drag-to-move-node.
- **🎯 Crosshair** — recenter on the hub.

**Legend** ([TopologyLegend.jsx](frontend/src/components/dashboard/TopologyLegend.jsx)) — color/shape key for risk bands and device types.

**Click a node** → [AssetDetailPanel.jsx](frontend/src/components/dashboard/AssetDetailPanel.jsx) drawer with IP, ports, services, OS, vuln count, and last-scan info.

---

## 6. Tab 4 — AI Brain

**Route:** `/dashboard/ai-brain/ai-console`
**Purpose:** Audit & observability of the 4-stage agent pipeline. This is where security analysts and academic evaluators inspect *why* the system made each decision.
**Component:** [AgentLogViewer.jsx](frontend/src/components/dashboard/AgentLogViewer.jsx).

### 6.1 Pipeline Stepper (top card)

Four circles connected by lines, labeled **Nmap → Nuclei → Risk Engine → AI Advisory**, color-coded:
- Pending = grey
- Active = colored ring + pulse (Nmap blue, Nuclei red, Risk yellow, AI purple)
- Done = green ✓

The active stage is derived from the most recent `agent_name` in the log stream.

### 6.2 Neural Console (main panel)

A console-style log viewer styled as a "neural uplink".

**Header bar:**
- **Stream Active** indicator (pulsing green dot)
- **[N Data Points]** event count
- **Sync Scroll** checkbox — auto-scroll to the latest event.

**Log rows:** each row shows
- An emoji icon per agent (🔍 recon, ⚔️ attack, ✅ validation, 📊 reporting, 🤖 fallback)
- `[AGENT_NAME]` tag
- The action description
- Timestamp (HH:MM:SS, 24-hr)
- A ▼ chevron when reasoning is available.

**Click a row to expand** — reveals three blocks:
- **Neural Chain-of-Thought** — the agent's plain-text reasoning (purple-glow card).
- **Inbound Payload** — the JSON input the agent received (truncated to 500 chars).
- **Outbound Result** — the JSON the agent emitted (truncated to 500 chars).

**Footer:** vanity status `LINK ESTABLISHED`, `ENCRYPTION: AES-256`, version `AI AGENT MONITOR V1.2.0-PRO`.

**Auto-refresh:** every 2 s while the panel is mounted (`pentesterService.getAgentLogs(scanId)`).

**Empty state:** when no scan is selected — "INITIALIZING AI ADVISOR…" with a hint to run a scan first.

---

## 7. Tab 5 — Reports

**Route:** `/dashboard/reports/reports`
**Purpose:** Generate and download signed PDF executive / technical reports for completed scans.
**Component:** [Reports.jsx](frontend/src/components/dashboard/Reports.jsx).

**Layout:** 3-column grid (1 list / 2 viewer).

### 7.1 Left column — Completed Scans list

- Header: `Completed Scans` + 🔄 refresh.
- Each list item shows the target URL, completion date, "Completed" badge, and the scan's risk score. The currently selected scan is highlighted cyan.
- Empty state (no completed scans) → centered illustration + `Run your first scan` CTA that jumps to Operations › Scan.

### 7.2 Right column — Report viewer

**Header:**
- Scan title (target URL) + completion timestamp.
- **Generate Report** (purple) — calls `scanService.generateReport(id)`; while running shows a spinner and "Generating…".
- **Export PDF** (cyan, appears after generation) — downloads the signed PDF.

**Body (3 sections):**
1. **Vulnerability Summary** — 4 large severity badges: Critical / High / Medium / Low (using cumulative open-vuln counts from the live KPI feed).
2. **Report Metadata** (after generation):
   - Report ID
   - Generated timestamp
   - Digitally Signed (Yes/No)
   - **Findings Hash** — SHA-256 hex string for tamper-evidence.
3. **Findings list** — top-N rows of the open vulnerabilities for context: title, host, severity pill.

If no report has been generated yet → dashed-bordered placeholder card prompting the user to click *Generate Report*.

---

## 8. Tab 6 — Settings

**Route:** `/dashboard/settings/settings`
**Purpose:** System configuration, integration health, lab control, account management.
**Component:** [SettingsPanel.jsx](frontend/src/components/dashboard/SettingsPanel.jsx).

The panel renders one of two views depending on the user's role:
- **Admin** — full edit access (sections 8.1 – 8.4 below).
- **Non-admin** — read-only summary view (section 8.5).

### 8.1 Tool Toggles

A 2-col grid of switchable feature flags. Each row has an icon, label, description, and a cyan/grey toggle switch.

| Toggle | Description |
|---|---|
| **OpenVAS Scanner** (Radar) | GVM/GMP authenticated network vuln scanner. |
| **SIEM Integration** (Activity) | Elasticsearch + Wazuh event pipeline. Hides the SIEM sub-tab when off. |
| **LLM AI Validation** (Brain) | Gemini triage of findings (advisory only — never overrides reprobe). |
| **Nmap Scanning** (Network) | Port and service discovery. |
| **Nuclei Scanning** (Shield) | Template-driven vulnerability scanner. |

### 8.2 Scan & LLM Defaults

Two number inputs (commit on blur):
- **Daily LLM Token Budget** — global ceiling (default 500 000).
- **Per-Scan LLM Token Cap** — per-job ceiling (default 50 000).

### 8.3 Lab Environment Controls

- 3 KPI tiles: **Containers** (running/total), **Overall** status, **Traffic Intensity** dropdown (`low/medium/high`).
- **▶ Seed Targets** button — re-seeds lab DB; shows success count under the button.
- **🔄 Refresh Status** button.

### 8.4 Integration Health

Live grid of every external integration with a colored status pill: `CONNECTED` / `CONFIGURED` / `STARTING` / `UNREACHABLE` / `NOT CONFIGURED` / `DISABLED`. Auto-refreshes every 30 s. Includes a manual **🔄** button.

### 8.5 Read-only view (non-admin)

A simplified `Tool Toggles` table that just shows ON/OFF state for each capability, plus the platform version string. No edits possible.

---

## 9. Modal & Drawer reference

These are not tabs — they're contextual UI surfaces that open *over* a tab.

### 9.1 Scan Config Modal — [ScanConfigModal.jsx](frontend/src/components/dashboard/ScanConfigModal.jsx)

Triggered by:
- **Advanced** link inside the Quick Scan card.
- **Configure** button in the Top Bar's Quick Scan popover.
- **AI Scan** button in the Targets list.

A 4-step stepper modal:

| Step | Purpose | Inputs |
|---|---|---|
| **1. Target** | Who are we scanning? | URL/IP text input (validated against an RFC-1123 / IPv4 regex), or pick from saved Targets. |
| **2. Profile** | How deep? | 3 cards: **Quick** (`nmap`, ~2 min), **Standard** (`nmap+nuclei`, ~10 min), **Full** (`+ai_validation`, ~20 min). Tool toggles can be customized per-scan: Nmap, Nuclei, OpenVAS, AI Validation. |
| **3. Schedule** | Now or recurring? | Run-once / daily 02:00 / weekly Mon 02:00 / hourly / custom cron. |
| **4. Review** | Confirm & launch. | Read-only summary card + **Launch Scan** button. |

### 9.2 Incident Detail Drawer — [IncidentDetailDrawer.jsx](frontend/src/components/dashboard/IncidentDetailDrawer.jsx)

Slides in from the right when a vulnerability is clicked. Sections:
- **Header** — severity badge, title, CVE-ID (if any), close ✕, and a Prev/Next pager when navigating a list.
- **AI Remediation** (collapsible, default open) — Gemini-generated step-by-step fix.
- **Raw PoC** (collapsible) — the Nuclei matched payload with **Copy** button (✓ check confirms copy).
- **Actions row** — buttons:
  - **Revalidate** — re-runs the check against the same target.
  - **Mark Fixed**, **Mark False Positive**, **Accept Risk** — status mutations.
  - **Open Endpoint** — opens the affected URL in a new tab.
- **CVE Intel** — external links and CVSS vector breakdown.
- **Keyboard shortcuts:** `Esc` close • `J / ↓` next finding • `K / ↑` previous.

### 9.3 Risk Breakdown Drawer — [RiskBreakdownDrawer.jsx](frontend/src/components/dashboard/RiskBreakdownDrawer.jsx)

Opens from the **Explain** button in Scan History. Shows how the **UnifiedRiskEngine** computed the scan's score: per-finding contributions, weighting, and final aggregate.

### 9.4 Asset Detail Panel — [AssetDetailPanel.jsx](frontend/src/components/dashboard/AssetDetailPanel.jsx)

Opens from the Topology graph node click. Shows IP, ports, detected services, OS guess, running scans, and vuln count.

### 9.5 Environment Wizard — [EnvironmentWizard.jsx](frontend/src/components/dashboard/EnvironmentWizard.jsx)

Multi-step target onboarding form: URL/IP → asset value (Low/Medium/High/Critical) → data sensitivity → compliance tags (SOC2, ISO 27001, PCI, HIPAA, GDPR) → scope allowlist → rate limits → confirm.

### 9.6 Notifications Bell — [NotificationsBell.jsx](frontend/src/components/NotificationsBell.jsx)

TopBar bell icon. Dropdown of the most recent alerts (scan completions, SLA breaches, failures). Marked-read state persisted client-side.

### 9.7 Command Palette — [CommandPalette.jsx](frontend/src/components/CommandPalette.jsx)

`⌘K / Ctrl+K`. Fuzzy navigation between any tab/sub-tab; also exposes commands like "Start scan", "Open report", "Open settings".

### 9.8 Shortcut Cheatsheet — [ShortcutCheatsheet.jsx](frontend/src/components/ShortcutCheatsheet.jsx)

`?` opens a modal listing every registered keyboard shortcut.

---

## 10. Real-time behavior summary

The whole UI reacts to a single WebSocket connection at `/ws/events`, surfaced through [RealTimeContext.jsx](frontend/src/context/RealTimeContext.jsx). Below is a quick map of which surfaces update *live* (no manual refresh needed):

| Surface | Update trigger |
|---|---|
| **KPI Strip** | `RISK_UPDATE` and `ALERT_NEW` messages — counts and Health Score animate. |
| **Health Gauge** (Command Center) | Same as above. |
| **Risk Heatmap** | Same as above. |
| **Orchestration Log** | `LOG_STREAM` — new lines appended to the virtualized list (max 200 retained). |
| **Quick Scan pipeline** | `LOG_STREAM` keywords advance the step indicator (`RECON` → step 1, `ATTACK` → step 2, etc). |
| **Scan History** | `dashboard:scan-started` / `dashboard:scan-complete` events trigger an immediate re-fetch; otherwise polled every 30 s. |
| **AI Brain console** | Polls every 2 s while mounted. |
| **Action Queue** | Polls every 30 s. |
| **Lab status / events** | Polls every 10 s / 15 s. |
| **TopBar health pills** | `/health` polled every 30 s. |
| **Sidebar connection dot** | Reflects WebSocket `isConnected` directly. |
| **Sidebar AI-Brain pulse** | `scanStatus === 'RUNNING'`. |
| **Sidebar Threat Center red badge** | `kpi.overdue_findings`. |

---

### Document version

- **Generated:** 2026-05-08
- **Dashboard tabs covered:** 6 main + 9 sub-tabs.
- **Components referenced:** ~30 panels + 6 modals/drawers.
- **Source of truth:** [Dashboard.jsx](frontend/src/pages/Dashboard.jsx) (router) and the components under [frontend/src/components/dashboard/](frontend/src/components/dashboard/).
