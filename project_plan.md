# 🎓 found 404 — Graduation Project Master Plan
### SME Security Orchestration Center | Team of 11 | 4-Month Roadmap

> **Project:** found 404 — A deterministic cybersecurity orchestration platform featuring rule-based tool chaining, unified risk scoring, network topology visualization, SIEM/SOAR integration, and Gemini AI (advisory only for risk explanations).
> **Start Date:** March 2, 2026 | **Deadline:** ~July 2, 2026
> **Team Size:** 11 members | **Team Leader:** Omar Kapil

---

## 📐 SDLC + Learning Integration Model

Each phase of the Software Development Life Cycle is augmented with a **Learning Sprint** before development begins. No one codes what they don't understand.

```
[ Learning Sprint ] → [ Build Sprint ] → [ Integration ] → [ Review & Demo ]
```

---

## 👥 Team Structure & Sub-Teams

### 🔷 Sub-Team 1: Backend & AI Core
**Sub-Leader: Reem Amin**
| # | Member | Role |
|---|--------|------|
| 1 | **Reem Amin** (Sub-Leader) | FastAPI, Database, Celery/Redis |
| 2 | **Yousef Abdel Hady** | UnifiedRiskEngine, AI Advisory Agent |
| 3 | **Mohamed Shaban** | Task Queue, Docker Orchestration |

**Technologies to Learn:** Python, FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis, Google Gemini API, Docker

---

### 🔷 Sub-Team 2: Frontend & Visualization
**Sub-Leader: Marize Ehap**
| # | Member | Role |
|---|--------|------|
| 4 | **Marize Ehap** (Sub-Leader) | React, Vite, Component Architecture |
| 5 | **Omnia Helmy** | D3.js, Network Topology Graph |
| 6 | **Mazin Alaa** | Tailwind CSS, Dashboard UI, UX |

**Technologies to Learn:** React, Vite, Tailwind CSS, D3.js, React Force Graph, Lucide Icons, REST API consumption

---

### 🔷 Sub-Team 3: Security & Scanning Engine
**Sub-Leader: Shahd Paher**
| # | Member | Role |
|---|--------|------|
| 7 | **Shahd Paher** (Sub-Leader) | Nmap, Nuclei, Scan Orchestration |
| 8 | **Rahma Ebraheam** | Wazuh (EDR), Elasticsearch, Kibana |

**Technologies to Learn:** Nmap, Nuclei, Wazuh, Elasticsearch, Kibana, Linux CLI, Docker Compose networking

---

### 🔷 Sub-Team 4: DevOps & Quality Assurance
**Sub-Leader: Omar Kapil** *(Team Leader — dual role)*
| # | Member | Role |
|---|--------|------|
| 9 | **Omar Kapil** (Sub-Leader + Team Leader) | Docker, CI/CD, Infrastructure, Overall Coordination |
| 10 | **Yosef Ali** | Testing (API, Integration, E2E) |
| 11 | **Omar Tarek** | Documentation, Demo, Presentation |

**Technologies to Learn:** Docker Compose, GitHub Actions, Pytest, Postman, Technical Writing, Presentation Design

---

## ✅ Sprint Log — Completed Work

### Sprint 1 (March 2–8, 2026) — Architecture Design & Core Refactoring
> **Status: COMPLETED**

**Sub-Team 1 (Backend/AI — Reem, Yousef, Mohamed):**
- [x] Analyzed all AI dependencies across the entire codebase
- [x] Created `UnifiedRiskEngine` (`backend/app/services/unified_risk_engine.py`):
  - Deterministic **Risk Score** (0–100): CVSS weights × asset criticality multiplier
  - SME-friendly **Health Score** (100–0): deductions for critical/high vulns & risky open ports
  - Auto-generates `ActionItem` tasks: REMEDIATION (critical/high), REVIEW (medium), CONFIGURATION (dangerous ports)
