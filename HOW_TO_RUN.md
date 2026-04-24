# Orchestration Security Center — Run Guide, Lab Guide & Use Cases

> Complete instructions for running the dashboard, deploying the lab, and manually walking through every use case.

---

## RAM Requirements

| Mode | RAM Needed | What's Running |
|------|-----------|----------------|
| **Lite (default)** | **16 GB** | 6 main services + 6 lab containers ≈ 3–4 GB containers |
| Full | 32 GB | + OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, celery_beat |

> Windows 11 + Docker Desktop consume ~4.5 GB on their own. Lite mode leaves ~8 GB headroom on a 16 GB machine.

---

## Prerequisites

Before anything else, verify these are installed and running:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Docker Desktop | Latest | `docker --version` |
| Docker Compose v2 | v2.x | `docker compose version` |
| PowerShell | v5.1+ | `$PSVersionTable.PSVersion` |

> **CRITICAL:** Docker Desktop must be running before any step below. All services run inside containers.

---

## Quickstart (Recommended — Lite Mode)

One script does everything: creates the network, starts both stacks, and seeds lab targets.

```powershell
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
```

When it finishes, open **https://localhost** (accept the self-signed cert).

---

## Non-Expert 3-Click Workflow (Phase 5.3)

If you don't want to drop to a terminal after the first run, everything below
is in the UI:

1. **Sign in** at `https://localhost` as an analyst/admin.
2. Open the **Lab Environment** tab. It shows container status live. If Docker
   Desktop isn't running yet, a plain-English banner tells you so ("Docker
   Desktop is not running. Start Docker Desktop and press Refresh.") — no Python
   stack traces.
3. Click **Seed Targets**, then click **Scan** on any lab target card. Watch
   progress via the Scanning Banner. Go to **Scan History** to see the result
   row and generate a PDF report.

When you're done, run `docker compose down` and `docker compose -f docker-compose.lab.yml down` to stop.

---

## Lab Network Isolation (Phase 5.1)

The lab networks (`dmz`, `corp`, `data`) are intentionally vulnerable. They
must not be reachable from the host's LAN or the internet. Two artifacts
enforce this:

- **Compose override:** [infra/isolation/docker-compose.lab.isolation.override.yml](infra/isolation/docker-compose.lab.isolation.override.yml)
  marks every lab network `internal: true` and rebinds published ports to
  `127.0.0.1` (loopback only).
- **Host firewall rules:** [infra/isolation/lab_isolation.sh](infra/isolation/lab_isolation.sh)
  (Linux/iptables) and [infra/isolation/lab_isolation.ps1](infra/isolation/lab_isolation.ps1)
  (Windows/netsh) deny outbound traffic from the lab subnets with a minimal
  intra-lab allowlist.

### Start the lab with isolation enforced

```powershell
# Apply host firewall rules (one-time, persistent)
powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 apply

# Start lab containers with the isolation override
docker compose -f docker-compose.lab.yml `
               -f infra/isolation/docker-compose.lab.isolation.override.yml `
               up -d
```

### Verify isolation is active

```powershell
# 1. Networks are internal
docker network inspect the-dashboard-project-_lab_dmz --format '{{.Internal}}'
# → true

# 2. Container cannot reach the internet
docker exec lab_webserver curl -m 5 https://1.1.1.1
# → curl: (28) Connection timed out

# 3. Firewall rules are active
powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 verify
```

### Recover if the lab starts in a half-up state

```powershell
docker compose -f docker-compose.lab.yml down
docker network prune -f
docker compose -f docker-compose.lab.yml `
               -f infra/isolation/docker-compose.lab.isolation.override.yml `
               up -d --force-recreate
```

---

## Part 1 — Running the Main Dashboard (Manual Steps)

### Step 1: Create the Lab Network Bridge

This shared network is required by both stacks. Only run this once.

```powershell
docker network create the-dashboard-project-_lab_network
```

If you see "network already exists" — that's fine, continue.

### Step 2: Start the Lean Main Stack (6 services)

```powershell
docker compose up -d
```

Starts: Caddy (TLS proxy), FastAPI backend, React frontend, PostgreSQL, Redis, Celery worker.

Wait 30–60 seconds, then verify:

```powershell
docker compose logs -f backend
```

Wait until you see: `Application startup complete`

### Step 3: Verify the Dashboard is Running

| URL | What you'll see |
|-----|----------------|
| https://localhost | Main dashboard (accept self-signed cert) |
| http://localhost:8000/docs | Swagger API docs |
| http://localhost:8000/health | JSON health status |

---

## Part 2 — Deploying the Lab Environment

The lab is a separate set of vulnerable containers that the dashboard will scan.

### Step 4: Start the Lab Containers (6 containers)

```powershell
docker compose -f docker-compose.lab.yml up -d --build
```

Starts: Juice Shop (web), API Gateway (nginx), Samba file server, PostgreSQL (lab DB), Redis cache, traffic generator.

