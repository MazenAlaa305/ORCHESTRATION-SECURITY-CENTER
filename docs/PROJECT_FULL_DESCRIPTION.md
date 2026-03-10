# Found 404: The Intelligent Security Orchestration Center

## 1. Project Overview: The "Security Conductor"
**Found 404** is an autonomous cybersecurity platform designed to act as an **Orchestration Center**. It moves beyond fragmented security tools (Nmap, Nuclei, OpenVAS, etc.) by unifying them into a single, intelligent "Brain" that reasons through threats and orchestrates professional-grade responses.

### The Problem it Solves
In modern cybersecurity, analysts suffer from **alert fatigue**. They have to jump between dozen of different tabs, manually correlate logs, and try to understand what is a real threat and what is noise. Found 404 automates this "mundane" work, allowing human defenders to focus on strategic decisions.

---

## 2. Core Architecture: Hub-and-Spoke
The system is built on a containerized microservices architecture:
- **FastAPI Gateway:** The central nervous system for API requests.
- **Redis/Celery Queue:** Handles heavy background scanning tasks without slowing down the UI.
- **UnifiedRiskEngine (Deterministic):** A reliable core that calculates risk and health scores based on CVSS data and asset criticality (zero AI needed for this part, ensuring high reliability).
- **Gemini AI (Advisory):** Provides human-readable, expert security advice *after* the heavy lifting is done by the deterministic engine.
- **PostgreSQL Database:** Maintains the state of all discovered assets, scans, and reported vulnerabilities.

---

## 3. The Security Lifecycle
Found 404 follows a logical, automated flow from discovery to remediation:
1.  **Autonomous Asset Discovery:** Uses Nmap to map "Shadow IT" and fingerprint OS/Services.
2.  **Intelligent Tool Chaining:** If a web server is found (Port 80/443), it automatically triggers **Nuclei** for web vulnerabilities. If a standard server is found, it uses **OpenVAS (GVM)** for deep scanning.
3.  **Deterministic Scoring:** The UnifiedRiskEngine computes:
    - **Risk Score (0-100):** How dangerous the asset is.
    - **Health Score (100-0):** How secure the asset remains.
4.  **AI Advisory Role:** Gemini AI analyzes the findings to explain:
    - *Why is this dangerous?*
    - *What is the business impact?*
    - *Expert remediation advice.*
5.  **Visual Orchestration:** Assets are displayed on a **D3.js Topology Map** where nodes pulse and change color based on their real-time health status.

---

## 4. Key Components & Technologies
- **Backend:** Python (FastAPI), Celery, Redis, PostgreSQL, SQLAlchemy.
- **Frontend:** React, D3.js (for high-performance hex-grid topology), TailwindCSS.
- **Security Engines:** Nmap (Discovery), Nuclei (Web), GVM/OpenVAS (Heavy Scanning), Wazuh (Log Monitoring).
- **AI Integration:** Google Gemini 1.5 Flash for rapid security advisory.

---

## 5. Unique Value Proposition
- **Unification:** Replaces 10+ separate tools with one professional dashboard.
- **Speed:** Reduces detection-to-remediation time from hours to seconds.
- **Reduced Alert Fatigue:** Deduplicates findings and prioritizes them into meaningful "Tasks" (Remediation, Review, Configuration).
- **Accessibility:** Sophisticated security data is presented in a way that even a non-technical manager can understand.
