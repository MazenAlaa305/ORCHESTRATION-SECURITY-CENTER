# Final Project Presentation Plan
## Orchestration Security Center — AI-Driven DAST Platform

**Duration:** 30 minutes
**Team Size:** 11 members
**Audience:** FYP Examination Committee (HITU 2025–2026)

---

## Time Allocation Overview

| Phase | Duration | Members |
|---|---|---|
| Opening & Problem | 4 min | 1, 2 |
| Architecture & Tech | 6 min | 3, 4 |
| AI Brain & Risk Engine | 5 min | 5, 6 |
| Frontend & DevOps | 5 min | 7, 8 |
| Live Demo | 8 min | 9, 10 |
| Closing & Q&A | 2 min | 11 |
| **Total** | **30 min** | **11 members** |

---

## Speaker Order

### 1. Team Lead / Project Manager — Opening (2 min)
**Role:** Set the stage and introduce the project.

- Project name: **Orchestration Security Center**
- HITU Final Year Project 2025–2026, 11-member team
- Show presentation roadmap (agenda slide)
- Introduce the next speaker

**Opening line:**
> "Today we present an AI-Driven DAST platform built specifically for Small-to-Medium Enterprises. We will walk you through the problem, the solution, and a live demonstration."

---

### 2. Business Analyst — Problem & Value Proposition (2 min)
**Role:** Justify why the project exists.

- **Problem:** SMEs lack dedicated security teams and face thousands of daily alerts
- **Solution:** Translate thousands of raw alerts into 5 prioritized action items
- **Concrete example:** Nmap detects port 445 → triggers SMB-specific Nuclei templates instead of generic web tests
- **Target users:** SME IT admins, security analysts, compliance officers, DevOps teams

---

### 3. Solution Architect — Architecture Overview (3 min)
**Role:** Present the big picture.

- Display full architecture diagram
- Flow: React Frontend → FastAPI → Celery → Redis → 4-Stage Pipeline → PostgreSQL
- Justify technology choices:
  - FastAPI for async performance
  - Celery for background task orchestration
  - Redis for pub/sub real-time streaming
- Walk through the tech stack table briefly

---

### 4. Backend Lead — API & Database (3 min)
**Role:** Present backend foundation.

- **FastAPI:** 13 API route groups (auth, scans, targets, vulnerabilities, reports, dashboard, network, OpenVAS, SIEM, config, lab, audit, findings)
- **ORM Models:** Target → Scan → Vulnerability / Endpoint / AgentLog / ScanAsset
- **Authentication:** JWT + bcrypt + Role-based access (ANALYST / ADMIN)
- **Credential Encryption:** Fernet symmetric encryption for stored credentials
- **WebSocket:** `/ws/events` for real-time scan updates

---

### 5. AI / Agent Engineer — The Brain (3 min) ⭐
**Role:** Highlight the project's unique selling point.

**4-Stage Agent Pipeline:**
1. **Stage 1 — Recon:** Nmap port scan + Subfinder subdomain discovery
2. **Stage 2 — Attack:** Nuclei vulnerability templates with service-aware chaining
3. **Stage 3 — Validation:** InfrastructureAgent (Trivy/CVE) + IntelligenceAgent (Gemini 2.0 Flash)
4. **Stage 4 — Scoring:** UnifiedRiskEngine produces deterministic 0–100 score

**Trust & Safety:**
- SHA-256 hash-chained agent logging for tamper evidence
- LLM Guard: daily token budget (500K) + per-scan limit (50K) for cost control

---

### 6. Security / Risk Engineer — Risk Scoring (2 min)
**Role:** Explain how risk is quantified.

**Scoring Formula:**
```
Score = (vuln_penalties × confidence) + port_penalties
      × asset_multiplier × exposure_modifier
```

- **Severity weights:** CRITICAL 25, HIGH 15, MEDIUM 7, LOW 2
- **High-risk ports:** SMB(20), FTP(15), RDP(15), Redis(10)
- **Exposure modifier:** 0.6 for RFC-1918 internal IPs, 1.0 for public
- **Compliance auto-tagging:** PCI-DSS, HIPAA, ISO-27001, GDPR
- **Health Score = 100 − Risk Score**

