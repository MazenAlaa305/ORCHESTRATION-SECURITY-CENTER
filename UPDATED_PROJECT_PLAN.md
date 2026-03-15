# 🎓 found 404 — Master Development & Graduation Roadmap
## SME Security Orchestration Center | Team of 11 | Professional Graduation Path

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

## 👥 Team Structure & Sub-Teams

### 🔷 Sub-Team 1: Backend & AI Advisory
**Sub-Leader: Reem Amin**
| # | Member | Role |
|---|--------|------|
| 1 | **Reem Amin** (Sub-Leader) | FastAPI Endpoints, Schema Design, OpenVAS Integration |
| 2 | **Yousef Abdel Hady** | **UnifiedRiskEngine.py** (CVSS Logic) & Advisor Prompting |
| 3 | **Mohamed Shaban** | **AgentOrchestrator** (Deterministic Rule & Task Chaining) |

---

### 🔷 Sub-Team 2: Frontend & High-Density Visualization
**Sub-Leader: Marize Ehap**
| # | Member | Role |
|---|--------|------|
| 4 | **Rahma Epraheam** | React Component Architecture, State Management |
| 5 | **Omnia Helmy** (Sub-Leader) | **React-Force-Graph-2d** & Network Topology D3 Logic |
| 6 | **AI** | Tailwind CSS Design, Asset Detail Slide-outs, UX Polish |

---

### 🔷 Sub-Team 3: Security Ops & Scanning Engine
**Sub-Leader: Shahd Paher**
| # | Member | Role |
|---|--------|------|
| 7 | **Shahd Paher** (Sub-Leader) | Nmap Discovery scripts & Nuclei Template Orchestration |
| 8 | **Mariz Ehap ,Omar kapil** | Wazuh EDR Integration & Elasticsearch/Kibana SIEM Tuning |

---

### 🔷 Sub-Team 4: DevOps & Quality Assurance
**Sub-Leader: Omar Kapil** *(Team Leader)*
| # | Member | Role |
|---|--------|------|
| 9 | **Omar Kapil** (Sub-Leader) | Docker Orchestration, CI/CD, Infrastructure Hardening |
| 10 | **Yosef Ali , Mazin Alaa** | Testing (Pytest, Playwright), Integration Verification |
| 11 | **Omar Tarek** | Documentation, Academic Defense Design, Presentation |

---

## 📅 16-Week Implementation Roadmap

### 🟡 PHASE 1 — Foundation & Tech Sprints (Weeks 1–4)
*   **Wk 1-2:** Environment setup (Docker Compose), Repository cloning, and SDLC walkthrough.
*   **Wk 3-4:** Sub-team technical deep-dives (FastAPI, React-Force-Graph, Nmap advanced).
*   **Deliverable:** 11 healthy development environments + Integrated Dashboard Base.

### 🟠 PHASE 2 — Deterministic Core Development (Weeks 5–9)
*   **Wk 5-6:** Build the **Deterministic Workflow**. Mohamed (Back) & Shahd (Sec) map Nmap outputs to Nuclei inputs.
*   **Wk 7-8:** Implement **UnifiedRiskEngine.py**. Yousef (AI) builds the CVSS reduction logic for the **SME Health Score**.
*   **Wk 9:** Connect React-Force-Graph to real-time discovery events.
*   **Deliverable:** First "Start Scan" button success — Discovery to Dashboard.

### 🔴 PHASE 3 — Advisory AI & System Hardening (Weeks 10–13)
*   **Wk 10-11:** Integrate Gemini 1.5 Flash. AI takes deterministic JSON scores and generates "Risk Explanation" and "SME Remediation Advice."
*   **Wk 12:** Implement Wazuh log ingestion. Alerts show up on the Network Topology nodes.
*   **Wk 13:** PDF Report generation with correct Health Score grading ($A$-$F$).
*   **Deliverable:** Fully functional SIM/SOAR platform with automated advice.

### 🟢 PHASE 4 — Academic Defense & Finalization (Weeks 14–16)
*   **Wk 14:** **Efficiency Benchmark:** Measure time saved (Manual Scan vs Orchestrated) to prove SME business value.
*   **Wk 15:** Demo video production & Mock Presentation (Final Polish).
*   **Wk 16:** **🎓 MASTER GRADUATION DEFENSE.** 
*   **Deliverable:** Professional GitHub repo, Presentation Slides, and 5-min Demo.

---

## 🏁 Weekly Rituals
| Ritual | Day | Duration | Who |
|--------|-----|----------|-----|
| **Strategy Kickoff** | Monday | 30 min | Full Team |
| **Code Review** | Wednesday | 1 hour | Sub-Leaders |
| **Demo & Review** | Friday | 45 min | Full Team |

---
*Created by: Senior Cybersecurity PM & Solutions Architect*
*Last Update: March 15, 2026*
