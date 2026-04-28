# Manual Live Demo — Orchestration Security Center

> Step-by-step walkthrough for demonstrating every feature of OSC by hand,
> **without** running any automated scan trigger and **without** booting the
> intentional-lab containers. Every action below is performed in the UI.
>
> Prereq: the main stack is up (`docker compose up -d`). Health endpoint
> `http://localhost:8000/health` returns `{"status":"ok"}`.

---

## 0. Pre-flight — verify the platform is running

Before you open the browser, confirm the six lean containers are healthy.

```powershell
docker compose ps
```

Expected:

| Container | State |
|---|---|
| sme_dashboard_caddy | Up |
| sme_dashboard_backend | Up (healthy) |
| sme_dashboard_frontend | Up |
| sme_dashboard_db | Up (healthy) |
| sme_dashboard_redis | Up |
| sme_dashboard_celery | Up |

Open the dashboard:

- **https://localhost** — accept the self-signed certificate the first time.
- Backend Swagger: **http://localhost:8000/docs**

If you previously seeded lab targets and want a clean demo state, **do not**
re-run `lab_setup.ps1 seed` or `trigger_lab_scans.ps1` — both auto-scan.

---

## 1. Log in

1. Visit **https://localhost**.
2. Sign in with an admin account (default seeded user from `seed_user.py`).
3. The router lands you on `/dashboard/overview`.
4. Verify the top bar shows three green health pills: **API · Redis · Workers**.

> **Demo point** — Health pills auto-refresh every 30 s. They go red the
> moment a backing service stops; this is the first thing an SME admin
> should look at on login.

---

## 2. Tour the global chrome (no scan needed)

These features work on a cold deployment — nothing in the database required.

### 2.1 Command palette (⌘K / Ctrl-K)

1. Press **Ctrl + K** (or click the search bar in the top bar).
2. Type `vu` — the result `Go to Vulnerabilities` appears.
3. Press **Enter**. The router navigates to `/dashboard/threats/vulns`.
4. Press **Ctrl + K** again, type `>` — only **Actions** are shown.
5. Press **Esc** to dismiss.

> **What to call out** — full keyboard navigation, sectioned results,
> ARIA combobox pattern (`role="combobox"` + `aria-activedescendant`),
> recent items persist in localStorage.

### 2.2 Keyboard cheat-sheet

1. Press **?** (Shift + /) anywhere outside an input.
2. Modal lists every shortcut in the app, grouped by area.
3. Close with **Esc**.

### 2.3 Skip-link & focus rings (a11y)

1. Refresh the page. Press **Tab** once before clicking anything.
2. A "**Skip to main content**" link appears in the top-left.
3. Press **Tab** repeatedly — every focusable control shows a 2 px cyan
   focus ring (`:focus-visible`, no mouse-click ring noise).

### 2.4 Notifications bell

1. Click the bell icon in the top bar (right of the env switcher).
2. The dropdown shows recent orchestration events.
3. The unread count clears when the dropdown opens (persisted via
   `localStorage[notif.lastSeenAt]`).

### 2.5 Environment scope switcher

1. In the top bar, click the segmented pill: **All / Lab / Prod**.
2. Pick **Prod**.
3. Navigate to **Threat Center → Vulnerabilities**. The list refetches
   with `?environment=production`.
4. Switch back to **All** to see every environment.

> **Demo point** — the scope filter propagates to **Targets**,
> **Vulnerabilities**, and **Scan History** on the same page transition.

---

## 3. Targets Manager — create a target manually

Skip `lab_setup.ps1 seed`. Add a target by hand so the demo is reproducible.

1. Sidebar → **Operations → Nodes** (Targets Manager).
2. Click **Add Target**.
3. Fill in:
   - **Name**: `Demo Web App`
   - **Base URL / IP**: `http://example.com` (or any IP you control)
   - **Environment**: `production`
4. Save.
5. The new row appears immediately. Note the inline **Scan** button
   (zap icon) on the right — clicking it would open `ScanConfigModal`
   pre-scoped to this target. **Do not click it for this demo.**

> **Demo point** — empty-state CTA was here before you added anything;
> after adding, the toolbar exposes per-row actions instead.

---

## 4. Vulnerabilities Panel — drive the triage workflow

This is the panel where the bulk-action and saved-views work matters most.
For the demo, ensure at least a handful of vulnerability rows exist
(seeded from a prior run, or insert directly via Swagger
`POST /api/v1/vulnerabilities` on the dev DB).

### 4.1 Filters & saved views

1. Sidebar → **Threat Center → Vulnerabilities**.
2. Set filters: **Severity = High**, **Status = Open**, **Min severity = High**.
3. Sort by **CVSS desc**.
4. Click **Save view** → name it `Critical & Open`.
5. The view appears under **Pinned views** in the sidebar.
6. Clear all filters. Click the pinned view — every filter restores instantly.

> **Demo point** — saved views dispatch `osc:views-changed`; the Sidebar
> listens and re-reads localStorage without a re-render of the panel.

### 4.2 Single-finding triage (drawer)

1. Click any vulnerability row → `IncidentDetailDrawer` slides in from the right.
2. Use **J / K** (or arrow keys) to step through findings without closing.
3. The URL hash updates: `#finding=F-1234`.
4. Copy the URL, paste it into a new tab — the drawer reopens on that finding.
5. Close with **Esc**.

> **Demo point** — `role="dialog"` + `aria-modal` + focus-on-open + URL hash.
> The triage round-trip cost dropped from "click row → close → click next"
> to a single keypress.

### 4.3 Bulk actions + Undo

