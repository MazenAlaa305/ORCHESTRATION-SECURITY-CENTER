# (Found 404 System Architecture)

This file provides a comprehensive overview of the Found 404 platform's technical architecture, covering everything from the high-level data flow to the intricate specifications of the deployment environment.

## High-Level System Architecture:
```mermaid
graph TD
    subgraph PresentationTier["<b>Presentation Tier</b>"]
        FE["<b>React 18 SPA</b><br/>Vite + Tailwind CSS<br/>Port 5173"]
    end

    subgraph ApplicationTier["<b>Application Tier</b>"]
        API["<b>FastAPI Server</b><br/>REST API + WebSocket<br/>Port 8000"]
        ORCH["<b>Agent Orchestrator</b><br/>5-Agent Pipeline"]
        CELERY["<b>Celery Workers</b><br/>Background Tasks"]
        BEAT["<b>Celery Beat</b><br/>Scheduled Tasks"]
    end

    subgraph DataTier["<b>Data Tier</b>"]
        PG[("<b>PostgreSQL 15</b><br/>Primary Database<br/>Port 5432")]
        REDIS[("<b>Redis 7</b><br/>Cache + Pub/Sub<br/>Port 6379")]
        ES[("<b>Elasticsearch 8.11</b><br/>Log Storage<br/>Port 9200")]
    end

    subgraph ExternalIntegrations["<b>External Integrations</b>"]
        NMAP["<b>Nmap</b><br/>Network Scanner"]
        NUCLEI["<b>Nuclei</b><br/>Template Scanner"]
        OPENVAS["<b>OpenVAS</b><br/>Vuln Scanner<br/>Port 9392"]
        WAZUH["<b>Wazuh 4.7</b><br/>SIEM Agent<br/>Port 55000"]
        N8N["<b>n8n</b><br/>SOAR Engine<br/>Port 5678"]
        GEMINI["<b>Google Gemini</b><br/>AI Advisory"]
    end

    FE -- "HTTP REST (Axios)" --> API
    FE -. "WebSocket<br/>ws://localhost:8000/ws/logs" .-> API
    API --> ORCH
    ORCH --> CELERY
    BEAT --> CELERY
    API --> PG
    API --> REDIS
    CELERY --> PG
    CELERY --> REDIS
    CELERY --> NMAP
    CELERY --> NUCLEI
    API --> OPENVAS
    API --> WAZUH
    API --> N8N
    ORCH --> GEMINI
    WAZUH --> ES
    REDIS -. "Pub/Sub<br/>ws_events" .-> API

    style PresentationTier fill:#1a1a2e,stroke:#4a90d9,stroke-width:2px,color:#e0e0e0
    style ApplicationTier fill:#16213e,stroke:#4a90d9,stroke-width:2px,color:#e0e0e0
    style DataTier fill:#0f3460,stroke:#4a90d9,stroke-width:2px,color:#e0e0e0
    style ExternalIntegrations fill:#1a1a2e,stroke:#4a90d9,stroke-width:2px,color:#e0e0e0
    style FE fill:#2563eb,stroke:#1d4ed8,color:#fff
    style API fill:#2563eb,stroke:#1d4ed8,color:#fff
    style ORCH fill:#3b82f6,stroke:#2563eb,color:#fff
    style CELERY fill:#3b82f6,stroke:#2563eb,color:#fff
    style BEAT fill:#3b82f6,stroke:#2563eb,color:#fff
    style PG fill:#475569,stroke:#64748b,color:#fff
    style REDIS fill:#475569,stroke:#64748b,color:#fff
    style ES fill:#475569,stroke:#64748b,color:#fff
    style NMAP fill:#374151,stroke:#6b7280,color:#e0e0e0
    style NUCLEI fill:#374151,stroke:#6b7280,color:#e0e0e0
    style OPENVAS fill:#374151,stroke:#6b7280,color:#e0e0e0
    style WAZUH fill:#374151,stroke:#6b7280,color:#e0e0e0
    style N8N fill:#374151,stroke:#6b7280,color:#e0e0e0
    style GEMINI fill:#374151,stroke:#6b7280,color:#e0e0e0
```
### Figure 3.1
 *High-Level System Architecture Diagram — Three-tier client-server architecture showing the React presentation tier, FastAPI application tier with agent orchestration and Celery workers, data tier (PostgreSQL, Redis, Elasticsearch), and external integrations (Nmap, Nuclei, OpenVAS, Wazuh, n8n, Google Gemini). All services are orchestrated via Docker Compose.*

