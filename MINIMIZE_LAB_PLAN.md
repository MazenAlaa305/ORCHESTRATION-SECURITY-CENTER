# Full Plan: Minimize Lab + Dashboard Control Center

## Overview

This plan has **4 parts**:

1. **Part A** -- Minimize the lab environment (Docker only, main project stack untouched)
2. **Part B** -- Build a Settings/Configuration tab with tool toggle switches
3. **Part C** -- Scan control center (choose tests, tools, auto tasks from the dashboard)
4. **Part D** -- Manual real-environment configuration (add any target, not just lab)

**Rule: The main project stack (backend, frontend, db, redis, celery, caddy, etc.) stays exactly as-is. Only the lab Docker files change for minimization.**

---

---

# PART A: Minimize the Lab Environment

> Only `docker-compose.lab.yml` changes. Main `docker-compose.yml` is NOT touched.

## Current State (10 lab containers, ~2GB RAM)

| Container | RAM | Zone | Vulnerabilities |
|-----------|-----|------|----------------|
| lab_webserver (Juice Shop) | 512M | DMZ | SQLi, XSS, BOLA, IDOR, SSRF |
| lab_api_gateway (nginx) | 64M | DMZ | Info disclosure, header leaks, dir listing |
| lab_dns_server (CoreDNS) | 64M | DMZ | Zone transfer, DNS amplification |
| lab_fileserver (Samba) | 256M | Corp | Weak creds, SMB enum, PII exposure |
| lab_mailserver (GreenMail) | 256M | Corp | Plaintext SMTP/POP3, weak creds |
| lab_workstation (nginx) | 64M | Corp | Info disclosure |
| lab_database (PostgreSQL) | 256M | Data | Weak password, plaintext PII/credit cards |
| lab_redis_cache (Redis) | 128M | Data | No auth, data exfiltration |
| lab_traffic_gen (Python) | 256M | Mgmt | Background traffic simulation |
| lab_log_shipper (Python) | 128M | Mgmt | Ships logs to Elasticsearch |

## Target State (6 lab containers, ~900MB RAM)

### Keep these 6 (all OWASP Top 10 covered):

| Container | New RAM | Vulnerabilities | OWASP Coverage |
|-----------|---------|----------------|----------------|
| lab_webserver (Juice Shop) | 384M | SQLi, XSS, BOLA, IDOR, SSRF, broken-auth | A01, A03, A06, A07, A08, A10 |
| lab_api_gateway (nginx) | 64M | Info disclosure, header leaks, dir listing, Swagger | A05, A06 |
| lab_fileserver (Samba) | 128M | Weak creds (admin/admin123), SMB enum, PII | A02, A04, A07 |
| lab_database (PostgreSQL) | 128M | Weak password, plaintext PII/credit cards, no SSL | A02, A04, A07, A09 |
| lab_redis_cache (Redis) | 64M | No auth, protected-mode off, data exfiltration | A01, A04 |
| lab_traffic_gen (Python) | 128M | Background traffic for realism | N/A (support) |

### Remove these 4 (redundant coverage):

| Container | Why Remove |
|-----------|-----------|
| lab_dns_server | Zone transfer is niche; info disclosure already in API gateway |
| lab_mailserver | Weak creds already in fileserver + database |
| lab_workstation | Info disclosure already in API gateway |
| lab_log_shipper | Only ships to Elasticsearch; not needed for core scanning |

## Step A.1: Modify `docker-compose.lab.yml`

Add `profiles: ["full-lab"]` to the 4 removed containers so they are hidden by default but can be brought back with `--profile full-lab`.

**Changes:**
```yaml
# Add this line to each of the 4 containers:
  lab_dns_server:
    profiles: ["full-lab"]        # <-- ADD THIS LINE
    image: coredns/coredns:latest
    ...

  lab_mailserver:
    profiles: ["full-lab"]        # <-- ADD THIS LINE
    image: greenmail/standalone:2.0.1
    ...

  lab_workstation:
    profiles: ["full-lab"]        # <-- ADD THIS LINE
    image: nginx:alpine
    ...

  lab_log_shipper:
    profiles: ["full-lab"]        # <-- ADD THIS LINE
    build:
      context: ./lab/log-shipper
    ...
```

