# 🎓 found 404 — Master Development & Graduation Roadmap
### SME Security Orchestration Center | Team of 11 | Professional Graduation Path

> [!IMPORTANT]
> **Core Architecture Protocol:** "found 404" operates on a **Deterministic Hybrid Model**. 
> - **Execution:** Rule-based tool chaining (Nmap -> Nuclei -> Wazuh).
> - **Scoring:** Statistical calculation (CVSS weights + Asset Criticality).
> - **AI Role:** *Advisory Only*. Gemini 1.5 Flash translates technical findings into business-readable SME advice.

---

## 🛠️ Updated Tech Stack & Architecture Rules

### 🔹 Core Technologies
*   **Backend:** Python 3.10+, FastAPI (Asynchronous API), PostgreSQL (Metadata & Results).
*   **Engine:** Celery (Distributed Tasks), Redis (Message Broker), `AgentOrchestrator` (Rule Chaining).
*   **Frontend:** React 18+, Vite, **react-force-graph-2d** (Topology), Tailwind CSS (High-Density UI).
*   **Security Stack:** Nmap (Network Discovery), Nuclei (Vulnerability Templates), Wazuh EDR/SIEM (Log Analytics).
*   **AI Advisory:** Google Gemini 1.5 Flash (Risk Explanations & Remediation Advice).

### 📏 Mandatory Rules
1.  **Rule-Based Logic:** No AI is used to decide "what to scan." Scans are triggered by hard-coded tool chaining (e.g., Open Port 80 -> Nuclei HTTP Scan).
2.  **UnifiedRiskEngine:** All findings must pass through `UnifiedRiskEngine.py` to calculate the **SME Health Score** (100 - Reductions).
3.  **Visualization:** Interactive D3.js/React-Force-Graph for real-time subnet mapping.

---

## 📐 SDLC + Learning Integration Model

Each phase of the Software Development Life Cycle is augmented with a **Learning Sprint** before development begins. No one codes what they don't understand.

```
[ Learning Sprint ] → [ Build Sprint ] → [ Integration ] → [ Review & Demo ]
```

---

## 👥 Team Structure & Sub-Teams

### 🔷 Sub-Team 1: Backend & AI Advisory
**Sub-Leader: Reem Amin**
| # | Member | Role |
|---|--------|------|
| 1 | **Reem Amin** (Sub-Leader) | FastAPI Endpoints, Schema Design, OpenVAS Integration |
| 2 | **Yousef Abdel Hady** | **UnifiedRiskEngine.py** (CVSS Logic) & Advisor Prompting |
| 3 | **Mohamed Shaban** | **AgentOrchestrator** (Deterministic Rule & Task Chaining) |

**Technologies to Learn:** FastAPI, PostgreSQL, Celery, Redis, Google Gemini API, CVSS Scoring Specs.

---

### 🔷 Sub-Team 2: Frontend & High-Density Visualization
**Sub-Leader: Marize Ehap**
| # | Member | Role |
|---|--------|------|
| 4 | **Marize Ehap** (Sub-Leader) | React Component Architecture, State Management |
| 5 | **Omnia Helmy** | **React-Force-Graph-2d** & Network Topology D3 Logic |
| 6 | **Mazin Alaa** | Tailwind CSS Design, Asset Detail Slide-outs, UX Polish |

---

### 🔷 Sub-Team 3: Security Ops & Scanning Engine
**Sub-Leader: Shahd Paher**
| # | Member | Role |
|---|--------|------|
| 7 | **Shahd Paher** (Sub-Leader) | Nmap Discovery scripts & Nuclei Template Orchestration |
| 8 | **Rahma Ebraheam** | Wazuh EDR Integration & Elasticsearch/Kibana SIEM Tuning |

---

### 🔷 Sub-Team 4: DevOps & Quality Assurance
**Sub-Leader: Omar Kapil** *(Team Leader)*
| # | Member | Role |
|---|--------|------|
| 9 | **Omar Kapil** (Sub-Leader) | Docker Orchestration, CI/CD, Infrastructure Hardening |
| 10 | **Yosef Ali** | Testing (Pytest, Playwright), Integration Verification |
| 11 | **Omar Tarek** | Documentation, Academic Defense Design, Presentation |

**Technologies to Learn:** Docker Compose, GitHub Actions, Pytest, Technical Writing, Presentation Design.

