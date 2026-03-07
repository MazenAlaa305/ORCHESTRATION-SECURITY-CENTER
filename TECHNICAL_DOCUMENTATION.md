# found 404: The Absolute Engineering Manual

This document is an exhaustive, line-by-line breakdown of the **found 404** security intelligence platform. It explains the purpose of every file, how they interact, and exactly what every line of code does.

---

## 1. Project Anatomy (The Big Picture)

The system is split into two hemispheres:
1. **The Backend (Brain)**: A FastAPI server that orchestrates AI agents, background scans, and the SOAR system.
2. **The Frontend (Central Command)**: A React/Vite dashboard that visualizes network data using D3.js and communicates with the backend via Axios.

---

## 2. Infrastructure Setup (Quick Startup)

*Refer to the previous section for setup steps: Clone, Env Config, Docker Up.*

---

## 3. Backend Deep Dive (`/backend`)

### 📂 `app/main.py` — The Entry Gate
This is the "First Boot" file.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 1 | `from fastapi import FastAPI` | Imports the core web framework. |
| 5 | `from app.core.database import engine, Base` | Gets the DB engine to build tables. |
| 8 | `Base.metadata.create_all(bind=engine)` | **The Magic Line**: Scans all Python classes in `models/` and physically builds the SQL tables (Scans, Vulns, etc.) if they don't exist. |
| 10 | `app = FastAPI(...)` | Creates the actual server instance. |
| 17 | `app.add_middleware(CORSMiddleware, ...)` | **Gatekeeper**: Explicitly allows the Frontend (port 5173) to send requests to the API. Without this, browsers would block all communication. |
| 25 | `app.include_router(api_router, ...)` | Registers all the "Rooms" (URLs) in the API (e.g., `/scans`, `/targets`). |

---

### 📂 `app/services/scan_tasks.py` — The Orchestrator
This file handles the logic of a background scan. It is executed by **Celery**, not the main API.

**How it works with other files**:
- Triggered by `api/v1/endpoints/scans.py`.
- Uses `services/nmap_wrapper.py` for discovery.
- Uses `services/nuclei_wrapper.py` for vulnerability testing.
- Uses `services/risk_engine.py` to calculate the final health score.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 12 | `@celery_app.task(bind=True)` | Declares this function as a "Background Worker Task". It doesn't use the user's CPU; it runs as an independent worker. |
| 23 | `scan.status = ScanStatus.RUNNING` | Updates the DB so the Frontend "Live Indicator" turns green. |
| 48 | `results = scanner.scan_target(...)` | Calls the `NmapWrapper` to scan the network. |
| 81 | `service = AssetService(...)` | **Persistence**: Takes raw Nmap data and maps it to a database structure so it can be queried later. |
| 122 | `from app.services.intelligence_agent import IntelligenceAgent` | **Dynamic Import**: Loads the AI "Mind" to analyze the discovery results. |
| 168 | `target_obj = db.query(Target)...` | **Contextual Awareness**: Checks if this target is marked as "Critical" (e.g., a DB) to double the risk penalties. |

---

### 📂 `app/services/agent_orchestrator.py` — The AI Mind
The most advanced file in the system. It manages the multi-agent AI system.

**Relationships**:
- **Parent**: `ScanManager`.
- **Children**: `ReconAgent`, `AttackAgent`, `ValidationAgent`.
- **Brain**: `Google Gemini API`.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 34 | `class BaseAgent(ABC):` | **Blueprint**: An abstract class that ensures every agent (Recon, Attack, etc.) has a name, a log system, and an `execute` method. |
| 55 | `log_entry = AgentLog(...)` | **Traceability**: Every time an AI "thinks," it is recorded here, which is what you see in the "Agent Console" in the UI. |
| 72 | `response = self.llm.generate_content(prompt)` | **The Core Call**: Physically sends the security data to Gemini and retrieves a reasoning response. |
| 144 | `async with async_playwright() as p:` | **Sophisticated Recon**: Uses a "Headless Browser" (Chrome with no screen) to visit the target website and find hidden links/forms just like a human would. |
| 283 | `self.payloads = {...}` | **Arsenal**: Contains the "Ammunition" for testing (SQLi, XSS strings). |
| 624 | `prompt = f"Analyze this potential...` | **Validation Logic**: Instead of blindly trusting a scanner, the system asks Gemini: "Does this look like a real bug or a mistake?" |