- [x] Refactored `AgentOrchestrator`:
  - Added **rule-based tool chaining**: Nmap ports → Nuclei (web), SMB scan (port 445)
  - Replaced AI-based `ValidationAgent` with **confidence-score filtering** (≥ 0.6)
  - Integrated `UnifiedRiskEngine` for scoring after scan completes
- [x] Refactored `IntelligenceAgent` to **advisory-only** role:
  - New SME prompt: `risk_explanation`, `business_impact`, `remediation_advice`, `response_priority`
  - Upgraded from deprecated `gemini-pro` → `gemini-1.5-flash`
  - Added API key guard (system works without Gemini key using fallback responses)
- [x] **Bug Fixes:** `vuln.severity.value.upper()` (Enum fix), model guard in `analyze_asset()`
- [x] Deleted redundant `app/core/risk_engine.py` and `app/services/risk_engine.py`

**Sub-Team 2 (Frontend — Marize, Omnia, Mazin):**
- [x] Updated `NetworkTopology.jsx` hover tooltip: shows **Health Score** + AI **Expert Advice**
- [x] Updated `AssetDetailPanel.jsx`: renamed to "SME Security Advisor" section, displays `risk_explanation`, `business_impact`, `remediation_advice`, and color-coded `response_priority`
- [x] **Bug Fix:** Removed stray `recreation` text accidentally left in JSX markup

**Sub-Team 4 (DevOps/QA — Omar Kapil, Yosef, Omar Tarek):**
- [x] Updated `PROJECT_WORKFLOW_PRESENTATION.md` with new Mermaid architecture diagram + 9-step flow
- [x] Rewrote `TECHNICAL_DOCUMENTATION.md` with new backend architecture documentation
- [x] Updated `FOUND_404_PRESENTATION.md` Slides 4, 5, 8, 9 to reflect hybrid model
- [x] Updated `implementation_plan.md` to final state

---

## 📅 4-Month Timeline (16 Weeks)

### ═══════════════════════════════════
### 🟡 PHASE 1 — Foundation & Learning (Weeks 1–4)
### SDLC Stage: Requirements + Planning
### ═══════════════════════════════════

**Goal:** Every member understands their technology. No one is lost. Build the foundation.

| Week | All Teams | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|-----------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 1** | Project kickoff, Notion setup, repo clone, read all docs | Learn Python basics + FastAPI crash course | Learn React + Vite setup | Learn Linux CLI + run Nmap locally | Learn Docker basics, run the project locally |
| **Wk 2** | Architecture review session (Omar presents full codebase) | Learn PostgreSQL + SQLAlchemy, draw DB schema | Learn Tailwind CSS + component structure | Learn Nuclei, run first scan on lab | Understand docker-compose.yml, map all services |
| **Wk 3** | Tech deep-dives by sub-leaders (each sub-leader teaches own team) | Learn Celery + Redis, understand task queues | Learn D3.js basics, explore network graph code | Learn Wazuh, install + explore dashboard | Learn GitHub Actions, set up repo CI pipeline |
| **Wk 4** | **Phase 1 Demo:** Each sub-team presents what they learned | Build a Hello World FastAPI + DB endpoint | Build a Hello World React dashboard page | Run a full lab scan: Nmap → Nuclei | Write first automated test + document setup |

**📌 Deliverables (End of Week 4):**
- [x] All 11 members have dev environment running
- [x] Each sub-team has a learning demo ready (5-min presentation per team)
- [x] Notion workspace fully populated with tasks
- [x] GitHub repo forked and everyone has access

---

### ═══════════════════════════════════
### 🟠 PHASE 2 — Core Development (Weeks 5–9)
### SDLC Stage: Design + Implementation
### ═══════════════════════════════════

**Goal:** Each sub-team builds their module. Features are developed in isolation, ready for integration.