---

## ✅ Sprint Log — Completed Work

### Sprint 1 (March 2–8, 2026) — Architecture Design & Core Refactoring
> **Status: COMPLETED**

**Sub-Team 1 (Backend/AI):**
- [x] Created `UnifiedRiskEngine` with deterministic **Risk Score** (0–100) using CVSS weights.
- [x] Refactored `AgentOrchestrator` for **rule-based tool chaining** (Nmap → Nuclei).
- [x] Refactored `IntelligenceAgent` to **advisory-only** role using Gemini 1.5 Flash.

**Sub-Team 2 (Frontend):**
- [x] Updated `NetworkTopology.jsx` hover tooltip: shows Health Score + AI Advisor data.
- [x] Updated `AssetDetailPanel.jsx` to display security advice, impact, and remediation.

**Sub-Team 4 (DevOps/QA):**
- [x] Updated Mermaid architecture diagrams and technical documentation.
- [x] Finalized initial `implementation_plan.md`.

---

## 📅 4-Month Timeline (16 Weeks)

### ═══════════════════════════════════
### 🟡 PHASE 1 — Foundation & Technical Sprints (Weeks 1–4)
### SDLC Stage: Requirements + Planning
### ═══════════════════════════════════

| Week | All Teams | Sub-Team 1 (Back/AI) | Sub-Team 2 (Front) | Sub-Team 3 (Sec) | Sub-Team 4 (DevOps) |
|------|-----------|----------------------|--------------------|------------------|---------------------|
| **Wk 1** | Kickoff & Clone | FastAPI crash course | React + Vite setup | Linux CLI + Nmap | Docker basics |
| **Wk 2** | Arch Review | PostgreSQL + SQLA | Tailwind + UI Blocks | Nuclei setup | Docker-compose mapping |
| **Wk 3** | Tech Deep-dive | Celery + Redis | D3.js + Graph basics | Wazuh exploration | GitHub Actions CI |
| **Wk 4** | **Phase 1 Demo** | Build API Base | Build UI Layout | Full Lab Scan test | Automated Test setup |

**📌 Deliverables (End of Week 4):**
- [x] 11 Healthy development environments.
- [x] Sub-team learning proofs presented.
- [x] GitHub repo access confirmed for all.

---

### ═══════════════════════════════════
### 🟠 PHASE 2 — Deterministic Core Development (Weeks 5–9)
### SDLC Stage: Design + Implementation
### ═══════════════════════════════════

| Week | Sub-Team 1 (Back/AI) | Sub-Team 2 (Front) | Sub-Team 3 (Sec) | Sub-Team 4 (DevOps) |
|------|----------------------|--------------------|------------------|---------------------|
| **Wk 5** | Solidify API & DB | Real API data binding | Scan pipeline study | API Test suite stubs |
| **Wk 6** | **Deterministic Rules** | Graph Improvements | Nmap OS Discovery | Full service docs |
| **Wk 7** | **UnifiedRiskEngine** | Asset Detail Panel | Wazuh Log Injection | Integration Tests |
| **Wk 8** | Background Tasks | Risk Score Charts | n8n SOAR Playbooks | Performance Load tests |
| **Wk 9** | **Integration Hub** | Full API Data Sync | SIEM UI Induction | CI Pipeline Green ★ |

**📌 Deliverables (End of Week 9):**
- [x] End-to-end scan flow: Discovery → Scan → Logic → UI.
- [x] Real-time Network Topology connected to live API.
- [x] Wazuh receiving live telemetry from lab assets.

---

### ═══════════════════════════════════
### 🔴 PHASE 3 — Integration & Hardening (Weeks 10–13)
### SDLC Stage: Testing + Enhancement
### ═══════════════════════════════════

| Week | Sub-Team 1 (Back/AI) | Sub-Team 2 (Front) | Sub-Team 3 (Sec) | Sub-Team 4 (DevOps) |
|------|----------------------|--------------------|------------------|---------------------|
| **Wk 10** | RBAC Implementation | Auth UI & Protection | Add lab vulnerabilities | End-to-end SOAR test |
| **Wk 11** | PDF Export Endpoint | PDF UI Action Button | Wazuh IDS simulation | Team UAT Session |
| **Wk 12** | Logging & Audit | UI animations & polish | Traffic capture (tshark) | Security Self-Audit |
| **Wk 13** | Bug Squashing | Mobile responsiveness | Tool tuning | Regression test pack |

