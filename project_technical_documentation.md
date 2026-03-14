# found 404: Technical Documentation

## Executive Summary
This document provides a deep dive into the architecture, design decisions, and core systems behind **found 404**, a focused deterministic SME Security Orchestrator tailored for IT Administrators without dedicated SOC teams. The system is designed to provide automated external security analysis through deterministic rule chaining, combining port discovery (`Nmap`) with dynamic vulnerability scanning (`Nuclei`).

## System Architecture

### 1. The Core Application Stack
- **Framework:** FastAPI (Python 3.10+) 
- **Database:** PostgreSQL (via SQLAlchemy ORM)
- **Task Orchestration:** Celery + Redis (for background scan execution)
- **Asset/Recon Engines:** Custom Nmap Wrapper
- **Attack Engines:** Nuclei Wrapper
- **AI Advisory:** Google Gemini (1.5 Flash), limited to report summarization only.

---

## The Deterministic Orchestrator Pipeline

The core mechanism behind *found 404* is the **Agent Orchestrator** (`app.services.agent_orchestrator`). It is a strictly controlled four-stage pipeline:

### Stage 1: Reconnaissance (ReconAgent)
The application calls the `NmapWrapper` to scan the provided `Target_URL`. The resulting scan discovers hostnames, MAC addresses, operating systems, and, significantly, open ports and services spanning active network boundaries. The endpoints discovered heavily influence Stage 2. 

### Stage 2: Attack (AttackAgent)
The attack phase operates on **Deterministic Chaining**. Unlike brute-force methodologies that fire indiscriminately, *found 404* parses the extracted Nmap asset services.
- **Rule Example:** If Nmap detects `ssh` logic, the system targets only `tags:default-logins,misconfiguration`.
- **Rule Example:** If Nmap detects `http/https`, the system unleashes `tags:cve,exposures,misconfiguration`.

The orchestrator dynamically injects these scoped inputs into the `Nuclei` engine, heavily optimizing external attack traffic and reducing noise.

### Stage 3: Validation (ValidationAgent)
The outcomes generated from `Nuclei` run through confidence-based filters. The system calculates empirical severity metrics parsed from the CVE templates matching the vulnerabilities found. Information is stored contextually per asset, updating the SQL Database instances through strictly modeled relations.

### Stage 4: Reporting and Scoring (ReportingAgent)
With validated vulnerabilities mapped to specific network nodes, the **Unified Risk Engine** initializes.

---

## Unified Risk Engine (The Math Behind the Dashboard)

A raw list of CVEs does not provide prioritized actionable value. *found 404* employs a `UnifiedRiskEngine` (`app.services.unified_risk_engine`) to calculate the impact specific to the target node.

The Engine relies on four metrics:
1. **Severity Weights:** CRITICAL (25 points), HIGH (15 points), MEDIUM (7 points), LOW (2 points).
2. **Port Penalties:** Select critical ports actively exposed map flat score increases to the vulnerability. For example: RDP (Port 3389) or SMB (Port 445).
3. **Asset Criticality Context:** When a user sets an asset value to `CRITICAL` via the dashboard, penalties are multiplied by `1.5x`.
4. **Exposure Modifiers:** Internal RFC1918 addresses trigger an underlying `0.6x` modifier, automatically scaling back false panics for non-public threats.

These metrics compile to output two variables: Data-stored `risk_score` (100 = Maximum Risk) and a translated front-end `health_score` (100 = Securely Protected).

---

## Database Schemas Overview

The SQLAlchemy models mapping to Postgres tables dictate the strict storage structure.

- **`Scan`:** Core Table. Tracks metadata regarding the scan execution and associated unified risk score.
- **`Target`:** Tied to Scans via Target relationships. Maintains business context like "Asset Criticality".
- **`ScanAsset` & `AssetService`:** Stores Nmap extraction rules. Tracks exactly which services run on which IP, enforcing historic network changes.
- **`Vulnerability`:** Direct linking of Nuclei findings appended to specific `ScanAssets`. Contains PoC (Proof-of-Concept) scripts. 
- **`AgentLogs`:** Emits transparent orchestration reasoning from the execution stages to track the automated system choices dynamically.

---

## Future Enhancements
- Deploy customized internal `Nuclei` templates tailored uniquely to identified SME attack trends.
- Expand React/D3.js integration to visually draw node boundaries representing `Exposure Modifiers` directly on the command screen topology. 
