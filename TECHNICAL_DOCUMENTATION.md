# found 404: The Absolute Master Manual

This is the definitive engineering manual for **found 404**. It covers everything from initial laboratory setup to an exhaustive line-by-line analysis of the core engine and visual orchestration logic.

---

## 🟢 Part 1: Laboratory Setup & Deployment

Before diving into the code, you must have the environment running. found 404 uses a containerized microservices architecture.

### 1. External Requirements
- **Docker & Docker Compose**: For container orchestration.
- **Python 3.10+**: For local script execution and backend development.
- **Node.js & NPM**: For the React frontend.
- **Gemini API Key** *(optional)*: Required for AI advisory features. The system runs fully without it using pre-configured fallback responses.

### 2. Step-by-Step Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/omarkapil/the-dashboard-project-.git
    cd the-dashboard-project-
    ```
2. **Launch Everything (One Command)**:
   ```bash
   docker-compose up -d --build
   ```
   *This automatically uses the pre-configured `.env` file, initializes the PostgreSQL database, Redis, Celery workers, and the FastAPI engine.*

3. **Open the Dashboard**:
   - Backend API: `http://localhost:8000`
   - Frontend: `http://localhost:5173`
   *(All services start automatically with the Docker command).*

---

## 🔵 Part 2: Backend Deep Dive (`/backend`)

### 📂 `app/main.py` — The Heartbeat
The server entry point that initializes the entire ecosystem.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 1 | `from fastapi import FastAPI` | Imports the asynchronous web framework. Unlike Flask, FastAPI uses `uvicorn` to handle thousands of concurrent security probes. |
| 5 | `from app.core.database import engine, Base` | Loads the SQLAlchemy engine. This is the bridge between Python and the PostgreSQL database. |
| 8 | `Base.metadata.create_all(bind=engine)` | **Database Migration**: This line automatically builds the tables. If you add a new field to `models/scan.py`, this command ensures the database updates on next boot. |
| 17 | `app.add_middleware(CORSMiddleware, ...)` | **Cross-Origin Security**: In development, your frontend (5173) and backend (8000) are on different "origins". This middleware allows them to speak to each other securely. |
| 25 | `app.include_router(api_router, ...)` | **Modular Routing**: Instead of one giant file, the API is split into folders. This line maps `/api/v1/scans` to the logic in `endpoints/scans.py`. |

---

### 📂 `app/services/scan_tasks.py` — The Executor
The background engine that physically "touches" the network.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 12 | `@celery_app.task(bind=True)` | **Distributed Computing**: This function is a Celery Task. It runs in its own process, meaning if a scan crashes, the main API stays online. |
| 48 | `results = scanner.scan_target(...)` | Calls the `NmapWrapper`. It performs a "Banner Grab" to see what software is running on open ports. |
| 122 | `from IntelligenceAgent...` | **Late Binding**: We import the AI agent here to avoid "Circular Import" errors where files try to load each other infinitely. |

---

### 📂 `app/services/agent_orchestrator.py` — The Deterministic Hub
This is where **found 404** orchestrates security tools with rule-based logic.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 19 | `from app.services.unified_risk_engine import UnifiedRiskEngine` | **Single Source of Truth**: All risk computation is done by the `UnifiedRiskEngine`. No AI is used for this. |
| 554 | `is_valid = finding.get("confidence", 0) >= 0.6` | **Deterministic Validation**: Replaces the old LLM-based false positive filter. Any finding with confidence ≥ 60% from a tool is considered valid. |
| 975-983 | `has_web = ...; has_smb = ...` | **Rule-Based Tool Chaining**: After Nmap, the code checks which ports are open and decides deterministically which next tools to run (e.g., Nuclei for web ports, SMB scans for port 445). |
| 1018-1020 | `risk_engine.update_scan_risk(...)` | **Scoring**: Calls the `UnifiedRiskEngine` to calculate both the Risk Score (0-100) and the SME-friendly Health Score. |
| 1022-1030 | `ai_agent.analyze_asset(...)` | **Advisory Trigger**: Only after all deterministic work is done, AI advice is generated for the top 3 assets. Wrapped in try/except so a failure here never blocks the scan. |

---

### 📂 `app/services/unified_risk_engine.py` — The Risk Arbiter *(NEW)*
The single service responsible for all deterministic risk and task logic.

| Method | Purpose |
| :--- | :--- |
| `calculate_scan_risk(scan)` | Returns 0-100 Risk Score based on CVSS severity weights × asset criticality multiplier. |
| `calculate_health_score(scan)` | Returns 100-0 Health Score. Starts at 100, deducts for critical/high/medium vulns and exposed dangerous ports. |
| `update_scan_risk(scan_id)` | Persists both scores to the `Scan` record in the database. |
| `generate_action_items(scan_id)` | Creates `ActionItem` tasks from HIGH/CRITICAL vulns (REMEDIATION), MEDIUM vulns (REVIEW), and dangerous open ports (CONFIGURATION). Deduplicates automatically. |

