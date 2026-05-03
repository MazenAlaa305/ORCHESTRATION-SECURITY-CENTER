# UX Enhancement Plan — Orchestration Security Center (OSC)

> Audience: IT admin at an SME. Goal of this plan: make OSC *faster to navigate, surface more of the value already buried in the backend, and add concrete UI affordances that ship the product's "1000 signals → 5 actions" promise more aggressively.*

---

## 1. Project Overview

- **One-sentence value prop** — Turn 1,000 raw security signals into 5 prioritized, plain-language action items by chaining open-source scanners (Nmap → Nuclei → OpenVAS) through a deterministic, AI-assisted pipeline.
- **Target users** — IT administrators at small/medium enterprises. Moderately technical, no SOC, time-poor, judged on *outcomes* (incidents avoided, SLA met) not on *activity* (alerts triaged).
- **Tech stack** — React 18 + Vite + Tailwind, TanStack Query, Zustand, Recharts, react-force-graph-2d, framer-motion, lucide-react. Backend: FastAPI + SQLAlchemy + Celery/Redis + Elasticsearch (Wazuh) + OpenVAS/Nmap/Nuclei. SPA with no router (state-driven tabs), WebSocket live updates.

---

## 2. Current State Analysis

### 2.1 Existing User Flows

1. **First-run / login** → `LoginPage` → `Dashboard` lands on the *Command Center* tab. No onboarding, no empty-state handholding, no "add your first target" CTA.
2. **Run a scan** → Top-bar **Quick Scan** *or* sidebar → **Scanner** sub-tab → click **ScanButton** → opens `ScanConfigModal` → submit → app auto-jumps to *AI Brain* tab → watch `AgentLogViewer`. *(4 clicks if user already knows where to go; 6+ if discovering.)*
3. **Triage a finding** → *Threats → Vulns* sub-tab → scroll list → click row → `IncidentDetailDrawer` opens → mark status → close. No bulk actions, no keyboard navigation between rows, no "next finding" affordance inside the drawer.
4. **Investigate a SIEM alert** → *Threats → SIEM* → `UnifiedInbox` (10s polling) → click alert → no cross-link to the affected asset's vulnerabilities or scan history.
5. **Generate a report** → *Docs* tab → `Reports` → pick scan → download PDF. No template choice, no scoping, no scheduled/recurring reports surfaced to the user.
6. **Add a target / scan it** → *Ops → Nodes* → `TargetsManager` → add IP → return to *Scanner* to launch. Targets and scans live in two separate sub-tabs even though they're the same task.
7. **Adjust settings / RBAC** → *Config* tab → `SettingsPanel`. Users with the wrong role see nothing — no "request access" path.

### 2.2 Pain Points