---

### 📂 `app/services/risk_engine.py` — The Judge
Calculates the final score that you see on the dashboard gauge.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 5 | `class RiskCalculator:` | The mathematical logic for security. |
| 16 | `HIGH_RISK_PORTS = [21, 23, 445...]` | **Blacklist**: If a node has these ports open, they are flagged as dangerous automatically. |
| 32 | `score -= 20` | Significant penalty for "Critical" bugs found by Nuclei. |
| 47 | `score = 90` | **The Ceiling**: If any bug exists, the grade can never be a perfect "100" or "A+". |
| 71 | `title: f"Disable Telnet on {ip}"` | **Action Logic**: Turns a "Port 23" finding into a human-readable "Disable Telnet" command. |

---

## 4. Frontend Deep Dive (`/frontend`)

### 📂 `src/pages/Dashboard.jsx` — Central Intelligence
The primary interface file. Every widget you see is controlled by this "Manager".

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 24 | `const [activeTab, setActiveTab] = useState('overview');` | **State Control**: Tracks which tab (Command Center vs. Threat Center) the user is currently looking at. |
| 35 | `const checkScanStatus = async () => {...}` | **Polling Logic**: Every 3 seconds, it "pings" the API to check if a scan is finished. |
| 52 | `setActiveTab('threat-center');` | **Automation**: When a scan finishes, the UI automatically "jumps" to the results screen to show the user the data. |
| 121 | `{isScanning && (...)}` | **Conditional Rendering**: Only shows the "Orchestrating Nodes" animation if the back-end says a scan is active. |

---

### 📂 `src/components/dashboard/NetworkTopology.jsx` — Neural Mapping
One of the most complex UI files. It creates the interactive network graph.

**Relationships**:
- Fetches data from `services/api.js`.
- Renders icons based on `device_type` from `ScanAsset` model.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 2 | `import ForceGraph2D from 'react-force-graph-2d';` | Imports the D3 engine for physics-based rendering. |
| 30 | `const transformDataToGraph = (assets) => {...}` | **Data Mapping**: Translates raw JSON list of IPs into "Nodes" and "Links" for the graph. |
| 91 | `const getNodeColor = (node) => {...}` | **Visual Logic**: Assigns colors (Red, Orange, Green) based on the `risk_score` received from the Backend Judge. |
| 160 | `<ForceGraph2D ref={fgRef} ... />` | **The Canvas**: Renders the actual interactive graph. |
| 189 | `for (let i = 0; i < 6; i++) { ... }` | **Custom Geometry**: Manually draws the "Hexagonal Neon Frames" around every node using HTML5 Canvas coordinates. |
| 203 | `const pulseSpeed = node.riskScore > 50 ? 5 : 2;` | **Dynamic Animation**: If a node is dangerous, the neon ring pulses FASTER to grab the user's attention. |

---

### 📂 `src/services/api.js` — The Nerve System
Every single data request leaves from here.

| Line | Code | Explanation |
| :--- | :--- | :--- |
| 398 | `import axios from 'axios';` | The standard library for HTTP communication. |
| 403 | `baseURL: API_URL` | **Global Address**: Points the frontend to `localhost:8000`. If you host this on a server, you only change this line. |
| 431 | `getScanDetails: (id) => api.get(...)` | Wraps complex API calls into simple JavaScript functions. |

---

## 5. Summary of Internal Interaction (How they play together)

1. **TRIGGER**: You click "Scan" in `Dashboard.jsx`.
2. **COMMUNICATION**: `api.js` sends a message to `api/endpoints/scans.py`.
3. **SCHEDULING**: `scans.py` puts a task in **Redis** and returns a `Scan ID` to React.
4. **EXECUTION**: `Celery Worker` picks up the task from `scan_tasks.py`.
5. **DISCOVERY**: `scan_tasks.py` runs `nmap_wrapper.py` and `nuclei_wrapper.py`.
6. **INTELLIGENCE**: `IntelligenceAgent` (via Gemini) analyzes results and updates `models/scan.py`.
7. **JUDGEMENT**: `risk_engine.py` calculates scores and generates `ActionItems`.
8. **VISUALIZATION**: `Dashboard.jsx` detects the scan is complete, fetches new data, and `NetworkTopology.jsx` draws the neon map.