| Week | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 5** | ✅ Refactor/stabilize FastAPI endpoints; solidify DB models | Rebuild Dashboard page with real API data | Study scan pipeline code end-to-end | Set up test environment, write API test suite stubs |
| **Wk 6** | ✅ Refactor `AgentOrchestrator`: Rule-based chaining, fix types/slices | ✅ Updated Network Topology tooltip (Health Score + AI Advice) | Improve Nmap scanner: better OS detection, subnet handling | Run full docker-compose, document all service dependencies |
| **Wk 7** | ✅ Build `UnifiedRiskEngine`: Risk Score, Health Score, fixed math | ✅ Updated `AssetDetailPanel` to display SME security advice | Integrate Wazuh + Elasticsearch: live log ingestion | Write integration tests for Backend ↔ Scanner |
| **Wk 8** | ✅ Refactor `IntelligenceAgent` to advisory-only role (Gemini 1.5 Flash) | Connect every page to live API data | Set up n8n SOAR: build 1 remediation playbook (e.g., block IP) | Load test the backend + document performance benchmarks |
| **Wk 9** | ✅ **Phase 2 Complete:** Backend stabilized, unused files deleted | Ensure every page pulls live API data | SIEM data flows into dashboard UI | All tests passing, CI pipeline green |

**📌 Deliverables (End of Week 9):**
- [x] Full scan flow working: Nmap → Nuclei → Risk Engine → Dashboard display
- [x] AI advisory generates SME-friendly advice for top 3 critical assets
- [ ] Wazuh/Elasticsearch receiving and displaying live logs
- [ ] Automated test suite with ≥ 15 test cases
- [x] Docker Compose launches all services reliably

---

### ═══════════════════════════════════
### 🔴 PHASE 3 — Integration & Enhancement (Weeks 10–13)
### SDLC Stage: Testing + Enhancement
### ═══════════════════════════════════

**Goal:** All modules work together. Add polish, fix bugs, implement roadmap features.

| Week | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 10** | Implement RBAC (Role-based access: Admin/Analyst/Viewer) | Implement login/auth UI, protect routes | Harden virtual lab: add more vulnerable nodes | Full end-to-end test: scan → alert → playbook |
| **Wk 11** | Build PDF report export endpoint | Build PDF/Report export UI button | Add IDS alert simulation in Wazuh | User acceptance testing (UAT) session with all 11 members |
| **Wk 12** | API cleanup, error handling, logging | UI polish: animations, loading states, mobile responsiveness | TShark/Wireshark traffic capture integration | Security audit of the platform itself |
| **Wk 13** | Final bug fixes from UAT | Final UI fixes from UAT | Final security tool tuning | Full regression test suite, update documentation |

**📌 Deliverables (End of Week 13):**
- [ ] RBAC implemented and tested
- [ ] PDF export working
- [ ] Platform passes security self-audit
- [ ] All bugs from UAT resolved
- [ ] Complete API documentation (OpenAPI/Swagger)

---

### ═══════════════════════════════════
### 🟢 PHASE 4 — Presentation & Finalization (Weeks 14–16)
### SDLC Stage: Deployment + Maintenance
### ═══════════════════════════════════

**Goal:** Polish everything. Prepare a stunning, memorable university presentation.

| Week | All Teams | Key Activities |
|------|-----------|----------------|
| **Wk 14** | **Demo Preparation** | Record a 3–5 min demo video of the platform in action. Each sub-leader prepares their feature walkthrough segment. |
| **Wk 15** | **Dry Run Presentation** | Full team does a complete mock university presentation. Omar gives feedback. Sub-leaders finalize their slides. |
| **Wk 16** | **🎓 Final Presentation** | University presentation. Live demo on the lab environment. Each team presents their module. Q&A session. |

**📌 Deliverables (End of Week 16):**
- [ ] Final GitHub repository with clean README and documentation
- [ ] Demo video (3–5 mins)
- [ ] Presentation slides (one set, all sub-leaders contribute sections)
- [ ] Virtual lab running live during demo
- [ ] 🎓 **Project Submitted**

---

## 📊 Visual Timeline Summary