---

### 7. Frontend Lead — User Experience (3 min)
**Role:** Showcase the UI design.

- **Stack:** React 18 + Vite + Tailwind CSS (custom cyber/dark theme)
- **4 Global Contexts:** Auth, RealTime (WebSocket), Config, Toast
- **25+ Dashboard Components** organized into 8 tabs
- **Highlights:**
  - NetworkTopology (D3 force-directed graph)
  - RiskHeatmap (D3 treemap)
  - OrchestrationFeed (virtualized with react-window)
- Real-time state updates via WebSocket events

---

### 8. DevOps Engineer — Deployment & Lab (2 min)
**Role:** Present infrastructure and the test environment.

- **Docker Compose:** 6 core services + 6 optional services
- Caddy reverse proxy with TLS termination
- **Lab Environment:** 6 vulnerable containers across 4 network zones
  - DMZ: Juice Shop, API Gateway, DNS
  - Corp: File server, Mail server, Workstation
  - Data: PostgreSQL, Redis (weak credentials)
  - Mgmt: Traffic generator, Log shipper
- Network isolation via external bridge `lab_network`
- Hand-off line: *"Now my colleague will demonstrate this stack live."*

---

## LIVE DEMO (8 min) — Most Critical Section

### 9. Demo Driver #1 — Scan Execution (4 min)
**Role:** Drive the first half of the live demo.

**Demo Steps:**
1. Login with JWT credentials → Dashboard loads
2. Show 4 KPI cards: Risk Score, Security Health, Active Scans, MTTR
3. Click **Quick Scan** on a lab target (e.g., Juice Shop)
4. Show **ScanPipelinePanel** progressing through 4 stages live
5. Display **OrchestrationFeed** streaming agent actions in real-time
6. Show **LiveConsole** with raw scan output

---

### 10. Demo Driver #2 — Results & Reporting (4 min)
**Role:** Continue the demo with results analysis.

**Demo Steps:**
1. Show **NetworkTopology** — force-directed graph, click a node
2. Show **RiskHeatmap** treemap of vulnerability severity distribution
3. Open **VulnerabilitiesPanel** → click finding → **IncidentDetailDrawer**
4. Show **SecurityAdvisor** AI-powered recommendations (Gemini)
5. Generate and download **PDF Report** with digital signature
6. (If time permits) Show **AgentLogViewer** with SHA-256 hash chain verification

---

### 11. QA Lead / Closer — Wrap-up & Q&A (2 min)
**Role:** Close the presentation professionally.

- **Testing strategy:** unit tests + integration tests against lab containers
- **Future Work:**
  - SOAR auto-remediation via n8n
  - Wazuh SIEM integration
  - Scheduled recurring scans (Celery Beat)
- **Closing line:**
  > "We transformed thousands of alerts into 5 actionable items, powered by transparent and auditable AI."
- Open the floor for **Q&A** and thank the committee

---

## Professional Execution Tips

1. **Full rehearsal twice** with a stopwatch — demos always overrun
2. **Backup demo video** ready in case the live scan fails
3. **One slide per speaker** with maximum 3 bullet points
4. **Members 5, 9, and 10 are the stars** — assign your strongest speakers
5. **Member 5 (AI Engineer)** must speak with confidence — this is the unique selling point
6. **Smooth transitions:** each speaker introduces the next by name and role
7. **Dress code:** business formal for all 11 members
8. **Test the venue setup:** projector resolution, network access for live demo, audio

---

## Pre-Presentation Checklist

- [ ] All Docker services running (`docker compose ps` shows healthy)
- [ ] Lab containers seeded (`/lab/seed` endpoint hit)
- [ ] Test scan run-through completed within last hour
- [ ] PDF report pre-generated as fallback
- [ ] Backup demo video on USB drive
- [ ] Slides exported as PDF (in case PowerPoint fails)
- [ ] Each member knows their cue line from the previous speaker
- [ ] Q&A responses pre-discussed for top 10 likely questions

---

**Document version:** 1.0
**Last updated:** 2026-04-25