## Step A.2: Tighten RAM limits on kept containers

In `docker-compose.lab.yml`, update `deploy.resources.limits.memory`:

| Container | Old | New |
|-----------|-----|-----|
| lab_webserver | 512M | 384M |
| lab_fileserver | 256M | 128M |
| lab_database | 256M | 128M |
| lab_redis_cache | 128M | 64M |
| lab_traffic_gen | 256M | 128M |
| lab_api_gateway | 64M | 64M (keep) |

## Step A.3: Update `backend/app/services/lab_manager.py`

Remove 3 entries from the `LAB_TARGETS` list:
- `lab_dns_server` (lines 45-56)
- `lab_mailserver` (lines 69-79)
- `lab_workstation` (lines 81-92)

Keep: lab_webserver, lab_api_gateway, lab_fileserver, lab_database, lab_redis_cache (5 entries).

## Step A.4: Update `lab_setup.ps1`

In the `Show-Status` function, remove these 4 from the `$containers` array:
- `lab_dns_server`
- `lab_mailserver`
- `lab_workstation`
- `lab_log_shipper`

## Step A.5: Bring back full lab later (optional)

```powershell
docker compose -f docker-compose.lab.yml --profile full-lab up --build -d
```

---

---

# PART B: Settings/Configuration Tab with Tool Toggle Switches

> The "Config" tab already exists in the dashboard navigation (`Dashboard.jsx` line 54) but has **no content**. We build the content.

## What Currently Exists

| Item | Status | File |
|------|--------|------|
| "Config" tab in navigation | Exists (route only, no UI) | `Dashboard.jsx` line 54 |
| `GET /api/v1/config/public` | Exists (read-only) | `backend/app/api/v1/endpoints/config.py` |
| `ConfigContext` + `useConfig()` | Exists (reads flags on load) | `frontend/src/context/ConfigContext.jsx` |
| Feature flags in backend | Exists (env vars only, not writable) | `backend/app/core/config.py` lines 75-78 |
| UI to toggle flags | **MISSING** | N/A |
| API to save flags | **MISSING** | N/A |
| DB table for runtime config | **MISSING** | N/A |

## What We Build

A Settings panel with **4 sections** rendered inside the "Config" tab:

### Section 1: Tool Toggles (switch buttons)

| Toggle | Controls | Default |
|--------|----------|---------|
| OpenVAS Scanner | `OPENVAS_ENABLED` | OFF |
| SIEM Integration (Elasticsearch + Wazuh) | `SIEM_ENABLED` | OFF |
| SOAR Automation (n8n) | `SOAR_ENABLED` | OFF |
| LLM AI Validation | `LLM_VALIDATION_ENABLED` | OFF |
| Nmap Scanning | `NMAP_ENABLED` (new) | ON |
| Nuclei Scanning | `NUCLEI_ENABLED` (new) | ON |

Each toggle shows:
- ON/OFF switch
- Status indicator (green = connected, red = unreachable, gray = disabled)
- Health check result (e.g., "OpenVAS: connected on port 9390" or "Elasticsearch: unreachable")

### Section 2: Scan Defaults

| Setting | Type | Options |
|---------|------|---------|
| Default Scan Type | Dropdown | Quick, Full, Custom |
| Default Tools | Multi-select checkboxes | Nmap, Nuclei, OpenVAS |
| Max Requests/Second | Number input | Default: 10 |
| Max Concurrent Scans | Number input | Default: 1 |
| LLM Token Budget (per scan) | Number input | Default: 50,000 |

### Section 3: Lab Environment Controls

