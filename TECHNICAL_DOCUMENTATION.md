# found 404: The Absolute Master Manual

This is the definitive engineering manual for **found 404**. It covers everything from initial laboratory setup to an exhaustive line-by-line analysis of the core engine and visual orchestration logic.

---

## 🟢 Part 1: Laboratory Setup & Deployment

Before diving into the code, you must have the environment running. found 404 uses a containerized microservices architecture.

### 1. External Requirements
- **Docker & Docker Compose**: For container orchestration.
- **Python 3.10+**: For local script execution and backend development.
- **Node.js & NPM**: For the React frontend.
- **Gemini Pro API Key**: Required for the AI reasoning engine.

### 2. Step-by-Step Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/omarkapil/the-dashboard-project-.git
    cd the-dashboard-project-
    ```
2. **Environment Configuration**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PROJECT_NAME="found 404"
   SECRET_KEY="your-super-secret-key"
   POSTGRES_SERVER=db
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=found404
   GEMINI_API_KEY="AIzaSy..." # Your Google AI Key
   ```
3. **Launch the Core Infrastructure**:
   ```bash
   docker-compose up -d --build
   ```
   *This starts PostgreSQL, Redis, the FastAPI Backend, and the Celery Worker.*

4. **Initialize the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

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