### Step 5: Seed the Targets into the Dashboard

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/v1/lab/seed
```

Or via the lab script:

```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 seed
```

### Step 6: Verify Lab Status

```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status
```

All 6 lab containers should show as `running`.

Juice Shop is reachable at: http://localhost:3000

---

## Lite Mode vs Full Mode

By default `docker compose up` starts only the 6 lean services. To add OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, and celery_beat:

```powershell
docker compose --profile full up -d
```

Full mode requires ~32 GB RAM. Optional features (SIEM, SOAR, scheduled scans, OpenVAS deep scans) are disabled by default and activate automatically when their services are running.

---

## Part 3 — Running Your First Scan

### Step 7: Trigger Automated Scans on All Targets

```powershell
powershell -ExecutionPolicy Bypass -File .\trigger_lab_scans.ps1
```

This calls the backend API to create a scan job for each registered lab target. The Celery worker picks up the jobs and the AgentOrchestrator begins the 4-stage pipeline.

### Watching the Scan in Real Time

1. Go to http://localhost:5173
2. The **Scanning Banner** appears at the top — scan is active
3. Open the **Orchestration Feed** tab — watch live agent log messages
4. Open the **Scan Pipeline Panel** — see which stage is currently running:
   - Stage 1: RECON (Nmap discovery)
   - Stage 2: TARGETED CHAINING (Nuclei templates)
   - Stage 3: VALIDATION (confidence filtering)
   - Stage 4: RISK SCORING (UnifiedRiskEngine)
5. When complete, the **Network Topology** graph populates with discovered nodes

---

## Part 4 — Lab Management Commands

### Check All Container Status

```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status
```

### Follow Live Logs for a Specific Service

```powershell
# Main backend logs
docker compose logs -f backend

# Celery worker logs (shows scan execution)
docker compose logs -f celery_worker

# All lab services
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 logs
```

### Stop Everything

```powershell
docker compose down
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 stop
```

### Full Reset (Clean Slate)

Wipes all containers, volumes, and database records:

```powershell
docker compose down -v
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 reset
```

After reset, go back to Step 1 and repeat the full startup sequence.

---

## Part 5 — Manual Use Cases

These are step-by-step walkthroughs for demonstrating every major feature of Orchestration Security Center in the lab environment.

---

### Use Case 1: Discover the Full Lab Network

**Goal:** Show how the ReconAgent maps an unknown network.

**Steps:**
1. Go to http://localhost:5173
2. Navigate to the **Targets Manager** tab
3. Add a new target: enter the lab subnet `172.30.0.0/24` as the target
4. Click **Initiate Orchestrated Scan**
5. Watch the **Network Topology** graph — nodes appear as Nmap discovers each host
6. Each node shows: IP address, detected OS, open ports
7. Hover over a node to see its **Health Score** and AI risk summary

**What to observe:** The system finds `lab_juice_shop (172.30.0.50)` and `lab_api_gateway (172.30.0.51)` automatically without manual configuration.

---

### Use Case 2: Deterministic Tool Chaining (SMB Attack Path)

**Goal:** Demonstrate how Orchestration Security Center avoids alert fatigue by only running relevant tests.

**Steps:**
1. In **Targets Manager**, add target: `lab_misconfig_infra` (172.31.0.50)
2. Click **Initiate Orchestrated Scan**
3. Open the **Orchestration Feed** — watch for these specific log entries:
   ```
   [RECON] Port 4445 open on 172.31.0.50
   [CHAIN] Port 445/4445 → triggering smb-enum, default-login Nuclei templates
   [ATTACK] Testing SMB default credentials admin:admin123
   [VALIDATE] Login succeeded — confidence: 0.95
   [RISK] ActionItem created: REMEDIATION — Disable default SMB credentials
   ```
4. The Risk Score for this asset will be **80/100 (High)**
5. In **Action Center**, find the generated action item with exact remediation steps

**What to observe:** The system did NOT run web SQLi templates against an SMB host. It routed port 445/4445 to SMB-specific Nuclei templates only. This is deterministic chaining in action.

---

### Use Case 3: Unauthenticated Database Discovery (Shadow IT)

**Goal:** Show detection of the forgotten Redis instance.

**Steps:**
1. Add target: `lab_shadow_asset` (172.32.0.50)
2. Run a scan
3. In the **Orchestration Feed**, look for:
   ```
   [RECON] Port 63790 open — service fingerprint: Redis
   [CHAIN] Port 6379/variant → triggering redis-unauthenticated template
   [VALIDATE] Redis responds to PING without authentication — confirmed
   [RISK] Score: 85/100 (High) — unauthenticated database access
   ```
4. View the generated **Vulnerability** in the Vulnerabilities panel
5. The AI Advisory in **Asset Detail Panel** will explain the business risk

**What to observe:** Non-standard port (63790) was still correctly fingerprinted as Redis and tested with the right template — not a generic port scan.

---

### Use Case 4: Web Application Attack Surface (Juice Shop)

**Goal:** Show web vulnerability detection with BOLA and SQL injection.

**Steps:**
1. Add target: `lab_juice_shop` (http://172.30.0.50:3000)
2. Run a scan
3. Watch the **Orchestration Feed** for:
   ```
   [RECON] Port 3000 open — HTTP service detected
   [CHAIN] HTTP port → triggering web nuclei templates (bola, sqli, xss)
   [ATTACK] BOLA template matched on /api/users/
   [VALIDATE] Confirmed — confidence: 0.92
   [RISK] Score: 95/100 (CRITICAL)
   ```
4. In **Vulnerabilities Panel**, the Juice Shop shows multiple critical/high findings
5. The **Risk Heatmap** shifts to show critical severity in the top-right cell
6. The **Network Topology** node for Juice Shop turns red (critical)

**What to observe:** Juice Shop generates the highest risk score (95/100) — it should appear first in every prioritized list.

---

### Use Case 5: Reading the Dashboard — Business Risk Translation

**Goal:** Show how a non-technical manager reads the output.

**Steps:**
1. After scans complete, look at the **Stat Cards** row at the top:
   - Total Assets Scanned
   - Critical Findings count
   - Health Score (0–100)
   - Active Action Items
2. Click the **Risk Score** gauge — it shows the overall network risk
3. Open **Action Center** — items are sorted by priority (REMEDIATION first)
4. Click any action item to expand it — read the plain-language remediation step
5. Click a red node in **Network Topology** → **Asset Detail Panel** opens on the right
6. Scroll to "SME Security Advisor" — the AI explains why it matters in business terms

**What to observe:** From 4 scanned targets, the system produced ~5–8 prioritized action items instead of hundreds of raw vulnerability lines. Each item has an exact fix step.

---

### Use Case 6: Viewing SIEM Events

**Goal:** Show real-time log monitoring from the lab environment.

**Steps:**
1. Go to the **SIEM** tab in the dashboard
2. The Wazuh integration shows alerts generated by the lab traffic generator and log shipper
3. Filter by severity: show only HIGH and CRITICAL events
4. Click any alert to see the raw log data
5. For deeper exploration, open Kibana at http://localhost:5601

**What to observe:** While scans run, the log shipper forwards container activity to Elasticsearch. The SIEM tab shows this activity aggregated in real time.

---

### Use Case 7: Generating a PDF Report

**Goal:** Export scan findings as a formal security report.

**Steps:**
1. Navigate to the **Reports** tab
2. Select the completed scan from the dropdown
3. Click **Generate PDF Report**
4. The report downloads automatically with:
   - Executive Summary (risk scores, key findings)
   - Asset inventory with risk ratings
   - Full vulnerability list with CVE references
   - Prioritized action items with remediation steps
   - Network topology snapshot

**What to observe:** The report is formatted for a non-technical audience (business owner) and a technical audience (IT admin) at the same time.

---

### Use Case 8: Scan History and Trend Analysis

**Goal:** Show how risk changes over time as remediations are applied.

**Steps:**
1. Run a first scan on all targets — note the overall risk score
2. In **Targets Manager**, mark the Juice Shop target as "remediated" (simulated)
3. Run a second scan
4. Open **Scan History** — compare the two scans side by side
5. Open **Vuln Trend** chart — the line graph should show the drop in findings
6. The **Health Score** gauge should increase

**What to observe:** The system tracks progress over time, giving the IT admin evidence that their remediations are working.

---

## Troubleshooting

### Docker not starting

```powershell
# Check Docker daemon
docker info