| Control | What It Does |
|---------|-------------|
| Lab Status Card | Shows running/total lab containers |
| Start Lab button | Calls backend to `docker compose -f lab up -d` |
| Stop Lab button | Calls backend to `docker compose -f lab down` |
| Seed Targets button | Calls `POST /api/v1/lab/seed` |
| Traffic Intensity dropdown | Low / Medium / High |

### Section 4: Integration Connection Status

A status dashboard showing:
- PostgreSQL: connected/disconnected
- Redis: connected/disconnected
- OpenVAS: connected/disconnected/disabled
- Elasticsearch: connected/disconnected/disabled
- Wazuh: connected/disconnected/disabled
- n8n: connected/disconnected/disabled
- Gemini LLM: configured/not configured

---

## Step B.1: Create database table for runtime config

**File:** `backend/app/models/config.py` (NEW)

```
Table: runtime_config
  - id: UUID (primary key)
  - key: String (unique) -- e.g., "SIEM_ENABLED", "NMAP_ENABLED"
  - value: String -- "true" / "false" / JSON string
  - updated_by: UUID (FK to users)
  - updated_at: DateTime
```

This stores runtime overrides. On startup, env vars are the defaults. Runtime changes override them.

## Step B.2: Create config CRUD API endpoints

**File:** `backend/app/api/v1/endpoints/config.py` (MODIFY -- add new endpoints)

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `GET /config/public` | GET | Any | Read all flags (already exists) |
| `GET /config/all` | GET | ADMIN | Read all config with metadata |
| `PUT /config/{key}` | PUT | ADMIN | Update a single config flag |
| `GET /config/health` | GET | Any | Health check for all integrations |

The `PUT /config/{key}` endpoint:
1. Validates the key is in the allowed list
2. Saves to `runtime_config` table
3. Updates the in-memory `settings` object
4. Returns the updated config

The `GET /config/health` endpoint:
1. Pings PostgreSQL, Redis, OpenVAS, Elasticsearch, Wazuh, n8n
2. Returns connection status for each
3. Frontend displays green/red indicators

## Step B.3: Modify settings loader to check DB overrides

**File:** `backend/app/core/config.py` (MODIFY)

Add a function `load_runtime_overrides(db_session)` that:
1. Reads all rows from `runtime_config` table
2. Overrides corresponding `settings.*` attributes
3. Called during app startup (in `main.py` lifespan) and after any PUT to `/config/{key}`

## Step B.4: Create the Settings panel frontend component

**File:** `frontend/src/components/dashboard/SettingsPanel.jsx` (NEW)

Structure:
```
SettingsPanel
  +-- ToolToggles          (Section 1: switch buttons)
  +-- ScanDefaults         (Section 2: default scan options)
  +-- LabControls          (Section 3: lab start/stop/seed)
  +-- IntegrationStatus    (Section 4: health indicators)
```

Each toggle switch calls `PUT /api/v1/config/{key}` on change and refreshes the ConfigContext.

## Step B.5: Wire the Settings panel into Dashboard.jsx

**File:** `frontend/src/pages/Dashboard.jsx` (MODIFY)

In the rendering section (around line 301), add:
```jsx
{activeTab === 'settings' && (
  <SettingsPanel />
)}
```

## Step B.6: Update ConfigContext to support refresh

**File:** `frontend/src/context/ConfigContext.jsx` (MODIFY)

Add a `refreshConfig()` function that re-fetches from `GET /api/v1/config/public`. Expose it via the context so `SettingsPanel` can call it after toggling a switch.

---

---

# PART C: Scan Control Center (Choose Tests, Tools, Tasks)

> Let users choose what to scan, which tools to use, and what auto-tasks to run -- all from the dashboard.

## What Currently Exists

| Feature | Status | Location |
|---------|--------|----------|
| Quick scan button | Exists (hardcoded "quick" type) | `ScanButton.jsx` |
| OpenVAS one-click scan | Exists (separate button) | `OpenVAS/ScanButton.jsx` |
| `POST /scans/` API | Exists (accepts `scan_type` + `configuration` JSON) | `scans.py` |
| Tool selection per scan | **MISSING** | N/A |
| Test type selection | **MISSING** | N/A |
| Auto-task scheduling | **MISSING** (celery_beat is all-or-nothing) | N/A |

