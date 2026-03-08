# Found 404: The Intelligent Security Orchestration Center
*An Autonomous Platform for Unified Threat Management*

---

## Slide 1: Title Slide
**Title:** Found 404: The Intelligent Security Orchestration Center
**Tagline:** Moving from Fragmented Tools to Unified Autonomous Intelligence
**Project Area:** Cybersecurity / Graduation Project 2026
**Key Objective:** To present a system that doesn't just "detect" threats, but "reasons" through them and "orchestrates" a response.

---

## Slide 2: The Project Idea: The Security "Conductor"
**Concept:** Orchestration made simple for everyone.

**The "Orchestra" Analogy:**
Imagine a world-class orchestra. You have a **violinist** (Nmap), a **cellist** (OpenVAS), and a **pianist** (Wazuh). They are all talented, but without a **Conductor**, they are just individual noises.
- **The Musicians (Tools):** Each tool focuses on one specific thing (finding ports, finding vulnerabilities, or watching logs).
- **The Conductor (Found 404):** Our project is the Conductor. It doesn't replace the musicians; it makes them play together in harmony.
- **The Song (Intelligence):** Instead of giving you 1,000 separate notes (logs), Found 404 gives you a masterpiece (a single, clear security report).

**Simple Goal:** Make disparate security tools work together in a logical, professional, and autonomous flow that even a non-technical manager can understand.

---

## Slide 3: The Cybersecurity Fragmentation Crisis
**The Core Problem:** Too many alerts, not enough answers.

```mermaid
gantt
    title "The Security Analyst Fatigue Problem"
    dateFormat  X
    axisFormat %s
    section Daily Workflow
    "Siloed Tool Login"        :a1, 0, 10
    "Context Switching"        :a2, 10, 35
    "Manual Log Correlation"   :a3, 35, 70
    "False Positive Filtering" :a4, 70, 90
    "Actual Security Response" :crit, a5, 90, 100
```

- **90% of Time** is wasted jumping between tabs and trying to connect the dots.
- **Found 404 Philosophy:** Automate the mundane (tab switching, log merging) so humans can focus on the critical (strategic defense).

---

## Slide 4: The Orchestration Center Architecture
**The Hub-and-Spoke Model:** A deep dive into the engine.

```mermaid
flowchart TB
    subgraph "External Sensors (The Ears)"
        Wazuh["Wazuh Agent"]
        Network["Network Traffic"]
    end

    subgraph "Orchestration Core (The Brain)"
        direction TB
        Main["FastAPI Gateway"]
        Queue["Redis/Celery Queue"]
        RiskEng["UnifiedRiskEngine (Deterministic)"]
        DB[("PostgreSQL State")]
        AI["Gemini AI (Advisory Only)"]
    end

    subgraph "Active Scanners (The Hands)"
        Nmap["Nmap Discovery"]
        Nuclei["Nuclei (Web ports detected)"]
        GVM["OpenVAS Engine"]
    end

    Wazuh --> Main
    Main <--> Queue
    Queue --> Nmap
    Nmap -->|"Port 80/443?"| Nuclei
    Nmap & Nuclei & GVM --> RiskEng
    RiskEng -->|"Risk + Health Score + Tasks"| DB
    RiskEng -->|"Top 3 assets"| AI
    AI -->|"SME Advice"| DB
    DB --> Main
    Main --> UI["React Topology Dashboard"]
```

- **Deterministic Core:** Discovery, validation, and risk scoring require **zero AI** — they are reliable and fast.
- **AI Advisory:** AI is only called after scoring is done, to add human-friendly context.

---

## Slide 5: The Security Lifecycle (Hybrid Model)
**The Logic Flow:** From unknown asset to actionable report.

```mermaid
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant S as Scanners (Nmap/Nuclei/GVM)
    participant E as UnifiedRiskEngine
    participant AI as Gemini AI (Advisory)
    participant R as Task Manager

    U->>O: Enter CIDR / Domain
    O->>S: Launch Network Discovery (Nmap)
    S-->>O: Open Ports + OS Fingerprint
    Note over O: Port 80 found → trigger Nuclei<br/>Port 445 found → trigger SMB scan
    O->>S: Run Chained Scans
    S-->>E: Raw Vulnerability Findings
    E->>E: Calculate Risk Score + Health Score
    E->>R: Auto-Generate Action Tasks
    E-->>AI: Top 3 critical assets (advisory only)
    AI-->>O: SME Advice (business_impact, remediation)
    O-->>U: Full Report: Risk Score + Tasks + Advice
    O->>U: Alert: Vulnerability Found!
    O->>R: Trigger Auto-Block Playbook
    R-->>U: Threat Neutralized
```

---

