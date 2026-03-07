# found 404: Technical Deep-Dive & Documentation

## 1. Project Overview
**found 404** is an autonomous, agentic security intelligence platform. Unlike traditional vulnerability scanners that simply list bugs, found 404 uses **AI Reasoning (Gemini Pro)** and **Neural Topology Visualization** to understand network relationships and identify critical risk paths.

### Core Philosophy
- **Agentic Workflow**: Specialized AI agents (Intelligence, Risk, SOAR) collaborate to analyze threats.
- **Visual Intelligence**: Real-time D3-powered hexagonal topology maps the attack surface.
- **Simulation First**: Includes a built-in virtual corporate lab for safe security testing.

---

## 2. Infrastructure Setup Guide

### System Requirements
- **Docker & Docker Compose** (Required)
- **Python 3.10+** (For local development)
- **Node.js 18+** (For frontend development)
- **Gemini API Key** (Required for AI features)

### Step-by-Step Installation

#### 1. Repository Setup
```bash
git clone https://github.com/omarkapil/the-dashboard-project-.git
cd the-dashboard-project-
```

#### 2. Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_actual_key_here
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=dashboard_db
```

#### 3. Core Platform Deployment
Launch the backend api, database, redis, and frontend:
```bash
docker-compose up -d --build
```

#### 4. Virtual Lab Setup (Optional)
To deploy the 5-node simulated network (Gateway, Windows PC, Linux Servers, Redis):
```bash
docker-compose -f docker-compose.lab.yml up -d
```

#### 5. Verification
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Backend Architecture Deep-Dive (`/backend`)

The backend is built with **FastAPI**, an asynchronous Python framework designed for high-performance API development.

### 📁 Core Structure Analysis

#### `app/main.py` — The Engine Starter
This file initializes the FastAPI application.
- **Line 8**: `Base.metadata.create_all` — Automatically builds database tables on startup.
- **Lines 16-23**: `CORSMiddleware` — Crucial for allowing the React frontend (running on port 5173) to communicate with the API (port 8000).
- **Line 25**: Includes the central `api_router`.

#### `app/core/` — The System Brain
- **`config.py`**: Uses `pydantic-settings` to manage environment variables safely.
- **`database.py`**: Manages the SQLAlchemy connection pool. `get_db()` is a generator that ensures every request gets a fresh database session and closes it afterward.
- **`risk_engine.py`**: The logic center that calculates "Risk Scores". It weights vulnerabilities based on severity (Critical=10, High=5) and asset importance.
- **`celery_app.py`**: Configures background task processing using Redis. This allows "Long Scans" to run without freezing the API.

#### `app/models/` — Data Blueprint
- **`scan.py`**: Defines the database schema.
    - `Target`: Stores host metadata.
    - `Scan`: Tracks scan sessions and status (`RUNNING`, `COMPLETED`).
    - `Vulnerability`: Stores Nuclei/OpenVAS findings with AI-generated simplified descriptions.

#### `app/services/` — The Execution Layer
- **`agent_orchestrator.py`**: Manages the AI agent's "Thinking Process".
- **`ai_advisor.py`**: Interfaces with Google Gemini to "reason" through technical findings.
- **`nmap_wrapper.py`**: Executes network discovery and service fingerprinting.
- **`nuclei_wrapper.py`**: Orchestrates deep vulnerability scanning using templates.

---

## 4. Frontend Architecture Deep-Dive (`/frontend`)

The frontend is a **React** application built with **Vite** and styled using **Tailwind CSS**.

### 📁 UI Logic Analysis

#### `index.html` & `main.jsx` — Entry Points
The application is a Single Page Application (SPA). `main.jsx` renders the `<App />` component into the `root` div defined in `index.html`.

#### `src/pages/Dashboard.jsx` — The Command Center
This is the most complex file in the frontend.
- **State Management**: Tracks `activeTab`, `isScanning`, and `latestScan`.
- **Polling Logic**: Uses `useEffect` to check the backend every 3 seconds during a scan to provide "Live" updates to the user.
- **Tabbed Interface**: Dynamically renders components like `NetworkTopology` or `VulnerabilitiesPanel` based on the user's selection.

#### `src/components/dashboard/` — Specialized Widgets
- **`NetworkTopology.jsx`**: Uses **D3.js** and **React Force Graph** to draw the hexagonal network map. It creates a physical simulation where nodes attract/repel each other.
- **`RiskScore.jsx`**: An SVG-based animated gauge that visually represents the overall security posture (A to F).
- **`ActionCenter.jsx`**: Translates complex technical risks into a "To-Do" list for security administrators.

#### `src/services/api.js` — Communication Bridge
Centralized **Axios** instance. It handles all HTTP calls to the backend. If you need to change the Backend URL, this is the only file you modify.

---

## 5. Operational Workflow

1. **Discovery Phase**: User inputs a CIDR (e.g., `172.18.0.0/24`). `nmap_wrapper.py` identifies live hosts.
2. **Analysis Phase**: `nuclei_wrapper.py` probes services for vulnerabilities.
3. **Reasoning Phase**: Gemini AI analyzes raw logs, removes false positives, and writes "Simplified Explanations".
4. **Synthesis Phase**: `risk_engine.py` calculates scores and populates the `ActionCenter` for the user.
5. **Visualization Phase**: Frontend fetches the updated data and renders the `NetworkTopology` map.