## What We Build

### The Scan Configuration Modal

When user clicks "New Scan" or "Start Scan", a modal opens with these tabs:

#### Tab 1: Target Selection
- Pick from existing targets (dropdown from `GET /targets/`)
- OR enter a new URL/IP manually
- OR pick a lab target (tagged with `[Lab]` prefix)

#### Tab 2: Scan Type
| Option | What Runs | Estimated Time |
|--------|-----------|---------------|
| Quick Scan | Nmap (top 1000 ports) only | ~2 min |
| Standard Scan | Nmap + Nuclei | ~10 min |
| Full Scan | Nmap + Nuclei + AI Validation | ~20 min |
| Custom Scan | User picks tools below | Varies |

#### Tab 3: Tool Selection (only visible in Custom mode)
| Tool | Checkbox | Options |
|------|----------|---------|
| Nmap | ON/OFF | Port range (default: top 1000), Aggressive (-A) toggle |
| Nuclei | ON/OFF | Template categories: CVE, Exposure, Misconfiguration, Default-Login |
| OpenVAS | ON/OFF (grayed out if disabled in settings) | Scan profile: Full, Fast, Discovery |
| AI Validation | ON/OFF (grayed out if disabled in settings) | Confidence threshold slider (0-100%) |

#### Tab 4: Auto Tasks / Schedule
| Option | What It Does |
|--------|-------------|
| Run Once (now) | Start immediately |
| Schedule Recurring | Cron-style: every day/week/month at time |
| Auto-remediation Report | Generate PDF after scan completes |
| SOAR Trigger | Fire n8n webhook on critical findings (if SOAR enabled) |
| SIEM Forward | Send findings to Elasticsearch (if SIEM enabled) |

---

## Step C.1: Extend the Scan schema

**File:** `backend/app/schemas/scan.py` (MODIFY)

Add new fields to `ScanCreate`:
```python
class ScanCreate(BaseModel):
    target_id: Optional[UUID] = None
    target_url: Optional[str] = None
    scan_type: str = "full"          # "quick", "standard", "full", "custom"
    tools: Optional[List[str]] = None  # ["nmap", "nuclei", "openvas", "ai_validation"]
    configuration: Optional[Dict[str, Any]] = None  # tool-specific options
    schedule: Optional[str] = None     # cron expression for recurring
    auto_report: bool = False          # generate PDF on completion
    soar_trigger: bool = False         # fire SOAR webhook on critical
    siem_forward: bool = False         # forward findings to SIEM
```

## Step C.2: Modify scan task to respect tool selection

**File:** `backend/app/services/scan_tasks.py` (MODIFY)

Currently the scan pipeline always runs: Nmap -> Nuclei -> Risk Engine -> AI.

Change it to check `scan.configuration["tools"]`:
```
- If "nmap" not in tools: skip Nmap phase
- If "nuclei" not in tools: skip Nuclei phase
- If "openvas" in tools AND OPENVAS_ENABLED: run OpenVAS phase
- If "ai_validation" in tools AND LLM_VALIDATION_ENABLED: run AI phase
- Always run Risk Engine (it scores whatever findings exist)
```

Also respect tool-specific options from `configuration`:
```
- nmap_ports: "1-65535" or "top-1000" (default)
- nmap_aggressive: true/false
- nuclei_templates: ["cve", "exposure", "misconfiguration", "default-login"]
- openvas_profile: "full" / "fast" / "discovery"
- ai_confidence_threshold: 0.7 (default)
```

## Step C.3: Add scheduled scan API

**File:** `backend/app/api/v1/endpoints/scans.py` (MODIFY)