**📌 Deliverables (End of Week 13):**
- [ ] Role-Based Access Control (RBAC) functional.
- [ ] Professional PDF Reports with SME Advice.
- [ ] Complete OpenAPI/Swagger documentation.

---

### ═══════════════════════════════════
### 🟢 PHASE 4 — Academic Defense & Finalization (Weeks 14–16)
### SDLC Stage: Presentation + Deployment
### ═══════════════════════════════════

| Week | All Teams | Key Activities |
|------|-----------|----------------|
| **Wk 14** | **Defense Prep** | **Efficiency Benchmark:** Manual vs Orchestrated time/cost metrics. |
| **Wk 15** | **Mock Defense** | Demo video (5-min) + Dry-run university presentation. |
| **Wk 16** | **🎓 FINAL DEFENSE** | University presentation + Live lab demonstration. |

**📌 Deliverables (End of Week 16):**
- [ ] Master Demo Video (3-5 mins).
- [ ] Final Documentation Package (Technical + Presentation).
- [ ] 🎓 **Project Submitted.**

---

## 📊 Visual Timeline Summary

```
Month 1 (March)   | PHASE 1: Foundation & Learning
  Wk 1: Kickoff + Environment Setup
  Wk 2: Architecture Deep Dive
  Wk 3: Tech Deep Dives (sub-leaders teach)
  Wk 4: Phase 1 Learning Demo ★ 

Month 2 (April)   | PHASE 2: Core Development (Deterministic Engine)
  Wk 5: API & Database Stabilization
  Wk 6: Deterministic Orchestrator 
  Wk 7: UnifiedRiskEngine (CVSS logic)
  Wk 8: SOAR & Background Processing
  Wk 9: Integration Checkpoint ★ 

Month 3 (May-Jun) | PHASE 3: Integration & Enhancement
  Wk 10: RBAC & Hardening
  Wk 11: PDF Reporting & UAT
  Wk 12: Polish & Traffic Integration
  Wk 13: Final Stability Check

Month 4 (Jun-Jul) | PHASE 4: Graduation & Defense
  Wk 14: Efficiency Metrics & Slotting
  Wk 15: Mock Presentation
  Wk 16: 🎓 UNIVERSITY DEFENSE
```

---

## 🏁 Sub-Leader Responsibilities

| Sub-Leader | Team | Responsibility |
|-----------|------|----------------|
| **Reem Amin** | Backend/AI | Engine Logic, DB integrity, Advisory Agent quality |
| **Marize Ehap** | Frontend | UI Consistency, D3 visualization accuracy, React State |
| **Shahd Paher** | Security | Lab target management, tool output reliability |
| **Omar Kapil** | DevOps/ALL | Cross-team integration, CI/CD, Final defense strategy |

---

## 📋 Weekly Rituals (Team Workflow)

| Ritual | Day | Duration | Who |
|--------|-----|----------|-----|
| **Strategy Kickoff** | Monday | 30 min | Full Team |
| **Lab Sync** | Wednesday | 20 min | Sub-Leads + Omar |
| **Demo & Review** | Friday | 45 min | Full Team |
| **Notion/Git Sync** | Friday | 15 min | Individual |

---

## 🎯 Grading Distribution (Suggested)

| Component | Weight |
|-----------|--------|
| Working Platform (Deterministic Engine) | 40% |
| AI Advisory Utility & Accuracy | 20% |
| Topology Visualization (UX/D3) | 15% |
| Security Tool Chaining Logic | 15% |
| Documentation & Presentation | 10% |

---

## 🔗 Key Resources Per Team

### Sub-Team 1 (Backend/AI)
- FastAPI: https://fastapi.tiangolo.com
- Gemini API: https://ai.google.dev/gemini-api/docs

### Sub-Team 2 (Frontend)
- React-Force-Graph: https://github.com/vasturiano/react-force-graph
- Tailwind UI: https://tailwindcss.com/docs

### Sub-Team 3 (Security)
- Nuclei Templates: https://github.com/projectdiscovery/nuclei-templates
- Wazuh: https://documentation.wazuh.com

---
*Generated by: Senior PM & Lead Architect Team*
*Last Update: March 15, 2026*