| # | Issue | Location | Severity | User Impact |
|---|---|---|---|---|
| 1 | No URL routing — state lives in `useState` only | `App.jsx`, `Dashboard.jsx` | **Critical** | Cannot share or bookmark a scan, finding, or asset. Refresh always lands on Center. |
| 2 | No global command palette — only a passive search input that does nothing on Enter | `Layout.jsx:58` (search), `TopBar` | **Critical** | The ⌘K key is *captured* but only focuses the input; there is no result list, no command list, no keyboard-driven navigation. |
| 3 | "Search IPs, assets, CVEs..." input is decorative — typing does not query anything | `Layout.jsx:60-77` | **Critical** | False affordance. Users discover the limitation only after typing. |
| 4 | Top-tab labels are abbreviated jargon ("Center / Ops / Threats / AI / Docs / Config") *and* the sidebar uses different labels ("Command Center / Threat Center / Scanner / AI Brain / Reports / Settings") | `Dashboard.jsx:49`, `Sidebar.jsx:6` | Important | Two naming systems for the same destinations confuses new users and breaks muscle memory. |
| 5 | Backend exposes `overdue_findings` (SLA breaches) on `KPISnapshot` — UI never shows it | `dashboard.py:32`, `StatCards.jsx` | **Critical** | The *one* metric that should drive admin urgency is invisible. |
| 6 | Scan **risk breakdown with per-vuln reason** exists at `/dashboard/risk-breakdown` and is never surfaced | `dashboard.py` (RiskBreakdown), `scoring_explainer.py` | **Critical** | The "deterministic AI-assisted scoring" value prop is invisible — users see a number, not the *why*. |
| 7 | MITRE/OWASP framework tags (`framework_tagger.py`) and dedup counts (`finding_dedup.py`) not displayed on findings | `VulnerabilitiesPanel.jsx`, `IncidentDetailDrawer.jsx` | Important | Findings look generic; admins cannot pivot by framework or see "this CVE was hit on 14 hosts." |
| 8 | No bulk actions on findings (mark accepted-risk, false-positive, snooze, assign) | `VulnerabilitiesPanel.jsx` | **Critical** | At >50 findings the panel is a wall of single-click work. |
| 9 | `IncidentDetailDrawer` has no Prev/Next, no `J/K` keys, no `Esc` documented | `IncidentDetailDrawer.jsx` | Important | Triaging 30 findings requires 30 round-trips back to the list. |
| 10 | Targets and Scans are split across sub-tabs, but adding a target rarely exists in isolation from scanning it | `Dashboard.jsx:243-247` | Important | A "scan this target now" button on the row would collapse a 3-step flow into 1. |
| 11 | `ScanHistory` doesn't expose the 4-stage pipeline progress (Recon→Attack→Validate→Score) on each row | `ScanHistory.jsx`, `ScanPipelinePanel.jsx` | Important | The pipeline animation lives in a separate panel; the history row only says "running/completed." |
| 12 | `LiveConsole` is always mounted at the bottom — wastes vertical space on screens where the user isn't debugging | `Layout.jsx:126`, `LiveConsole.jsx` | Nice-to-have | Should be a collapsible/togglable drawer with `~` shortcut. |
| 13 | No empty states with CTAs — first-time users see zeros across StatCards and no guidance | `StatCards.jsx`, `VulnerabilitiesPanel.jsx` | **Critical** | "Is it broken or do I have nothing to do?" ambiguity. |
| 14 | No keyboard shortcuts cheat-sheet (`?` / Shift+/) | global | Important | Power users cannot discover ⌘K, ⌘/, J/K patterns. |
| 15 | Wizard-style scan launch is buried — `ScanConfigModal` is 600 lines but gated behind one button on one sub-tab | `ScanConfigModal.jsx` | Nice-to-have | Should also launch from command palette and from a target row. |
| 16 | Aggressive cyberpunk styling: 8–9px tracked-out caps, `text-[7px]` micro-labels, low contrast on `text-gray-700` against `rgba(15,30,40,0.4)` | many components | **Critical** | Fails WCAG AA contrast in places; legibility cost outweighs the aesthetic. |
| 17 | Health pills (API/Redis/Workers) silently fail with no recovery action — clicking does nothing | `Layout.jsx:80-84` | Important | When Redis goes down, admin must SSH; UI should at least link to a runbook or surface the error. |
| 18 | No notifications/activity feed in the chrome — `OrchestrationFeed` is only on the Center tab | `OrchestrationFeed.jsx` | Important | When working in *Ops*, a critical-severity finding from a background scan is invisible until tab switch. |
| 19 | No saved views / filter presets on `VulnerabilitiesPanel` (e.g., "Critical & Open & SLA-overdue") | `VulnerabilitiesPanel.jsx` | Important | Same filter combo is reapplied every visit. |
| 20 | RBAC denies render *nothing* in some places (`RoleGuard`) — no "you need role X, ask admin" message | `RoleGuard.jsx` | Important | Looks like a broken page to non-admins. |
| 21 | Mobile/tablet — sidebar is fixed `w-52`, top bar assumes desktop width, force-graph crashes on small screens | `Sidebar.jsx:103`, `NetworkTopology.jsx` | Nice-to-have | Field-IT scenario (admin on a tablet during an incident) is unsupported. |
| 22 | Quick Scan button on top bar calls `onQuickScan` with no scan-config — uses last-used or default. The user has no way to know what will be scanned. | `Layout.jsx:88-101` | **Critical** | One-click destructive-ish action with no confirmation/preview. |
| 23 | `ActionCenter` shows action items but doesn't link them to the source vulnerability or asset | `ActionCenter.jsx` | Important | Users can't trace "why is this an action?" |
| 24 | `lab-enabled` and `siem_enabled` flags hide tabs entirely, but there's no "enable this in Settings" hint where the tab would be | `Dashboard.jsx:74,290` | Nice-to-have | Discoverability of paid/optional integrations is zero. |

---