```
Month 1 (March)   | PHASE 1: Foundation & Learning
  Wk 1: Kickoff + Environment Setup
  Wk 2: Architecture Deep Dive
  Wk 3: Tech Deep Dives (sub-leaders teach)
  Wk 4: Phase 1 Learning Demo ★ COMPLETED

Month 2 (April)   | PHASE 2: Core Development (Part 1)
  Wk 5: Stabilize & Refactor ★ COMPLETED
  Wk 6: Core Feature Development ★ COMPLETED
  Wk 7: Advanced Features (UnifiedRiskEngine done) ★ COMPLETED
  Wk 8: AI Advisory (IntelligenceAgent refactored) ★ COMPLETED
  Wk 9: Integration Checkpoint & Cleanup ★ COMPLETED

Month 3 (May-Jun) | PHASE 3: Integration & Enhancement
  Wk 10: RBAC + System Hardening
  Wk 11: Export Features + UAT
  Wk 12: Polish & Traffic Analysis
  Wk 13: Final Bug Fixes

Month 4 (Jun-Jul) | PHASE 4: Presentation & Finalization
  Wk 14: Demo video + slide prep
  Wk 15: Dry run presentation
  Wk 16: 🎓 UNIVERSITY PRESENTATION
```

---

## 🏁 Sub-Leader Responsibilities

| Sub-Leader | Team | Responsibility |
|-----------|------|----------------|
| **Reem Amin** | Backend/AI | Daily standup for team, code reviews, unblock members, present backend at final demo |
| **Marize Ehap** | Frontend | Ensure UI consistency, review PRs, present frontend at final demo |
| **Shahd Paher** | Security | Manage lab environment, document all tool configs, present security features at final demo |
| **Omar Kapil** | DevOps/QA + ALL | Overall coordination, cross-team integration, CI pipeline, Notion management, final presentation lead |

---

## 📋 Weekly Rituals (Team Workflow)

| Ritual | Day | Duration | Who |
|--------|-----|----------|-----|
| **Weekly Kickoff** | Monday | 30 min | All 11 members |
| **Sub-team standup** | Daily | 10 min | Within each sub-team |
| **Integration sync** | Wednesday | 20 min | Sub-leaders + Omar |
| **Demo/Review** | Friday | 45 min | All 11 members |
| **Notion update** | Friday | 15 min | Each member updates their tasks |

---

## 🎯 Grading Distribution (Suggested)

| Component | Weight |
|-----------|--------|
| Working platform (live demo) | 40% |
| Code quality & documentation | 20% |
| Individual learning & contribution | 20% |
| Presentation quality | 10% |
| Testing & reliability | 10% |

---

## 🔗 Key Resources Per Team

### Sub-Team 1 (Backend/AI)
- FastAPI Docs: https://fastapi.tiangolo.com
- SQLAlchemy: https://docs.sqlalchemy.org
- Celery: https://docs.celeryq.dev
- Gemini API: https://ai.google.dev/gemini-api/docs

### Sub-Team 2 (Frontend)
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- D3.js: https://d3js.org
- Vite: https://vitejs.dev

### Sub-Team 3 (Security)
- Nmap Docs: https://nmap.org/book
- Nuclei: https://docs.projectdiscovery.io/tools/nuclei
- Wazuh: https://documentation.wazuh.com
- Elasticsearch: https://www.elastic.co/guide/en/elasticsearch/reference/current

### Sub-Team 4 (DevOps/QA)
- Docker Compose: https://docs.docker.com/compose
- GitHub Actions: https://docs.github.com/en/actions
- Pytest: https://docs.pytest.org
- Postman: https://learning.postman.com

---

*Last Updated: March 8, 2026 | Team Leader: Omar Kapil*
*Latest Sprint: Deterministic Orchestration + UnifiedRiskEngine + AI Advisory Refactor (March 2–8)*

---

## 📐 SDLC + Learning Integration Model

Each phase of the Software Development Life Cycle is augmented with a **Learning Sprint** before development begins. No one codes what they don't understand.