Add endpoint: `POST /api/v1/scans/schedule`
- Accepts same `ScanCreate` body + `cron_expression` field
- Creates a Celery periodic task via `celery_app.conf.beat_schedule`
- Returns schedule ID for management

Add endpoint: `GET /api/v1/scans/schedules` -- list all scheduled scans
Add endpoint: `DELETE /api/v1/scans/schedules/{id}` -- cancel a schedule

## Step C.4: Build the Scan Configuration Modal

**File:** `frontend/src/components/dashboard/ScanConfigModal.jsx` (NEW)

A multi-tab modal (using existing Tailwind styling) with:
- Tab 1: Target picker (dropdown + manual input)
- Tab 2: Scan type selector (radio buttons)
- Tab 3: Tool checkboxes + per-tool options (collapsible sections)
- Tab 4: Schedule + auto-task toggles

On submit, calls `POST /api/v1/scans/` with the full configuration.

## Step C.5: Replace the simple ScanButton

**File:** `frontend/src/components/dashboard/ScanButton.jsx` (MODIFY)

Instead of directly calling `scanService.startScan(target, 'quick')`:
- The "Start Scan" button now opens `ScanConfigModal`
- Keep a "Quick Scan" shortcut button that bypasses the modal (uses defaults)

## Step C.6: Add scan schedule management UI

**File:** `frontend/src/components/dashboard/ScanScheduler.jsx` (NEW)

Under Operations -> History sub-tab, add a "Scheduled" section showing:
- List of scheduled recurring scans
- Enable/disable toggle per schedule
- Delete button
- Next run time

---

---

# PART D: Manual Real-Environment Configuration

> Let users add any real target (not just lab) from the dashboard, configure it, and scan it like a real pentest engagement.

## What Currently Exists

Target management is **already fully implemented**:
- `TargetsManager.jsx` has "Add Target" form (name, URL, auth, criticality)
- `POST /api/v1/targets/` API accepts name, base_url, auth_method, auth_credentials
- Target model has: `scope_allowlist`, `max_rps`, `data_sensitivity`, `asset_value`

## What We Add

### A "New Environment" wizard that guides users through adding a real target

