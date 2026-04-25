# Architecture Diagram — Orchestration Security Center

> A reviewer-friendly architectural reference. The root-level [ARCHITECTURE_DIAGRAM.md](../ARCHITECTURE_DIAGRAM.md) carries the full Found 404 design narrative; this file is the trimmed Mermaid-only version for quick reading.

## High-level flow

```mermaid
flowchart LR
  U[Browser<br/>React + Vite] -- HTTPS / WSS --> P[Caddy / Nginx<br/>TLS proxy]
  P -- /api --> B[FastAPI<br/>Uvicorn]
  P -- /ws  --> B
  P -- /    --> F[Vite<br/>static]
  B -- async tasks --> Q[(Redis<br/>broker + pub/sub)]
  Q --> W[Celery worker]
  W --> N[Nmap]
  W --> NU[Nuclei]
  W --> OV[OpenVAS GMP]
  W --> G[Gemini API<br/>advisory only]
  B -- ORM --> DB[(PostgreSQL 15)]
  W -- write --> DB
  W -- publish --> Q
  Q -- subscribe --> B -- WS --> U
  W -- forward --> WZ[Wazuh + Elastic<br/>SIEM]
  WZ -. alerts .-> B
```

## Data model snapshot

```mermaid
classDiagram
  User --> Scan : owns
  Target --> Scan : has
  Scan --> ScanAsset : produces
  ScanAsset --> Vulnerability : contains
  Vulnerability --> ActionItem : creates
  Scan --> AuditLog : writes
```

## Sequence: a single scan

```mermaid
sequenceDiagram
  participant Browser
  participant API as FastAPI
  participant Q as Redis
  participant W as Celery worker
  participant DB as PostgreSQL
  Browser->>API: POST /scans
  API->>DB: Scan(status=QUEUED)
  API->>Q: enqueue run_ai_scan
  API-->>Browser: 200 {scan_id}
  Q->>W: dispatch
  W->>W: Stage 1 Recon (Nmap)
  W->>Q: publish SCAN_STATUS recon_done
  Q-->>API: subscribe -> broadcast
  API-->>Browser: WS SCAN_STATUS
  W->>W: Stage 2 Attack (Nuclei)
  W->>W: Stage 3 Validation
  W->>W: Stage 4 Scoring
  W->>DB: persist findings + risk
  W->>Q: publish SCAN_COMPLETED
  API-->>Browser: WS SCAN_COMPLETED
```

## Network zones (lab)

```mermaid
flowchart TB
  subgraph DMZ[DMZ — public-facing]
    WEB[lab_webserver<br/>Juice Shop]
    SMB[lab_smb<br/>Samba]
  end
  subgraph CORP[Corp — workstations]
    WS1[lab_workstation_1]
    WS2[lab_workstation_2]
  end
  subgraph DATA[Data — internal: true]
    DB2[lab_db]
    REDIS2[lab_redis]
  end
  subgraph MGMT[MGMT — internal: true]
    JUMP[lab_jumphost]
  end
  DMZ --> CORP
  CORP -. firewall .-> DATA
  MGMT -. SSH only .-> CORP
```

## Auth & RBAC

```mermaid
sequenceDiagram
  participant U as User
  participant FE as React SPA
  participant API as FastAPI
  participant DB as PostgreSQL
  U->>FE: submit credentials
  FE->>API: POST /auth/login
  API->>DB: load user + bcrypt verify
  DB-->>API: User row
  API-->>FE: JWT + role + force_password_change?
  FE->>FE: ProtectedRoute + RoleGuard mount
  FE->>API: GET /scans (Authorization: Bearer ...)
  API->>API: require_role(VIEWER|ANALYST|ADMIN)
  API-->>FE: 200 / 403
```

## See also
- [API_GUIDE.md](API_GUIDE.md) — endpoints & WebSocket envelope
- [../SECURITY_AUDIT.md](../SECURITY_AUDIT.md) — OWASP Top 10 mapping