---

### 📂 `app/services/intelligence_agent.py` — The SME Security Advisor *(REFACTORED)*
The AI agent, now limited to a pure advisory role.

| Aspect | Detail |
| :--- | :--- |
| **Purpose** | Generate human-readable security advice for business owners, not technical validation. |
| **Model** | `gemini-1.5-flash` for fast, concise responses. |
| **Output Fields** | `risk_explanation`, `business_impact`, `remediation_advice`, `response_priority` |
| **Failure Safety** | Returns pre-defined fallback advice if API key is missing or Gemini is unavailable. Never crashes the scan pipeline. |

---

## 🟡 Part 3: Frontend & Visualization (`/frontend`)

### 📂 `src/pages/Dashboard.jsx` — The Command Center
The React controller for the entire User Experience.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 35 | `const checkScanStatus = async () => {...}` | **Real-Time Polling**: Since scans take time, the frontend "checks in" with the backend every 3 seconds to update the progress bars and maps. |
| 121 | `{isScanning && (...)}` | **Conditional UI**: Renders the "AI Brain" loading animation. This gives the user visual feedback that the agents are currently "thinking". |
| 156 | `<Tabs tabs={mainTabs} ... />` | **Dynamic Navigation**: Switches between the "Command Center" (overview), "Threat Center" (data), and "System" (settings) without refreshing the page. |

---

### 📂 `src/components/dashboard/NetworkTopology.jsx` — Visual Intelligence
The D3.js engine that draws the interactive node map.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 30 | `const transformDataToGraph = (assets) => {...}` | **Data Transformation**: Converts the SQL list of IP addresses into a "Graph Data Structure" (Nodes/Edges) that the physics engine can understand. |
| 91 | `const getNodeColor = (node) => {...}` | **Semantic Coloring**: An infected server (Red) is visually distinguished from a safe gateway (Blue), allowing for instant "At-a-glance" security assessment. |
| 163 | `nodeLabel={(node) => {...}}` | **Hybrid Tooltip**: Shows the deterministic **Health Score** alongside the AI-generated **Expert Advice** in the hover tooltip. |
| 203 | `const pulseSpeed = node.riskScore > 50 ? 5 : 2;` | **Micro-Interactions**: Dangerous nodes pulse faster. This follows "Human-Computer Interaction" (HCI) principles to create an urgent visual warning. |

### 📂 `src/components/dashboard/AssetDetailPanel.jsx` — The SME Advisor Panel
The side panel that opens when a user clicks on a network node.

| Section | Detail |
| :--- | :--- |
| **Identity** | Shows OS family, MAC address, and uptime. All from Nmap data (deterministic). |
| **SME Security Advisor** | Renders AI-generated `risk_explanation`, `business_impact`, and `remediation_advice` with color-coded priority. |
| **Open Ports** | Lists all detected services from the `AssetService` table (deterministic Nmap data). |
| **Vulnerabilities** | Shows vulnerability count and links to the full report for CVE details. |

---

## 🟠 Part 4: File Relationships & Data Flow

1.  **Request Flow**: `User (React)` -> `API (FastAPI)` -> `Broker (Redis)` -> `Worker (Celery)`.
2.  **Logic Flow**: `Worker` -> `AgentOrchestrator` -> `Tool Wrappers (Nmap/Nuclei/GVM)` -> `Storage (PostgreSQL)`.
3.  **Scoring Flow**: `Storage` -> `UnifiedRiskEngine` -> `Risk Score + Health Score + ActionItems`.
4.  **Advisory Flow**: `UnifiedRiskEngine` (top 3 assets only) -> `IntelligenceAgent (Gemini)` -> `ScanAsset.ai_insight`.
5.  **Monitoring Flow**: `Sensors (Wazuh)` -> `Alerting (Elasticsearch)` -> `Automation (n8n)`.

This unified system ensures that **found 404** isn't just a scanner—it's a reliable, deterministic security orchestration center that uses AI selectively to make findings understandable for business owners.

### 2. Step-by-Step Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/omarkapil/the-dashboard-project-.git
    cd the-dashboard-project-
    ```
2. **Launch Everything (One Command)**:
   ```bash
   docker-compose up -d --build
   ```
   *This automatically uses the pre-configured `.env` file, initializes the PostgreSQL database, Redis, Celery workers, and the FastAPI engine.*

3. **Open the Dashboard**:
   - Backend API: `http://localhost:8000`
   - Frontend: `http://localhost:5173`
   *(All services start automatically with the Docker command).*

---

## 🔵 Part 2: Backend Deep Dive (`/backend`)

