# Found 404 — Graduation Project Master Plan

> **Project:** Found 404 — Deterministic cybersecurity orchestration platform for SMEs
> **Start Date:** March 2, 2026 | **Deadline:** ~July 2, 2026 (16 weeks)
> **Team Size:** 11 members | **Team Leader:** Omar Kapil

---

## Team Structure

### Sub-Team 1 — Backend & AI Core
**Sub-Leader: Reem Amin**

| Member | Role |
|--------|------|
| Reem Amin (Sub-Leader) | FastAPI, Database, Celery/Redis |
| Yousef Abdel Hady | UnifiedRiskEngine, AI Advisory Agent |
| Mohamed Shaban | Task Queue, Docker Orchestration |

**Stack:** Python, FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis, Gemini API, Docker

---

### Sub-Team 2 — Frontend & Visualization
**Sub-Leader: Marize Ehap**

| Member | Role |
|--------|------|
| Marize Ehap (Sub-Leader) | React, Vite, Component Architecture |
| Omnia Helmy | D3.js, Network Topology Graph |
| Rahma Ebrahem | Tailwind CSS, Dashboard UI, UX |

**Stack:** React 18, Vite, Tailwind CSS, D3.js, React Force Graph, Recharts, Chart.js

---

### Sub-Team 3 — Security & Scanning Engine
**Sub-Leader: Shahd Paher**

| Member | Role |
|--------|------|
| Shahd Paher (Sub-Leader) | Nmap, Nuclei, Scan Orchestration |
| Mariz Ehap | Wazuh (EDR), Elasticsearch, Kibana |

**Stack:** Nmap, Nuclei, Wazuh, Elasticsearch, Kibana, OpenVAS, Docker networking

---

### Sub-Team 4 — DevOps & Quality Assurance
**Sub-Leader: Omar Kapil** *(Team Leader — dual role)*

| Member | Role |
|--------|------|
| Omar Kapil (Sub-Leader + Team Leader) | Docker, CI/CD, Infrastructure, Coordination |
| Yosef Ali & Mazin Alla | Testing (API, Integration, E2E) |
| Omar Tarek | Documentation, Demo, Presentation |

**Stack:** Docker Compose, GitHub Actions, Pytest, Postman

---

## SDLC Model

```
[ Learning Sprint ] → [ Build Sprint ] → [ Integration ] → [ Review & Demo ]
```

Each phase begins with a learning sprint before development starts. No team member codes what they don't understand.

---

## Sprint Log — Completed Work

### Phase 1 (Weeks 1–4): Foundation & Learning — COMPLETED

**Backend (Sub-Team 1):**
- [x] Analyzed all AI dependencies across the codebase
- [x] Created `UnifiedRiskEngine`: Risk Score (0–100) + Health Score + ActionItem generation
- [x] Refactored `AgentOrchestrator`: rule-based tool chaining, confidence-score filtering (≥ 0.6)
- [x] Refactored `IntelligenceAgent` to advisory-only role with Gemini 1.5 Flash
- [x] Fixed Enum bugs (`vuln.severity.value.upper()`), added API key guard
- [x] Deleted legacy `risk_engine.py` files

**Frontend (Sub-Team 2):**
- [x] Updated `NetworkTopology.jsx` hover tooltip (Health Score + AI Expert Advice)
- [x] Updated `AssetDetailPanel.jsx` to display `risk_explanation`, `business_impact`, `remediation_advice`, `response_priority`
- [x] Fixed JSX markup issues

**DevOps/QA (Sub-Team 4):**
- [x] All members have working dev environments
- [x] Docker Compose launches all services reliably
- [x] Repository organized, documentation cleaned up

---

### Phase 2 (Weeks 5–9): Core Development — COMPLETED

**Backend (Sub-Team 1):**
- [x] FastAPI endpoints stabilized and DB models finalized
- [x] `AgentOrchestrator` refactored: rule-based chaining working end-to-end
- [x] `UnifiedRiskEngine` fully implemented: Risk Score math correct
- [x] `IntelligenceAgent` advisory-only with Gemini 1.5 Flash
- [x] Backend stabilized, all unused legacy files deleted

**Frontend (Sub-Team 2):**
- [x] Network Topology tooltip with Health Score + AI advice
- [x] AssetDetailPanel wired to live API data
- [x] Dashboard pulls real API data

**Security (Sub-Team 3):**
- [x] Lab environment fully deployed with 4 target personas
- [x] Nmap→Nuclei pipeline working end-to-end on lab targets
- [x] Wazuh + Elasticsearch receiving log data from lab

**DevOps/QA (Sub-Team 4):**
- [x] Full docker-compose stack documented and stable
- [x] Lab lifecycle managed by `lab_setup.ps1`
- [x] Backend and frontend Dockerfiles verified

---

## Current Phase: Phase 3 — Integration & Enhancement (Weeks 10–13)

**Current Week:** Week 10 | **Phase Status:** IN PROGRESS

### Week 10 Targets