## 3. Research & Inspiration

### 3.1 Reference Products

1. **Tenable.io / Nessus** — Borrow: per-finding MITRE ATT&CK tagging, "remediation summary" view that groups findings by *fix* (one patch closes 14 vulns), and SLA dashboards by asset criticality. *Don't* borrow: heavy left nav with 6 levels.
2. **Wazuh dashboard (Kibana-based)** — Borrow: the timeline-driven incident view, Lens-style ad-hoc charting on top of the same alert index, "compare to last 7 days" deltas on every KPI. *Don't* borrow: Kibana's discovery latency.
3. **Linear** — Borrow: ⌘K command palette as the canonical way to do *anything* (navigate, run, assign, filter, create); J/K row navigation + drawer with Prev/Next; saved filter views pinned to the sidebar; instant deep-links per item (`/finding/F-1234`).
4. **GitHub (Issues + Code Scanning)** — Borrow: `is:open severity:critical assignee:@me` filter syntax, bulk-action toolbar that appears on row selection, "Watching/Subscribed" notifications, breadcrumb back to repo/scan.
5. **Datadog** — Borrow: top-of-screen environment switcher (prod/staging/lab) with badge color, notebook/timeline for incident retros, "metric correlator" that surfaces what changed when an alert fired. *Don't* borrow: information overload.
6. **Vercel / Stripe Dashboard** — Borrow: extreme empty-state quality (illustration + 2 CTAs + docs link), inline editing on settings, optimistic updates with toast undo.

### 3.2 Applicable UX Patterns

- **Command Palette (⌘K)** — Linear, GitHub, Vercel, Slack. Single keystroke to *navigate, search, and execute*. Highly relevant — OSC already has 6 tabs × multiple sub-tabs, every action belongs here.
- **Saved Views / Smart filters** — Linear, Jira, Datadog. Filters are 80% of triage; saving them is free leverage.
- **Drawer + Prev/Next + J/K** — Linear, GitHub PR review. Cuts triage round-trips by 50%+.
- **Bulk-action toolbar on selection** — GitHub, Gmail. The single biggest force multiplier for >20-row lists.
- **Deep-linking with shareable URLs** — Every modern admin product. Required for Slack/email handoffs.
- **Breadcrumbs on detail views** — GitHub, AWS Console. OSC has 0 breadcrumbs today.
- **Activity feed in chrome** — GitHub bell, Linear inbox. Decouples "where I am" from "what's happening."
- **Empty states with CTAs** — Stripe, Vercel. Removes "is it broken?" doubt.
- **Inline editing + optimistic updates with toast undo** — Linear, Notion. Settings/targets/findings status all qualify.
- **Progressive disclosure** — Stripe. Expert mode opens advanced scan options; default hides them.
- **Keyboard cheat-sheet (`?`)** — GitHub, Linear, Slack. Free discoverability for every shortcut you ship.
- **First-run product tour** — Intercom Product Tours, Stripe. 60 seconds saves 60 minutes of confusion.
- **Status-aware top bar** — Datadog env switcher. Lab vs. Prod scope must be impossible to misread.

---

## 4. Recommendations

### 4.1 Quick Wins (≤1 week, high impact)