```
[ Learning Sprint ] → [ Build Sprint ] → [ Integration ] → [ Review & Demo ]
```

---

## 👥 Team Structure & Sub-Teams

### 🔷 Sub-Team 1: Backend & AI Core
**Sub-Leader: Reem Amin**
| # | Member | Role |
|---|--------|------|
| 1 | **Reem Amin** (Sub-Leader) | FastAPI, Database, Celery/Redis |
| 2 | **Yousef Abdel Hady** | AI Agent (Gemini), Risk Engine |
| 3 | **Mohamed Shaban** | Task Queue, Docker Orchestration |

**Technologies to Learn:** Python, FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis, Google Gemini API, Docker

---

### 🔷 Sub-Team 2: Frontend & Visualization
**Sub-Leader: Marize Ehap**
| # | Member | Role |
|---|--------|------|
| 4 | **Marize Ehap** (Sub-Leader) | React, Vite, Component Architecture |
| 5 | **Omnia Helmy** | D3.js, Network Topology Graph |
| 6 | **Mazin Alaa** | Tailwind CSS, Dashboard UI, UX |

**Technologies to Learn:** React, Vite, Tailwind CSS, D3.js, React Force Graph, Lucide Icons, REST API consumption

---

### 🔷 Sub-Team 3: Security & Scanning Engine
**Sub-Leader: Shahd Paher**
| # | Member | Role |
|---|--------|------|
| 7 | **Shahd Paher** (Sub-Leader) | Nmap, Nuclei, Scan Orchestration |
| 8 | **Rahma Ebraheam** | Wazuh (EDR), Elasticsearch, Kibana |

**Technologies to Learn:** Nmap, Nuclei, Wazuh, Elasticsearch, Kibana, Linux CLI, Docker Compose networking

---

### 🔷 Sub-Team 4: DevOps & Quality Assurance
**Sub-Leader: Omar Kapil** *(Team Leader — dual role)*
| # | Member | Role |
|---|--------|------|
| 9 | **Omar Kapil** (Sub-Leader + Team Leader) | Docker, CI/CD, Infrastructure, Overall Coordination |
| 10 | **Yosef Ali** | Testing (API, Integration, E2E) |
| 11 | **Omar Tarek** | Documentation, Demo, Presentation |

**Technologies to Learn:** Docker Compose, GitHub Actions, Pytest, Postman, Technical Writing, Presentation Design

---

## 📅 4-Month Timeline (16 Weeks)

### ═══════════════════════════════════
### 🟡 PHASE 1 — Foundation & Learning (Weeks 1–4)
### SDLC Stage: Requirements + Planning
### ═══════════════════════════════════

**Goal:** Every member understands their technology. No one is lost. Build the foundation.

| Week | All Teams | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|-----------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 1** | Project kickoff, Notion setup, repo clone, read all docs | Learn Python basics + FastAPI crash course | Learn React + Vite setup | Learn Linux CLI + run Nmap locally | Learn Docker basics, run the project locally |
| **Wk 2** | Architecture review session (Omar presents full codebase) | Learn PostgreSQL + SQLAlchemy, draw DB schema | Learn Tailwind CSS + component structure | Learn Nuclei, run first scan on lab | Understand docker-compose.yml, map all services |
| **Wk 3** | Tech deep-dives by sub-leaders (each sub-leader teaches own team) | Learn Celery + Redis, understand task queues | Learn D3.js basics, explore network graph code | Learn Wazuh, install + explore dashboard | Learn GitHub Actions, set up repo CI pipeline |
| **Wk 4** | **Phase 1 Demo:** Each sub-team presents what they learned | Build a Hello World FastAPI + DB endpoint | Build a Hello World React dashboard page | Run a full lab scan: Nmap → Nuclei | Write first automated test + document setup |

**📌 Deliverables (End of Week 4):**
- [ ] All 11 members have dev environment running
- [ ] Each sub-team has a learning demo ready (5-min presentation per team)
- [ ] Notion workspace fully populated with tasks
- [ ] GitHub repo forked and everyone has access