### 📂 `app/main.py` — The Heartbeat
The server entry point that initializes the entire ecosystem.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 1 | `from fastapi import FastAPI` | Imports the asynchronous web framework. Unlike Flask, FastAPI uses `uvicorn` to handle thousands of concurrent security probes. |
| 5 | `from app.core.database import engine, Base` | Loads the SQLAlchemy engine. This is the bridge between Python and the PostgreSQL database. |
| 8 | `Base.metadata.create_all(bind=engine)` | **Database Migration**: This line automatically builds the tables. If you add a new field to `models/scan.py`, this command ensures the database updates on next boot. |
| 17 | `app.add_middleware(CORSMiddleware, ...)` | **Cross-Origin Security**: In development, your frontend (5173) and backend (8000) are on different "origins". This middleware allows them to speak to each other securely. |
| 25 | `app.include_router(api_router, ...)` | **Modular Routing**: Instead of one giant file, the API is split into folders. This line maps `/api/v1/scans` to the logic in `endpoints/scans.py`. |

---

### 📂 `app/services/scan_tasks.py` — The Executor
The background engine that physically "touches" the network.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 12 | `@celery_app.task(bind=True)` | **Distributed Computing**: This function is a Celery Task. It runs in its own process, meaning if a scan crashes, the main API stays online. |
| 48 | `results = scanner.scan_target(...)` | Calls the `NmapWrapper`. It performs a "Banner Grab" to see what software is running on open ports. |
| 122 | `from IntelligenceAgent...` | **Late Binding**: We import the AI agent here to avoid "Circular Import" errors where files try to load each other infinitely. |
| 176 | `scan.risk_score = min(100.0, ...)` | **The Final Verdict**: Calculates the 0-100 risk score. It uses the `RiskCalculator` but caps it at 100 to prevent math errors from overflowing the UI gauge. |

---

### 📂 `app/services/agent_orchestrator.py` — The Cognitive Hub
This is where **found 404** becomes "Agentic".

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 48 | `self.llm = genai.GenerativeModel(...)` | **Model Selection**: Attempts to use the latest `1.5-flash` for speed, falling back to `pro` for deeper reasoning if needed. |
| 55 | `log_entry = AgentLog(...)` | **The Black Box**: Every thought the AI has is saved to the DB. This allows for "Auditability" where you can see *why* the AI flagged something as a threat. |
| 141 | `try: from playwright.async_api...` | **Web Intelligence**: If the target has a web server, the AI launches a real Chrome instance to find login pages or sensitive PDF files hidden from standard scanners. |
| 624 | `prompt = f"Analyze this potential...` | **False Positive Filtering**: The AI looks at the raw scan evidence and uses its knowledge of CVEs to decide if a finding is real or just noise. |

---

## 🟡 Part 3: Frontend & Visualization (`/frontend`)

### 📂 `src/pages/Dashboard.jsx` — The Command Center
The React controller for the entire User Experience.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 35 | `const checkScanStatus = async () => {...}` | **Real-Time Polling**: Since scans take time, the frontend "checks in" with the backend every 3 seconds to update the progress bars and maps. |
| 121 | `{isScanning && (...)}` | **Conditional UI**: Renders the "AI Brain" loading animation. This gives the user visual feedback that the agents are currently "thinking". |
| 156 | `<Tabs tabs={mainTabs} ... />` | **Dynamic Navigation**: Switches between the "Command Center" (overview), "Threat Center" (data), and "System" (settings) without refreshing the page. |

---

### 📂 `src/components/dashboard/NetworkTopology.jsx` — Visual Intelligence
The D3.js engine that draws the interactive node map.

| Line | Code | Deep Explanation |
| :--- | :--- | :--- |
| 30 | `const transformDataToGraph = (assets) => {...}` | **Data Transformation**: Converts the SQL list of IP addresses into a "Graph Data Structure" (Nodes/Edges) that the physics engine can understand. |
| 91 | `const getNodeColor = (node) => {...}` | **Semantic Coloring**: An infected server (Red) is visually distinguished from a safe gateway (Blue), allowing for instant "At-a-glance" security assessment. |
| 189 | `for (let i = 0; i < 6; i++) { ... }` | **Low-Level Rendering**: Directly interacts with the GPU (via Canvas) to draw custom hexagonal "neon" frames around every discovered computer. |
| 203 | `const pulseSpeed = node.riskScore > 50 ? 5 : 2;` | **Micro-Interactions**: Dangerous nodes pulse faster. This follows "Human-Computer Interaction" (HCI) principles to create an urgent visual warning. |

---

## 🟠 Part 4: File Relationships & Data Flow

1.  **Request Flow**: `User (React)` -> `API (FastAPI)` -> `Broker (Redis)` -> `Worker (Celery)`.
2.  **Logic Flow**: `Worker` -> `Wrapper (Nmap/Nuclei)` -> `Storage (PostgreSQL)`.
3.  **Reasoning Flow**: `Storage` -> `Orchestrator (AI Agents)` -> `LLM (Gemini)` -> `Final Result (UI)`.
4.  **Monitoring Flow**: `Sensors (Wazuh)` -> `Alerting (Elasticsearch)` -> `Automation (n8n)`.

This unified system ensures that **found 404** isn't just a scanner—it's an autonomous, intelligent organism that detects, analyzes, and explains vulnerabilities in real-time.
