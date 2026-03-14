# 🎯 Found 404: Target Range Operations Manual

Welcome to the **Found 404** Target Range. This lab environment is a self-contained, deterministic simulation of a Small-to-Medium Enterprise (SME) network specifically designed to test the Orchestrator's 4-stage pipeline: **Recon \u2192 Targeted Chaining \u2192 Validation \u2192 Risk Scoring**.

By abstracting away the noise, Found 404 serves as a massive **Efficiency Multiplier**, reducing alert fatigue and enabling IT admins to focus directly on actionable remediations rather than sifting through thousands of raw vulnerability logs.

---

## \ud83c\udf10 Environment Overview

The lab utilizes a **Multi-Subnet Architecture** containing 4 specifically engineered personas simulating common SME weaknesses:

| Subnet | Persona | Internal Service | Vulnerability Profile | Target Risk |
| :--- | :--- | :--- | :--- | :--- |
| `frontend-dmz` | **The Broken Web App** | OWASP Juice Shop (`:3000`) | BOLA, SQL Injection (Targeted web chaining) | **9.5 (Critical)** |
| `frontend-dmz` | **The API Gateway** | Legacy REST API (`:8081`) | Information Disclosure (Verbose Headers/Swagger) | **6.0 (Medium)** |
| `internal-srv` | **Misconfigured Infra** | Corporate Samba (`1139`,`4445`) | Exposed SMB, Default Admin (`admin:admin123`) | **8.0 (High)** |
| `data-vault` | **The Shadow IT Asset** | Forgotten Redis (`:63790`) | Non-standard port, Unauthenticated Database | **8.5 (High)** |

---

## \u2699\ufe0f Prerequisites

Before deploying the Target Range, ensure the host machine has the following dependencies initialized:
* **Docker & Docker Compose v2:** To virtualize the multi-subnet personas.
* **PowerShell (v5.1+):** For executing the automated `lab_setup.ps1` lifecycle script.
* **Python (3.9+):** Required to run the core `AgentOrchestrator` microservices.
* **Found 404 Infrastructure:** The main project dependencies (PostgreSQL, Redis, Celery, and the Orchestrator) must be running to process lab telemetry.

---

## \ud83d\ude80 The "Zero-to-Hero" Workflow

### Phase 1: Bootstrapping the Environment
Launch the isolated lab components using the included Compose configuration.

```bash
# 1. Start the main Found 404 pipeline (Redis, DB, Backend, Celery, Frontend)
docker-compose up -d

# 2. Start the Target Range in its isolated networks
docker-compose -f docker-compose.lab.yml up -d
```

*Optional Automation:* You can also utilize the provided PowerShell script to manage the lifecycle:
```powershell
.\scripts\lab_setup.ps1 -Action Start -Mode Full
```

### Phase 2: Target Seeding
With the containers running, you must inform Found 404's Orchestrator that these targets exist. The setup script or manual API calls will register the URIs into the PostgreSQL database.

```bash
# Example API Seeding Payload
curl -X POST http://localhost:8000/api/v1/assets \
  -H "Content-Type: application/json" \
  -d '{"name": "Shadow DB", "ip_address": "lab_shadow_asset", "port": 63790}'
```

### Phase 3: The Scan Lifecycle
Once seeded, navigate to the Dashboard UI (`http://localhost:5173`) to initiate the scan.

1. **User Action:** Click "Initiate Orchestrated Scan" in the React UI.
2. **Message Broker:** The request is queued via **Redis/Celery** to prevent locking the UI.
3. **Execution:** The `AgentOrchestrator` consumes the job:
   - **ReconAgent:** Nmap identifies open ports (`3000`, `8081`, `4445`, `63790`).
   - **ChainingAgent:** Nuclei maps templates to the discovered ports.
   - **ValidationAgent:** Custom scripts actively exploit safely to confirm false-negative reduction.
   - **UnifiedRiskEngine:** Calculates the business impact score.

---

## \ud83d\udcca Interpreting Results

### The D3.js Network Graph
The React frontend utilizes a D3.js graph to map the attack surface visually:
* **Nodes** represent the discovered assets (e.g., `lab_misconfig_infra`).
* **Edges** represent the detected pathways (e.g., `Port 445 -> SMB Protocol`).
* **Color Coding** natively indicates status (Red = Validated Vuln, Gray = Port Open/No Vuln).

### The Unified Risk Engine (0-100)
Found 404 translates raw CVSS scores into contextual **Business Risk**:
* **0-39 (Low):** Informational headers. No immediate action required.
* **40-69 (Medium):** e.g., The API Gateway (6.0 / 60). Information disclosure that aids attackers but doesn't instantly compromise the host.
* **70-89 (High):** e.g., Shadow IT (8.5 / 85). Direct threat requiring scheduling remediation.
* **90-100 (Critical):** e.g., Broken Web App (9.5 / 95). Active exploit path (BOLA). Page the on-call engineer.

---

## \ud83d\udd0d Use Case Walkthrough: Deterministic Chaining

To understand how Found 404 eliminates **Alert Fatigue**, observe the **Corporate Samba (Port 445)** attack path:

1. **Discovery:** The ReconAgent finds port `445` mapped on `lab_misconfig_infra`.
2. **Contextual Mapping:** The ChainingAgent ignores web vulnerabilities and specifically queries Nuclei for `smb-enum` and `default-login` templates.
3. **Deterministic Validation:** Instead of just warning "SMB is open", the ValidationAgent actively attempts a login using `admin:admin123`.
4. **Action Item Generation:** The login succeeds. The UnifiedRiskEngine scores it an **8.0** and outputs a pre-written remediation step:
   > *"Disable guest/anonymous SMB shares and enforce strong passwords for admin accounts on the Corporate Router."*

By validating the chain, Found 404 confirmed a theoretical risk into a concrete, prioritized action item—saving the IT administrator hours of manual verification.