---

### ═══════════════════════════════════
### 🟠 PHASE 2 — Core Development (Weeks 5–9)
### SDLC Stage: Design + Implementation
### ═══════════════════════════════════

**Goal:** Each sub-team builds their module. Features are developed in isolation, ready for integration.

| Week | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 5** | Refactor/stabilize FastAPI endpoints; solidify DB models | Rebuild Dashboard page with real API data | Study scan pipeline code end-to-end | Set up test environment, write API test suite stubs |
| **Wk 6** | Implement/improve Gemini AI agent integration | Build Network Topology component cleanup + improvements | Improve Nmap scanner: better OS detection, subnet handling | Run full docker-compose, document all service dependencies |
| **Wk 7** | Build Risk Engine: scoring logic, CVE matching | Build Asset Detail Panel component (slide-out) | Integrate Wazuh + Elasticsearch: live log ingestion | Write integration tests for Backend ↔ Scanner |
| **Wk 8** | Connect Celery background tasks to scan pipeline | Build Real-Time Risk Score display component | Set up n8n SOAR: build 1 remediation playbook (e.g., block IP) | Load test the backend + document performance benchmarks |
| **Wk 9** | **Integration Checkpoint:** Backend ↔ Frontend ↔ Security connected | Ensure every page pulls live API data | SIEM data flows into dashboard UI | All tests passing, CI pipeline green |

**📌 Deliverables (End of Week 9):**
- [ ] Full scan flow working: Nmap → Nuclei → AI Analysis → Dashboard display
- [ ] All major UI components functional with real data
- [ ] Wazuh/Elasticsearch receiving and displaying live logs
- [ ] Automated test suite with ≥ 15 test cases
- [ ] Docker Compose launches all services reliably

---

### ═══════════════════════════════════
### 🔴 PHASE 3 — Integration & Enhancement (Weeks 10–13)
### SDLC Stage: Testing + Enhancement
### ═══════════════════════════════════

**Goal:** All modules work together. Add polish, fix bugs, implement roadmap features.

| Week | Sub-Team 1 (Backend/AI) | Sub-Team 2 (Frontend) | Sub-Team 3 (Security) | Sub-Team 4 (DevOps/QA) |
|------|--------------------------|------------------------|------------------------|-------------------------|
| **Wk 10** | Implement RBAC (Role-based access: Admin/Analyst/Viewer) | Implement login/auth UI, protect routes | Harden virtual lab: add more vulnerable nodes | Full end-to-end test: scan → alert → playbook |
| **Wk 11** | Build PDF report export endpoint | Build PDF/Report export UI button | Add IDS alert simulation in Wazuh | User acceptance testing (UAT) session with all 11 members |
| **Wk 12** | API cleanup, error handling, logging | UI polish: animations, loading states, mobile responsiveness | TShark/Wireshark traffic capture integration | Security audit of the platform itself |
| **Wk 13** | Final bug fixes from UAT | Final UI fixes from UAT | Final security tool tuning | Full regression test suite, update documentation |

**📌 Deliverables (End of Week 13):**
- [ ] RBAC implemented and tested
- [ ] PDF export working
- [ ] Platform passes security self-audit
- [ ] All bugs from UAT resolved
- [ ] Complete API documentation (OpenAPI/Swagger)

---

### ═══════════════════════════════════
### 🟢 PHASE 4 — Presentation & Finalization (Weeks 14–16)
### SDLC Stage: Deployment + Maintenance
### ═══════════════════════════════════

**Goal:** Polish everything. Prepare a stunning, memorable university presentation.

| Week | All Teams | Key Activities |
|------|-----------|----------------|
| **Wk 14** | **Demo Preparation** | Record a 3–5 min demo video of the platform in action. Each sub-leader prepares their feature walkthrough segment. |
| **Wk 15** | **Dry Run Presentation** | Full team does a complete mock university presentation. Omar gives feedback. Sub-leaders finalize their slides. |
| **Wk 16** | **🎓 Final Presentation** | University presentation. Live demo on the lab environment. Each team presents their module. Q&A session. |