## Docker & Deployment Architecture

```mermaid
flowchart TB
    subgraph DockerCompose["<b>Docker Compose Stack</b>"]
        subgraph AppLayer["<b>Application Services</b>"]
            BE["<b>backend</b><br/>FastAPI<br/>:8000"]
            FE_S["<b>frontend</b><br/>React/Vite<br/>:5173"]
            CW["<b>celery_worker</b><br/>Celery 5.3"]
            CB["<b>celery_beat</b><br/>Scheduler"]
        end

        subgraph DataLayer["<b>Data Services</b>"]
            DB["<b>db</b><br/>PostgreSQL 15<br/>:5432"]
            RD["<b>redis</b><br/>Redis 7<br/>:6379"]
            EL["<b>elasticsearch</b><br/>ES 8.11<br/>:9200"]
        end

        subgraph SecurityLayer["<b>Security Services</b>"]
            OV["<b>openvas</b><br/>Greenbone<br/>:9390, :9392"]
            WZ["<b>wazuh</b><br/>Wazuh 4.7<br/>:1514, :55000"]
            KB["<b>kibana</b><br/>Kibana 8.11<br/>:5601"]
            NN["<b>n8n</b><br/>SOAR Engine<br/>:5678"]
        end
    end

    subgraph LabNetwork["<b>Lab Network (External)</b>"]
        T1["DVWA"]
        T2["Juice Shop"]
        T3["WebGoat"]
        T4["Metasploitable"]
        T5["VulnHub"]
        T6["bWAPP"]
    end

    BE --> DB
    BE --> RD
    CW --> DB
    CW --> RD
    CB --> RD
    WZ --> EL
    KB --> EL
    BE --> OV
    BE --> WZ
    BE --> NN
    FE_S -- "HTTP/WS" --> BE
    BE -. "lab_network" .-> LabNetwork

    style DockerCompose fill:#0f172a,stroke:#4a90d9,stroke-width:2px,color:#e0e0e0
    style AppLayer fill:#1e293b,stroke:#3b82f6,stroke-width:1px,color:#e0e0e0
    style DataLayer fill:#1e293b,stroke:#22c55e,stroke-width:1px,color:#e0e0e0
    style SecurityLayer fill:#1e293b,stroke:#ef4444,stroke-width:1px,color:#e0e0e0
    style LabNetwork fill:#1a1a2e,stroke:#d97706,stroke-width:2px,stroke-dasharray:5 5,color:#e0e0e0
    style BE fill:#2563eb,stroke:#1d4ed8,color:#fff
    style FE_S fill:#2563eb,stroke:#1d4ed8,color:#fff
    style CW fill:#2563eb,stroke:#1d4ed8,color:#fff
    style CB fill:#2563eb,stroke:#1d4ed8,color:#fff
    style DB fill:#059669,stroke:#047857,color:#fff
    style RD fill:#059669,stroke:#047857,color:#fff
    style EL fill:#059669,stroke:#047857,color:#fff
    style OV fill:#dc2626,stroke:#b91c1c,color:#fff
    style WZ fill:#dc2626,stroke:#b91c1c,color:#fff
    style KB fill:#dc2626,stroke:#b91c1c,color:#fff
    style NN fill:#dc2626,stroke:#b91c1c,color:#fff
```
### Figure 3.8:
*Docker Compose Service Architecture — Eleven containerized microservices organized into three layers: Application (FastAPI, React, Celery Worker, Celery Beat), Data (PostgreSQL, Redis, Elasticsearch), and Security (OpenVAS, Wazuh, Kibana, n8n). An external lab_network bridges the stack to six vulnerable target containers for testing.*

