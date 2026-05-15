# Security Tools Analysis — Orchestration Security Center

**Project:** Orchestration Security Center — AI-Driven DAST & Orchestration Platform for SMEs
**Author:** Omar Abdelaziz Kapil — HITU, Final Year Project (FYP), 2025–2026
**Document Purpose:** Deep-dive into each integrated security tool, how they are orchestrated together, what is genuinely *new* in this project, and an honest assessment of real-world SME deployment readiness.

---

## Table of Contents

1. [Part 1 — Individual Tool Breakdown](#part-1--individual-tool-breakdown)
2. [Part 2 — Tools Working Together (Orchestration)](#part-2--tools-working-together-orchestration)
3. [Part 3 — Project Innovation: Beyond Just Using Existing Tools](#part-3--project-innovation-beyond-just-using-existing-tools)
4. [Part 4 — Real-World SME Deployment Assessment](#part-4--real-world-sme-deployment-assessment)

---

# Part 1 — Individual Tool Breakdown

The platform integrates **six core security tools** plus three optional integrations (SIEM/SOAR). Each is wrapped behind a Python service class so the orchestrator can invoke them uniformly.

---

## 1.1 Nmap — Network Mapper

| Field | Value |
|---|---|
| **Version** | System-installed (Debian `nmap` package in [backend/Dockerfile](backend/Dockerfile)) |
| **Category** | Network reconnaissance & service fingerprinting |
| **Wrapper** | [backend/app/services/nmap_wrapper.py](backend/app/services/nmap_wrapper.py) via `python-nmap` |
| **Stage** | Stage 1 — Recon |

### How it works internally
Nmap sends crafted TCP/UDP/ICMP probes to a target, observes responses (or absence thereof), and infers:
- Which TCP/UDP **ports are open, closed, or filtered**
- Which **services and versions** are running (`-sV` service detection)
- The likely **operating system** via TCP/IP stack fingerprinting (`-O`, requires raw sockets)
- Application-layer details via the **NSE script engine** (`--script=vulners,banner,http-enum,smb-os-discovery`)

### Inputs & outputs
- **Input:** target IP/hostname/CIDR, scan profile (`quick` / `full` / `deep`)
- **Output:** structured Python dict (`PortScanner.scan()` result) — parsed into `Endpoint` and `ScanAsset` ORM rows

### Where it sits in this project
- Invoked by `AgentOrchestrator` during Stage 1
- Detects a key capability gate at runtime: [nmap_wrapper.py:7-18](backend/app/services/nmap_wrapper.py#L7-L18) probes whether the container has `CAP_NET_RAW`; if not, it transparently downgrades to TCP-connect scans (no `-O`, no `-sS`)
- Results feed directly into the **service-aware chaining logic** that selects Nuclei templates (see Part 2)

### Strengths
- Industry-standard, extremely reliable, comprehensive port/service detection
- NSE scripts add lightweight vulnerability detection (e.g., `vulners`, `smb-os-discovery`)

### Limitations (in isolation)
- Reports **what services exist**, not whether they are exploitable
- High-noise raw output (thousands of lines per /24)
- No business-context prioritization

---

## 1.2 Nuclei — Template-Based Vulnerability Scanner

| Field | Value |
|---|---|
| **Version** | Pinned **v3.3.8** (downloaded during Docker build for reproducibility) |
| **Category** | DAST / template-driven vulnerability detection |
| **Wrapper** | [backend/app/services/nuclei_wrapper.py](backend/app/services/nuclei_wrapper.py) |
| **Stage** | Stage 2 — Attack |

### How it works internally
Nuclei runs **YAML-defined detection templates** against a target. Each template encodes:
- HTTP/TCP/DNS/file/network request patterns
- Matchers (regex, word, status, DSL expressions)
- Severity, CVE references, and remediation hints

Nuclei has ~9,000+ community templates covering CVEs, default credentials, misconfigurations, exposures, and tech fingerprints.

### Inputs & outputs
- **Input:** target URL/IP, scan type (`quick` = critical/high only; `full` = critical/high/medium), and a **rate limit** (`-rate-limit N` to avoid DoS'ing the target — see [nuclei_wrapper.py:36-43](backend/app/services/nuclei_wrapper.py#L36-L43))
- **Output:** JSONL — one finding per line, each normalised by `_transform_finding()` into a dict containing `raw_request`, `raw_response`, `evidence_hash` (SHA-256 of the proof), `template_id`, `severity`, `detected_by`

### Where it sits in this project
- Invoked by Stage 2 after Nmap has identified open ports
- **Service-aware template selection** — e.g., port 445 open → SMB templates; port 80/443 + tech fingerprint = WordPress → WordPress templates
- Findings persisted as `Vulnerability` rows with full evidence chain (`evidence_hash`) used by [finding_dedup.py](backend/app/services/finding_dedup.py)

### Strengths
- Massive, community-maintained template library; fast YAML iteration
- Produces machine-readable evidence (request/response) — auditable
- Rate-limited by design in this project (cannot DoS production)

### Limitations (in isolation)
- Template-only: cannot detect novel vulnerabilities outside its templates
- High false-positive rate on weak matchers
- No business impact — every CVE looks equally urgent

---

## 1.3 OpenVAS / GVM — Comprehensive CVE Scanner

| Field | Value |
|---|---|
| **Version** | OpenVAS via Greenbone Vulnerability Manager (GMP API) |
| **Category** | Authenticated/unauthenticated vulnerability scanning (network-level CVEs) |
| **Wrapper** | [backend/app/services/openvas.py](backend/app/services/openvas.py) (GMP protocol) |
| **Stage** | Optional Stage 3 — Validation (feature-flagged: `OPENVAS_ENABLED=false` default) |

### How it works internally
- OpenVAS maintains a **feed of ~150,000 NVTs** (Network Vulnerability Tests)
- Each NVT runs probes against the target and matches output against known CVE signatures
- Supports authenticated scans (SSH/SMB credentials → checks installed package versions vs. CVE DB)

### Inputs & outputs
- **Input:** target IP, optional credentials (encrypted with Fernet), scan policy
- **Output:** GMP XML — parsed into `Vulnerability` rows with CVSS vectors

### Where it sits in this project
- API exposed via [api/v1/endpoints/openvas.py](backend/app/api/v1/endpoints/openvas.py)
- Runs as a sidecar container (`openvas` service, ports 9390/9392) — only when `--profile full`
- Used as a **second opinion** during validation to corroborate Nuclei findings or surface CVEs Nuclei missed

### Strengths
- Industry-grade CVE coverage, including authenticated scanning
- High-confidence CVSS vectors directly from upstream feeds

### Limitations (in isolation)
- **Heavy** — feed sync alone can take 30+ minutes; full scans hours
- Notoriously difficult to install/configure outside a container
- Off by default in this project for resource reasons

---

## 1.4 Subfinder — Subdomain Discovery (EASM)

| Field | Value |
|---|---|
| **Category** | External attack surface management — subdomain enumeration |
| **Wrapper** | Invoked by [backend/app/services/discovery_agent.py](backend/app/services/discovery_agent.py) |
| **Stage** | Stage 1 — Recon |

### How it works internally
Queries **~30+ passive sources** (certificate transparency logs, DNS providers, search engines, threat-intel APIs) to find subdomains of a root domain — without sending traffic to the target.

### Inputs & outputs
- **Input:** root domain (e.g., `example.com`)
- **Output:** list of discovered subdomains, each handed to Nmap for port scanning

### Where it sits in this project
- Runs *before* Nmap to expand the scan scope from one URL to all reachable subdomains
- Output feeds the `ScanAsset` model and the network graph

### Strengths
- Passive — zero footprint on the target
- Finds shadow IT and forgotten dev/staging hosts SMEs often don't realise exist

### Limitations (in isolation)
- Passive sources can be stale; misses brand-new subdomains
- No vulnerability data — only enumeration

---

## 1.5 Trivy — Container & OS Package Scanner

| Field | Value |
|---|---|
| **Category** | SCA / container image vulnerability scanning |
| **Wrapper** | Invoked by [backend/app/services/infrastructure_agent.py](backend/app/services/infrastructure_agent.py) |
| **Stage** | Stage 3 — Validation |

### How it works internally
Trivy compares installed package versions (from OS package managers or container image layers) against vulnerability databases (NVD, GitHub Advisory, vendor advisories) and reports matching CVEs.

### Inputs & outputs
- **Input:** container image reference or filesystem path
- **Output:** JSON list of CVEs with severity, fixed version, package name

### Where it sits in this project
- Used by `InfrastructureAgent` to scan the *infrastructure layer* — Docker images and OS packages of the target environment when applicable
- Adds **package-level CVEs** that DAST tools (Nmap/Nuclei) cannot see

### Strengths
- Extremely fast, multi-source vuln DB
- Identifies upgrade paths (fixed-in version) — directly actionable

### Limitations (in isolation)
- Requires access to the image/filesystem (not always available externally)
- No exploit confirmation — flags CVEs that may not be reachable in practice

---

## 1.6 Google Gemini 2.0 Flash — LLM Reasoning Engine

| Field | Value |
|---|---|
| **Model** | `gemini-2.0-flash` |
| **Category** | AI reasoning / explanation / prioritization |
| **Wrappers** | [intelligence_agent.py](backend/app/services/intelligence_agent.py), [ai_advisor.py](backend/app/services/ai_advisor.py), [agent_orchestrator.py:60-67](backend/app/services/agent_orchestrator.py#L60-L67) |
| **Stage** | Stage 3 — Validation (feature-flagged) + Stage 4 reporting |

### How it works internally
Each agent's `BaseAgent.llm_reason(prompt)` calls Gemini with a carefully scoped prompt:
- "Given this Nuclei finding + this Nmap context + this asset criticality, is this exploitable in practice?"
- "Translate this CVE into a plain-language business impact for a non-technical executive"
- "Suggest a remediation that an SME IT admin can execute today"

### Inputs & outputs
- **Input:** structured finding + asset/environment context
- **Output:** natural-language reasoning, confidence score, plain-English impact, suggested remediation steps

### Where it sits in this project
- **Guarded** by [llm_guard.py](backend/app/services/llm_guard.py) — daily and per-scan token budgets (`LLM_DAILY_TOKEN_BUDGET=500000`, `LLM_PER_SCAN_TOKEN_BUDGET=50000`)
- All actions chained into the SHA-256 hash-linked audit log (`AgentLog`) for tamper-evident provenance

### Strengths
- Bridges the gap between raw CVE data and SME-readable insight — the project's core value
- Cost-controlled by hard token budgets

### Limitations (in isolation)
- Non-deterministic — same input can yield different wording
- Hallucination risk — *never* used as the source of truth for whether a vuln exists, only for explaining/prioritizing findings the scanners already produced
- Vendor lock-in to Google's API

---

## 1.7 Optional Integrations

| Tool | File | Role |
|---|---|---|
| **Wazuh** (SIEM) | [wazuh_integration.py](backend/app/services/wazuh_integration.py) | Forwards findings as SIEM events for correlation with logs |
| **Elasticsearch + Kibana** | [elastic_integration.py](backend/app/services/elastic_integration.py) | Long-term log storage & dashboards |
| **n8n** (SOAR) | [soar_orchestrator.py](backend/app/services/soar_orchestrator.py) | Triggers auto-remediation playbooks via webhooks (block IP, open ticket, page on-call) |

All three are **off by default** and degrade gracefully when disabled — see feature flags in [.env.example](.env.example).

---

# Part 2 — Tools Working Together (Orchestration)

The platform's actual product is **not the tools themselves** — it is the **4-stage agent pipeline** in [agent_orchestrator.py](backend/app/services/agent_orchestrator.py) that chains them intelligently.

## 2.1 End-to-End Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│ User triggers scan via POST /api/v1/scans/ (with target ID)          │
└──────────────────────────────┬───────────────────────────────────────┘
                               ↓
                  Celery task enqueued (scan_tasks.py)
                               ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — RECON                                                       │
│  • DiscoveryAgent → subfinder → list of subdomains                    │
│  • NmapWrapper    → ports, services, OS, banners per host             │
│  • Persists: ScanAsset, Endpoint, AssetService                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — ATTACK (service-aware chaining)                             │
│  Open port 445 (SMB)? → Nuclei SMB templates                          │
│  Open port 80/443?    → Nuclei HTTP CVE + fingerprint templates       │
│  Open port 6379?      → Nuclei Redis-auth templates                   │
│  Open port 3306/5432? → Nuclei DB-default-creds templates             │
│  Persists: Vulnerability rows with evidence_hash                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 3 — VALIDATION                                                  │
│  • finding_dedup.py     → collapses duplicate findings by evidence    │
│  • InfrastructureAgent  → Trivy + OS package check                    │
│  • OpenVAS (optional)   → second-opinion CVE corroboration            │
│  • IntelligenceAgent    → Gemini "is this really exploitable?"        │
│  • validation_probe.py  → automated re-confirmation HTTP probe        │
│  Result: each Vulnerability gets a confidence_score (0.0–1.0)         │
└──────────────────────────────┬───────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 4 — SCORING (UnifiedRiskEngine — deterministic)                 │
│   Score = (Σ severity_weight × confidence)                            │
│         + Σ port_weight                                               │
│         × asset_value_multiplier (CRITICAL 1.5 → LOW 0.8)             │
│         × exposure_modifier (internal 0.6 / external 1.0)             │
│   Health = 100 − Score                                                │
│   framework_tagger.py → maps each vuln to PCI-DSS/HIPAA/ISO/GDPR      │
│   sla.py              → remediation deadlines + escalation            │
│   pdf_generator.py    → ReportLab executive PDF + report_signer.py    │
└──────────────────────────────┬───────────────────────────────────────┘
                               ↓
              Redis pub/sub → WebSocket /ws/events
                               ↓
              React dashboard updates in real time
```

## 2.2 Normalisation, Correlation, Deduplication

| Concern | Mechanism |
|---|---|
| **Different output formats** | Every tool wrapper has a `_transform_finding()` step that converts raw output into a canonical dict (severity enum, CVE list, evidence hash, source tool name) |
| **Duplicate findings across tools** | [finding_dedup.py](backend/app/services/finding_dedup.py) — same CVE on same endpoint detected by both Nuclei and OpenVAS is merged into one Vulnerability with a `detected_by` array |
| **Conflicting severities** | UnifiedRiskEngine uses the **highest** CVSS from the providers, weighted by confidence |
| **Cross-tool correlation** | [alert_correlator.py](backend/app/services/alert_correlator.py) — surfaces patterns like "5 hosts in DMZ all have CVE-X" |
| **Evidence integrity** | Every finding stores `evidence_hash` (SHA-256 of request/response). Every agent action is logged with hash-chained SHA-256 in `AgentLog` (tamper-evident) |

## 2.3 Why Orchestration Beats Standalone

Running each tool independently gives you:
- 4 separate UIs to learn
- 4 separate report formats to reconcile manually
- Thousands of raw findings, no prioritization
- No business context, no remediation guidance
- No audit trail across tools

The orchestration pipeline transforms that into **5 prioritized action items** with executive-ready reporting — the project's stated value proposition.

---

# Part 3 — Project Innovation: Beyond Just Using Existing Tools

A fair critique of any "wrapped scanner" project is: *"You're just gluing existing tools together."* This section documents what is **genuinely novel** in this platform.

## 3.1 Novel Components Built From Scratch

| Component | What is new |
|---|---|
| **4-Stage Agent Pipeline** ([agent_orchestrator.py](backend/app/services/agent_orchestrator.py)) | Original abstraction: `BaseAgent` with rate-limited HTTP, hash-chained logging, LLM reasoning hook, async state machine (IDLE → RUNNING → COMPLETED/FAILED) |
| **UnifiedRiskEngine** ([unified_risk_engine.py](backend/app/services/unified_risk_engine.py)) | Custom deterministic scoring blending CVSS, port weighting, asset value, exposure (internal vs. external — auto-detected from RFC-1918 prefix) — no existing tool offers this combination |
| **Hash-chained AgentLog** | Every agent action logged with `this_hash = SHA256(prev_hash + payload)` — a blockchain-style tamper-evident audit chain across the whole scan |
| **Evidence Hash Deduplication** | SHA-256 of raw request/response gives content-addressable findings — eliminates the "same vuln reported 8 times" problem |
| **Service-Aware Chaining** | Nmap output drives Nuclei template *selection* — running only SMB templates on a host with 445 open, not all 9,000 templates blindly |
| **LLM Guard** ([llm_guard.py](backend/app/services/llm_guard.py)) | Per-scan + daily token budgets — production-grade cost control, not available in any off-the-shelf scanner |
| **Scope Guard** ([scope_guard.py](backend/app/services/scope_guard.py)) | Allowlist enforcement preventing scans from leaving authorised scope (legal/safety control) |
| **Compliance Auto-Tagging** ([framework_tagger.py](backend/app/services/framework_tagger.py)) | Each finding auto-tagged with PCI-DSS / HIPAA / ISO-27001 / GDPR clauses — directly bridges technical findings to compliance evidence |
| **Real-Time Streaming** ([ws_manager.py](backend/app/services/ws_manager.py) + [event_publisher.py](backend/app/services/event_publisher.py)) | Redis pub/sub → WebSocket → 25+ live React panels — most scanners give a static PDF at the end; this one streams progress and findings live |
| **SME-Focused Dashboard** | 25+ panels designed for non-experts: action items, health score, asset graph (react-force-graph), compliance heatmap |

## 3.2 New Methodology

The methodology contribution is **AI-assisted prioritization with deterministic scoring**:

1. **Detection** is deterministic (scanners) — no LLM in the trust path for "does this vuln exist?"
2. **Validation** uses the LLM as an *advisor* — "given this evidence, what's the realistic exploitability?" — output is a confidence multiplier, never a yes/no
3. **Scoring** is deterministic again — `UnifiedRiskEngine` is fully auditable, reproducible
4. **Explanation** is LLM-generated — plain-language impact + remediation for the SME audience

This split (deterministic core, LLM only at edges) is genuinely novel for an SME-targeted DAST product, and it sidesteps the hallucination risk that kills most "AI security" tools.

## 3.3 Problems Existing Tools Do NOT Solve

| Problem | Existing tools | This project |
|---|---|---|
| "I have 4,000 findings — which 5 matter today?" | Manual triage by an analyst | UnifiedRiskEngine + AI action items |
| "Translate CVE-2023-XXXXX into something the CEO understands" | Doesn't exist | IntelligenceAgent (Gemini) |
| "Auto-map findings to PCI-DSS controls" | Expensive GRC tools | framework_tagger.py (free, automatic) |
| "Prove no one tampered with the scan log" | Trust the SIEM | Hash-chained `AgentLog` |
| "Don't DoS my production during the scan" | Manual flag tuning | aiolimiter + Target.max_rps inherited by every agent |
| "Stream scan progress live to a dashboard" | Most scanners: poll the API | Redis pub/sub → WebSocket built-in |
| "Tie LLM reasoning to a hard cost ceiling" | Not addressed | llm_guard.py token budgets |

## 3.4 Comparison Table

| Dimension | Nmap alone | Nuclei alone | OpenVAS alone | **This Project** |
|---|---|---|---|---|
| Automation across tools | ✗ | ✗ | ✗ | ✓ 4-stage pipeline |
| Cross-tool correlation | ✗ | ✗ | ✗ | ✓ alert_correlator |
| AI prioritization | ✗ | ✗ | ✗ | ✓ UnifiedRiskEngine + Gemini |
| SME-readable explanations | ✗ | ✗ | ✗ | ✓ IntelligenceAgent |
| Compliance mapping | ✗ | ✗ | Partial | ✓ Auto-tagged PCI/HIPAA/ISO/GDPR |
| Tamper-evident audit | ✗ | ✗ | ✗ | ✓ SHA-256 hash chain |
| Real-time dashboard | ✗ | ✗ | Limited | ✓ 25+ live React panels |
| Scope/rate safety | Manual | Manual | Manual | ✓ Enforced in code |
| Auto-remediation | ✗ | ✗ | ✗ | ✓ n8n SOAR (optional) |

## 3.5 Academic / Research Contribution

Defensible original FYP contributions:

1. **A working architectural pattern** for combining deterministic scanners with LLM advisors safely (the "LLM at edges, never in the trust path" pattern)
2. **An open, deterministic risk-scoring formula** specifically tuned for SME contexts (exposure-aware, asset-aware)
3. **Hash-chained agent action logging** applied to a security orchestration context
4. **An SME-targeted UX** for vulnerability management — a deliberately small action-item set (5 items), executive PDFs, no jargon
5. **A reproducible reference implementation** (Docker Compose + lab containers) others can build on

---

# Part 4 — Real-World SME Deployment Assessment

**Honest verdict:** **PARTIALLY YES — with significant hardening.**

The platform is a **strong prototype / pilot-ready system** but has clearly identified gaps before production SME use. Below is the breakdown.

## 4.1 What Works Today (Production-Grade Components)

| Component | Why it's ready |
|---|---|
| Core scan pipeline | Functional, tested, rate-limited, scope-guarded |
| JWT auth + RBAC | bcrypt + python-jose, ANALYST/ADMIN roles enforced on every route |
| Encrypted credentials | Fernet symmetric encryption for stored auth credentials |
| Tamper-evident logging | SHA-256 hash chain in AgentLog |
| Containerized stack | Docker Compose, resource limits set per service |
| Real-time dashboard | Production WebSocket pattern with reconnect/backoff |
| LLM cost controls | Hard token budgets prevent runaway API spend |

## 4.2 Gaps Blocking Full Production (Honest List)

| Gap | Severity | What is missing |
|---|---|---|
| **HA / Multi-Node** | High | Single-node Docker Compose; no Kubernetes manifests; no DB replication |
| **Backup & DR** | High | No automated PostgreSQL backups in the compose file; no documented restore procedure |
| **Secrets Management** | High | `.env` file with plaintext JWT_SECRET, DB password, API keys. Production needs HashiCorp Vault / AWS Secrets Manager / Doppler |
| **TLS Certificates** | Medium | Caddy self-signs; production needs ACME with a real domain |
| **Hardened Auth** | Medium | No MFA, no SSO (OIDC/SAML), no password rotation policy, no account lockout |
| **Monitoring & Alerting** | High | No Prometheus metrics, no Grafana, no APM, no alerting on backend errors |
| **Log Aggregation** | Medium | Logs go to stdout only — fine in dev, weak for forensics in prod |
| **Audit Log Retention** | Medium | AgentLog stored in primary DB indefinitely — needs archival policy |
| **CI/CD** | Medium | No GitHub Actions pipeline visible, no automated container image scanning |
| **Penetration Testing** | High | The platform itself has not undergone a 3rd-party pentest |
| **Compliance Certification** | Variable | SOC 2 / ISO 27001 audit not done — required for some SME customers |
| **Scalability** | Medium | Celery `concurrency=1`; single worker per node; no horizontal scaling tested |
| **Database Migrations** | Medium | Alembic setup not confirmed for safe schema upgrades in prod |
| **License/Compliance of Bundled Tools** | Low | OpenVAS/GVM, Nuclei, Nmap licenses all permit commercial use — but each customer deployment should be reviewed |

## 4.3 IF Deployed Today (Pilot/Small SME — 5–50 endpoints)

### Recommended Architecture
```
                   ┌──────────────────────────────┐
                   │ Customer SME Network         │
                   │                              │
   Internet ──→ FW │  ┌─────────────────────────┐ │
                   │  │ Single VM (or 2 for HA) │ │
                   │  │  - Docker Compose stack │ │
                   │  │  - Caddy + Let's Encrypt│ │
                   │  └─────────────────────────┘ │
                   │           ↓ scans            │
                   │   Internal & DMZ assets      │
                   └──────────────────────────────┘
```

### Minimum Resources (Lite Mode, 5–20 assets)
| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 4 cores | 8 cores |
| RAM | **16 GB** (lite mode requirement) | 24 GB |
| Disk | 80 GB SSD | 250 GB SSD |
| Network | 100 Mbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS / Debian 12 | Same |

### Recommended Resources (Full Mode with SIEM/SOAR, 20–100 assets)
| Resource | Value |
|---|---|
| CPU | 16 cores |
| RAM | **32 GB** (full profile requirement) |
| Disk | 500 GB SSD (Elasticsearch retention) |
| Network | 1 Gbps + dedicated NIC for scanning |
| Backup target | Separate NAS / S3 bucket |

### Operational Checklist Before Going Live
- [ ] Replace all `CHANGE_ME` secrets with vault-managed values
- [ ] Configure a real domain + ACME TLS via Caddy
- [ ] Enable PostgreSQL `pg_dump` cron + offsite backup
- [ ] Add Prometheus + Grafana sidecars; alert on backend 5xx and Celery queue depth
- [ ] Document an incident-response runbook (compromised credentials, runaway scan, DB corruption)
- [ ] Get an external pentest of the platform itself
- [ ] Add an OIDC/SAML integration for SME identity providers (M365, Google Workspace)
- [ ] Add MFA to admin login
- [ ] Set retention policies for AgentLog and scan history
- [ ] Document customer-side firewall rules (which ports the platform needs)

### Estimated Cost Range (per pilot deployment)
| Item | Monthly Cost |
|---|---|
| VM (8 vCPU / 32 GB / 250 GB) | $80–200 (cloud) or one-time hardware cost |
| Gemini API (controlled by token budget) | $20–100 |
| Backup storage | $5–20 |
| TLS / domain | $1–2 |
| **Total** | **~$100–300/mo per SME tenant** |

### Team / Skillset to Operate
- 1 part-time DevOps engineer (Docker, Linux, basic Postgres) — ~0.2 FTE
- 1 security analyst (interprets findings, tunes templates) — ~0.5 FTE
- Optional: 1 developer for customer-specific integrations — ~0.1 FTE

## 4.4 Realistic Roadmap to Full Production

| Phase | Effort | Deliverables |
|---|---|---|
| **Phase A — Hardening (2–3 months)** | 1 engineer FT | Secrets vault, automated backups, monitoring stack, MFA, external pentest |
| **Phase B — Multi-tenancy (3–4 months)** | 2 engineers | Tenant isolation in DB, per-tenant API key, billing integration |
| **Phase C — HA & Scale (2–3 months)** | 2 engineers | Kubernetes manifests, PG replication, Celery horizontal scaling, load testing |
| **Phase D — Compliance (6–12 months)** | Consultant + 1 engineer | SOC 2 Type II, ISO 27001 readiness, documented controls |

## 4.5 Bottom Line

This is **a real, working, defensible FYP product** that:
- ✓ Solves an actual SME problem
- ✓ Demonstrates strong systems engineering (async, real-time, hash-chained audit, rate limiting)
- ✓ Combines deterministic and AI components safely
- ✓ Can be piloted at a small SME today with manageable risk

But it is **not yet a turnkey commercial product**. The gap list above is honest and achievable — none of it is research-grade; it is all standard productionisation work. For a final-year project, the platform comfortably exceeds what is expected; for commercial SME deployment, **Phase A hardening is the minimum bar**.

---

*Generated for: HITU FYP 2025–2026 — Orchestration Security Center*