| Sub-Team | Task | Status |
|----------|------|--------|
| Backend | Implement RBAC (Admin/Analyst/Viewer roles) | Pending |
| Frontend | Login/auth UI, protected routes | Pending |
| Security | Add more vulnerable lab nodes, harden scenarios | Pending |
| DevOps/QA | Full end-to-end test: scan → alert → playbook | Pending |

### Week 11 Targets

| Sub-Team | Task | Status |
|----------|------|--------|
| Backend | Build PDF report export endpoint | Pending |
| Frontend | PDF/Report export UI button | Pending |
| Security | IDS alert simulation in Wazuh | Pending |
| DevOps/QA | User acceptance testing (UAT) with all 11 members | Pending |

### Week 12 Targets

| Sub-Team | Task | Status |
|----------|------|--------|
| Backend | API cleanup, error handling, structured logging | Pending |
| Frontend | UI polish: animations, loading states, mobile responsiveness | Pending |
| Security | Traffic capture integration (TShark/Wireshark) | Pending |
| DevOps/QA | Security audit of the platform itself | Pending |

### Week 13 Targets

| Sub-Team | Task | Status |
|----------|------|--------|
| All | Final bug fixes from UAT | Pending |
| All | Full regression test suite run | Pending |
| DevOps/QA | Complete documentation update | Pending |

### Phase 3 Deliverables Checklist

- [ ] RBAC implemented and tested
- [ ] PDF export working end-to-end
- [ ] Platform passes security self-audit
- [ ] All UAT bugs resolved
- [ ] Complete API documentation in Swagger
- [ ] ≥ 15 automated test cases passing

---

## Phase 4 — Presentation & Finalization (Weeks 14–16)

### Week 14: Demo Preparation

- [ ] Record 3–5 min demo video of the platform scanning the lab
- [ ] Each sub-leader prepares their feature walkthrough segment (5 min each)
- [ ] Demo script written and rehearsed

### Week 15: Dry Run Presentation

- [ ] Full team completes mock university presentation
- [ ] Omar collects feedback from each sub-leader
- [ ] Final slides locked in

### Week 16: University Presentation — July 2, 2026

- [ ] Final GitHub repository with clean structure
- [ ] Demo video finalized
- [ ] Presentation slides complete
- [ ] Virtual lab running live during demo
- [ ] Q&A preparation complete
- [ ] Project submitted

---

## Timeline Summary

```
March 2026    | PHASE 1: Foundation & Learning
  Wk 1–4: Setup, architecture deep-dives, learning demos
                                              ★ COMPLETED

April 2026    | PHASE 2: Core Development
  Wk 5–9: Backend stabilization, frontend wiring,
           lab deployment, scan pipeline working
                                              ★ COMPLETED

May–June 2026 | PHASE 3: Integration & Enhancement
  Wk 10: RBAC + System Hardening             ← CURRENT
  Wk 11: Export Features + UAT
  Wk 12: Polish & Traffic Analysis
  Wk 13: Final Bug Fixes

June–July 2026 | PHASE 4: Presentation & Finalization
  Wk 14: Demo video + slide prep
  Wk 15: Dry run presentation
  Wk 16: UNIVERSITY PRESENTATION (July 2, 2026)
```

---

## Sub-Leader Responsibilities

| Sub-Leader | Responsibility |
|-----------|----------------|
| Reem Amin | Backend team daily standup, code reviews, backend demo at final presentation |
| Marize Ehap | UI consistency reviews, frontend PRs, frontend demo at final presentation |
| Shahd Paher | Lab environment management, security tool configs, security demo at final presentation |
| Omar Kapil | Cross-team coordination, CI pipeline, Notion management, final presentation lead |

---

## Weekly Rituals

| Ritual | Day | Duration | Who |
|--------|-----|----------|-----|
| Weekly Kickoff | Monday | 30 min | All 11 |
| Sub-team standup | Daily | 10 min | Within sub-teams |
| Integration sync | Wednesday | 20 min | Sub-leaders + Omar |
| Demo/Review | Friday | 45 min | All 11 |
| Notion update | Friday | 15 min | Each member |

---

## Grading Breakdown

| Component | Weight |
|-----------|--------|
| Working platform (live demo) | 40% |
| Code quality & documentation | 20% |
| Individual learning & contribution | 20% |
| Presentation quality | 10% |
| Testing & reliability | 10% |

---

## Key Resources

### Sub-Team 1 (Backend/AI)
- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy: https://docs.sqlalchemy.org
- Celery: https://docs.celeryq.dev
- Gemini API: https://ai.google.dev/gemini-api/docs

### Sub-Team 2 (Frontend)
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- D3.js: https://d3js.org
- Vite: https://vitejs.dev

### Sub-Team 3 (Security)
- Nmap: https://nmap.org/book
- Nuclei: https://docs.projectdiscovery.io/tools/nuclei
- Wazuh: https://documentation.wazuh.com
- Elasticsearch: https://www.elastic.co/guide

### Sub-Team 4 (DevOps/QA)
- Docker Compose: https://docs.docker.com/compose
- GitHub Actions: https://docs.github.com/en/actions
- Pytest: https://docs.pytest.org
- Postman: https://learning.postman.com

---

*Last Updated: April 10, 2026 | Team Leader: Omar Kapil*