1. Tick the checkbox on three rows (or **Shift-click** to range-select).
2. The sticky bulk toolbar appears at the bottom of the panel: **3 selected**.
3. Pick **Status → Accepted-risk** from the dropdown.
4. A toast appears: **"3 findings updated to accepted-risk"** with an
   **Undo** button.
5. Click **Undo** within 10 s — every row reverts to its previous status.
6. Repeat the bulk update, this time let the toast time out. The change
   sticks.
7. Re-select the rows, click **Export → CSV** — `findings.csv` downloads.

> **Demo point** — backed by the new
> `PATCH /api/v1/vulnerabilities/bulk` endpoint that returns each row's
> previous status, enabling a true Undo without local snapshots.

### 4.4 Framework / dedup / CVSS chips

1. With the panel open, hover any row.
2. Inline chips show: **OWASP A03 · CWE-89 · ×14 hosts · CVSS 9.1**.
3. Click any chip → it adds itself as a filter and the URL updates.

---

## 5. Scan History — explore historical scans (no new scan)

If older scans exist in the DB (from prior demos), this section works
without triggering anything new.

1. Sidebar → **Operations → Scan History**.
2. The list paginates server-side (page size 25).
3. Set the **Environment** scope in the top bar to **Lab** — the URL
   gains `?environment=lab` and the list refetches.
4. Click **Explain score** on any completed scan with a risk score.
5. The **Risk Breakdown drawer** opens, showing each contributor as a
   horizontal bar (severity × CVSS × confidence × % contribution) with
   plain-language reasons.
6. Bar widths sum to ~100 % of the final score.

> **Demo point** — this is the panel that delivers the "deterministic,
> AI-assisted scoring" promise. It uses the existing
> `/dashboard/risk-breakdown` endpoint that was previously unrendered.

---

## 6. Threat Center — SIEM, Action Center, KPIs

### 6.1 KPI cards on Command Center

1. Sidebar → **Command Center**.
2. Five `StatCard` tiles render:
   - Total Assets · Critical Findings · Health Score · Action Items · **SLA Overdue**.
3. The **SLA Overdue** card turns red when the count is > 0 and pulses
   for 1.2 s on a WS update.
4. Click it → navigates to **Vulnerabilities** with the saved view
   `SLA Overdue` pre-applied.

### 6.2 Unified Inbox (SIEM)

1. Sidebar → **Threat Center → SIEM**.
2. The Unified Inbox lists alerts (10 s polling).
3. If Wazuh / Elasticsearch are not running in lite mode, the panel
   shows the empty state with a CTA to enable SIEM in **Settings**.

### 6.3 Action Center

1. Sidebar → **Command Center** → scroll to **Action Center**.
2. Items are sorted: **Remediation > Investigate > Watch**.
3. Click any item to expand the plain-language remediation step.

---

## 7. Reports — generate one PDF without a new scan

1. Sidebar → **Reports**.
2. Pick a completed scan from the dropdown (any prior scan is fine).
3. Click **Generate PDF Report** → file downloads.
4. Open the PDF: executive summary, asset inventory, full vuln list,
   prioritized action items, topology snapshot.

> **Demo point** — the report renders for both audiences (business owner
> + IT admin) on the same artifact.

---

## 8. Settings & RBAC

1. Sidebar → **Settings**.
2. Toggle **SIEM enabled = false**, save. The **Threat Center → SIEM**
   sub-tab disappears from the navigation immediately.
3. Toggle it back on. Sub-tab returns.
4. Visit **Settings → RBAC** as an admin. Add a viewer-role test user.
5. Sign out, sign in as the viewer. Privileged sub-tabs render a
   `RoleGuard` "you need role X" message instead of a blank page.

---

## 9. Deep links — share a finding by URL

1. While a vulnerability drawer is open, copy the address bar.
   Example: `https://localhost/dashboard/threats/vulns#finding=F-1234`.
2. Paste it into a new browser window. The dashboard restores:
   - Correct top tab (`threats`)
   - Correct sub-tab (`vulns`)
   - Drawer reopened on `F-1234`.
3. Press the browser **Back** button — drawer closes; **Forward** —
   drawer reopens.

> **Demo point** — every panel has a stable URL. Refresh, share via
> Slack, or bookmark works the same way.

---

## 10. Stop the demo cleanly

```powershell
# Just the dashboard stack (leaves no scan jobs running)
docker compose down
```

If you previously brought up the lab stack:

```powershell
docker compose -f docker-compose.lab.yml down
```

Volumes are preserved by default, so the next `docker compose up -d`
starts at the same state.

---

## Cheat-sheet — every shortcut surfaced in this demo

| Shortcut | Action |
|---|---|
| **Ctrl + K** | Open command palette |
| **?** | Open keyboard cheat-sheet |
| **Esc** | Close any modal / drawer / palette |
| **J / K** or **↑ / ↓** | Step through findings inside the drawer |
| **Tab** (before clicking) | Reveal the skip-to-main-content link |
| **Shift-click** on row checkbox | Range-select for bulk actions |

---

## What this demo intentionally does **not** do

- ❌ No `trigger_lab_scans.ps1` — every scan is started manually if at all.
- ❌ No `lab_setup.ps1 seed` — targets are added one at a time in the UI.
- ❌ No `docker compose -f docker-compose.lab.yml up` — the intentional-lab
  containers are never booted.
- ❌ No quick-scan from the top bar without the confirmation popover.

Everything above is keyboard- and mouse-driven, against pre-existing data
or empty states.

---

*Last updated: 2026-04-28 — manual-only walkthrough, no auto-scan, no lab scenario.*