# If Docker Desktop is frozen, restart it from the system tray
```

### Backend returns 500 errors

The backend is still starting. Wait 30 seconds and try again. Check:

```powershell
docker compose logs backend | tail -20
```

### Lab targets not reachable

The shared network might not exist:

```powershell
docker network ls | grep lab_network

# If missing:
docker network create the-dashboard-project-_lab_network
```

### PowerShell execution policy error

Always use the bypass flag:

```powershell
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 start
```

### Nuclei scans timing out

In Docker Desktop → Settings → Resources → Memory, set at least **6 GB** for lite mode, **16 GB** for full mode.

### No Gemini AI advisory appearing

The Gemini API key is optional. Set it in the root `.env` file:

```
GEMINI_API_KEY=your_key_here
```

Then restart the backend:

```powershell
docker compose restart backend
```

The system works fully without it — AI advisory fields will show generic fallback text.

### WebSocket disconnected (yellow/red dot in sidebar)

The backend is restarting or overloaded. The frontend reconnects automatically with exponential backoff. Wait 10–30 seconds.

---

## Service Access Reference

### Lite Mode (always available)

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | https://localhost | — |
| Backend API Docs | http://localhost:8000/docs | — |
| Juice Shop (scan target) | http://localhost:3000 | — |
| API Gateway (scan target) | http://localhost:8081 | — |

### Full Mode only (`--profile full`)

| Service | URL | Credentials |
|---------|-----|-------------|
| Kibana | http://localhost:5601 | — |
| n8n SOAR | http://localhost:5678 | — |
| OpenVAS | https://localhost:9392 | admin / admin |
| Wazuh API | https://localhost:55000 | — |
| Elasticsearch | http://localhost:9200 | — |

---

*Last updated: 2026-04-25 (stabilization phase 5 — lab isolation & simplified configuration)*