#### Wizard Step 1: Environment Type
| Type | Description |
|------|------------|
| Lab Target | Auto-discovered from running lab containers |
| Web Application | Public URL (e.g., https://myapp.com) |
| Internal Network | IP range or CIDR (e.g., 192.168.1.0/24) |
| API Endpoint | REST/GraphQL API URL |
| Custom | Manual URL/IP entry |

#### Wizard Step 2: Connection Details
| Field | Description | Example |
|-------|-------------|---------|
| Name | Friendly name | "Staging Server" |
| Base URL | Target URL or IP | `https://staging.myapp.com` |
| Auth Method | none / basic / jwt / cookie | "jwt" |
| Auth Credentials | Username+password or token (encrypted) | `{"token": "Bearer xxx"}` |
| Scope Allowlist | Hostnames/CIDRs the scanner may touch | `["staging.myapp.com", "api.myapp.com"]` |
| Max RPS | Rate limit for scanner | 5 |

#### Wizard Step 3: Classification
| Field | Options |
|-------|---------|
| Business Criticality | Low / Medium / High / Critical |
| Data Sensitivity | None / PII / Financial |
| Environment Type | Production / Staging / Development / Lab |
| Compliance | None / PCI-DSS / HIPAA / ISO 27001 |

#### Wizard Step 4: Review + Start Scan
- Summary of all configured options
- "Save Target" button (saves without scanning)
- "Save & Start Scan" button (saves then opens Scan Config Modal from Part C)

---

## Step D.1: Extend the Target model

**File:** `backend/app/models/scan.py` (MODIFY)

Add new fields to the Target model:
```python
environment_type: str = "lab"        # "lab", "production", "staging", "development"
compliance_tags: JSON = []            # ["pci-dss", "hipaa", "iso-27001"]
notes: Text = ""                      # free-form notes
last_scanned_at: DateTime = None
```

## Step D.2: Extend the Target schema

**File:** `backend/app/schemas/scan.py` (MODIFY)

Update `TargetCreate` and `TargetUpdate` to accept the new fields:
```python
class TargetCreate(BaseModel):
    name: str
    base_url: str
    auth_method: str = "none"
    auth_credentials: Optional[Dict] = None
    asset_value: str = "MEDIUM"
    data_sensitivity: str = "NONE"
    environment_type: str = "lab"
    compliance_tags: Optional[List[str]] = None
    scope_allowlist: Optional[List[str]] = None
    max_rps: int = 10
    notes: Optional[str] = None
```

## Step D.3: Build the Environment Wizard component

**File:** `frontend/src/components/dashboard/EnvironmentWizard.jsx` (NEW)

A step-by-step wizard (4 steps as described above) using the existing Tailwind + cyber theme.

## Step D.4: Integrate wizard into TargetsManager

**File:** `frontend/src/components/dashboard/TargetsManager.jsx` (MODIFY)

Replace the simple "Add Target" form with the new `EnvironmentWizard`. Keep the old form as a "Quick Add" option.

## Step D.5: Add target cards with scan actions

**File:** `frontend/src/components/dashboard/TargetsManager.jsx` (MODIFY)

Each target card should show:
- Name, URL, environment type badge (Lab / Production / Staging)
- Last scanned date
- Compliance tags
- Action buttons: "Scan Now", "Configure", "Delete"
- "Scan Now" opens the Scan Config Modal (Part C) pre-filled with this target

---

---

# Implementation Order

## Phase 1: Lab Minimization (Part A)
> Estimated files to change: 3

| Step | File | What |
|------|------|------|
| A.1 | `docker-compose.lab.yml` | Add profiles to 4 containers |
| A.2 | `docker-compose.lab.yml` | Tighten RAM limits |
| A.3 | `backend/app/services/lab_manager.py` | Remove 3 LAB_TARGETS entries |
| A.4 | `lab_setup.ps1` | Update status display |

## Phase 2: Runtime Config Backend (Part B, backend)
> Estimated files to change/create: 5

| Step | File | What |
|------|------|------|
| B.1 | `backend/app/models/config.py` | NEW -- RuntimeConfig model |
| B.1b | Alembic migration | NEW -- create runtime_config table |
| B.2 | `backend/app/api/v1/endpoints/config.py` | ADD -- PUT /config/{key}, GET /config/health |
| B.3 | `backend/app/core/config.py` | ADD -- load_runtime_overrides() function |
| B.3b | `backend/app/main.py` | MODIFY -- call load_runtime_overrides on startup |

## Phase 3: Settings Panel Frontend (Part B, frontend)
> Estimated files to change/create: 4

| Step | File | What |
|------|------|------|
| B.4 | `frontend/src/components/dashboard/SettingsPanel.jsx` | NEW -- full settings UI |
| B.5 | `frontend/src/pages/Dashboard.jsx` | MODIFY -- render SettingsPanel in Config tab |
| B.6 | `frontend/src/context/ConfigContext.jsx` | MODIFY -- add refreshConfig() |
| B.6b | `frontend/src/services/api.js` | MODIFY -- add configService.update() |

## Phase 4: Scan Control Center (Part C)
> Estimated files to change/create: 5

| Step | File | What |
|------|------|------|
| C.1 | `backend/app/schemas/scan.py` | MODIFY -- add tools, schedule, auto-task fields |
| C.2 | `backend/app/services/scan_tasks.py` | MODIFY -- respect tool selection |
| C.3 | `backend/app/api/v1/endpoints/scans.py` | ADD -- schedule endpoints |
| C.4 | `frontend/src/components/dashboard/ScanConfigModal.jsx` | NEW -- multi-tab modal |
| C.5 | `frontend/src/components/dashboard/ScanButton.jsx` | MODIFY -- open modal |

## Phase 5: Manual Environment Config (Part D)
> Estimated files to change/create: 4

| Step | File | What |
|------|------|------|
| D.1 | `backend/app/models/scan.py` | MODIFY -- add environment_type, compliance_tags |
| D.2 | `backend/app/schemas/scan.py` | MODIFY -- extend TargetCreate |
| D.3 | `frontend/src/components/dashboard/EnvironmentWizard.jsx` | NEW -- 4-step wizard |
| D.4 | `frontend/src/components/dashboard/TargetsManager.jsx` | MODIFY -- integrate wizard |

---

# Verification Checklist

## After Part A (Lab Minimization)
- [ ] `docker compose -f docker-compose.lab.yml up -d` starts 6 containers (not 10)
- [ ] `docker stats --no-stream` shows lab using under 1GB total
- [ ] `.\lab_setup.ps1 status` shows only the 6 kept containers
- [ ] `.\lab_setup.ps1 seed` seeds 2 HTTP targets (webserver + api_gateway)

## After Part B (Settings Tab)
- [ ] Open dashboard -> click "Config" tab -> see 4 sections
- [ ] Toggle "OpenVAS Scanner" switch -> calls PUT /config/OPENVAS_ENABLED -> switch stays ON after page refresh
- [ ] Toggle "SIEM" switch ON -> "Threats" tab shows SIEM sub-tab
- [ ] Integration Status section shows green/red for each service
- [ ] Lab Controls section shows container count and start/stop buttons

## After Part C (Scan Control Center)
- [ ] Click "New Scan" -> modal opens with 4 tabs
- [ ] Select "Custom Scan" -> tool checkboxes appear
- [ ] Uncheck Nuclei, run scan -> scan completes with Nmap only (no Nuclei phase in logs)
- [ ] Check OpenVAS -> grayed out if OpenVAS is disabled in settings
- [ ] Create scheduled scan -> appears in schedule list -> runs at next cron time
- [ ] Quick Scan button still works as before (bypasses modal)

## After Part D (Manual Environment Config)
- [ ] Click "Add Target" -> wizard opens with 4 steps
- [ ] Select "Web Application" -> fill in URL, auth, scope -> save
- [ ] Target appears in list with "Production" badge
- [ ] Click "Scan Now" on target card -> Scan Config Modal opens pre-filled
- [ ] Scan runs against real target (not lab) and finds vulnerabilities
- [ ] Vulnerabilities appear on dashboard with correct target attribution

---

# File Summary (All Changes)

| File | Action | Part |
|------|--------|------|
| `docker-compose.lab.yml` | MODIFY | A |
| `backend/app/services/lab_manager.py` | MODIFY | A |
| `lab_setup.ps1` | MODIFY | A |
| `backend/app/models/config.py` | NEW | B |
| `backend/app/api/v1/endpoints/config.py` | MODIFY | B |
| `backend/app/core/config.py` | MODIFY | B |
| `backend/app/main.py` | MODIFY | B |
| `frontend/src/components/dashboard/SettingsPanel.jsx` | NEW | B |
| `frontend/src/pages/Dashboard.jsx` | MODIFY | B |
| `frontend/src/context/ConfigContext.jsx` | MODIFY | B |
| `frontend/src/services/api.js` | MODIFY | B, C |
| `backend/app/schemas/scan.py` | MODIFY | C, D |
| `backend/app/services/scan_tasks.py` | MODIFY | C |
| `backend/app/api/v1/endpoints/scans.py` | MODIFY | C |
| `frontend/src/components/dashboard/ScanConfigModal.jsx` | NEW | C |
| `frontend/src/components/dashboard/ScanButton.jsx` | MODIFY | C |
| `backend/app/models/scan.py` | MODIFY | D |
| `frontend/src/components/dashboard/EnvironmentWizard.jsx` | NEW | D |
| `frontend/src/components/dashboard/TargetsManager.jsx` | MODIFY | D |
| Alembic migration file | NEW | B, D |