1. **Make ⌘K a real command palette** (replaces fake search). [Spec §5.1]
2. **Surface SLA / overdue findings** as a 5th KPI card and a sidebar badge. [Spec §5.2]
3. **Empty states with CTAs** on `StatCards`, `VulnerabilitiesPanel`, `TargetsManager`, `ScanHistory`. [Spec §5.3]
4. **Quick Scan confirmation popover** showing target scope + "Configure…" escape hatch. [Spec §5.4]
5. **Keyboard cheat-sheet modal** triggered by `?`. [Spec §5.5]
6. **Unify tab labels** — pick one set (recommend the sidebar's longer names) and use everywhere. [Spec §5.6]
7. **Add "Scan now" button to each `TargetsManager` row.** [Spec §5.7]
8. **Drawer Prev/Next + J/K + Esc + URL hash for findings.** [Spec §5.8]

### 4.2 Medium-effort Improvements (1–2 sprints)

9. **Introduce react-router with deep links** (`/scans/:id`, `/findings/:id`, `/assets/:ip`). [Spec §5.9]
10. **Saved Views on the vulnerabilities panel** + a "Pinned views" section in the sidebar. [Spec §5.10]
11. **Bulk-action toolbar** on findings (status, assign, snooze, export). [Spec §5.11]
12. **Risk breakdown drawer** that explains *why* a scan scored what it did, fed by `/dashboard/risk-breakdown`. [Spec §5.12]
13. **Global notifications bell** in the top bar (orchestration events from anywhere in the app). [Spec §5.13]
14. **Scope/environment switcher** (Lab vs. Production) with a colored badge in the top bar. [Spec §5.14]
15. **MITRE / OWASP / dedup chips** on every finding row + filterable. [Spec §5.15]

### 4.3 Strategic Additions (bigger bets)

16. **Remediation Plans view** — group findings by fix (one patch closes N findings), with assignable owners and SLA timers. [Spec §5.16]
17. **Asset-centric page** (`/assets/:ip`) merging topology, scan history, findings, SIEM alerts, and SLA into one timeline. [Spec §5.17]
18. **Scheduled & recurring reports** with template chooser and email/Slack delivery. [Spec §5.18]
19. **First-run Product Tour + checklist widget** ("Add target → Run scan → Review findings → Generate report"). [Spec §5.19]
20. **Accessibility & contrast pass** — bump micro-text from 7–9px to 11–12px, raise grays, add focus rings, audit ARIA on all modals/drawers. [Spec §5.20]

---

## 5. Detailed Specs

### 5.1 Global Command Palette (⌘K)

- **Problem** — The ⌘K shortcut already exists but only focuses a non-functional search input. The product has 6 main tabs × ≥3 sub-tabs × dozens of items; there is no fast path between them.
- **Solution** — Replace the top-bar search with a `cmdk`-powered modal palette. Index: every navigation destination, every scan, every target, every recent finding (last 50), and a curated *Actions* list (Run quick scan, New scan with config, Generate report, Toggle live console, Switch scope, Logout).
- **UI** — Centered modal, ~640px wide, dark glass card matching existing `glass-card`, top input row with `lucide:Search`, results in sectioned groups: **Actions / Recent / Scans / Targets / Findings / Help**. Top-right: `Esc` chip. Each result row shows icon + label + dim secondary metadata + a small kbd badge if it has a shortcut.
- **Behavior** — Open: `⌘K` / `Ctrl+K` / clicking the top-bar trigger. Arrow keys move; `Enter` runs/navigates; `Tab` cycles section; typing `>` filters to *Actions only*; typing `#` filters to findings; `@` to assets; `/` to scans. Recents persist in localStorage (max 8). Close on `Esc`, outside click, or selection.
- **Files / components** — New: `frontend/src/components/CommandPalette.jsx`. Modify: `Layout.jsx` (replace search input with `<button>` trigger + Kbd hint, mount palette at root). New context: `frontend/src/context/CommandPaletteContext.jsx`.
- **Libraries** — `cmdk` (~3kb, MIT), already-present `framer-motion` for fade.
- **Acceptance criteria** — (a) ⌘K opens in <100ms with cached recents; (b) typing "vu" shows "Go to Vulnerabilities" within 1 keystroke; (c) Enter on any result either navigates or executes without leaving the keyboard; (d) the previous fake search input is removed.
- **Outcome metric** — Reduces top-3 task click counts: Run scan 4→2, Open finding 3→2, Open scan history 2→1.

### 5.2 SLA / Overdue Findings KPI

- **Problem** — `KPISnapshot.overdue_findings` is computed and shipped to the frontend but never rendered. SLA is the single most actionable metric for an SME admin.
- **Solution** — Add a 5th `StatCard` ("SLA Breaches") with red accent when >0, and a small numeric badge on the sidebar's *Threat Center* item.
- **UI** — Reuses `KPICard` shape. Title: "SLA OVERDUE". Value: integer count. Sub: "needs attention" / "all on track". Color: `#ff0055` if >0, else `#00ff88`. Click → navigates to `Threats → Vulns` with a pre-applied "SLA overdue" saved view.
- **Behavior** — Pulses for 1.2s when count increases via WS event. Tooltip explains SLA tiers (Critical 24h / High 7d / Medium 30d).
- **Files** — `StatCards.jsx` (add card), `Sidebar.jsx` (badge prop on Threat Center NavItem), `dashboard.py` already returns the field.
- **Acceptance** — Card visible on Center tab; clicking it lands on filtered Vulns view; badge appears on Sidebar when value > 0.

### 5.3 First-Class Empty States

- **Problem** — A fresh deployment shows zeros, blank lists, and ambiguity about whether things are working.
- **Solution** — Replace empty render branches in `StatCards`, `VulnerabilitiesPanel`, `TargetsManager`, `ScanHistory`, `Reports`, `UnifiedInbox` with a unified `<EmptyState>` (already exists in `components/ui/EmptyState.jsx` — extend it).
- **UI** — Centered: subtle icon (96px, low-opacity cyan glow), one-line title ("No targets yet"), one-line subtitle, primary CTA ("Add your first target"), secondary text link ("View docs").
- **Behavior** — Each empty state has a *single* primary CTA mapped to the next logical step. CTA fires the same path as the relevant button (e.g., opens `ScanConfigModal`).
- **Files** — Extend `components/ui/EmptyState.jsx`; replace ad-hoc empty checks in each panel.
- **Acceptance** — No panel renders a bare "0" or blank list; every empty state has a CTA.

### 5.4 Quick Scan Confirmation Popover

- **Problem** — Top-bar Quick Scan launches with last-used / default config silently. Users cannot see scope before consequence.
- **Solution** — Click on Quick Scan opens a small popover anchored to the button: "About to scan: **3 targets** with profile **Default Recon**." Buttons: **Run** (primary), **Configure…** (opens modal), **Cancel**.
- **UI** — `Popover` (Radix) anchored bottom-right of the button, ~320px, glass card, lists target chips (max 4 + "+N more"), profile name pill, ETA hint ("~2–4 min").
- **Behavior** — `Enter` runs, `Esc` cancels, `C` opens Configure. Popover dismisses on outside click. If 0 targets configured, replaces popover with empty state CTA.
- **Files** — `Layout.jsx` (TopBar Quick Scan button), new `components/dashboard/QuickScanPopover.jsx`.
- **Libraries** — `@radix-ui/react-popover`.
- **Acceptance** — No scan launches from top bar without one confirmation step; popover never blocks Run when targets exist.

### 5.5 Keyboard Shortcuts Cheat-Sheet

- **Problem** — Shortcuts are invisible. Power-user pattern is undelivered.
- **Solution** — Modal triggered by `?` (Shift+/) listing all shortcuts grouped by area.
- **UI** — Centered modal, two columns of `Kbd` chips + descriptions: Global (⌘K, ?, ⌘/), Lists (J/K nav, X select, Enter open), Drawer (Prev/Next, S=status, A=assign), Scan (Q=quick scan).
- **Behavior** — `?` opens, `Esc` closes. Auto-detects platform for ⌘ vs Ctrl glyph.
- **Files** — New `components/ShortcutCheatsheet.jsx`; register hotkey in a `useShortcuts` hook.
- **Libraries** — `react-hotkeys-hook`.
- **Acceptance** — Pressing `?` from any tab shows the modal; every shortcut listed actually works.

### 5.6 Tab Label Unification

- **Problem** — Sidebar says "Command Center / Threat Center / Scanner / AI Brain / Reports / Settings"; main tab bar says "Center / Ops / Threats / AI / Docs / Config". Two vocabularies for the same destinations.
- **Solution** — Standardize on the sidebar's full names, since they are domain-meaningful and only ~12 chars. Shorten only on collapsed states.
- **Files** — `Dashboard.jsx:49-56` (`MAIN_TABS`).
- **Acceptance** — Sidebar label === main tab label for every tab.

### 5.7 "Scan Now" on Target Rows

- **Problem** — Adding a target then scanning it is a 3-step flow across two sub-tabs.
- **Solution** — Each `TargetsManager` row gets a primary "Scan" button (Zap icon) that opens `ScanConfigModal` pre-scoped to that target.
- **Files** — `TargetsManager.jsx`, `ScanConfigModal.jsx` (accept `prescopedTargets` prop).
- **Acceptance** — From Targets, one click opens the scan modal with that target's IP locked in.

### 5.8 Finding Drawer: Prev/Next + J/K + URL hash

- **Problem** — Triaging 30 findings requires 30 close+reopen cycles.
- **Solution** — `IncidentDetailDrawer` accepts the *list* + current index; renders Prev/Next chevrons + handles `J/K` (and Up/Down) to step. URL hash updates to `#finding=F-1234` for shareable deep links.
- **UI** — Top-right of drawer header: `‹ 12 / 47 ›` indicator + chevrons. Footer keeps existing actions, adds `S` (status), `A` (assign), `M` (mark false-positive) inline kbds.
- **Files** — `VulnerabilitiesPanel.jsx`, `IncidentDetailDrawer.jsx`.
- **Acceptance** — Opening any finding sets URL hash; J/K cycles drawer in place; refreshing the page restores the open finding.

### 5.9 React Router with Deep Links

- **Problem** — All state is in-memory; no shareable URLs; refresh always lands on Center.
- **Solution** — Introduce `react-router-dom` v6. Routes: `/` (Center), `/operations/:sub?`, `/threats/:sub?`, `/threats/findings/:id`, `/threats/findings`, `/operations/scans/:id`, `/operations/targets/:id`, `/assets/:ip`, `/ai/:scanId?`, `/reports`, `/reports/:id`, `/settings/:section?`. Tabs read from `useParams`, sub-tabs from search params.
- **Files** — Wrap `App.jsx` in `<BrowserRouter>`; convert `Dashboard.jsx`'s tab-switch into a `<Routes>` tree; add a `useDashboardNav()` hook to consolidate.
- **Acceptance** — (a) Every panel has a stable URL; (b) refresh preserves location; (c) browser back/forward work; (d) command palette `Enter` updates the URL.

### 5.10 Saved Views (Findings & Scans)

- **Problem** — Same filter combos are reapplied every visit. No way to share "the dangerous queue" with a teammate.
- **Solution** — On `VulnerabilitiesPanel` and `ScanHistory`, a "Save view" button next to the filter bar. Saved views list pinned in the sidebar under their parent section. Each view = filter state + sort + grouping, stored in user preferences (DB) plus URL-encoded in the route.
- **UI** — Sidebar gets a new collapsible "Pinned Views" subsection per area. Each item shows count badge ("Critical+Open: 12").
- **Behavior** — Saving prompts for name + scope (private/team). Editing/deleting via right-click context menu or pencil on hover.
- **Files** — Backend: new `views` table (id, user_id, name, kind, payload jsonb). Endpoint `/api/v1/views`. Frontend: `Sidebar.jsx`, `VulnerabilitiesPanel.jsx`, new hook `useSavedViews`.
- **Acceptance** — A saved view persists across sessions, is shareable via URL, and the count badge updates live.

### 5.11 Bulk Actions on Findings

- **Problem** — Per-finding click work doesn't scale past ~50 rows.
- **Solution** — Row checkboxes + a sticky bulk-action bar that appears on selection: **Status** (Open/Triage/Accepted/False-positive/Closed), **Assign**, **Snooze (1d/7d/30d)**, **Add tag**, **Export selected**. `X` toggles selection on focused row; `Shift+X` selects range; `⌘A` selects visible.
- **UI** — Sticky bar slides up from bottom of the panel with `framer-motion` (already a dep). Shows count + actions + "Clear" button.
- **Files** — `VulnerabilitiesPanel.jsx`, new `components/dashboard/BulkActionBar.jsx`. Backend: extend `findings.py` with `PATCH /findings/bulk`.
- **Acceptance** — Selecting 5 rows + setting status fires one network request; toast confirms with **Undo** (10s window).

### 5.12 Risk Breakdown Drawer

- **Problem** — `/dashboard/risk-breakdown` returns per-vuln contribution + reasons; never rendered.
- **Solution** — On any scan card / scan history row, an "Explain score" affordance opens a side drawer showing a horizontal bar of contributors (sorted), each row: severity chip, CVSS env score, confidence, contribution %, plain-language reason from `scoring_explainer`.
- **UI** — Right-side drawer (~480px). Header: scan id + final score gauge. Body: list of contributors with progress bars (% of total score). Footer: "Open scan", "Generate report".
- **Files** — `ScanHistory.jsx`, new `components/dashboard/RiskBreakdownDrawer.jsx`. Endpoint already exists.
- **Acceptance** — Every scan with a score has an "Explain" button; drawer renders within 500ms; bar widths sum to ~100%.

### 5.13 Global Notifications Bell

- **Problem** — Orchestration events visible only on Center tab; users miss critical findings while in Ops/Settings.
- **Solution** — Bell icon in top bar with unread badge. Dropdown lists last 20 events from the existing WS stream (`event_publisher.py`): scan started/completed, critical finding, SLA breach, agent error.
- **UI** — Radix `DropdownMenu`, ~360px, items grouped by time ("Today / Yesterday / Earlier"). Each item: icon, title, time, click → deep link.
- **Behavior** — Persists "last seen" timestamp in localStorage; events newer than that are bold + glow. ⌘/ opens the bell.
- **Files** — `Layout.jsx` (TopBar), new `components/NotificationsBell.jsx`, reuse existing WS context.
- **Acceptance** — While on Settings tab, a critical finding shows up in <2s as a bell badge + toast; clicking deep-links to the finding.

### 5.14 Scope / Environment Switcher

- **Problem** — Lab and Production scans share one UI. Misreading the scope is a footgun.
- **Solution** — Top-bar switcher (left of search) showing current scope: a colored chip ("LAB" cyan / "PROD" amber / "ALL" gray). Click → menu of scopes from `lab_manager`/targets metadata. Selected scope filters scans, findings, topology, SIEM index.
- **UI** — Pill button, ~120px, colored border + icon. Opens a popover; selected scope persists per-user in localStorage. A subtle full-width tinted bar at top of main content reinforces non-default scope.
- **Files** — `Layout.jsx`, new `context/ScopeContext.jsx`, propagate `scope` to all list queries.
- **Acceptance** — Switching scope updates every list within one query refetch; URL reflects scope (`?scope=lab`); a non-default scope is visually unmissable.

### 5.15 Framework / Dedup / CVSS Chips on Findings

- **Problem** — `framework_tagger` (MITRE/OWASP) and `finding_dedup` results never reach the UI.
- **Solution** — Each finding row gets compact chips: MITRE technique id ("T1190"), OWASP category ("A01"), dedup count ("×14 hosts"), CVSS env score ("8.7"). All filterable from the filter bar.
- **UI** — Reuse `CyberBadge`. Chips are clickable to add to filters.
- **Files** — `VulnerabilitiesPanel.jsx`, `IncidentDetailDrawer.jsx`, backend serializer for findings.
- **Acceptance** — Chips render where data exists; clicking a chip applies it as a filter and updates URL.

### 5.16 Remediation Plans (Group-by-Fix)

- **Problem** — A single patch closes many findings. The UI doesn't know that — admins triage CVE-by-CVE.
- **Solution** — New top-level subsection under *Threats* called **Remediations**. Backend groups open findings by `(cve_id OR fix_signature)` and surfaces one row per fix with: affected hosts count, severity max, SLA earliest deadline, owner, status, "Apply / Mark applied". Findings are joined back through the existing dedup/scoring layer.
- **UI** — Table with progress bar per row ("12/14 hosts patched"), expand → list of underlying findings.
- **Files** — Backend: new endpoint `/api/v1/remediations` aggregating from `Vulnerability` + `Finding`. Frontend: new `components/dashboard/RemediationPlans.jsx`.
- **Acceptance** — Remediations list reduces row count by ≥40% vs raw findings on a typical scan; marking a remediation applied closes all underlying findings atomically.

### 5.17 Asset-Centric Page

- **Problem** — Topology, scan history, findings, SIEM alerts, and SLA timers for a single asset live in 5 places.
- **Solution** — `/assets/:ip` consolidates: header (hostname, IP, OS, owner), risk score gauge, timeline (scans + findings + alerts in chronological order), open findings table, related topology subgraph, SLA strip.
- **UI** — Three-column layout: left = facts panel, center = timeline, right = current findings + actions.
- **Files** — Existing `AssetDetailPanel.jsx` + `AssetTimeline.jsx` (compose). New route + page wrapper.
- **Acceptance** — Clicking a node in topology, an IP in any list, or `@1.2.3.4` in command palette navigates here; all 5 data sources visible without further clicks.

### 5.18 Scheduled & Recurring Reports

- **Problem** — Reports are one-off PDFs. Compliance reporting is by definition recurring.
- **Solution** — In *Reports*, "New schedule" → choose template (Executive / Technical / Compliance), scope (scope or asset list), cadence (weekly/monthly), delivery (download / email / Slack via webhook). Backed by a Celery beat schedule.
- **UI** — Two-pane: left = scheduled report list with next-run countdown; right = template preview.
- **Files** — `Reports.jsx`, backend `reports.py` + new `ReportSchedule` model.
- **Acceptance** — A weekly schedule actually fires next Monday and produces an artifact; user can pause/edit/delete.

### 5.19 First-Run Tour + Checklist Widget

- **Problem** — New deployment has zeros and no guidance.
- **Solution** — On first login (per-user flag), a 4-step tour: (1) Add target, (2) Run scan, (3) Review findings, (4) Generate report. Persistent collapsible checklist widget in bottom-right until all 4 are complete.
- **UI** — Tour: small popovers anchored to actual UI elements, "Skip / Next". Checklist: 240px collapsible card, progress bar.
- **Files** — New `components/onboarding/FirstRunTour.jsx`, `components/onboarding/ChecklistWidget.jsx`. Persist state in user preferences.
- **Libraries** — `@radix-ui/react-popover` (lightweight; avoid full driver libs).
- **Acceptance** — A new account sees the tour once; closing it sets the flag; checklist auto-checks items as the user completes them.

### 5.20 Accessibility & Contrast Pass

- **Problem** — `text-[7px]`, `text-[8px]`, `text-gray-700` on near-black, no visible focus rings, modals without `role="dialog"` and focus trap.
- **Solution** — (a) Floor body text at 11px, micro-labels at 10px; (b) raise grays from `gray-700` to `gray-400` on dark; (c) add focus-visible outlines (`outline outline-2 outline-cyan-400/60`); (d) ensure every modal/drawer uses Radix Dialog primitives or equivalent ARIA + focus trap; (e) tab order audit on Dashboard.
- **Files** — `tailwind.config.js` (token), every component (sweep), `IncidentDetailDrawer.jsx`, `ScanConfigModal.jsx`.
- **Acceptance** — Lighthouse a11y ≥95; keyboard-only user can complete top-3 flows without a mouse; no text below 10px outside icons.

---

## 6. Suggested Roadmap

### Sprint 1 — "Make it navigable" (Quick Wins)
§5.1 Command Palette · §5.2 SLA KPI · §5.3 Empty States · §5.4 Quick Scan Popover · §5.5 Cheat-sheet · §5.6 Label Unification · §5.7 Scan-now on Targets · §5.8 Drawer Prev/Next.
*Rationale*: low-risk, highest UX leverage. Fixes the top-3 task click counts and lights up the data the backend already produces.

### Sprint 2 — "Make it linkable & filterable"
§5.9 Routing · §5.10 Saved Views · §5.11 Bulk Actions · §5.13 Notifications Bell · §5.15 Framework/Dedup chips · §5.20 a11y/contrast pass.
*Rationale*: deep links and bulk actions are foundational for §5.16/§5.17; the contrast pass is best done while components are already being touched.

### Sprint 3 — "Make it explain itself"
§5.12 Risk Breakdown Drawer · §5.14 Scope Switcher · §5.16 Remediation Plans · §5.17 Asset-Centric Page · §5.18 Scheduled Reports · §5.19 First-run Tour.
*Rationale*: these depend on routing + saved views + chips landing first, and they realize the product's "deterministic, plain-language" promise most visibly.

---

## 7. Open Questions & Assumptions

1. **RBAC matrix** — Is "viewer" allowed to save shared team views, or only private? Assumed: viewer = private only, admin = team views.
2. **Scope model** — Does "Lab" map to a stored target tag, a dedicated DB schema, or a config flag? Assumed: a target attribute filterable via existing list endpoints; if not, the scope switcher needs backend work.
3. **Multi-tenant** — Is OSC ever shared across organizations, or always single-tenant per deployment? Assumed: single-tenant; if not, scope switcher should also support tenants.
4. **SIEM index naming** — Wazuh indices may shift on rollover. Notifications and scope filters need a stable alias.
5. **WS reliability** — Notifications bell assumes the existing WS context is reliable; if reconnection is flaky, add a polling fallback for the unread count.
6. **Mobile** — Tablet/phone is out of scope per the SME-IT-admin workflow assumption. If field use becomes a target, sidebar collapse + topology fallback must be redesigned.
7. **Telemetry** — There's no product analytics in the codebase. To measure click-count and task-time wins, we'd need a lightweight event sink (PostHog self-hosted recommended). Not blocking, but the "outcome metrics" in §4 will otherwise be observational.