**📌 Deliverables (End of Week 16):**
- [ ] Final GitHub repository with clean README and documentation
- [ ] Demo video (3–5 mins)
- [ ] Presentation slides (one set, all sub-leaders contribute sections)
- [ ] Virtual lab running live during demo
- [ ] 🎓 **Project Submitted**

---

## 📊 Visual Timeline Summary

```
Month 1 (March)   | PHASE 1: Foundation & Learning
  Wk 1: Kickoff + Environment Setup
  Wk 2: Architecture Deep Dive
  Wk 3: Tech Deep Dives (sub-leaders teach)
  Wk 4: Phase 1 Learning Demo

Month 2 (April)   | PHASE 2: Core Development (Part 1)
  Wk 5: Stabilize & Refactor
  Wk 6: Core Feature Development
  Wk 7: Advanced Features
  Wk 8: Performance & SOAR
  Wk 9: Integration Checkpoint ★

Month 3 (May-Jun) | PHASE 3: Integration & Enhancement
  Wk 10: RBAC + System Hardening
  Wk 11: Export Features + UAT
  Wk 12: Polish & Traffic Analysis
  Wk 13: Final Bug Fixes

Month 4 (Jun-Jul) | PHASE 4: Presentation & Finalization
  Wk 14: Demo video + slide prep
  Wk 15: Dry run presentation
  Wk 16: 🎓 UNIVERSITY PRESENTATION
```

---

## 🏁 Sub-Leader Responsibilities

| Sub-Leader | Team | Responsibility |
|-----------|------|----------------|
| **Reem Amin** | Backend/AI | Daily standup for team, code reviews, unblock members, present backend at final demo |
| **Marize Ehap** | Frontend | Ensure UI consistency, review PRs, present frontend at final demo |
| **Shahd Paher** | Security | Manage lab environment, document all tool configs, present security features at final demo |
| **Omar Kapil** | DevOps/QA + ALL | Overall coordination, cross-team integration, CI pipeline, Notion management, final presentation lead |

---

## 📋 Weekly Rituals (Team Workflow)

| Ritual | Day | Duration | Who |
|--------|-----|----------|-----|
| **Weekly Kickoff** | Monday | 30 min | All 11 members |
| **Sub-team standup** | Daily | 10 min | Within each sub-team |
| **Integration sync** | Wednesday | 20 min | Sub-leaders + Omar |
| **Demo/Review** | Friday | 45 min | All 11 members |
| **Notion update** | Friday | 15 min | Each member updates their tasks |

---

## 🎯 Grading Distribution (Suggested)

| Component | Weight |
|-----------|--------|
| Working platform (live demo) | 40% |
| Code quality & documentation | 20% |
| Individual learning & contribution | 20% |
| Presentation quality | 10% |
| Testing & reliability | 10% |

---

## 🔗 Key Resources Per Team

### Sub-Team 1 (Backend/AI)
- FastAPI Docs: https://fastapi.tiangolo.com
- SQLAlchemy: https://docs.sqlalchemy.org
- Celery: https://docs.celeryq.dev
- Gemini API: https://ai.google.dev/gemini-api/docs

### Sub-Team 2 (Frontend)
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- D3.js: https://d3js.org
- Vite: https://vitejs.dev

### Sub-Team 3 (Security)
- Nmap Docs: https://nmap.org/book
- Nuclei: https://docs.projectdiscovery.io/tools/nuclei
- Wazuh: https://documentation.wazuh.com
- Elasticsearch: https://www.elastic.co/guide/en/elasticsearch/reference/current

### Sub-Team 4 (DevOps/QA)
- Docker Compose: https://docs.docker.com/compose
- GitHub Actions: https://docs.github.com/en/actions
- Pytest: https://docs.pytest.org
- Postman: https://learning.postman.com

---

*Last Updated: March 2, 2026 | Team Leader: Omar*