## Slide 6: Component 1: Autonomous Asset Discovery
**Detailed Role:**
- **Nmap Orchestration:** Used to map the "Shadow IT" (the servers you didn't know you had).
- **Intelligent Fingerprinting:** Not just identifying active IPs, but determining the Operating System, Service Version, and potential entry points.
- **The Value:** Found 404 uses this discovery data to "Auto-Scale" its scans—if a web server is found, it automatically switches to web-based scanning modes.

---

## Slide 7: Component 2: Multi-Engine Synergetic Scanning
**Why use multiple engines?**
- **Breadth (GVM/OpenVAS):** Scans for 50,000+ known vulnerabilities across every port. It is slow but exhaustive.
- **Depth (Nuclei):** Scans for the latest "Day-Zero" exploits using rapid YAML templates. It is fast and targeted.
- **The Synergy:** Found 404 runs them in parallel and **deduplicates** the results. You only see one unified alert for one vulnerability, regardless of which tool found it.

---

## Slide 8: Component 3: The Deterministic Risk Engine + AI Advisor
**Two complementary systems. One clear answer.**

```mermaid
flowchart LR
    Raw["Raw Findings (CVSS + Ports)"] --> Engine["UnifiedRiskEngine"]
    Engine --> Score["Risk Score (0=Safe, 100=Critical)"]
    Engine --> Health["Health Score (100=Safe, 0=Critical)"]
    Engine --> Tasks["ActionItems (REMEDIATON / REVIEW / CONFIG)"]
    Engine -->|"Top 3 Assets"| AI["Gemini AI (Advisory Only)"]
    AI --> Advice["SME Advice: Why dangerous? Business impact? How to fix?"]
```

- **Risk Engine (Deterministic):** Uses CVSS weights, port risk tables, and asset criticality to compute reliable, consistent scores.
- **AI Advisor (Non-blocking):** Only adds human-readable context **after** the deterministic analysis is done. The scan succeeds even if AI is unavailable.
- **No Alert Fatigue:** Every finding is a graded task (CRITICAL/HIGH/MEDIUM), not just a raw log.

---

## Slide 9: Component 4: Dynamic Risk Topology
**Visualizing the Battleground:**
- **Engine:** Built with **D3.js** for high-performance hex-grid rendering.
- **Gravity Physics:** Nodes cluster together based on network relationships.
- **Color Coding:**
    - **Blue (Safe):** No critical findings. Health Score ≥ 80.
    - **Orange (Warning):** Misconfigurations or medium vulns. Health Score 40-79.
    - **Red (Critical):** Active threats or high risk scores. Health Score < 40.
- **Interactivity:** Hover for **Health Score + Expert Advice** without leaving the screen.

---

## Found 404 vs. SIEM Ecosystems
| Feature | Traditional SIEM (Splunk/ELK) | Found 404 (Modern Orchestrator) |
| :--- | :--- | :--- |
| **Detection** | Historical Logs Only | Active Probing + Live Logs |
| **Effort** | Manual Query Writing | Automatic AI Interpretation |
| **Cost** | \$100k+ in Licensing | Open-Source Core + Cheap API |
| **Logic** | Reactive (After the breach) | Proactive (Before the breach) |

---

## Found 404 vs. SOAR Automation
| Feature | Traditional SOAR (Cortex/Palo Alto) | Found 404 (Autonomous Agents) |
| :--- | :--- | :--- |
| **Playbooks** | Rigid "If/Then" Scripts | Dynamic Generative Reasoning |
| **Update Speed** | Manual updates for every new CVE | AI knows new threats via Web-Search |
| **User Barrier** | Needs specialized Python training | Natural Language Interaction |
| **Goal** | Workflow Automation | Intelligence Orchestration |

---

## Slide 12: Unique Value: The Force Multiplier
**Why the project idea is useful for a business:**
1. **统一 (Unification):** Replaces a screen of 10 tools with one professional dashboard.
2. **Speed:** Detection-to-Remediation time drops from 48 hours to 48 **seconds.**
3. **Accuracy:** AI filtering reduces "Alert Fatigue" by 90%, so analysts only see real threats.
4. **Professional Excellence:** Provides state-of-the-art security reporting for auditors and stakeholders.

---

## Slide 13: Operational Utility: Scaling Security
- **Bridging the Talent Gap:** A junior intern can manage a complex network because the AI "Brain" explains every step.
- **Resource Efficiency:** One security admin can do the work of a team of five.
- **Low Cost / High Impact:** Uses powerful open-source engines but wraps them in an enterprise-grade orchestration layer.

---

## Slide 14: Use Case: Advanced Intrusion Response

```mermaid
flowchart TD
    A["Suspicious Login on Web Server"] --> B["Wazuh Sends Alert to Found 404"]
    B --> C["Orchestrator Triggers Deep Nuclei Scan"]
    C --> D["Gemini Analyzes: Credential Stuffing Attack"]
    D --> E["Found 404 Notifications: Slack/Email Alert"]
    D --> F["n8n Automation: Blocks attacker IP on Gateway"]
    F --> G["Health Status: Node Returns to Blue/Safe"]
```

---

## Slide 15: Conclusion: Setting the New Standard
**Summary:**
- **Found 404** is not just a tool; it is the **Orchestra Conductor** of cybersecurity.
- We have combined raw scanning power with the reasoning of modern AI.
- **The Result:** A simpler, more professional, and fully autonomous security future.

**Thank you for your attention. Any questions?**
