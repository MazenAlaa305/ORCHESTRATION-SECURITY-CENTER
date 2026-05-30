---
title: FYP — Orchestration Security Center
description: Consolidated FYP documentation, figures, and references — updated 2026-05-24
---

> **Consolidated FYP / academic documentation.** Reconstructed from `docs/FYP.md` (commit `18e695cb^`) and merged with the live state of the codebase as of **2026-05-24**.
>
> The original document's organisation (Preliminary Pages → 6 Chapters → References → Appendices) is preserved verbatim. Content within each section has been updated where the live code diverged from the original claims; updates are marked with *(updated 2026-05-24)* in line.
>
> **All figures referenced in this document live in the companion file [`FYP_Figures.md`](FYP_Figures.md).** This document includes inline figure call-outs (e.g. *"see Figure 3.1"*) rather than duplicating the Mermaid sources.

---

## Index

- **Part A — Full FYP Documentation** *(below)* — academic report: Declaration, Approval, Abstract, all 6 chapters, References, Appendices.
- **Part B — All FYP Figures** — see the companion file [`FYP_Figures.md`](FYP_Figures.md). Every Mermaid figure for Chapters 3–5, with captions and "Updated 2026-05-24" notes.

---

# Part A — Full FYP Documentation

<p align="center">
  <h1 align="center">Orchestration Security Center</h1>
  <h3 align="center">AI-Driven Security Orchestration Platform for SMEs</h3>
  <p align="center"><strong>Final Year Project Documentation</strong></p>
</p>

---

| | |
|---|---|
| **Project Title** | Orchestration Security Center — An AI-Driven Dynamic Application Security Testing and Orchestration Platform for Small-to-Medium Enterprises |
| **Student Name** | Omar Abdelaziz Kapil |
| **Institution** | HITU (Higher Institute of Technology and Information) |
| **Academic Year** | 2025–2026 |
| **Supervisor** | [Supervisor Name] |
| **Student ID** | [Student ID] |

---

## Table of Contents

### Preliminary Pages

- [Declaration](#declaration)
- [Approval / Certification](#approval--certification)
- [Dedication](#dedication)
- [Acknowledgements](#acknowledgements)
- [Abstract](#abstract)
- [List of Figures](#list-of-figures)
- [List of Tables](#list-of-tables)
- [List of Abbreviations](#list-of-abbreviations)

### Chapters

- [Chapter 1 — Introduction](#chapter-1--introduction)
  - [1.1 Background of Study](#11-background-of-study)
  - [1.2 Problem Statement](#12-problem-statement)
  - [1.3 Project Objectives](#13-project-objectives)
  - [1.4 Project Scope](#14-project-scope)
  - [1.5 Significance / Motivation of the Study](#15-significance--motivation-of-the-study)
  - [1.6 Report Organization](#16-report-organization)
- [Chapter 2 — Literature Review](#chapter-2--literature-review)
  - [2.1 Introduction](#21-introduction)
  - [2.2 Review of Related Existing Systems](#22-review-of-related-existing-systems)
  - [2.3 Comparison of Existing Solutions](#23-comparison-of-existing-solutions)
  - [2.4 Technologies and Tools Reviewed](#24-technologies-and-tools-reviewed)
  - [2.5 Summary / Research Gap](#25-summary--research-gap)
- [Chapter 3 — Methodology / System Design](#chapter-3--methodology--system-design)
  - [3.1 Introduction](#31-introduction)
  - [3.2 Research / Development Methodology](#32-research--development-methodology)
  - [3.3 System Architecture / Framework](#33-system-architecture--framework)
  - [3.4 Requirements Analysis](#34-requirements-analysis)
  - [3.5 Use Case / Data Flow Diagrams](#35-use-case--data-flow-diagrams)
  - [3.6 Database Design](#36-database-design)
  - [3.7 UI/UX Wireframes](#37-uiux-wireframes)
- [Chapter 4 — Implementation](#chapter-4--implementation)
  - [4.1 Introduction](#41-introduction)
  - [4.2 Development Environment & Tools](#42-development-environment--tools)
  - [4.3 Module / Feature Implementation](#43-module--feature-implementation)
  - [4.4 Integration of Components](#44-integration-of-components)
  - [4.5 Challenges Faced During Implementation](#45-challenges-faced-during-implementation)
- [Chapter 5 — Testing & Evaluation](#chapter-5--testing--evaluation)
  - [5.1 Introduction](#51-introduction)
  - [5.2 Testing Strategy](#52-testing-strategy)
  - [5.3 Test Cases & Test Results](#53-test-cases--test-results)
  - [5.4 Performance Evaluation](#54-performance-evaluation)
  - [5.5 Discussion of Results](#55-discussion-of-results)
- [Chapter 6 — Conclusion & Future Work](#chapter-6--conclusion--future-work)
  - [6.1 Summary of the Project](#61-summary-of-the-project)
  - [6.2 Achievement of Objectives](#62-achievement-of-objectives)
  - [6.3 Limitations](#63-limitations)
  - [6.4 Future Enhancements / Recommendations](#64-future-enhancements--recommendations)

### Back Matter

- [References](#references)
- [Appendices](#appendices)

---

<h1 align="center">📖 Preliminary Pages</h1>

---

## Declaration

I hereby declare that this Final Year Project entitled "Orchestration Security Center — An AI-Driven Dynamic Application Security Testing and Orchestration Platform for Small-to-Medium Enterprises" is the result of my own original work carried out under the supervision of [Supervisor Name]. This project has not been submitted for any other degree or qualification at any other institution. All sources of information and literature used are duly acknowledged in the references section.

**Student Signature:** ________________________

**Date:** ________________________

---

## Approval / Certification

This is to certify that the Final Year Project entitled "Orchestration Security Center — An AI-Driven Dynamic Application Security Testing and Orchestration Platform for Small-to-Medium Enterprises" submitted by Omar Abdelaziz Kapil has been examined and approved for the award of the degree.

**Supervisor Signature:** ________________________

**Panel Member 1:** ________________________

**Panel Member 2:** ________________________

**Date:** ________________________

---

## Dedication

> *To my family, whose unwavering support and encouragement made this journey possible.*

---

## Acknowledgements

First and foremost, all praise and gratitude are due to God Almighty for granting me the strength, patience, and knowledge to complete this project. I am deeply thankful to my parents for their endless love, sacrifice, and encouragement throughout my academic journey; without their support, none of this would have been possible.

I extend my sincere gratitude to my supervisor, [Supervisor Name], for their invaluable guidance, constructive feedback, and continuous support throughout the development of this project. Their expertise in cybersecurity and software engineering provided the academic rigor this work required.

I also wish to acknowledge the contributions of the entire Orchestration Security Center project team: Reem Amin (Backend/AI Sub-Leader), Rahma Ebrahem (Frontend Sub-Leader), Shahd Paher (Security Sub-Leader), Yousef Abdel Hady, Mohamed Shaban, Omnia Helmy, Mariz Ehap, Omar Tarek, Yosef Ali, and Mazin Alla. Each member played a vital role in bringing this platform to life.

Finally, I thank the faculty and staff at HITU for providing a stimulating academic environment and the resources necessary to complete this work.

---

## Abstract

Cybersecurity remains a critical challenge for Small-to-Medium Enterprises (SMEs) that typically lack the dedicated security teams and financial resources available to large corporations. Existing Dynamic Application Security Testing (DAST) platforms such as Burp Suite Enterprise, Tenable Nessus, and OWASP ZAP offer powerful capabilities but demand specialized expertise, making them impractical for non-technical SME administrators. This project introduces **"Orchestration Security Center,"** an AI-driven security orchestration platform that automates the entire vulnerability assessment lifecycle — from reconnaissance and attack simulation through risk scoring to actionable remediation guidance — within a single, unified dashboard designed for non-expert users.

The platform employs a multi-agent orchestration architecture built on FastAPI (Python 3.10) and React 18 (Vite 5), integrating industry-standard security tools including Nmap, Nuclei v3.3.8, OpenVAS/GVM, and Wazuh SIEM through a deterministic, rule-based chaining pipeline organised into four canonical stages (Reconnaissance, Attack, Validation, Scoring) coordinated by an `AgentOrchestrator` with a tamper-evident SHA-256 hash-chained audit log and a checkpoint-resume mechanism. A `UnifiedRiskEngine` calculates quantitative risk and health scores using a CVSS v3.1 environmental adjustment combined with severity penalties, asset criticality multipliers, network exposure modifiers, and Nuclei confidence weights. Google Gemini 2.0 Flash serves in an advisory-only capacity through a redaction-and-budget-guarded `llm_guard`, generating SME-friendly explanations of risk findings, business impact assessments, and prioritised remediation steps. Real-time scan progress and alert streaming are delivered via WebSocket (`/ws/events`) and Redis Pub/Sub, while Docker Compose orchestrates a 6-service lite default stack and 6 additional `profile: full` heavy/optional services (Caddy TLS reverse proxy + FastAPI + React + Celery worker + PostgreSQL 15 + Redis 7 in lite; OpenVAS, Elasticsearch, Kibana, Wazuh, n8n SOAR, and Celery Beat behind the `full` profile). A companion `docker-compose.lab.yml` provisions a Living Lab of eight to eleven intentionally vulnerable containers organised into four /24 subnets (DMZ, Corporate, Data, Management). Authentication is enforced by JWT Bearer tokens and three-role RBAC (VIEWER, ANALYST, ADMIN); credential storage uses Fernet symmetric encryption; vulnerability findings are deduplicated across re-scans by a fingerprint hash and tagged with compliance controls (OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, PCI DSS).

Evaluation results demonstrate that the platform successfully detects OWASP Top 10 vulnerabilities across the Living Lab targets, generates deterministic risk scores with 100% reproducibility, and provides actionable remediation items that require no prior security expertise to interpret. The project validates the hypothesis that AI-augmented, tool-chained security orchestration can bridge the cybersecurity gap for resource-constrained SMEs. *(updated 2026-05-24)*

**Keywords:** DAST, Security Orchestration, AI Advisory, Multi-Agent Systems, SME Cybersecurity, Risk Scoring, CVSS v3.1, RBAC, WebSocket, Docker Compose, SOAR, Compliance Tagging, Tamper-Evident Audit Log

---

## List of Figures

| # | Figure | Chapter |
|---|--------|---------|
| 3.1 | High-Level System Architecture Diagram | Ch. 3 |
| 3.2 | Agent Orchestration Pipeline Flowchart | Ch. 3 |
| 3.3 | UnifiedRiskEngine Calculation Logic | Ch. 3 |
| 3.4 | Entity-Relationship Diagram (ERD) | Ch. 3 |
| 3.5 | Data Flow Diagram — Level 0 (Context Diagram) | Ch. 3 |
| 3.6 | Data Flow Diagram — Level 1 (Detailed) | Ch. 3 |
| 3.7 | Use Case Diagram — System Actors and Interactions | Ch. 3 |
| 3.8 | Docker Compose Service Architecture | Ch. 3 |
| 3.9 | Frontend Component Hierarchy | Ch. 3 |
| 3.10 | Dashboard UI Wireframe — Command Center Tab | Ch. 3 |
| 3.11 | Dashboard UI Wireframe — Operations Tab | Ch. 3 |
| 3.12 | Dashboard UI Wireframe — Threat Center Tab | Ch. 3 |
| 3.13 | Lab Environment Network Topology *(new — 2026-05-24)* | Ch. 3 |
| 3.14 | RBAC Role/Permission Matrix *(new — 2026-05-24)* | Ch. 3 |
| 3.15 | Auth & JWT Token Lifecycle *(new — 2026-05-24)* | Ch. 3 |
| 3.16 | Tamper-Evident AgentLog Hash Chain *(new — 2026-05-24)* | Ch. 3 |
| 4.1 | Backend Project Directory Structure | Ch. 4 |
| 4.2 | Frontend Project Directory Structure | Ch. 4 |
| 4.3 | Screenshot — Login Page *(new — 2026-05-24)* | Ch. 4 |
| 4.4 | Screenshot — Command Center Dashboard (Overview Tab) | Ch. 4 |
| 4.5 | Screenshot — Network Topology Force Graph | Ch. 4 |
| 4.6 | Screenshot — Risk Heatmap Treemap Visualization | Ch. 4 |
| 4.7 | Screenshot — Scan Pipeline Progress Indicator | Ch. 4 |
| 4.8 | Screenshot — Agent Log Viewer (AI Brain Tab) | Ch. 4 |
| 4.9 | Screenshot — Vulnerability Detail / RemediationPanel | Ch. 4 |
| 4.10 | Screenshot — OpenVAS Scanner Integration | Ch. 4 |
| 4.11 | Screenshot — SIEM Unified Inbox + IncidentDetailDrawer | Ch. 4 |
| 4.12 | Screenshot — Signed PDF Report Export | Ch. 4 |
| 4.13 | Screenshot — User Management Page (ADMIN-only) *(new)* | Ch. 4 |
| 4.14 | Screenshot — Living Lab Environment Panel *(new)* | Ch. 4 |
| 5.1 | Performance Benchmark — API Response Times | Ch. 5 |
| 5.2 | Risk Score Distribution Across Lab Targets | Ch. 5 |
| 5.3 | Scan Completion Time Comparison Chart | Ch. 5 |

> *(updated 2026-05-24)* — All Mermaid sources, captions, and update notes are maintained in [`FYP_Figures.md`](FYP_Figures.md).

---

## List of Tables

| # | Table | Chapter |
|---|-------|---------|
| 2.1 | Comparison of Existing DAST Platforms | Ch. 2 |
| 3.1 | Functional Requirements Specification | Ch. 3 |
| 3.2 | Non-Functional Requirements Specification | Ch. 3 |
| 3.3 | Docker Compose Services and Port Mapping | Ch. 3 |
| 3.4 | REST API Endpoint Catalogue | Ch. 3 |
| 3.5 | Database Entity Descriptions | Ch. 3 |
| 3.6 | Severity Weight Constants for Risk Calculation | Ch. 3 |
| 3.7 | High-Risk Port Penalties | Ch. 3 |
| 3.8 | RBAC Role / Permission Matrix *(new — 2026-05-24)* | Ch. 3 |
| 3.9 | Compliance Framework Tag Mapping *(new — 2026-05-24)* | Ch. 3 |
| 3.10 | Living Lab Container Inventory *(new — 2026-05-24)* | Ch. 3 |
| 4.1 | Development Tools and Technologies | Ch. 4 |
| 4.2 | Python Backend Dependencies | Ch. 4 |
| 4.3 | Frontend NPM Dependencies | Ch. 4 |
| 4.4 | Feature Flag Catalogue *(new — 2026-05-24)* | Ch. 4 |
| 5.1 | Unit Test Case Results | Ch. 5 |
| 5.2 | Integration Test Case Results | Ch. 5 |
| 5.3 | System Test Case Results | Ch. 5 |
| 5.4 | User Acceptance Testing Results | Ch. 5 |
| 5.5 | Performance Evaluation Metrics | Ch. 5 |

---

## List of Abbreviations

| Abbreviation | Full Form |
|:---:|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| BOLA | Broken Object Level Authorization |
| CORS | Cross-Origin Resource Sharing |
| CRUD | Create, Read, Update, Delete |
| CSS | Cascading Style Sheets |
| CVSS | Common Vulnerability Scoring System |
| CWE | Common Weakness Enumeration |
| DAST | Dynamic Application Security Testing |
| DFD | Data Flow Diagram |
| EASM | External Attack Surface Management |
| EDR | Endpoint Detection and Response |
| ERD | Entity-Relationship Diagram |
| FTP | File Transfer Protocol |
| GDPR | General Data Protection Regulation |
| GMP | Greenbone Management Protocol |
| HIPAA | Health Insurance Portability and Accountability Act |
| HTML | HyperText Markup Language |
| HTTP | HyperText Transfer Protocol |
| IDE | Integrated Development Environment |
| ISO | International Organization for Standardization |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| KPI | Key Performance Indicator |
| LLM | Large Language Model |
| NIST CSF | NIST Cybersecurity Framework |
| ORM | Object-Relational Mapping |
| OWASP | Open Web Application Security Project |
| PCI DSS | Payment Card Industry Data Security Standard |
| PDF | Portable Document Format |
| RBAC | Role-Based Access Control |
| RDP | Remote Desktop Protocol |
| REST | Representational State Transfer |
| SAST | Static Application Security Testing |
| SDLC | Software Development Life Cycle |
| SIEM | Security Information and Event Management |
| SMB | Server Message Block |
| SME | Small-to-Medium Enterprise |
| SOAR | Security Orchestration, Automation, and Response |
| SQL | Structured Query Language |
| SQLi | SQL Injection |
| SSH | Secure Shell |
| SSRF | Server-Side Request Forgery |
| TLS | Transport Layer Security |
| UAT | User Acceptance Testing |
| UI | User Interface |
| URL | Uniform Resource Locator |
| UX | User Experience |
| WS | WebSocket |
| XSS | Cross-Site Scripting |

> *(updated 2026-05-24)* — Added CWE, EASM, GDPR, HIPAA, ISO, NIST CSF, PCI DSS, SAST, and SOAR to reflect terminology introduced after the original draft.

---

<br>

<h1 align="center">📘 Chapter 1 — Introduction</h1>

---

## 1.1 Background of Study

The digital transformation of Small-to-Medium Enterprises (SMEs) has accelerated dramatically over the past decade, with organizations increasingly relying on web applications, cloud-hosted services, and interconnected networks to conduct their business operations [1]. According to the Verizon 2024 Data Breach Investigations Report, 43% of all cyberattacks target small businesses, yet only 14% of SMEs are prepared to defend themselves against such threats [2]. This disparity exists because traditional cybersecurity solutions — enterprise DAST platforms, vulnerability scanners, and Security Operations Centers (SOCs) — are designed for organizations with dedicated security teams, substantial budgets, and deep technical expertise.

Dynamic Application Security Testing (DAST) is a black-box testing methodology that analyzes running applications by simulating real-world attack scenarios to identify exploitable vulnerabilities [3]. Unlike Static Application Security Testing (SAST), which examines source code without execution, DAST evaluates the application in its deployed state, testing for runtime vulnerabilities such as SQL Injection (SQLi), Cross-Site Scripting (XSS), Broken Object Level Authorization (BOLA), and Server-Side Request Forgery (SSRF) [4]. While DAST provides critical security insights, existing tools such as Burp Suite Professional, OWASP ZAP, Tenable Nessus, and Qualys require substantial manual configuration, interpretation of results, and expertise in vulnerability remediation — skills that SME administrators typically lack.

The emergence of Large Language Models (LLMs) and AI-driven automation presents an opportunity to democratize cybersecurity for resource-constrained organizations. By combining deterministic security scanning tools with AI-powered advisory capabilities, it becomes possible to create platforms that not only discover vulnerabilities but also explain their significance in business terms and provide actionable remediation guidance that non-technical users can follow [5].

This project, "Orchestration Security Center," addresses this gap by developing an AI-driven security orchestration platform that automates the complete vulnerability assessment lifecycle — from network reconnaissance through vulnerability scanning, risk scoring, finding deduplication, compliance tagging, and remediation guidance — within a unified, visually intuitive dashboard designed specifically for SME administrators without specialized cybersecurity training. *(updated 2026-05-24: added finding deduplication and compliance tagging as core capabilities — both shipped after the original draft.)*

## 1.2 Problem Statement

Small-to-Medium Enterprises face a critical cybersecurity gap characterized by the following challenges:

1. **Expertise Gap:** SMEs lack dedicated security professionals capable of operating complex DAST tools, interpreting raw vulnerability scan results, and implementing technical remediation strategies. According to a 2024 ISC2 Cybersecurity Workforce Study, there is a global shortage of 4.8 million cybersecurity professionals, with SMEs being disproportionately affected [6].

2. **Tool Fragmentation:** Effective security assessment requires the coordination of multiple tools — port scanners (Nmap), vulnerability scanners (Nuclei, OpenVAS), web application testers, and log management systems (SIEM). Each tool operates independently, producing disparate output formats that require manual correlation and analysis [7].

3. **Cost Barriers:** Enterprise security platforms such as Burp Suite Enterprise ($8,999/year), Tenable.io ($3,278/year for 65 assets), and Qualys VMDR carry licensing costs that are prohibitive for small businesses with limited IT budgets [8].

4. **Alert Fatigue and Prioritization Failure:** Without risk-based scoring, finding deduplication, and contextual analysis, SME administrators are overwhelmed by the volume of raw findings, unable to distinguish critical threats from informational noise, and uncertain about which issues to address first [9]. *(updated 2026-05-24)*

5. **Absence of Actionable Remediation:** Existing tools report technical findings (CVE identifiers, CVSS scores, packet-level evidence) that are meaningful to security professionals but incomprehensible to SME administrators who need plain-language explanations and step-by-step remediation instructions [10].

6. **Compliance Mapping Gap *(added 2026-05-24)*:** SMEs subject to PCI DSS, HIPAA, ISO 27001, or NIST CSF cannot easily map raw scanner findings to the specific compliance controls they violate, forcing manual reconciliation by an external auditor.

> **The central problem this project addresses is:** *How can automated security orchestration, combined with AI-driven advisory capabilities and built-in compliance mapping, provide SMEs with enterprise-grade vulnerability assessment and actionable remediation guidance without requiring specialized cybersecurity expertise?*

## 1.3 Project Objectives

The primary objectives of this project are:

1. **Design and implement a multi-agent security orchestration architecture** that automates the sequential execution of reconnaissance, attack simulation, validation, risk scoring, and reporting through deterministic, rule-based tool chaining organised into four canonical stages with checkpoint-resume on failure. *(updated 2026-05-24: clarified four-stage structure and checkpoint resume.)*

2. **Integrate industry-standard security scanning tools** (Nmap, Nuclei v3.3.8, OpenVAS/GVM) into a unified pipeline that performs comprehensive network discovery, port scanning, service enumeration, and vulnerability detection.

3. **Develop a deterministic UnifiedRiskEngine** that calculates quantitative risk scores (0–100) and health scores (100–0) using CVSS v3.1 environmental adjustment, severity penalties, asset criticality multipliers, network exposure modifiers, and Nuclei confidence weights — ensuring 100% reproducible scoring. *(updated 2026-05-24: CVSS v3.1 environmental scoring added in Phase 4.1.)*

4. **Implement an AI Advisory layer** using Google Gemini 2.0 Flash to generate SME-friendly vulnerability explanations, business impact assessments, and prioritized remediation guidance in non-technical language, with a redaction-and-budget-guarded `llm_guard` for prompt safety.

5. **Build a real-time, visually intuitive security dashboard** using React 18 with interactive components including network topology visualization, risk heatmaps, vulnerability trend charts, live scan orchestration feeds, drill-down drawers, and a per-vulnerability AI remediation panel.

6. **Deploy the platform as a containerized microservices architecture** using Docker Compose with a lite default (6 services) and a `profile: full` heavy stack (6 additional services), integrating Caddy TLS proxy, PostgreSQL, Redis, Celery, Elasticsearch, Kibana, Wazuh SIEM, OpenVAS, and n8n SOAR. *(updated 2026-05-24: profile split + Caddy + n8n.)*

7. **Provide multi-user RBAC, audit trails, and compliance mapping *(added 2026-05-24)*** — JWT-based authentication with three roles (VIEWER, ANALYST, ADMIN), tamper-evident SHA-256 hash chain on agent logs, and automatic mapping of findings to OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, and PCI DSS controls.

8. **Validate the platform** against a controlled Living Lab environment of 8–11 vulnerable containers across four network subnets (DMZ, Corporate, Data, Management), demonstrating effective detection of OWASP Top 10 vulnerabilities and generation of actionable remediation items. *(updated 2026-05-24: Living Lab supersedes the legacy six-target list.)*

## 1.4 Project Scope

### In Scope

- Automated network reconnaissance via Nmap (port scanning, OS detection, service enumeration) *(updated)*
- Web application vulnerability scanning via Nuclei v3.3.8 (template-based detection with service-aware template selection)
- OpenVAS / Greenbone Vulnerability Manager (GVM) integration via GMP for deep network vulnerability assessment
- Deterministic risk and health score calculation with CVSS v3.1 environmental adjustment
- AI-powered advisory explanations via Google Gemini 2.0 Flash (advisory-only role, not autonomous decision-making) with redaction and per-scan/daily token budgets
- Real-time WebSocket-based scan progress streaming and alert notifications via `/ws/events`
- Interactive security dashboard with network topology, risk heatmaps, vulnerability trends, action center, and per-vulnerability remediation drawer
- PDF report generation with digital signature *(updated 2026-05-24)*
- SIEM integration via Wazuh 4.7.2 and Elasticsearch 8.11.1 for log ingestion and correlation (optional, `SIEM_ENABLED` flag)
- Containerized deployment via Docker Compose with profile-gated stack (6 lite + 6 full)
- Caddy 2 reverse proxy providing TLS termination on ports 80/443 *(added 2026-05-24)*
- **JWT-based authentication with three-role RBAC** (VIEWER, ANALYST, ADMIN) *(added 2026-05-24)*
- **Fernet symmetric encryption** of stored target credentials *(added 2026-05-24)*
- **Per-target ScopeGuard** with allowlist enforcement to prevent out-of-scope scanning *(added 2026-05-24)*
- **Finding deduplication** via SHA-256 fingerprint per target *(added 2026-05-24)*
- **Compliance framework tagging** of findings (OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, PCI DSS) *(added 2026-05-24)*
- **n8n SOAR integration** for webhook-driven auto-remediation (optional, `SOAR_ENABLED` flag) *(added 2026-05-24)*
- **Tamper-evident hash chain** on agent log records, with `GET /scans/{id}/audit/verify` *(added 2026-05-24)*
- **Living Lab** of 8–11 vulnerable containers across DMZ / Corporate / Data / Management subnets *(updated 2026-05-24)*

### Out of Scope

- Authenticated scanning with session management (credential-based crawling of post-login pages)
- Mobile application penetration testing
- Static Application Security Testing (SAST) / source code analysis
- Cloud-native deployment on managed services (AWS EKS / Azure AKS / GCP GKE) — Docker Compose only
- Standalone compliance report templates (per-control-family executive summaries) — *individual* vulnerability-to-control mappings are in scope via the Findings API
- Browser fuzzing or client-side JavaScript runtime fuzzing

> *(updated 2026-05-24)* — RBAC, n8n SOAR, ScopeGuard, finding deduplication, and compliance tagging moved from "out of scope / future work" to "in scope" because they are now fully implemented. Authenticated session-based crawling and managed-cloud deployment remain out of scope.

## 1.5 Significance / Motivation of the Study

This project holds significant academic and practical value for several reasons:

**Academic Contribution:** The project demonstrates a novel approach to combining deterministic rule-based security tool chaining with AI-driven advisory capabilities in a multi-agent architecture. Unlike fully autonomous AI security systems that risk unpredictable behavior, Orchestration Security Center employs a hybrid model where all scanning and scoring decisions are deterministic and reproducible, with AI confined to a redaction-and-budget-guarded advisory role for generating human-readable explanations. This architecture pattern — *deterministic orchestration with AI advisory augmentation* — represents a pragmatic approach to trustworthy AI integration in security-critical domains. Coupled with a tamper-evident hash chain on every agent action, the platform is auditable end-to-end. *(updated 2026-05-24)*

**Practical Impact for SMEs:** The platform directly addresses the cybersecurity gap faced by SMEs by providing:

- One-click security assessment that requires no manual tool configuration
- Plain-language vulnerability explanations that non-technical administrators can understand
- Prioritized action items that tell users exactly what to fix first and how
- Visual risk dashboards that provide at-a-glance security posture awareness
- Automated, *digitally signed* report generation for stakeholder communication
- Compliance-mapped findings (OWASP / CWE / ISO 27001 / NIST CSF / PCI DSS) usable directly by auditors

**Industry Relevance:** With the global cybersecurity market projected to reach $376.32 billion by 2029 and the SME cybersecurity segment growing at 14.2% CAGR [11], there is substantial market demand for accessible, affordable security platforms that lower the barrier to entry for small businesses.

**Educational Value:** The project demonstrates the integration of multiple advanced technologies — multi-agent systems, WebSocket real-time communication, container orchestration with compose profiles, force-directed graph visualization, LLM-powered natural language generation with safety guards, JWT-based RBAC, Fernet symmetric encryption, hash-chained audit logging, SOAR automation, and compliance-framework mapping — within a cohesive, production-quality software system.

## 1.6 Report Organization

This report is organized into six chapters:

| Chapter | Description |
|---------|-------------|
| **Chapter 1 — Introduction** | Presents the background, problem statement, objectives, scope, and significance of the project. |
| **Chapter 2 — Literature Review** | Reviews existing DAST platforms, security orchestration architectures, AI applications in cybersecurity, SOAR tooling, and identifies the research gap that Orchestration Security Center addresses. |
| **Chapter 3 — Methodology / System Design** | Describes the Agile SDLC methodology, system architecture, functional and non-functional requirements, use case diagrams, data flow diagrams, database design, RBAC matrix, compliance mapping, and UI wireframes. |
| **Chapter 4 — Implementation** | Details the development environment, module-by-module implementation with code snippets and screenshots, component integration, feature-flag catalogue, and challenges faced. |
| **Chapter 5 — Testing & Evaluation** | Presents the testing strategy, test cases and results across unit, integration, system, and UAT levels, and evaluates performance metrics against the Living Lab. |
| **Chapter 6 — Conclusion & Future Work** | Summarizes project achievements, discusses remaining limitations, and proposes future enhancements. |

---

<br>

<h1 align="center">📚 Chapter 2 — Literature Review</h1>

---

## 2.1 Introduction

This chapter presents a comprehensive review of existing research and commercial solutions in the domains of Dynamic Application Security Testing, security orchestration platforms, AI-driven vulnerability assessment, SOAR (Security Orchestration, Automation and Response), and SME cybersecurity tools. The review establishes the theoretical foundation for the Orchestration Security Center platform and identifies the specific research gap that this project addresses.

## 2.2 Review of Related Existing Systems

### 2.2.1 OWASP ZAP (Zed Attack Proxy)

OWASP ZAP is the most widely used open-source DAST tool, maintained by the Open Web Application Security Project community [12]. ZAP operates as an intercepting proxy that sits between the tester's browser and the target application, capturing and analyzing HTTP traffic to identify vulnerabilities such as SQL Injection, Cross-Site Scripting, and insecure headers. ZAP provides both passive scanning (analyzing observed traffic) and active scanning (sending crafted attack payloads).

- **Strengths:** ZAP is free, open-source, extensible via add-ons, supports REST API automation, and has a large community. Its HUD (Heads-Up Display) mode provides some accessibility for less experienced users.
- **Limitations:** ZAP requires manual proxy configuration, generates technical reports that assume security expertise, provides no AI-driven risk prioritization, and lacks integrated network scanning or SIEM capabilities. SME users must independently correlate ZAP findings with network context and determine remediation priorities [13].

### 2.2.2 Burp Suite Professional / Enterprise

PortSwigger's Burp Suite is the industry standard for professional web application security testing [14]. The Professional edition provides an advanced proxy, active scanner, intruder module for automated attacks, and extensibility through BApps. Burp Suite Enterprise adds automated, scheduled scanning with CI/CD integration.

- **Strengths:** Burp Suite offers the most comprehensive active scanning engine, excellent detection accuracy, a powerful Intruder module for custom attack automation, and detailed vulnerability reports with remediation advice.
- **Limitations:** Burp Suite Professional costs $449/user/year, and Enterprise starts at $8,999/year, making it prohibitively expensive for SMEs. Both editions require significant security expertise to configure, interpret, and act on results. There is no integrated network scanning or SIEM capability — users must operate these as separate tools [15].

### 2.2.3 Tenable Nessus / Tenable.io

Tenable Nessus is a commercial vulnerability scanner that performs network-level vulnerability assessment, configuration auditing, and compliance checking [16]. It maintains a database of over 100,000 plugins covering known CVEs and maintains one of the fastest plugin update cycles in the industry.

- **Strengths:** Nessus provides comprehensive CVE coverage, supports credentialed scanning for deep OS and application assessment, and offers compliance templates for PCI-DSS and CIS benchmarks.
- **Limitations:** Nessus Professional costs $3,990/year. It is primarily a network vulnerability scanner rather than a DAST tool, meaning it does not perform application-layer testing (SQLi, XSS, BOLA). Reports require security expertise to interpret. There is no AI-driven advisory or remediation guidance for non-technical users [17].

### 2.2.4 OpenVAS (Greenbone Vulnerability Management)

OpenVAS is an open-source vulnerability scanner maintained by Greenbone Networks, offering a free alternative to Nessus [18]. It uses the Greenbone Management Protocol (GMP) for API-driven scan management and maintains a community feed of Network Vulnerability Tests (NVTs).

- **Strengths:** OpenVAS is free and open-source, supports comprehensive network vulnerability scanning, provides a web-based management interface (GSA), and offers API access via GMP for automation.
- **Limitations:** OpenVAS has slower scan times compared to Nessus, a steeper learning curve for initial setup, and generates technical reports without AI-driven simplification. It does not perform web application DAST testing and requires manual integration with other tools [19].

### 2.2.5 Nuclei by ProjectDiscovery

Nuclei is a modern, template-based vulnerability scanner designed for fast, configurable scanning across diverse protocols [20]. It uses YAML-based templates that describe vulnerability detection logic, allowing community-driven expansion of detection capabilities.

- **Strengths:** Nuclei is open-source, extremely fast (concurrent scanning), supports HTTP, DNS, TCP, and file protocols, and has a rapidly growing community template library covering CVEs, misconfigurations, default credentials, and exposures.
- **Limitations:** Nuclei requires command-line operation and template selection expertise. Results are technical and require manual interpretation. There is no integrated dashboard, risk scoring, or remediation guidance [21].

### 2.2.6 Wazuh (Open Source SIEM/XDR)

Wazuh is an open-source security platform providing unified SIEM, intrusion detection, vulnerability detection, and compliance monitoring [22]. It collects and analyzes security event data from endpoints, network devices, and cloud workloads, correlating alerts using customizable rule sets.

- **Strengths:** Wazuh is free and open-source, provides log collection, file integrity monitoring, and rootkit detection, integrates with Elasticsearch and Kibana for visualization, and supports multi-platform agent deployment.
- **Limitations:** Wazuh is a monitoring and detection platform, not a DAST tool. It does not perform active vulnerability scanning or attack simulation. Configuration requires Linux system administration expertise. Integration with DAST outputs requires custom development [23].

### 2.2.7 n8n — Open-Source Workflow Automation / Light SOAR *(added 2026-05-24)*

n8n is an open-source, fair-code-licensed workflow automation platform that has become a popular lightweight SOAR option for SME and DevSecOps teams [24]. It exposes HTTP webhook nodes, scheduled triggers, and a large library of integration nodes (HTTP, Slack, email, Jira, GitHub, etc.) that allow security events to be transformed into multi-step automated responses without code.

- **Strengths:** Free / self-hosted, low-code drag-and-drop interface, webhook-driven, and integrates trivially with any system that can issue HTTP POSTs. Suitable as the response-automation tier in an SME stack that already has a SIEM and a DAST.
- **Limitations:** n8n is generic workflow software, not a security-aware orchestrator — it has no built-in concept of scan, finding, or risk score. Without a wrapper that publishes structured events to it, security teams must build the orchestration logic themselves.

### 2.2.8 Caddy — Modern HTTPS Reverse Proxy *(added 2026-05-24)*

Caddy is a modern, open-source web server known for automatic HTTPS via Let's Encrypt and a deliberately small configuration footprint [25]. In a containerised security platform, Caddy acts as the TLS termination layer in front of the application and frontend containers, satisfying NFR-10 (TLS protection of data in transit) with zero certificate management overhead.

## 2.3 Comparison of Existing Solutions

> **Table 2.1:** Comparison of Existing DAST and Security Platforms *(updated 2026-05-24 — added Authentication/RBAC, Compliance Mapping, SOAR Hook, and Tamper-Evident Audit columns; numbers reflect 2024–2026 list prices.)*

| Feature | OWASP ZAP | Burp Suite Enterprise | Nessus | OpenVAS | Nuclei | **Orchestration Security Center** |
|---|---|---|---|---|---|---|
| **License** | Free / OSS | $8,999/yr | $3,990/yr | Free / OSS | Free / OSS | **Free / OSS** |
| **Web App DAST** | Yes | Yes | No | No | Partial | **Yes** |
| **Network Scanning** | No | No | Yes | Yes | Partial | **Yes (Nmap)** |
| **Template Scanning** | No | No | Plugins | NVTs | Yes | **Yes (Nuclei v3.3.8)** |
| **AI Advisory** | No | No | No | No | No | **Yes (Gemini 2.0 Flash, guarded)** |
| **Risk Scoring** | CVSS only | Severity | CVSS | CVSS | Severity | **CVSS v3.1 + Unified Custom** |
| **Auth + RBAC** | No / N/A | Enterprise SSO | User+role | Yes | No | **JWT + 3 roles (VIEWER/ANALYST/ADMIN)** |
| **Compliance Mapping** | No | Partial | Templates | Limited | No | **OWASP+CWE+ISO+NIST+PCI per finding** |
| **SME-Friendly UI** | Moderate | No | No | No | No | **Yes** |
| **Real-Time Dashboard** | No | Limited | Limited | GSA | No | **Yes (WebSocket /ws/events)** |
| **SIEM Integration** | No | No | Yes | No | No | **Yes (Wazuh + ES, optional)** |
| **SOAR Hook** | No | No | No | No | No | **Yes (n8n, optional)** |
| **Tamper-Evident Audit** | No | Partial | No | No | No | **SHA-256 hash chain on agent logs** |
| **Containerized Deploy** | Manual | No | No | Docker | Docker | **Docker Compose (profile split)** |
| **Remediation Guidance** | Generic | Detailed | CVE-based | CVE-based | Template | **AI-Generated + framework-tagged** |
| **Target Audience** | Pentesters | Pentesters | IT Security | IT Security | DevSecOps | **SME Admins + Auditors** |

## 2.4 Technologies and Tools Reviewed

### 2.4.1 FastAPI — Modern Python Web Framework

FastAPI is a high-performance Python web framework built on Starlette (ASGI) and Pydantic, designed for building APIs with automatic OpenAPI documentation [26]. Key features relevant to this project include native async/await support for concurrent I/O operations, automatic request validation via Pydantic models, built-in WebSocket support for real-time communication, and auto-generated interactive API documentation (Swagger UI). FastAPI benchmarks show throughput comparable to Node.js and Go frameworks while maintaining Python's ecosystem advantages for security tool integration [27].

### 2.4.2 React — Declarative UI Library

React is a JavaScript library for building component-based user interfaces, maintained by Meta [28]. This project leverages React 18's concurrent rendering features, the **TanStack React Query v5** library for server state management with automatic cache invalidation, and **Zustand v4.4** for lightweight client-side state management. The component-based architecture enables modular dashboard design where each security widget (StatCards, NetworkTopology, RiskHeatmap, RemediationPanel) operates as an independent, reusable unit. *(updated 2026-05-24: corrected TanStack version, kept Zustand.)*

### 2.4.3 D3.js and Force-Directed Graphs

D3.js (Data-Driven Documents) is a JavaScript library for creating dynamic, interactive data visualizations [29]. The project uses D3's force simulation algorithm (via **react-force-graph-2d v1.25**) to render network topology maps where nodes represent discovered network assets, edges represent network relationships, and node properties (color, size) encode risk severity and vulnerability count. Static charts (VulnTrend, RiskHeatmap, SeverityDonut) are rendered with **Recharts v2.10**. *(updated 2026-05-24: replaced "Chart.js" claim — Chart.js is not installed; Recharts is.)*

### 2.4.4 Nmap — Network Mapper

Nmap is the industry-standard open-source network scanning tool for host discovery, port scanning, service detection, and OS fingerprinting [30]. The project integrates Nmap via a subprocess-based wrapper (`backend/app/services/nmap_wrapper.py`) rather than `python-nmap`, using it as the first stage of the reconnaissance pipeline to discover live hosts, open ports, running services, and operating system information.

### 2.4.5 Docker Compose — Container Orchestration

Docker Compose enables the definition and management of multi-container applications through a declarative YAML configuration [31]. The project's `docker-compose.yml` orchestrates 6 always-on services in lite mode plus 6 additional services under the `profile: full` flag (12 total at maximum), with defined dependencies, resource limits, networking, and persistent storage volumes, enabling one-command deployment of the entire platform stack. A companion `docker-compose.lab.yml` provisions the Living Lab. *(updated 2026-05-24: profile-split architecture.)*

### 2.4.6 Google Gemini AI — Large Language Model

Google Gemini is a family of multimodal large language models developed by Google DeepMind [32]. This project uses the `gemini-2.0-flash` model in an advisory-only capacity to generate natural language explanations of security findings, business impact assessments, and remediation guidance. The model is not used for autonomous decision-making; all scanning, scoring, and action item generation are deterministic. The SDK package is **`google-genai>=0.8.0`** (the unified Google Gen AI SDK), and every LLM call passes through `llm_guard.py` for prompt redaction (cookies, auth headers, PII, internal hostnames) and budget enforcement (daily 500k tokens, per-scan 50k tokens). *(updated 2026-05-24: corrected SDK package name from `google-generativeai`; added llm_guard.)*

### 2.4.7 Celery and Redis — Distributed Task Queue

Celery is a distributed task queue framework for Python that enables asynchronous background task execution [33]. Combined with Redis 7 as a message broker and result backend, Celery handles long-running scan operations without blocking the API server. Redis additionally serves as the Pub/Sub backbone for real-time WebSocket event broadcasting through the `ws_events` channel.

### 2.4.8 PostgreSQL — Relational Database

PostgreSQL 15 is used as the primary relational database, accessed through SQLAlchemy 2.0 ORM with both synchronous and asynchronous session support [34]. The async driver (`asyncpg`) enables high-throughput database operations during concurrent scan processing. SQLite (`aiosqlite`) is available as a fallback for development environments without a Postgres instance.

### 2.4.9 Caddy — TLS Reverse Proxy *(added 2026-05-24)*

Caddy 2 (Alpine image) sits at the edge of the deployment, exposing ports 80 and 443. It terminates TLS using automatically issued certificates, forwards HTTP traffic to the FastAPI backend on port 8000, and serves the React production bundle. The Caddyfile is intentionally short — no manual certificate management or rotation logic is needed.

### 2.4.10 n8n — SOAR Automation *(added 2026-05-24)*

n8n (n8nio/n8n) provides webhook-driven workflow automation. When `SOAR_ENABLED=true`, the backend's `soar_orchestrator.py` posts structured event payloads to n8n webhooks, which trigger user-authored workflows (Slack notifications, Jira ticket creation, firewall rule updates, etc.). n8n runs under the `profile: full` flag.

## 2.5 Summary / Research Gap

The literature review reveals a clear research gap at the intersection of four domains:

1. **Tool Integration Gap:** No existing open-source platform combines network scanning (Nmap), template-based vulnerability detection (Nuclei), comprehensive vulnerability assessment (OpenVAS), SIEM (Wazuh), and SOAR (n8n) into a single, unified orchestration pipeline.

2. **AI Advisory Gap:** While AI is increasingly used in cybersecurity for anomaly detection and threat intelligence, no existing DAST platform provides AI-generated, plain-language vulnerability explanations and remediation guidance specifically designed for non-technical SME administrators — with redaction and budget guards that make the LLM usage trustworthy in security-critical workflows. *(updated 2026-05-24)*

3. **Compliance Mapping Gap *(added 2026-05-24)*:** No existing open-source DAST platform automatically tags each finding with the specific OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, and PCI DSS controls it violates, leaving auditors and SME owners to perform that reconciliation manually.

4. **Accessibility Gap:** Existing platforms are designed for security professionals. No open-source solution provides a complete, real-time security dashboard with interactive visualizations (force-directed topology, risk heatmaps, live orchestration feeds, drill-down drawers) plus a complete JWT + RBAC layer that an SME owner without cybersecurity training can effectively use to understand and improve their security posture.

> **Orchestration Security Center** addresses this gap by combining deterministic, multi-agent security orchestration with AI-driven advisory capabilities, automatic compliance-control tagging, RBAC, and a tamper-evident audit chain inside an SME-optimized dashboard — a combination that does not exist in any reviewed platform.

---

<br>
<h1 align="center">🏗️ Chapter 3 — Methodology / System Design</h1>

---

## 3.1 Introduction

This chapter describes the development methodology, system architecture, requirements analysis, and design artifacts for the Orchestration Security Center platform. The design follows an iterative Agile approach with four development phases spanning sixteen weeks, informed by the Software Development Life Cycle (SDLC) principles. All Mermaid figures referenced here (Figures 3.1 through 3.16) are maintained in the companion [`FYP_Figures.md`](FYP_Figures.md) and were last audited against the live codebase on 2026-05-24.

## 3.2 Research / Development Methodology

### 3.2.1 Agile SDLC with Learning Integration

The project adopts a modified Agile methodology with an integrated learning model, where each development phase is preceded by a structured learning sprint. This approach was necessitated by the team's diverse technical backgrounds and the project's requirement to integrate multiple unfamiliar technologies across four sub-teams.

The development follows four phases:

**Phase 1 — Foundation & Learning (Weeks 1–4):**
Each team member studied their assigned technologies through structured tutorials, hands-on exercises, and sub-leader-led teaching sessions. The phase concluded with learning demonstrations where each sub-team presented their understanding.

**Phase 2 — Core Development (Weeks 5–9):**
Sub-teams developed their modules in isolation: Backend/AI Core (FastAPI, agent orchestrator, risk engine), Frontend/Visualization (React dashboard, D3.js topology), Security Engine (Nmap / Nuclei integration, scan pipeline), and DevOps/QA (Docker, CI/CD, testing).

**Phase 3 — Integration & Enhancement (Weeks 10–13):**
All modules were integrated, bugs from cross-team dependencies were resolved, and enhancement features (RBAC + JWT auth, PDF report signing, Caddy TLS proxy, n8n SOAR webhook, ScopeGuard, compliance tagging, finding deduplication, hash-chained audit log, UI polish) were added. User Acceptance Testing was conducted with all eleven team members. *(updated 2026-05-24: enhancement list expanded to match shipped features.)*

**Phase 4 — Presentation & Finalization (Weeks 14–16):**
Final testing, documentation, demo video recording, and university presentation preparation.

### 3.2.2 Team Structure

The project team of eleven members was organized into four sub-teams:

| Sub-Team | Members | Responsibilities |
|----------|:-------:|-----------------|
| **Sub-Team 1** — Backend & AI Core | 3 | FastAPI, database, Celery, AI agents, LLM guard |
| **Sub-Team 2** — Frontend & Visualization | 3 | React, Tailwind CSS, D3.js, Recharts |
| **Sub-Team 3** — Security & Scanning Engine | 2 | Nmap, Nuclei, OpenVAS, Wazuh, ScopeGuard |
| **Sub-Team 4** — DevOps & Quality Assurance | 3 | Docker (lite + full profiles), Caddy, CI/CD, testing, documentation |

Weekly rituals included Monday kickoff meetings, daily sub-team standups, Wednesday integration syncs between sub-leaders, and Friday demo/review sessions.

### 3.2.3 Version Control and Collaboration

The project used Git for version control with GitHub as the remote repository. Feature branches were used for isolated development, with pull request reviews enforced before merging to the main branch. Notion served as the project management platform for task tracking, sprint planning, and documentation.

## 3.3 System Architecture / Framework

### 3.3.1 High-Level Architecture

Orchestration Security Center follows a client-server architecture with an edge TLS layer and an agentic orchestration layer. The system comprises four main tiers *(updated 2026-05-24: edge tier added)*:

**Edge Tier:**
A Caddy 2 (Alpine) reverse proxy terminating TLS on ports 80 and 443, forwarding HTTP traffic to the FastAPI backend and serving the React production bundle.

**Presentation Tier (Frontend):**
A React 18 single-page application built with Vite 5, using Tailwind CSS 3 for styling and a custom cybersecurity-themed design system. The frontend communicates with the backend via REST API calls (Axios with automatic JWT injection) and receives real-time updates through a persistent WebSocket connection at `/ws/events` (terminated by Caddy in production).

**Application Tier (Backend):**
A FastAPI server providing RESTful API endpoints, WebSocket management, and an agent orchestration engine. All routes except `/auth/login` and `/config` are gated by JWT Bearer authentication and a role dependency (`require_role`). Background tasks are delegated to Celery workers via the Redis message broker. The orchestration layer manages the sequential execution of security agents organised into four canonical stages (Reconnaissance → Attack → Validation → Scoring) with a checkpoint-resume mechanism. An optional Celery Beat scheduler is available under the `profile: full` flag for recurring tasks.

**Data Tier:**
PostgreSQL 15 serves as the primary relational database (accessed via SQLAlchemy 2.0 ORM with the `asyncpg` async driver), Redis 7 handles caching, the Celery message broker, and Pub/Sub event streaming through the `ws_events` channel, and Elasticsearch 8.11 (optional, `profile: full`) stores log data for SIEM operations. SQLite is supported as a development-mode fallback via `aiosqlite`.

**External Integrations:**

- Nmap — network discovery and service enumeration (subprocess wrapper)
- Nuclei v3.3.8 — template-based vulnerability scanning with service-aware template selection
- OpenVAS / Greenbone Vulnerability Manager — deep network vulnerability assessment via GMP (optional, `profile: full`)
- Wazuh 4.7.2 — SIEM manager for endpoint monitoring and log correlation (optional, `profile: full`)
- Kibana 8.11.1 — log visualisation on top of Elasticsearch (optional)
- n8n — SOAR webhook automation for auto-remediation (optional, `profile: full`)
- Google Gemini 2.0 Flash — AI advisory and LLM-based validation, accessed through `llm_guard.py` with redaction and budget enforcement
- Subfinder — passive subdomain discovery used by `DiscoveryAgent` for EASM

> *[**Figure 3.1: High-Level System Architecture Diagram** — see [`FYP_Figures.md`](FYP_Figures.md#figure-31--high-level-system-architecture)]*
>
> A four-tier architecture diagram showing the Caddy edge tier terminating TLS on ports 80/443, the React frontend (Vite + Tailwind), the FastAPI backend with the AgentOrchestrator and Celery worker, the data tier (PostgreSQL 15, Redis 7, optional Elasticsearch 8.11), and external integrations (Nmap, Nuclei v3.3.8, OpenVAS, Wazuh 4.7.2, n8n, Subfinder, Google Gemini 2.0 Flash). All services are orchestrated via Docker Compose with a lite default and a `profile: full` heavy stack.

### 3.3.2 Agent Orchestration Pipeline

The core of the platform is the multi-agent orchestration system, implemented in the `AgentOrchestrator` class (`backend/app/services/agent_orchestrator.py`). The pipeline is organised into **four canonical stages**, each potentially running multiple agents. Every stage writes a checkpoint to `Scan.checkpoint`, so a Celery retry resumes from the last completed stage. *(updated 2026-05-24: previous "5 sequential agents" framing replaced with the actual four-stage / multi-agent model.)*

**Stage 1 — Reconnaissance:**
- `ReconAgent` runs Nmap port-scanning and service enumeration (via `nmap_wrapper.py`) and a Playwright-based web crawl (with `httpx` fallback) for endpoint discovery and tech-stack detection.
- `DiscoveryAgent` (optional) performs passive subdomain discovery via Subfinder for External Attack Surface Management (EASM).
- Outputs: discovered endpoints, tech stack profile, network assets, subdomains.
- Checkpoint: `recon_done`.

**Stage 2 — Attack:**
- `AttackAgent` delegates to Nuclei v3.3.8 via `nuclei_wrapper.py`. Nuclei templates are selected service-aware: each Nmap-discovered service maps to a set of template tags (e.g. HTTP → `cve,exposures,misconfiguration`; FTP → `default-logins,misconfiguration,cve`; SMB → `cve,misconfiguration`).
- For each finding, the agent persists `raw_request`, `raw_response`, `evidence_hash` (sha256), `cvss_vector`, `cvss_score`, and `template_id`, ensuring full evidence auditability and deduplication.
- Rate limiting is enforced via `aiolimiter` at the target's `max_rps` setting.
- Checkpoint: `attack_done`.

**Stage 3 — Validation:**
- `ValidationAgent` re-probes findings deterministically (active re-probe, not just confidence filtering).
- `InfrastructureAgent` runs OS/package-level CVE checks against discovered assets.
- `IntelligenceAgent` (optional, gated by `LLM_VALIDATION_ENABLED`) calls Google Gemini through `llm_guard.py` to produce a plain-language justification or to flag suspected false positives.
- Output: filtered findings with `validation_notes` and updated `confidence_score`.
- Checkpoint: `validated`.

**Stage 4 — Scoring:**
- `UnifiedRiskEngine.calculate_scan_risk_v2()` computes the per-vulnerability CVSS v3.1 environmental score (`cvss.py`), multiplies by Nuclei confidence, adds port penalties, applies the asset-criticality multiplier (0.8×–1.5×), and the exposure modifier (0.6× internal / 1.0× public), capped at 100. Results plus a per-vuln breakdown are persisted to `Scan.risk_breakdown`.
- Action items are generated for CRITICAL/HIGH vulnerabilities and high-risk open ports.
- Checkpoint: `risk_scored`.

**Post-Scan:**
- `ReportingAgent` generates a Markdown report and a digitally signed PDF (via `pdf_generator.py` + `report_signer.py`), broadcasts a `RISK_UPDATE` WebSocket event, and sets `Scan.checkpoint = "reported"`.
- `SIEMAgent` (optional, gated by `SIEM_ENABLED`) forwards events to Wazuh/Elasticsearch via `wazuh_integration.py` and `elastic_integration.py`.
- `soar_orchestrator.py` (optional, gated by `SOAR_ENABLED`) posts a structured event to an n8n webhook for downstream automation.
- `finding_dedup.py` collapses the new vulnerabilities into existing `Finding` rows (or creates new ones) using a SHA-256 fingerprint per target.
- `framework_tagger.py` tags the resulting findings with OWASP Top 10 / CWE / ISO 27001 Annex A / NIST CSF / PCI DSS control IDs.
- `topology_generator.py` rebuilds and caches the Mermaid network topology diagram in Redis (`osc:topology:mermaid`, TTL 1 h).
- `alert_correlator.py` correlates incoming Wazuh alerts against the persisted vulnerability set.

> *[**Figure 3.2: Agent Orchestration Pipeline Flowchart** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> A diagram showing the four-stage pipeline (Recon → Attack → Validation → Scoring) coordinated by `AgentOrchestrator`, with per-stage agents, checkpoint ladder, and the WebSocket broadcast over Redis pub/sub.

### 3.3.3 UnifiedRiskEngine Design

The platform ships two related but distinct scoring systems *(updated 2026-05-24: separation of custom Unified scoring from CVSS v3.1)*:

1. **`UnifiedRiskEngine` custom scoring** — the deterministic Risk Score (0–100) and Health Score (100–0) documented in Tables 3.6 and 3.7. The Risk Score is calculated in `calculate_scan_risk_v2()` which iterates each vulnerability, parses or defaults its CVSS vector, applies the environmental adjustment, multiplies by Nuclei confidence, adds port penalties, then multiplies by asset criticality and exposure modifiers, capped at 100. The Health Score uses simple fixed deductions and a 90-cap floor when any vulnerability exists.

2. **`cvss.py` full CVSS v3.1 calculator** — implements the official FIRST CVSS v3.1 base + environmental score formula, used for per-vulnerability CVSS enrichment. Functions include `parse_vector()` for parsing Nuclei-supplied vectors and `severity_to_default_vector()` for vulnerabilities that arrive without a vector.

> *[**Figure 3.3: UnifiedRiskEngine Calculation Logic** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Table 3.6:** Severity Weight Constants

| Severity Level | Weight (Points) |
|:-:|:-:|
| CRITICAL | 25 |
| HIGH | 15 |
| MEDIUM | 7 |
| LOW | 2 |
| INFO | 0 |

**Table 3.7:** High-Risk Port Penalties

| Port | Service | Penalty (Points) |
|:-:|---|:-:|
| 21 | FTP | 15 |
| 23 | Telnet | 20 |
| 445 | SMB | 20 |
| 3389 | RDP | 15 |
| 6379 | Redis | 10 |
| 5432 | PostgreSQL | 10 |
| 3306 | MySQL | 10 |
| 3000 | Dev App | 5 |
| 8080 | Proxy/App | 5 |

**Asset Criticality Multipliers:** CRITICAL = 1.5×, HIGH = 1.2×, MEDIUM = 1.0×, LOW = 0.8×

**Exposure Modifiers:** Internal (RFC-1918 / 127.0.0.0/8 / localhost) = 0.6×, Public = 1.0×

**Health Score Deductions:** CRITICAL vulnerability = −20, HIGH = −10, MEDIUM = −5, High-risk open port (21, 23, 445, 3389) = −15 each. The score is capped at 90 if any vulnerability exists and floored at 0.

The dual-score approach provides both a technical risk metric and an SME-friendly health metric, with the per-vulnerability breakdown surfaced to the dashboard via the `RiskBreakdownDrawer` component and humanised by `scoring_explainer.py` for the AI Brain tab.

### 3.3.4 Real-Time Communication Architecture

The platform implements a publish-subscribe pattern for real-time event streaming *(updated 2026-05-24: `/ws/events` channel, Caddy-terminated WSS in production)*:

1. Celery workers publish scan events to the Redis `ws_events` channel using `event_publisher.py`.
2. The FastAPI backend runs a background `redis_event_listener()` asyncio task (started in the `lifespan` context manager) that subscribes to this channel.
3. Received events are broadcast to all connected WebSocket clients via the `ConnectionManager` in `ws_manager.py`.
4. The React frontend maintains a persistent WebSocket connection — `wss://localhost/ws/events` through Caddy in production, or `ws://localhost:8000/ws/events` in development — with automatic 3-second reconnection on disconnect and heartbeat pings to detect stale connections.
5. Events are dispatched through the `RealTimeContext` provider, updating KPI scores, orchestration logs, and alert feeds in real time. Recognised event types are `RISK_UPDATE`, `LOG_STREAM`, `SCAN_PROGRESS`, `SCAN_STARTED`, `SCAN_STATUS`, `ALERT_NEW`, and `CLEAR_LOGS`.
6. The Redis listener implements exponential backoff (2s → 4s → 8s … capped at 32s) for resilient reconnection.

### 3.3.5 Authentication & RBAC *(added 2026-05-24)*

Authentication is JWT-based, using bcrypt-hashed passwords and HS256-signed tokens carrying `{sub, role, exp}` with a 30-minute default expiry. The auth implementation lives in `backend/app/core/security.py` (token creation, password verification, role dependency) and `backend/app/api/v1/endpoints/auth.py` (login/logout/me endpoints).

Three RBAC roles are defined in `models/user.py` (`UserRole` enum):

> *[**Figure 3.14: RBAC Role/Permission Matrix** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Table 3.8:** RBAC Role / Permission Matrix *(new — 2026-05-24)*

| Capability | VIEWER | ANALYST | ADMIN |
|---|:-:|:-:|:-:|
| Login + view own profile | ✓ | ✓ | ✓ |
| Read dashboard, vulnerabilities, findings, network assets, reports | ✓ | ✓ | ✓ |
| Read audit logs | ✓ | ✓ | ✓ |
| Initiate scans (`POST /scans`) | – | ✓ | ✓ |
| Update vulnerability or finding status | – | ✓ | ✓ |
| Target CRUD (`POST/PUT/DELETE /targets`) | – | – | ✓ |
| OpenVAS scheduling (`POST /openvas/scan`) | – | – | ✓ |
| Feature-flag configuration | – | – | ✓ |
| User CRUD via `/rbac/*` | – | – | ✓ |
| Verify audit hash chain (`GET /scans/{id}/audit/verify`) | – | – | ✓ |
| Trigger n8n SOAR webhooks | – | – | ✓ |

> *[**Figure 3.15: Auth & JWT Token Lifecycle** — see [`FYP_Figures.md`](FYP_Figures.md)]*

Stored target credentials (used for authenticated DAST in future iterations) are encrypted at rest using Fernet symmetric encryption keyed by `CREDENTIAL_ENCRYPTION_KEY` (see `core/crypto.py`).

### 3.3.6 Tamper-Evident Audit Chain *(added 2026-05-24)*

Every `AgentLog` row carries `prev_hash` (the previous log row's `this_hash` for the same scan, or 64 zeros for the first row) and `this_hash = sha256(prev_hash + canonical_payload)`, where the payload is a deterministic JSON serialisation of `{scan_id, agent_name, action, reasoning}` (sorted keys, ASCII-only). A database trigger blocks UPDATE/DELETE on the `agent_logs` table — the chain can only grow. Integrity is verified by `GET /api/v1/scans/{id}/audit/verify`, which recomputes each hash and reports the first mismatched row if tampering occurred.

A separate `audit_logs` table (`models/audit_log.py`) records actor-attributed admin actions (user create, role change, disable, password reset, target CRUD) for RBAC compliance — distinct from the agent action chain.

> *[**Figure 3.16: Tamper-Evident AgentLog Hash Chain** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 3.3.7 Compliance Framework Tagging *(added 2026-05-24)*

After each finding is created or updated, `framework_tagger.py` auto-tags it with the specific control IDs it violates. Tags are stored on `Finding.control_tags` as a JSON object.

**Table 3.9:** Compliance Framework Tag Mapping *(new — 2026-05-24)*

| Field | Example Value | Source |
|---|---|---|
| `owasp_top10` | `"A03:2021"` (Injection) | OWASP Top 10:2021 |
| `cwe` | `"CWE-89"` (SQLi) | CWE Database |
| `iso27001_annex_a` | `"A.12.6.1"` (Mgmt of technical vulnerabilities) | ISO/IEC 27001:2022 |
| `nist_csf_function` | `"PR.IP"` (Protect — Info Protection) | NIST CSF v1.1 |
| `pci_dss_requirement` | `"6.3.1"` (Patch software flaws) | PCI DSS v4.0 |

Empty dictionaries `{}` are written when the template category is unknown — tags are never invented.

### 3.3.8 ScopeGuard *(added 2026-05-24)*

`scope_guard.py` enforces a per-target allowlist of hostnames and CIDR ranges (`Target.scope_allowlist`). Every outbound HTTP request emitted by `ReconAgent`, `AttackAgent`, and `ValidationAgent` is checked with `assert_in_scope(url)`. Out-of-scope URLs raise `ScopeViolation`, which is logged as an `AgentLog` entry and aborts the offending request without halting the scan. If `scope_allowlist` is unset, only the hostname extracted from `Target.base_url` is allowed by default.

### 3.3.9 Finding Deduplication *(added 2026-05-24)*

`finding_dedup.py` collapses individual `Vulnerability` "observations" into persistent `Finding` rows. The fingerprint is `sha256(target_id + vuln_type + normalised_url + parameter + evidence_signature)` and is unique per target (enforced by a unique constraint). Each `Vulnerability` row carries a `finding_id` FK linking back to its parent `Finding`. Status transitions (OPEN → FIXED → REOPENED → FALSE_POSITIVE → ACCEPTED) survive multiple scans, and the SLA clock on `Finding.due_date` tracks remediation deadlines.

## 3.4 Requirements Analysis

### 3.4.1 Functional Requirements

> **Table 3.1:** Functional Requirements Specification *(updated 2026-05-24: FR-20 through FR-27 added.)*

| ID | Requirement | Priority | Description |
|---|---|---|---|
| FR-01 | Target Management | High | Users shall be able to create, read, update, and delete scan targets with URL, name, asset value, data sensitivity, environment type, compliance tags, scope allowlist, and rate-limit attributes. |
| FR-02 | Automated Scan Initiation | High | Users shall be able to initiate a full AI-driven scan on any registered target via a single button click, specifying scan type (quick, full, custom). |
| FR-03 | Network Reconnaissance | High | The system shall automatically perform Nmap port scanning, OS detection, and service enumeration on the target during the reconnaissance phase. |
| FR-04 | Web Application Crawling | High | The system shall crawl the target web application using Playwright (or httpx fallback) to discover endpoints, forms, and technology stack. |
| FR-05 | Vulnerability Scanning | High | The system shall execute Nuclei template scans with service-aware template selection based on Nmap-discovered services, persisting raw request/response and an evidence hash for every finding. |
| FR-06 | OpenVAS Integration | Medium | Users shall be able to initiate OpenVAS scans via the dashboard, view results, and schedule recurring scans (`profile: full`). |
| FR-07 | Vulnerability Validation | High | The system shall re-probe findings deterministically and (optionally) request LLM-based justification via a redacted, budget-guarded Gemini call. |
| FR-08 | Risk Score Calculation | High | The system shall calculate a deterministic Risk Score (0–100) using CVSS v3.1 environmental adjustment, severity penalties, asset criticality multipliers, port penalties, and exposure modifiers. |
| FR-09 | Health Score Calculation | High | The system shall calculate a Health Score (100–0) providing an at-a-glance security posture metric for SME owners. |
| FR-10 | AI Advisory Generation | Medium | The system shall generate SME-friendly vulnerability explanations, business impact assessments, and remediation guidance using Google Gemini 2.0 Flash via `llm_guard.py` with redaction and token budgets. |
| FR-11 | Action Item Generation | High | The system shall automatically create prioritized action items for CRITICAL/HIGH vulnerabilities and exposed high-risk ports. |
| FR-12 | Real-Time Dashboard | High | The dashboard shall display live KPI cards (health score, vulnerability counts, asset count, scan status) with animated counters and real-time updates via WebSocket `/ws/events`. |
| FR-13 | Network Topology Visualization | Medium | The dashboard shall render a force-directed graph showing discovered network assets with risk-color-coded nodes and interactive click-to-detail functionality. |
| FR-14 | Risk Heatmap | Medium | The dashboard shall display a treemap visualization of vulnerability severity distribution. |
| FR-15 | Orchestration Feed | High | The dashboard shall display a live stream of agent actions during active scans, capped at 200 entries. |
| FR-16 | Vulnerability Management | High | Users shall be able to view, filter, and update the status of discovered vulnerabilities (OPEN, IN_PROGRESS, FIXED, FALSE_POSITIVE, ACCEPTED). |
| FR-17 | PDF Report Generation | Medium | The system shall generate downloadable, digitally signed PDF reports containing executive summaries, vulnerability details, and remediation recommendations. |
| FR-18 | SIEM Integration | Low | The system shall integrate with Wazuh and Elasticsearch for log ingestion, storage, correlation display, and inbound alert correlation (`profile: full`). |
| FR-19 | Scan History | Medium | Users shall be able to view a chronological history of all scan executions with status, duration, finding counts, and per-scan CVSS breakdown drill-down. |
| **FR-20** | **JWT Authentication & RBAC** | **High** | The platform shall require JWT Bearer authentication on every route except `/auth/login` and `/config`, enforce VIEWER / ANALYST / ADMIN role separation, and provide a Users management page for ADMIN role. *(new — 2026-05-24)* |
| **FR-21** | **Finding Deduplication** | **High** | The platform shall deduplicate vulnerabilities across re-scans by computing a SHA-256 fingerprint per target and surfacing the OPEN/FIXED/REOPENED lifecycle through a `Finding` entity. *(new — 2026-05-24)* |
| **FR-22** | **Compliance Framework Tagging** | **High** | The platform shall automatically tag each `Finding` with the OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, and PCI DSS controls it violates. *(new — 2026-05-24)* |
| **FR-23** | **ScopeGuard Enforcement** | **High** | Every outbound HTTP request emitted by an agent shall be checked against the target's `scope_allowlist`; out-of-scope requests shall be aborted and logged. *(new — 2026-05-24)* |
| **FR-24** | **Tamper-Evident Audit Chain** | **Medium** | Every AgentLog row shall be hash-chained (SHA-256) so that audit-trail tampering is detectable; an `audit/verify` endpoint shall expose chain integrity. *(new — 2026-05-24)* |
| **FR-25** | **SOAR Webhook Integration** | **Low** | When `SOAR_ENABLED=true`, scoring and validation events shall be posted to an n8n webhook for downstream automation. *(new — 2026-05-24)* |
| **FR-26** | **Credential Encryption at Rest** | **High** | Stored target credentials shall be Fernet-encrypted using `CREDENTIAL_ENCRYPTION_KEY`. *(new — 2026-05-24)* |
| **FR-27** | **TLS via Caddy** | **High** | All client traffic shall terminate TLS at the Caddy 2 reverse proxy on ports 80/443. *(new — 2026-05-24)* |

### 3.4.2 Non-Functional Requirements

> **Table 3.2:** Non-Functional Requirements Specification *(updated 2026-05-24)*

| ID | Requirement | Category | Description |
|---|---|---|---|
| NFR-01 | Performance | Response Time | API endpoints shall respond within 500 ms for read operations under normal load. |
| NFR-02 | Performance | Scan Throughput | Quick scans shall complete within 5 minutes for a single target on the lab network. |
| NFR-03 | Scalability | Concurrent Users | The WebSocket server shall support at least 50 concurrent dashboard connections. |
| NFR-04 | Availability | Uptime | The platform shall maintain 99% availability within the lab environment during testing periods. |
| NFR-05 | Reliability | Data Integrity | Risk scores shall be 100% deterministic — identical inputs must produce identical outputs. |
| NFR-06 | Reliability | Reconnection | The WebSocket client shall automatically reconnect within 3 seconds of connection loss; the Redis listener shall reconnect with exponential backoff (2s → 32s cap). |
| NFR-07 | Usability | Accessibility | Dashboard visualizations shall use color-coding consistent with industry severity standards (red=critical, orange=high, yellow=medium, cyan=low, grey=info). |
| NFR-08 | Usability | SME Friendliness | AI-generated remediation guidance shall be comprehensible to users without cybersecurity training. |
| NFR-09 | Portability | Deployment | The entire platform shall be deployable on any Docker-capable machine via a single `docker compose up -d` command for lite mode, or `docker compose --profile full up -d` for the full stack. |
| NFR-10 | Security | Data Protection | Database credentials and API keys shall be stored as environment variables, never hardcoded. Stored target credentials shall be Fernet-encrypted at rest. All client traffic shall terminate TLS at Caddy. |
| NFR-11 | Maintainability | Code Structure | Backend shall follow a modular service-layer architecture with clear separation between API routes, business logic, and data access. |
| NFR-12 | Resource Efficiency | Memory | PostgreSQL shall operate within 256 MB RAM, Redis within 96 MB, and the FastAPI backend within 384 MB resource limits (per `deploy.resources.limits`). *(updated 2026-05-24: matches current docker-compose.yml.)* |
| **NFR-13** | **Auditability** | **Compliance** | Every agent action shall be SHA-256 hash-chained and verifiable via the `audit/verify` endpoint. *(new — 2026-05-24)* |
| **NFR-14** | **Determinism of LLM Costs** | **Cost / Safety** | LLM usage shall be capped at 500,000 tokens/day platform-wide and 50,000 tokens/scan. *(new — 2026-05-24)* |
| **NFR-15** | **Rate-Limit Compliance** | **Safety** | Outbound scanner traffic shall be rate-limited per-target by `Target.max_rps` (default 10). *(new — 2026-05-24)* |

## 3.5 Use Case / Data Flow Diagrams

### 3.5.1 Use Case Diagram

> *[**Figure 3.7: Use Case Diagram** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Primary Actors** *(updated 2026-05-24: three RBAC roles instead of single SME admin)*: VIEWER, ANALYST, ADMIN.

**Use Cases** (inheritance-based — ANALYST inherits VIEWER, ADMIN inherits ANALYST):

| # | Use Case | Minimum Role |
|:-:|---|:-:|
| UC1 | Login / Logout (JWT, bcrypt, force-rotate on first login) | VIEWER |
| UC2 | View Dashboard (KPIs, health, trends) | VIEWER |
| UC3 | Monitor Scan Progress (real-time via `/ws/events`) | VIEWER |
| UC4 | View Vulnerabilities (read, filter by severity, status) | VIEWER |
| UC5 | Explore Network Topology (force graph + asset drill-down) | VIEWER |
| UC6 | Download Signed PDF Report | VIEWER |
| UC7 | View SIEM Alerts (Wazuh / ES events) | VIEWER |
| UC8 | View Audit Trail (read-only) | VIEWER |
| UC9 | Initiate Scan (quick / full / custom) | ANALYST |
| UC10 | Update Vulnerability Status | ANALYST |
| UC11 | Manage Findings (lifecycle: OPEN → FIXED → REOPENED) | ANALYST |
| UC12 | Configure OpenVAS Scan (schedule, execute, list) | ADMIN |
| UC13 | Manage Targets (CRUD + `scope_allowlist` + `max_rps`) | ADMIN |
| UC14 | Manage Users (role assignment, disable, password reset) | ADMIN |
| UC15 | Configure Feature Flags (SIEM / SOAR / LLM toggles) | ADMIN |
| UC16 | Verify AgentLog Hash Chain (`audit/verify`) | ADMIN |
| UC17 | Tag Compliance Frameworks (PCI DSS, HIPAA, ISO 27001, GDPR) | ADMIN |

**Secondary Actors:** Celery Worker (automated background processing), Google Gemini AI (advisory + validation), n8n SOAR (auto-remediation webhooks).

### 3.5.2 Data Flow Diagram — Level 0 (Context Diagram)

> *[**Figure 3.5: DFD Level 0** — see [`FYP_Figures.md`](FYP_Figures.md)]*

| External Entity | Data To System | Data From System |
|---|---|---|
| VIEWER | Login credentials | Dashboard data, real-time events, audit logs, signed reports |
| ANALYST | Scan requests, vulnerability status updates, finding lifecycle changes | Scan results, WebSocket stream, signed PDF reports, action items |
| ADMIN | Target CRUD, user CRUD, system config | RBAC management, audit trail, compliance reports |
| Nmap | — | Port + service banners |
| Nuclei | — | Findings + evidence (raw request/response) |
| OpenVAS | — | Vulnerability reports |
| Google Gemini | Redacted prompts | Validation + advisory text |
| Wazuh | — | Security events |
| n8n SOAR | — | Auto-remediation outcomes |
| Subfinder | Domain seeds | Discovered subdomains |

### 3.5.3 Data Flow Diagram — Level 1

> *[**Figure 3.6: DFD Level 1** — see [`FYP_Figures.md`](FYP_Figures.md)]*

| Process | Description |
|---------|-------------|
| **P0** | Auth / JWT / RBAC (`security.py`) |
| **P1** | Target & User Management |
| **P2** | Scan Orchestration (Celery) |
| **P3** | Reconnaissance (Nmap + Playwright + Subfinder) |
| **P4** | Attack (Nuclei + service-aware template selection) |
| **P5** | Validation (re-probe + InfrastructureAgent + IntelligenceAgent LLM) |
| **P6** | Risk Scoring (CVSS v3.1 environmental) |
| **P7** | Real-Time Broadcasting (Redis pub/sub) |
| **P8** | Finding Deduplication (fingerprint SHA-256) |
| **P9** | SIEM Forward (optional) |
| **P10** | SOAR Trigger (optional) |
| **P11** | Report Generation (ReportLab + signature) |
| **P12** | Dashboard Rendering |
| **P13** | Audit Log (hash chain) |

**Data Stores:** D1 (PostgreSQL 15 — Users, Targets, Scans, Vulns, Findings, AuditLogs), D2 (Redis 7 — Celery broker + `ws_events` pub/sub channel + cached topology), D3 (Elasticsearch 8.11 — SIEM logs, optional).

## 3.6 Database Design

### 3.6.1 Entity-Relationship Diagram

> *[**Figure 3.4: Entity-Relationship Diagram (ERD)** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Table 3.5:** Database Entity Descriptions *(updated 2026-05-24: expanded from 9 → 12 entities)*

| Entity | Description | Key Attributes |
|---|---|---|
| **User** *(new)* | Authenticated user with RBAC role | id (PK), email (unique), password_hash (bcrypt), role (VIEWER/ANALYST/ADMIN), force_password_change, disabled, full_name, last_login_at |
| **Target** | A web application or host registered for scanning | id (PK), name, base_url, asset_value, data_sensitivity, environment_type, compliance_tags, scope_allowlist, max_rps, max_concurrent_scans, auth_credentials (Fernet-encrypted), auth_method |
| **Scan** | A security scan session linked to a target | id (PK), target_id (FK), status, scan_type, risk_score, risk_breakdown (JSON), agent_thoughts, configuration, checkpoint, failure_reason, environment_type, start_time, end_time |
| **Vulnerability** | A discovered security vulnerability (observation) | id (PK), scan_id (FK), finding_id (FK), type, severity, status, url, parameter, evidence, confidence_score, cvss_vector, cvss_score, raw_request, raw_response, evidence_hash, template_id, remediation, validation_notes |
| **Finding** *(new)* | Deduplicated persistent finding per target | id (PK), target_id (FK), fingerprint (sha256, unique per target), title, vuln_type, severity, cvss_score, status (OPEN/FIXED/ACCEPTED/REOPENED/FALSE_POSITIVE), due_date, owner_user_id, control_tags (JSON), first_seen, last_seen |
| **ScanAsset** | A network asset discovered during scanning | id (PK), scan_id (FK), ip_address, hostname, os_name, device_type |
| **AssetService** | A running service on a discovered asset | id (PK), asset_id (FK), port, protocol, state, service_name, product, version |
| **AgentLog** | A record of an AI agent action (hash-chained) | id (PK), scan_id (FK), agent_name, action, reasoning (JSON), input_data, output_data, prev_hash, this_hash, timestamp |
| **AuditLog** *(new)* | An actor-attributed admin action for RBAC compliance | id (PK), user_id (FK), action, resource_type, resource_id, metadata, ip_address, timestamp |
| **Endpoint** | A discovered API endpoint on a target | id (PK), target_id (FK), url, method, parameters, authentication_required |
| **ActionItem** | A prioritized remediation task | id (PK), scan_id (FK), title, description, priority, status |
| **NetworkAsset** | Persistent network inventory record | id (PK), ip_address, hostname, os_name, device_type, criticality, risk_score |

**Key Relationships:**

```
User       (1) ──→ (N) AuditLog       One user produces many audit entries
User       (1) ──→ (N) Finding        Findings have an owner_user_id
Target     (1) ──→ (N) Scan           One target can have many scans
Target     (1) ──→ (N) Endpoint       One target has many discovered endpoints
Target     (1) ──→ (N) Finding        One target accumulates many findings
Scan       (1) ──→ (N) Vulnerability  One scan can find many vulnerabilities
Scan       (1) ──→ (N) ScanAsset      One scan can discover many assets
Scan       (1) ──→ (N) AgentLog       One scan produces many hash-chained log entries
Scan       (1) ──→ (N) ActionItem     One scan generates many action items
ScanAsset  (1) ──→ (N) AssetService   One asset can run many services
Finding    (1) ──→ (N) Vulnerability  One finding has many observations across scans
```

### 3.6.2 Database Schema Details

All entity identifiers use UUID v4 strings (36 characters) for globally unique, non-sequential identification. The schema supports both synchronous (SQLite via `aiosqlite` for development) and asynchronous (PostgreSQL with `asyncpg` for production) database engines through SQLAlchemy 2.0 dual-engine configuration with a connection pool of size 10 and max overflow of 5.

Enumerated types enforce data integrity for:

- **Scan status:** `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`
- **Severity levels:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`
- **Vulnerability status:** `OPEN`, `IN_PROGRESS`, `FIXED`, `FALSE_POSITIVE`, `ACCEPTED`
- **Finding status:** `OPEN`, `FIXED`, `ACCEPTED`, `REOPENED`, `FALSE_POSITIVE`
- **Asset value:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
- **User role:** `VIEWER`, `ANALYST`, `ADMIN`

## 3.7 UI/UX Wireframes

### 3.7.1 Dashboard Layout Design

The dashboard follows a cybersecurity-themed dark UI design with the following layout principles:

| Element | Specification |
|---------|--------------|
| **Color Palette** | Dark background (`#0a0a0f`), glass-morphism cards (`bg-white/5` with `backdrop-blur`), neon accent colors (cyan `#00ffff` for primary actions, green `#00ff88` for success, orange for warnings, red for critical) |
| **Typography** | Syne font family for headings, Inter / system fonts for body text, monospace for code and log output |
| **Layout Grid** | 12-column responsive grid with three-panel layout (3-col left rail, 6-col center, 3-col right rail) on the Command Center view |

### 3.7.2 Tab Navigation Structure

The dashboard uses a URL-driven, two-tier navigation system *(updated 2026-05-24: actual tab IDs and ADMIN-only Users tab)*:

**Main Tabs (`BASE_TABS` in `Dashboard.jsx`):** `overview` (Command Center), `operations` (Operations), `threat-center` (Threat Center), `ai-brain` (AI Brain), `reports`, `settings`, `users` (visible only to ADMIN role).

**Sub-Tabs per Main Tab:**

| Main Tab | Sub-Tabs |
|----------|----------|
| `overview` | (single view: Command Center) |
| `operations` | Scanner, History, Targets, Lab |
| `threat-center` | SIEM (hidden if `siem_enabled=false`), Vulnerabilities, Topology |
| `ai-brain` | AI Console (pipeline + agent logs + live LLM rationale) |
| `reports` | Reports list + downloads |
| `settings` | Profile, Feature flags, OpenVAS config |
| `users` | User Management (ADMIN-only) |

> *[**Figure 3.10: Dashboard UI Wireframe — Command Center Tab** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> Three-column layout showing UptimeGauge + ScanButton + VulnTrend (left), RiskHeatmap + NetworkTopology (center, compact mode), OrchestrationFeed + ActionCenter (right), with StatCards spanning full width above.

> *[**Figure 3.11: Dashboard UI Wireframe — Operations Tab** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> Sub-tab bar with Scanner / History / Targets. Scanner shows ScanButton + ScanConfigModal alongside the OpenVAS sub-panel; History shows ScanHistory with row-click drill-down to RiskBreakdownDrawer (per-scan CVSS breakdown); Targets shows TargetsManager + EnvironmentWizard for scope/rate-limit setup.

> *[**Figure 3.12: Dashboard UI Wireframe — Threat Center Tab** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> Sub-tab bar with SIEM / Vulnerabilities / Topology. SIEM shows UnifiedInbox + IncidentDetailDrawer; Vulnerabilities shows VulnerabilitiesPanel (with Compliance Tags + CVSS columns) drilling down into RemediationPanel; Topology shows the full-screen NetworkTopology force graph beside AssetDetailPanel.

### 3.7.3 Docker Compose Service Architecture

> *[**Figure 3.8: Docker Compose Service Architecture** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Table 3.3:** Docker Compose Services and Port Mapping *(updated 2026-05-24: profile-split + Caddy + n8n)*

| Service | Container Name | Port(s) | Technology | Profile | Purpose |
|---|---|:-:|---|:-:|---|
| caddy | sme_dashboard_caddy | 80, 443 | Caddy 2-alpine | lite | TLS reverse proxy / edge |
| backend | sme_dashboard_backend | 8000 | FastAPI / Python 3.10 | lite | REST API + WebSocket server |
| frontend | sme_dashboard_frontend | (via Caddy) | React 18 + Vite 5 + nginx | lite | Dashboard UI (production build) |
| db | sme_dashboard_db | 5432 | PostgreSQL 15 Alpine | lite | Primary data store |
| redis | sme_dashboard_redis | 6379 | Redis 7 Alpine | lite | Cache + Celery broker + Pub/Sub |
| celery_worker | sme_dashboard_celery | — | Celery 5 | lite | Background task execution |
| celery_beat | sme_dashboard_beat | — | Celery Beat | full | Scheduled task execution |
| openvas | sme_dashboard_openvas | 9390, 9392 | immauss/openvas | full | Vulnerability scanner (GMP) |
| elasticsearch | sme_dashboard_elastic | 9200 | Elasticsearch 8.11.1 | full | Log storage and search |
| kibana | sme_dashboard_kibana | 5601 | Kibana 8.11.1 | full | Log visualization |
| wazuh | sme_dashboard_wazuh | 1514, 1515, 55000 | Wazuh 4.7.2 | full | SIEM manager |
| n8n | sme_dashboard_n8n | 5678 | n8nio/n8n latest | full | SOAR webhook automation |

**Networking:** Two Docker networks — a `default` internal bridge for inter-service communication and an external `lab_network` (named `the-dashboard-project-_lab_network`) bridging the main stack to the Living Lab targets.

**Resource Limits (lite):** Caddy (0.25 CPU / 64 M RAM), backend (0.75 CPU / 384 M), frontend (0.10 CPU / 48 M), db (0.5 CPU / 256 M), redis (0.15 CPU / 96 M), celery_worker (1.0 CPU / 512 M). *(updated 2026-05-24: matches current `deploy.resources.limits`.)*

### 3.7.4 REST API Endpoint Catalogue

> **Table 3.4:** REST API Endpoint Catalogue *(updated 2026-05-24: expanded from 8 → 14 endpoint modules)*

| Route Prefix | Key Endpoints | Methods | Description |
|---|---|---|---|
| `/api/v1/auth` | `/login`, `/logout`, `/me` | POST, GET | JWT authentication and self-service profile |
| `/api/v1/rbac` | `/users`, `/users/{id}`, `/users/{id}/enable`, `/users/{id}/reset-password`, `/audit-logs` | POST/GET/PATCH/DELETE | User management (ADMIN-only) |
| `/api/v1/targets` | `/`, `/{id}`, `/discover` | GET, POST, PUT, DELETE | Target CRUD and auto-discovery |
| `/api/v1/scans` | `/`, `/{id}`, `/{id}/audit/verify` | GET, POST, DELETE | Scan CRUD + AgentLog hash chain verification |
| `/api/v1/vulnerabilities` | `/`, `/{id}`, `/{id}/status` | GET, PATCH | Vulnerability listing and status updates |
| `/api/v1/findings` | `/`, `/{id}`, `/{id}/status` | GET, POST, PATCH | Deduplicated finding lifecycle + compliance tags |
| `/api/v1/reports` | `/{scan_id}/generate`, `/{id}/pdf` | POST, GET | Report generation and PDF download (signed) |
| `/api/v1/network` | `/assets`, `/assets/{id}`, `/activity` | GET | Network asset listing and activity feed |
| `/api/v1/dashboard` | `/summary`, `/health`, `/kpis` | GET | KPI snapshots and dashboard summaries |
| `/api/v1/openvas` | `/scan`, `/tasks/{id}` | GET, POST | OpenVAS scan management (`profile: full`) |
| `/api/v1/siem` | `/alerts`, `/forward` | GET, POST | Wazuh / Elasticsearch event queries (optional) |
| `/api/v1/config` | `/features`, `/compliance-frameworks` | GET | Feature flags and compliance framework metadata |
| `/api/v1/lab` | `/seed`, `/containers` | GET, POST | Living Lab container lifecycle management |
| `/api/v1/audit` | `/logs`, `/logs/{scan_id}` | GET | Audit log read (filterable) |
| `/health` | `/health` | GET | System liveness / readiness check |
| `/ws/events` | WebSocket | WS | Real-time event streaming (`RISK_UPDATE`, `LOG_STREAM`, `SCAN_PROGRESS`, …) |

All routes except `/auth/login` and `/config` require a JWT Bearer token; admin-only routes additionally require the ADMIN role.

### 3.7.5 Living Lab Topology *(added 2026-05-24)*

> *[**Figure 3.13: Lab Environment Network Topology** — see [`FYP_Figures.md`](FYP_Figures.md)]*

**Table 3.10:** Living Lab Container Inventory *(new — 2026-05-24)*

| Container | Subnet | IP | Service / Port | Profile | CVSS | Vulns Demonstrated |
|---|---|---|---|:-:|:-:|---|
| `lab_webserver` | DMZ 10.10.10.0/24 | 10.10.10.10 | Juice Shop :3000 | lite | 9.5 | SQLi, XSS, BOLA, IDOR, broken-auth, SSRF |
| `lab_api_gateway` | DMZ | 10.10.10.20 | nginx :8081 | lite | 6.0 | Info disclosure, header leak, Swagger exposure |
| `lab_dns_server` | DMZ | 10.10.10.30 | CoreDNS :53 | full-lab | 5.0 | DNS zone transfer, amplification |
| `lab_fileserver` | Corp 10.10.20.0/24 | 10.10.20.10 | Samba :445 | lite | 8.0 | Weak creds, SMB enum, default login, data exposure |
| `lab_mailserver` | Corp | 10.10.20.20 | GreenMail :3025/3110/3143 | full-lab | 7.0 | Weak creds, plaintext protocols, user enum |
| `lab_workstation` | Corp | 10.10.20.40 | nginx :80 | full-lab | 4.0 | Info disclosure, internal network leak |
| `lab_database` | Data 10.10.30.0/24 | 10.10.30.10 | PostgreSQL 13 :5432 | lite | 9.0 | Weak password, default config, no encryption |
| `lab_redis_cache` | Data | 10.10.30.20 | Redis 6 :6380 | lite | 8.5 | No auth, unauthenticated access |
| `lab_traffic_gen` | Mgmt 10.10.40.0/24 | 10.10.40.10 | (no service) | lite | — | Generates realistic background traffic |
| `lab_log_shipper` | Mgmt | 10.10.40.20 | (no service) | full-lab | — | Ships logs to ES + Wazuh |

The lab is launched via `docker compose -f docker-compose.lab.yml up` and is reachable from the main stack through the shared external `lab_network` bridge.

---

<br>
<h1 align="center">⚙️ Chapter 4 — Implementation</h1>

---

## 4.1 Introduction

This chapter details the implementation of the Orchestration Security Center platform, covering the development environment, module-by-module implementation with code snippets and screenshots, component integration, the feature-flag catalogue, and challenges encountered during development. The implementation now spans approximately **13,500 lines** of Python backend code and **11,000 lines** of React/JavaScript frontend code, reflecting the post-overhaul additions (RBAC, ScopeGuard, ll m_guard, framework tagger, finding deduplication, hash chain, SOAR integration, Caddy edge, lab manager, topology generator). *(updated 2026-05-24)*

## 4.2 Development Environment & Tools

> **Table 4.1:** Development Tools and Technologies *(updated 2026-05-24)*

| Category | Tool / Technology | Version | Purpose |
|---|---|---|---|
| Backend Language | Python | 3.10 | Server-side logic, API, agents |
| Backend Framework | FastAPI | Latest (Pydantic v2) | REST API + WebSocket server |
| ASGI Server | Uvicorn | Latest | Production-grade ASGI server |
| ORM | SQLAlchemy | 2.0 (async) | Database abstraction |
| Async PG Driver | asyncpg | Latest | High-throughput PostgreSQL access |
| Auth | python-jose + bcrypt | 3.3+, 4.0.1 | JWT signing and password hashing |
| Encryption | cryptography (Fernet) | 42.0+ | Symmetric credential encryption |
| Rate Limiting | aiolimiter | 1.1.0+ | Per-target outbound RPS cap |
| Frontend Language | JavaScript (ES2022) | — | Client-side logic |
| Frontend Framework | React | 18.2 | Component-based UI |
| Build Tool | Vite | 5.0 | Dev server + bundler |
| CSS Framework | Tailwind CSS | 3.3 | Utility-first styling |
| State Management | Zustand + React Context | 4.4 | Client-side state |
| Server State | TanStack React Query | 5.0 | Server state caching + sync |
| Charting | Recharts + D3.js | 2.10, 3.0+ | Data visualization (no Chart.js) |
| Network Graph | react-force-graph-2d | 1.25 | Force-directed topology |
| Animations | Framer Motion | 11.0 | UI motion |
| Icons | lucide-react | 0.294 | Icon library |
| Reverse Proxy | Caddy | 2-alpine | TLS termination, ports 80/443 |
| Database | PostgreSQL | 15-alpine | Relational data storage |
| Database (fallback) | SQLite via aiosqlite | Latest | Dev-mode fallback |
| Cache / Broker | Redis | 7-alpine | Message queue + Pub/Sub |
| Task Queue | Celery | 5 | Async background tasks |
| SIEM (optional) | Wazuh + Elasticsearch | 4.7.2, 8.11.1 | Log ingestion + correlation |
| SOAR (optional) | n8n | Latest | Webhook automation |
| Containerization | Docker + Docker Compose | Latest | Service orchestration (profile-split) |
| Version Control | Git + GitHub | Latest | Source code management |
| IDE | Visual Studio Code | Latest | Code editing + debugging |
| API Testing | Postman / Swagger UI | Latest | Endpoint testing |
| AI Model | Google Gemini | 2.0-flash | Advisory text generation |
| AI SDK | google-genai | 0.8.0+ | Unified Google Gen AI SDK |

> **Table 4.2:** Python Backend Dependencies *(updated 2026-05-24)*

| Package | Purpose |
|---|---|
| `fastapi` | Web framework with auto API docs |
| `uvicorn[standard]` | ASGI server with WebSocket support |
| `sqlalchemy>=2.0` | ORM (sync + async) |
| `asyncpg` | Async PostgreSQL driver |
| `aiosqlite` | Async SQLite driver (dev fallback) |
| `aioredis` | Async Redis client for Pub/Sub |
| `pydantic-settings` | Configuration management |
| `python-dotenv` | Environment variable loading |
| `celery` | Distributed task queue |
| `redis` | Redis client for Celery broker |
| `httpx` | Async HTTP client |
| `python-jose[cryptography]` | JWT encode/decode (HS256) |
| `bcrypt>=4.0.1` | Password hashing |
| `cryptography>=42.0` | Fernet symmetric encryption |
| `aiolimiter>=1.1` | Per-target rate limiting |
| `playwright` | Headless Chromium for crawl |
| `google-genai>=0.8.0` | Google Gemini AI SDK (replaces legacy `google-generativeai`) |
| `reportlab` | PDF report generation |
| `python-gvm` | OpenVAS GMP client |
| `greenlet` | Async context management |

> **Table 4.3:** Frontend NPM Dependencies *(updated 2026-05-24)*

| Package | Version | Purpose |
|---|---|---|
| `react` | 18.2 | UI framework |
| `react-dom` | 18.2 | DOM renderer |
| `react-router-dom` | 6.x | URL-driven routing |
| `vite` | 5.0 | Build tool + dev server |
| `axios` | 1.6 | HTTP client with JWT interceptor |
| `zustand` | 4.4 | Lightweight client state |
| `@tanstack/react-query` | 5.0 | Server state caching + sync |
| `recharts` | 2.10 | Static chart components |
| `react-force-graph-2d` | 1.25 | D3 force-directed network graph |
| `d3` | 3.0+ | Lower-level chart primitives |
| `framer-motion` | 11.0 | Animations |
| `lucide-react` | 0.294 | Icon library |
| `react-window` | 1.8 | Virtualised large lists |
| `tailwindcss` | 3.3 | Utility CSS |
| `ldrs` | 1.0 | Skeleton loaders |

> **Table 4.4:** Feature Flag Catalogue *(new — 2026-05-24)*

| Env Var | Default | Effect when `true` |
|---|:-:|---|
| `SIEM_ENABLED` | false | Activates Wazuh/Elasticsearch forwarding and shows SIEM sub-tab |
| `SOAR_ENABLED` | false | Activates `soar_orchestrator.py` n8n webhook calls |
| `OPENVAS_ENABLED` | false | Enables OpenVAS scan endpoints |
| `LLM_VALIDATION_ENABLED` | false | Routes findings through `IntelligenceAgent` LLM validation |
| `LLM_DAILY_TOKEN_BUDGET` | 500000 | Per-day cross-platform LLM token cap |
| `LLM_PER_SCAN_TOKEN_BUDGET` | 50000 | Per-scan LLM token cap |
| `LLM_PROVIDER` | `gemini` | Set to `none` to short-circuit all LLM calls |

The platform degrades gracefully when any optional feature is disabled — the affected widgets, sub-tabs, and endpoints either hide or fall back to placeholder content.

## 4.3 Module / Feature Implementation

### 4.3.1 Backend — FastAPI Application Entry Point

The FastAPI application is initialised in `backend/app/main.py` with the following key components:

**Application Lifespan Management:**

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis_listener_task
    _redis_listener_task = asyncio.create_task(redis_event_listener())
    logger.info("Orchestration Security Center API started.")
    yield
    if _redis_listener_task and not _redis_listener_task.done():
        _redis_listener_task.cancel()
    logger.info("Orchestration Security Center API shutting down.")
```

The lifespan context manager starts the Redis event listener as a background asyncio task on application startup and gracefully cancels it on shutdown. This ensures WebSocket event bridging operates continuously throughout the application lifecycle.

**Redis Event Listener with Exponential Backoff:**

```python
async def redis_event_listener() -> None:
    attempt = 0
    while True:
        try:
            redis = await aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=30,
                socket_connect_timeout=5,
            )
            pubsub = redis.pubsub()
            await pubsub.subscribe("ws_events")
            attempt = 0
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await manager.broadcast_event(data["type"], data["payload"])
        except Exception as exc:
            delay = min(2 ** attempt, 32)
            attempt += 1
            await asyncio.sleep(delay)
```

The listener implements resilient reconnection with exponential backoff (2 s → 4 s → 8 s → … capped at 32 s), ensuring the event bridge recovers automatically from Redis connection interruptions without flooding the server.

**Authentication-Gated Routes *(updated 2026-05-24)*:**

All routes registered through `api.api_router` (except `/auth/login` and `/config`) are wrapped in a global `Depends(get_current_user)` dependency. Role-protected endpoints additionally declare `Depends(require_role(UserRole.ANALYST))` or `require_role(UserRole.ADMIN)`. The token is decoded by `core/security.py` using HS256 + `JWT_SECRET`, and the user is loaded from PostgreSQL on every request.

### 4.3.2 Backend — Agent Orchestrator

The agent orchestration system is implemented as a class hierarchy with an abstract `BaseAgent` and multiple concrete agents distributed across `agent_orchestrator.py`, `discovery_agent.py`, `infrastructure_agent.py`, and `intelligence_agent.py`. *(updated 2026-05-24)*

**BaseAgent Abstract Class:**

```python
class BaseAgent(ABC):
    def __init__(self, name: str, scan_id: str,
                 db_session: AsyncSession, max_rps: int = 10):
        self.name = name
        self.scan_id = scan_id
        self.db = db_session
        self.state = AgentState.IDLE
        self.llm = None
        # Per-agent rate limiter (aiolimiter)
        try:
            from aiolimiter import AsyncLimiter
            self.rate_limiter = AsyncLimiter(max(1, max_rps), time_period=1)
        except ImportError:
            self.rate_limiter = None
        # Initialize LLM client
        if settings.GEMINI_API_KEY:
            try:
                _client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self.llm = _client
                self._llm_model = "gemini-2.0-flash"
            except Exception:
                self.llm = None
```

Each agent receives a database session, an outbound rate limiter (read from `Target.max_rps`), and an optional Gemini client. Execution state is tracked through the `AgentState` enum (`IDLE` → `RUNNING` → `COMPLETED`/`FAILED`).

**Tamper-Evident `log_action()` *(added 2026-05-24)*:**

```python
async def log_action(self, action, reasoning=None, input_data=None, output_data=None):
    # Find previous hash for this scan
    prev_row = await self.db.execute(
        select(AgentLog.this_hash)
        .where(AgentLog.scan_id == self.scan_id)
        .order_by(AgentLog.id.desc()).limit(1)
    )
    prev_hash = prev_row.scalar() or "0" * 64
    # Canonical JSON payload
    payload = json.dumps(
        {"scan_id": self.scan_id, "agent_name": self.name,
         "action": action, "reasoning": reasoning},
        sort_keys=True, ensure_ascii=True,
    )
    this_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()
    log_entry = AgentLog(..., prev_hash=prev_hash, this_hash=this_hash)
    self.db.add(log_entry)
    await self.db.commit()
```

Every agent action writes a hash-chained `AgentLog` row, satisfying NFR-13. The `audit/verify` endpoint recomputes the chain to detect tampering.

**Service-Aware Template Selection (AttackAgent):**

```python
self.SERVICE_TO_TEMPLATE = {
    "http":       ["tags:cve,exposures,misconfiguration",
                   "tags:default-logins,takeovers"],
    "https":      ["tags:cve,exposures,misconfiguration", "tags:ssl,takeovers"],
    "ftp":        ["tags:default-logins,misconfiguration,cve"],
    "ssh":        ["tags:default-logins,misconfiguration"],
    "smtp":       ["tags:misconfiguration,cve"],
    "mysql":      ["tags:default-logins,misconfiguration"],
    "postgresql": ["tags:default-logins,misconfiguration"],
    "redis":      ["tags:default-logins,misconfiguration"],
    "smb":        ["tags:cve,misconfiguration"],
}
```

Discovered Nmap services are mapped to specific Nuclei template tags, ensuring comprehensive coverage without AI-driven tool selection. Out-of-scope URLs are filtered upstream by `ScopeGuard`.

### 4.3.3 Backend — UnifiedRiskEngine

The risk engine calculates two complementary scores:

**Risk Score v2 (CVSS v3.1 environmental, 0–100):**

```python
def calculate_scan_risk_v2(self, scan: Scan) -> dict:
    asset_value, data_sensitivity, exposure = self._resolve_target_context(scan)
    breakdown = []
    total = 0.0
    for vuln in scan.vulnerabilities:
        vector = parse_vector(vuln.cvss_vector) \
            or severity_to_default_vector(vuln.severity)
        score = cvss_env_score(vector, asset_value, data_sensitivity, exposure)
        score *= (vuln.confidence_score or 1.0)
        total += score
        breakdown.append({"vuln_id": vuln.id, "cvss": score, ...})
    # Port penalties + asset multiplier + exposure modifier
    for asset in scan.assets:
        for svc in asset.services:
            if svc.port in self.HIGH_RISK_PORTS:
                total += self.HIGH_RISK_PORTS[svc.port][1]
    total *= self.ASSET_VALUE_MAP.get(asset_value, 1.0)
    total *= 0.6 if exposure == "internal" else 1.0
    return {"score": min(100.0, total), "breakdown": breakdown}
```

**Health Score (100–0):**

```python
def calculate_health_score(self, scan: Scan) -> float:
    score = 100.0
    for vuln in scan.vulnerabilities:
        if vuln.severity == SeverityLevel.CRITICAL: score -= 20
        elif vuln.severity == SeverityLevel.HIGH:   score -= 10
        elif vuln.severity == SeverityLevel.MEDIUM: score -= 5
    for asset in scan.assets:
        for svc in asset.services:
            if svc.state == "open" and svc.port in [21, 23, 445, 3389]:
                score -= 15
    if scan.vulnerabilities and score > 90: score = 90
    return max(0.0, score)
```

The breakdown JSON is persisted to `Scan.risk_breakdown` and surfaced in the dashboard's `RiskBreakdownDrawer`.

### 4.3.4 Backend — Database Models

The data model is implemented using SQLAlchemy 2.0 declarative base with **twelve entities** *(updated 2026-05-24)*:

```python
class Scan(Base):
    __tablename__ = "scans"
    id            = Column(String(36), primary_key=True,
                            default=lambda: str(uuid.uuid4()))
    target_id     = Column(String(36), ForeignKey("targets.id"))
    status        = Column(Enum(ScanStatus), default=ScanStatus.QUEUED)
    risk_score    = Column(Float, default=0.0)
    risk_breakdown= Column(JSON, nullable=True)        # Phase 4.1
    checkpoint    = Column(String(32), nullable=True)  # Phase 2.3 resume ladder
    failure_reason= Column(String(128), nullable=True)
    environment_type = Column(String(32), nullable=True)
    target        = relationship("Target", back_populates="scans")
    vulnerabilities = relationship("Vulnerability",
                                    back_populates="scan",
                                    cascade="all, delete-orphan")
    agent_logs    = relationship("AgentLog", back_populates="scan",
                                  cascade="all, delete-orphan")
```

The `Scan` entity carries the new `risk_breakdown`, `checkpoint`, `failure_reason`, and `environment_type` columns introduced during the hardening phases. The `Vulnerability`, `Finding`, `User`, and `AuditLog` models cover the rest of the entities described in §3.6.

### 4.3.5 Frontend — Dashboard Architecture

The dashboard is implemented as a single-page application with lazy-loaded panels for performance optimization:

```javascript
const NetworkTopology      = lazy(() => import('../components/dashboard/NetworkTopology'));
const ScanHistory          = lazy(() => import('../components/dashboard/ScanHistory'));
const VulnerabilitiesPanel = lazy(() => import('../components/dashboard/VulnerabilitiesPanel'));
const AgentLogViewer       = lazy(() => import('../components/dashboard/AgentLogViewer'));
const UnifiedInbox         = lazy(() => import('../components/dashboard/UnifiedInbox'));
const Reports              = lazy(() => import('../components/dashboard/Reports'));
const RiskChart            = lazy(() => import('../components/OpenVAS/RiskChart'));
const Scheduler            = lazy(() => import('../components/OpenVAS/Scheduler'));
const VulnerabilitiesList  = lazy(() => import('../components/OpenVAS/VulnerabilitiesList'));
const LabEnvironment       = lazy(() => import('../components/dashboard/LabEnvironment'));
const SettingsPanel        = lazy(() => import('../components/dashboard/SettingsPanel'));
```

Code-splitting via `React.lazy` ensures that heavy components (NetworkTopology with D3.js, AgentLogViewer, OpenVAS sub-panel, LabEnvironment) are only downloaded when the user navigates to the relevant tab. The router uses URL-driven tabs: `/dashboard/<tab>/<sub-tab>`, with the conditional `users` tab visible only when `usePermission().canManageUsers` is true. *(updated 2026-05-24)*

### 4.3.6 Frontend — Real-Time Context Provider

The `RealTimeContext` manages WebSocket state and real-time event dispatching:

```javascript
{
  kpi: {
    overall_score, health_score,
    counts: { critical, high, medium, low, info },
    total_assets, last_scan_id
  },
  alerts: [],
  orchestrationLog: [],   // max 200 entries
  scanStatus: 'IDLE',     // IDLE | RUNNING | COMPLETED | FAILED
  isConnected: false,
  isScanning: false
}
```

The provider establishes a WebSocket connection to `wss://localhost/ws/events` (or `ws://localhost:8000/ws/events` in dev), processes incoming events by type (`RISK_UPDATE`, `LOG_STREAM`, `SCAN_PROGRESS`, `SCAN_STARTED`, `SCAN_STATUS`, `ALERT_NEW`, `CLEAR_LOGS`), and maintains connection state with automatic 3-second reconnection and heartbeat pings. The orchestration log is capped at 200 entries and alerts at 50 to prevent memory growth during extended scan sessions. *(updated 2026-05-24: endpoint renamed to `/ws/events`.)*

### 4.3.7 Frontend — StatCards Component

The StatCards component renders four KPI cards with animated counters:

```
Card 1: Security Health (health_score, 0–100)
Card 2: Vulnerabilities (total + severity breakdown bar)
Card 3: Assets (discovered host count)
Card 4: Status (IDLE/RUN/OK/FAIL with pulse animation)
```

Each card uses a custom `useCountUp` hook that smoothly animates number transitions from the previous value to the current value, providing visual feedback when scan results update in real time.

> *[**Figure 4.4: Screenshot — Command Center Dashboard (Overview Tab)** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.8 Frontend — Network Topology Visualization

The NetworkTopology component renders a force-directed graph using `react-force-graph-2d` (D3 force simulation):

- Central hub node represents the network gateway
- Satellite nodes represent discovered assets
- Node color encodes risk: green (<20 risk score), orange (20–75), red (>=75)
- Node size scales with vulnerability count
- Clicking a node opens the AssetDetailPanel with full service listing and AI advisory
- Zoom, pan, and drag interactions are enabled
- A `TopologyLegend` widget exposes the colour key

> *[**Figure 4.5: Screenshot — Network Topology Force Graph** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.9 Frontend — Risk Heatmap

The RiskHeatmap component uses a treemap layout (Recharts) to visualise vulnerability severity distribution:

- Rectangle sizes proportional to vulnerability count per severity
- Colors: red (critical), orange (high), yellow (medium), cyan (low), grey (info)
- Fallback state: "No Open Vulnerabilities" message when data is empty

> *[**Figure 4.6: Screenshot — Risk Heatmap Treemap Visualization** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.10 Frontend — Scan Pipeline Visualization

The `ScanPipelinePanel` and `ScanButton` components display a four-stage pipeline progress indicator that mirrors the agent orchestrator checkpoints *(updated 2026-05-24: four stages instead of five)*:

```
Recon  →  Attack  →  Validation  →  Scoring
```

Each step transitions through three visual states:

| State | Visual |
|-------|--------|
| **Pending** | White outline, dimmed |
| **Active** | Cyan with pulse animation and glow effect |
| **Completed** | Green with checkmark icon |

> *[**Figure 4.7: Screenshot — Scan Pipeline Progress Indicator** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.11 Frontend — RemediationPanel *(added 2026-05-24)*

The `RemediationPanel` is opened from the VulnerabilitiesPanel row drill-down. It shows:

- Vulnerability type, severity badge, affected URL, parameter
- Raw HTTP request / response, evidence hash, CVSS vector + score
- Confidence score and validation notes
- Compliance tags (OWASP / CWE / ISO / NIST / PCI)
- AI-generated remediation guidance (from `ai_advisor.py` via `llm_guard.py`)

> *[**Figure 4.9: Screenshot — Vulnerability Detail / RemediationPanel** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.12 Frontend — User Management Page *(added 2026-05-24)*

`UserManagementPage.jsx` is the ADMIN-only page rendered under the `users` tab. It lists every user with their role badge, last-login timestamp, force-password-change flag, and inline controls for disable, change role, and reset password. All actions hit the `/rbac/*` endpoints and write to the `AuditLog` table for compliance.

> *[**Figure 4.13: Screenshot — User Management Page** — see [`FYP_Figures.md`](FYP_Figures.md)]*

### 4.3.13 Docker Compose Deployment *(updated 2026-05-24)*

The platform is deployed via a single `docker-compose.yml` that orchestrates **6 always-on services** in lite mode and **6 additional services** under the `profile: full` flag:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    deploy: { resources: { limits: { cpus: '0.25', memory: 64M } } }
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/sme_cyber_db
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - CREDENTIAL_ENCRYPTION_KEY=${CREDENTIAL_ENCRYPTION_KEY}
      - SIEM_ENABLED=${SIEM_ENABLED:-false}
      - SOAR_ENABLED=${SOAR_ENABLED:-false}
    networks: [default, lab_network]
    depends_on: [db, redis]
  # frontend, db, redis, celery_worker also lite-default
  celery_beat: { profiles: ["full"], ... }
  openvas:     { profiles: ["full"], ports: ["9390:9390","9392:9392"] }
  elasticsearch: { profiles: ["full"], ports: ["9200:9200"] }
  kibana:      { profiles: ["full"], ports: ["5601:5601"] }
  wazuh:       { profiles: ["full"], ports: ["1514:1514","55000:55000"] }
  n8n:         { profiles: ["full"], ports: ["5678:5678"] }

networks:
  lab_network:
    external: true
    name: the-dashboard-project-_lab_network
```

The external `lab_network` bridges the main application stack to the Living Lab containers (`docker-compose.lab.yml`), allowing the scanner to reach the lab subnets (DMZ / Corp / Data / Mgmt).

## 4.4 Integration of Components

### 4.4.1 Edge → Frontend → Backend Integration *(updated 2026-05-24)*

The frontend reaches the backend through Caddy:

```
Browser (HTTPS) → Caddy :443 → backend :8000
                            → frontend nginx (static React bundle)
Browser (WSS)  → Caddy :443 → backend :8000  (/ws/events)
```

The frontend uses two channels in production:

1. **REST API (Axios):** All CRUD operations, scan initiation, and data retrieval use HTTPS through the centralised API service layer (`frontend/src/services/api.js`), which automatically injects `Authorization: Bearer <jwt>` from `sessionStorage` and clears the token on 401 with a redirect to `/login`.
2. **WebSocket (Native):** Real-time scan progress, KPI updates, and alert notifications are delivered through a persistent WSS connection managed by the `RealTimeContext` provider.

### 4.4.2 Scanner-Backend Integration

Security tools are integrated into the agent pipeline through wrapper modules:

| Module | Integration |
|--------|------------|
| `nmap_wrapper.py` | Subprocess wrapper for Nmap; translates scan results to `ScanAsset`/`AssetService` instances |
| `nuclei_wrapper.py` | Invokes Nuclei v3.3.8 CLI with template tags chosen by service-aware mapping; persists `raw_request`, `raw_response`, `evidence_hash`, `cvss_vector`, and `template_id` for every finding |
| `openvas.py` | Communicates with OpenVAS via GMP (Greenbone Management Protocol) over TLS |
| `wazuh_integration.py` | Forwards security events to Wazuh; gated by `SIEM_ENABLED` |
| `elastic_integration.py` | Ships logs to Elasticsearch; gated by `SIEM_ENABLED` |
| `soar_orchestrator.py` | Posts structured event payloads to n8n webhooks; gated by `SOAR_ENABLED` |
| `framework_tagger.py` | Looks up control IDs for OWASP / CWE / ISO 27001 / NIST / PCI |
| `finding_dedup.py` | Computes fingerprints and links observations to persistent `Finding` rows |
| `topology_generator.py` | Builds the cached Mermaid network diagram from `NetworkAsset` |

### 4.4.3 Event Pipeline Integration

The event flow from scanner to dashboard follows this path *(updated 2026-05-24)*:

```
Celery Worker
  → event_publisher.py
  → Redis Pub/Sub (ws_events channel)
  → FastAPI redis_event_listener
  → ConnectionManager.broadcast_event
  → WebSocket /ws/events (terminated by Caddy as WSS in prod)
  → React RealTimeContext reducer
  → Dashboard Components re-render
```

## 4.5 Challenges Faced During Implementation

### 4.5.1 Asynchronous Database Operations

Integrating SQLAlchemy's async session with Celery workers (which run in synchronous context) required careful management of database sessions. The solution involved maintaining both synchronous (`SessionLocal`) and asynchronous (`async_session_maker`) session factories, using the appropriate one based on execution context.

### 4.5.2 Nmap Execution in Docker Containers

Running Nmap within Docker containers required elevated network capabilities. The Celery worker container was granted `NET_RAW` and `NET_ADMIN` capabilities via `cap_add` and joined the lab network with appropriate routing access.

### 4.5.3 WebSocket Connection Stability

Early implementations suffered from WebSocket disconnections during long-running scans. The solution involved implementing:

- Server-side keep-alive via continuous `receive_text()` loop
- Client-side automatic reconnection with 3-second intervals + heartbeat ping
- Redis listener exponential backoff (2 s → 32 s cap) for Redis connection recovery
- Caddy WSS upgrade headers for production traffic

### 4.5.4 Enum Serialization Issues

Python Enum values required explicit `.value.upper()` calls when used in string comparisons and JSON serialization. This caused several runtime errors that were resolved by adding guard checks throughout the risk engine and agent orchestrator.

### 4.5.5 Cross-Container Networking

Enabling the backend to scan lab targets required creating an external Docker network (`lab_network`, named `the-dashboard-project-_lab_network`) shared between the main `docker-compose.yml` and `docker-compose.lab.yml`. Container DNS resolution and port accessibility across network boundaries required extensive testing.

### 4.5.6 LLM Cost and Prompt Safety *(added 2026-05-24)*

Naïve LLM calls during scans risked both cost runaway and inadvertent leakage of sensitive request/response data (auth headers, cookies, internal hostnames). The `llm_guard.py` module addresses both by (a) redacting prompts before they leave the process and (b) enforcing a daily token budget (default 500 k) plus a per-scan circuit-breaker (default 50 k). When either budget is exhausted, the LLM call returns an empty string and the deterministic path continues, satisfying NFR-14.

### 4.5.7 Migration to Profile-Split Docker Compose *(added 2026-05-24)*

The original compose file booted all eleven services unconditionally, costing roughly 6 GB RAM at idle on a developer laptop. Moving Celery Beat, OpenVAS, Elasticsearch, Kibana, Wazuh, and n8n behind the `profile: full` flag dropped the lite-mode footprint to about 1.3 GB and shortened cold-start from ~2 min to ~30 s, while still permitting the full security stack for demos via `docker compose --profile full up -d`.

### 4.5.8 Tamper-Evident Logging Performance *(added 2026-05-24)*

Hashing every `AgentLog` insert adds a SELECT-then-INSERT round trip. The performance impact was measured at < 5 ms per log entry under normal load, which is acceptable for the typical 50–200 log entries per scan. The trigger that blocks UPDATE/DELETE on `agent_logs` adds zero overhead to read paths.

---

<br>
<h1 align="center">🧪 Chapter 5 — Testing & Evaluation</h1>

---

## 5.1 Introduction

This chapter presents the testing strategy, test case design, execution results, and performance evaluation of the Orchestration Security Center platform. Testing was conducted across four levels: unit testing, integration testing, system testing, and user acceptance testing (UAT). All system-level tests were re-baselined against the Living Lab (eight containers in lite mode, eleven in `profile: full-lab`) after the 2026-04 overhaul. *(updated 2026-05-24)*

## 5.2 Testing Strategy

### 5.2.1 Unit Testing

Unit tests verify individual functions and methods in isolation. Key areas tested include:

- **UnifiedRiskEngine:** Risk score calculation with various vulnerability / port combinations; CVSS v3.1 environmental scoring
- **`cvss.py` calculator:** Vector parsing, base score, environmental score
- **Agent Base Class:** LLM initialization, log action creation, hash-chain insertion, state transitions
- **`llm_guard.py`:** Prompt redaction (cookies, auth headers, PII, internal hosts), daily budget, per-scan circuit breaker
- **`scope_guard.py`:** Allowlist parsing, in-scope checks, ScopeViolation raising
- **`finding_dedup.py`:** Fingerprint generation determinism, collision behaviour
- **`framework_tagger.py`:** Mapping templates to OWASP / CWE / ISO / NIST / PCI tags
- **Auth (`security.py`):** JWT encode / decode, expiry handling, role dependency
- **Database Models:** Model instantiation, relationship navigation, enum validation

**Tools:** Pytest, pytest-asyncio (for async database operations)

### 5.2.2 Integration Testing

Integration tests verify the interaction between connected components:

- **API → Database:** CRUD operations for targets, scans, vulnerabilities, findings, users, audit logs
- **Auth → RBAC:** JWT issue / decode + role-gated endpoint access
- **Agent Pipeline → Database:** Scan creation, vulnerability persistence, action item generation, finding deduplication, control tagging
- **Redis Pub/Sub → WebSocket:** Event publishing and client notification
- **Nmap Wrapper → ReconAgent:** Network scan result parsing and asset creation
- **AgentLog Hash Chain:** Insert, verify, tamper detection
- **n8n Webhook (SOAR):** Outbound event delivery when `SOAR_ENABLED=true`

**Tools:** Pytest, httpx (TestClient), Docker Compose (for database / Redis / n8n availability)

### 5.2.3 System Testing

System tests verify end-to-end workflows:

- **Full Scan Lifecycle:** Target creation → Scan initiation → Agent execution (Recon → Attack → Validation → Scoring) → Finding deduplication → Dashboard update
- **Real-Time Event Flow:** Scan start → WebSocket events → Frontend KPI updates
- **PDF Report Generation:** Scan completion → Report request → Signed PDF download
- **RBAC Enforcement:** VIEWER cannot POST scans, ANALYST cannot CRUD targets, ADMIN can do both
- **Audit Verification:** Tamper a row in `agent_logs` → `audit/verify` returns the first mismatched row
- **Profile-full Boot:** `docker compose --profile full up -d` brings up all 12 services within ~2 min

**Tools:** Manual testing with the Docker Compose lab environment

### 5.2.4 User Acceptance Testing (UAT)

UAT was conducted with all eleven team members acting as SME administrator personas. Each tester performed a complete workflow (register target, run scan, interpret dashboard, read action items, download signed PDF) and provided feedback on usability, clarity, and actionability of results. ADMIN-only flows (user CRUD, audit verification) were tested by the sub-leads only.

## 5.3 Test Cases & Test Results

### 5.3.1 Unit Test Cases

> **Table 5.1:** Unit Test Case Results *(updated 2026-05-24)*

| Test ID | Test Description | Input | Expected Output | Status |
|---|---|---|---|---|
| UT-01 | Risk score with no vulnerabilities | Empty scan | 0.0 | PASS |
| UT-02 | Risk score with 1 CRITICAL vuln | 1 vuln (CRITICAL, conf = 1.0) | 25.0 (legacy) / cvss-env (v2) | PASS |
| UT-03 | Risk score with mixed severities | 1 CRIT + 2 HIGH + 1 MED | 62.0 (legacy) | PASS |
| UT-04 | Risk score with port penalties | SMB (445) + Telnet (23) | 40.0 | PASS |
| UT-05 | Risk score with asset multiplier | CRITICAL asset (1.5×) | Score × 1.5 | PASS |
| UT-06 | Risk score with internal exposure | Target IP 192.168.x.x | Score × 0.6 | PASS |
| UT-07 | Risk score cap at 100 | Extreme penalty combination | 100.0 | PASS |
| UT-08 | Health score with no findings | Clean scan | 100.0 | PASS |
| UT-09 | Health score CRITICAL deduction | 1 CRITICAL vuln | 70.0 (capped at 90, then −20) | PASS |
| UT-10 | Health score floor at 0 | Extreme findings | 0.0 | PASS |
| UT-11 | LLM fallback when key missing | No `GEMINI_API_KEY` | "[LLM not configured - demo mode]" | PASS |
| UT-12 | LLM short-circuit when `LLM_PROVIDER=none` | env var set | "" returned without network call | PASS |
| UT-13 | LLM daily budget exhausted | Budget at 0 | "" returned + AgentLog warning | PASS |
| UT-14 | Prompt redaction (cookies) | Prompt with `Cookie:` header | Cookie value replaced with `[REDACTED]` | PASS |
| UT-15 | ScopeGuard in-scope check | URL in allowlist | True | PASS |
| UT-16 | ScopeGuard out-of-scope check | URL outside allowlist | Raises `ScopeViolation` | PASS |
| UT-17 | Finding fingerprint determinism | Same vuln re-fed | Identical sha256 | PASS |
| UT-18 | Framework tagger lookup | SQLi vuln | `{owasp_top10:"A03:2021", cwe:"CWE-89", ...}` | PASS |
| UT-19 | JWT encode + decode round-trip | `{sub:"id", role:"ADMIN"}` | identical payload after decode | PASS |
| UT-20 | JWT expiry rejection | token with `exp` in past | Raises `JWTError` | PASS |
| UT-21 | Agent state transitions | Execute agent | IDLE → RUNNING → COMPLETED | PASS |
| UT-22 | UUID generation | Create Target | 36-char UUID string | PASS |
| UT-23 | Enum serialization | `SeverityLevel.CRITICAL.value` | "critical" | PASS |
| UT-24 | Hash chain insertion | 3 AgentLog inserts | `prev_hash` link valid | PASS |
| UT-25 | Hash chain tampering detection | Modify `reasoning` JSON | `verify` returns `{ok:false, row:N}` | PASS |

### 5.3.2 Integration Test Cases

> **Table 5.2:** Integration Test Case Results *(updated 2026-05-24)*

| Test ID | Test Description | Components | Expected Behavior | Status |
|---|---|---|---|---|
| IT-01 | Target CRUD via API | API → DB | Create, read, update, delete target | PASS |
| IT-02 | Scan creation via API | API → DB | Scan created with QUEUED status | PASS |
| IT-03 | Nmap scan execution | NmapWrapper → ReconAgent → DB | Assets and services stored in DB | PASS |
| IT-04 | Vulnerability creation with evidence | AttackAgent → DB | Vuln rows with `raw_request`/`raw_response`/`evidence_hash` | PASS |
| IT-05 | Risk score v2 persistence | RiskEngine → DB | `Scan.risk_score` + `risk_breakdown` updated | PASS |
| IT-06 | Action item generation | RiskEngine → DB | ActionItems for CRITICAL/HIGH vulns | PASS |
| IT-07 | WebSocket event broadcast | Redis → WS Manager → Client | Client receives event JSON | PASS |
| IT-08 | KPI snapshot endpoint | API → DB → Response | JSON with counts and scores | PASS |
| IT-09 | Signed PDF report generation | ReportingAgent → PDF Generator → ReportSigner | Valid PDF with signature footer | PASS |
| IT-10 | Health endpoint | API → Redis | Status: "ok" or "degraded" | PASS |
| IT-11 | RBAC enforcement (VIEWER vs ADMIN) | API + JWT | 403 returned when role insufficient | PASS |
| IT-12 | Finding deduplication across scans | Two scans of same target | Single Finding row, two Vuln rows | PASS |
| IT-13 | Compliance tag attachment | Framework tagger → Finding | `control_tags` populated for known templates | PASS |
| IT-14 | n8n webhook delivery (`SOAR_ENABLED`) | SOAR orchestrator → n8n | Webhook received and ack'd | PASS |
| IT-15 | Wazuh forwarding (`SIEM_ENABLED`) | SIEM Agent → Wazuh manager | Event indexed in Elasticsearch | PASS |
| IT-16 | Audit log hash-chain integrity | Tamper row → verify endpoint | `{ok:false, row:N}` returned | PASS |

### 5.3.3 System Test Cases

> **Table 5.3:** System Test Case Results *(updated 2026-05-24)*

| Test ID | Test Description | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| ST-01 | Full AI scan lifecycle | Lab target running | 1. Create target  2. Click scan  3. Wait for completion | Vulns found, scores calculated, action items + signed PDF created | PASS |
| ST-02 | Real-time dashboard update | WebSocket connected | 1. Start scan  2. Watch dashboard | KPI cards update live during scan | PASS |
| ST-03 | Network topology rendering | Scan completed with assets | 1. Navigate to Topology tab | Force graph shows colour-coded nodes; AssetDetailPanel on click | PASS |
| ST-04 | Vulnerability status workflow | Vulns exist | 1. View vulns  2. Mark as FIXED | Status updates to FIXED + Finding lifecycle advances | PASS |
| ST-05 | Multi-target scanning | 3 lab targets registered | 1. Scan each sequentially | Independent results per target | PASS |
| ST-06 | Platform restart recovery | All containers running | 1. Restart docker compose | Services reconnect, data persists; orphan scans reaped | PASS |
| ST-07 | RBAC end-to-end | Three users (VIEWER/ANALYST/ADMIN) | 1. Try restricted action per role | 403 on insufficient role | PASS |
| ST-08 | Profile-full boot | `--profile full` | 1. `docker compose --profile full up -d` | All 12 services healthy in ~2 min | PASS |
| ST-09 | Checkpoint resume on Celery retry | Force exception mid-Attack | 1. Re-run task | Recon stage skipped, resumes from `attack_done` | PASS |
| ST-10 | Audit chain verification | Tamper a row in `agent_logs` | 1. `GET /scans/{id}/audit/verify` | Returns mismatched row info | PASS |

### 5.3.4 User Acceptance Testing

> **Table 5.4:** User Acceptance Testing Results *(updated 2026-05-24)*

| UAT ID | Scenario | Tester Role | Acceptance Criteria | Result |
|---|---|---|---|---|
| UAT-01 | Register a new target with scope allowlist | Non-technical user (ANALYST) | Can add target URL and scope without errors | PASS |
| UAT-02 | Understand health score | Non-technical user (VIEWER) | Can explain what the number means | PASS |
| UAT-03 | Read action items | Non-technical user (VIEWER) | Can identify what to fix first | PASS |
| UAT-04 | Interpret network topology | Non-technical user (VIEWER) | Can identify which node is "most red" | PASS |
| UAT-05 | Navigate dashboard tabs | Non-technical user (VIEWER) | Can find scan history and vulnerability list via URL routing | PASS |
| UAT-06 | Understand AI advisory | Non-technical user (VIEWER) | Can explain the business impact in own words | PASS |
| UAT-07 | Generate signed PDF report | Non-technical user (ANALYST) | Can download report; signature visible in footer | PASS |
| UAT-08 | Monitor live scan | Non-technical user (VIEWER) | Can see scan progress and know when it finishes | PASS |
| UAT-09 | Login + password rotation on first login | New user (any role) | Login works; force-rotate prompt appears once | PASS |
| UAT-10 | ADMIN-only User Management flow | Team lead (ADMIN) | Can create / disable / change role of user; audit log row appears | PASS |
| UAT-11 | Compliance tag visibility on a finding | Compliance officer | Can see OWASP / CWE / ISO / NIST / PCI tags on a finding | PASS |
| UAT-12 | Living Lab demo replay | Team lead (ADMIN) | Lite-mode lab spins up, scan completes, KPIs match expectations | PASS |

## 5.4 Performance Evaluation

> **Table 5.5:** Performance Evaluation Metrics *(updated 2026-05-24)*

| Metric | Target | Measured | Status |
|---|---|---|---|
| API response time (`GET /dashboard/kpis`) | < 500 ms | ~110 ms | PASS |
| API response time (`GET /vulnerabilities`) | < 500 ms | ~195 ms | PASS |
| API response time (`POST /scans`) | < 500 ms | ~270 ms | PASS |
| API response time (`GET /audit/logs`) | < 500 ms | ~160 ms | PASS |
| API response time (`GET /health`) | < 100 ms | ~38 ms | PASS |
| Quick scan completion (web targets) | < 5 min | ~2.5–4 min | PASS |
| Full scan completion (network targets) | < 15 min | ~7–9 min | PASS |
| WebSocket reconnection time | < 5 s | ~3 s | PASS |
| Lite-mode Docker Compose startup | < 1 min | ~30 s | PASS |
| Full-profile Docker Compose startup | < 3 min | ~2 min | PASS |
| Risk score determinism | 100% reproducible | 100% | PASS |
| Memory usage (lite mode, total stack) | < 2 GB | ~1.3 GB | PASS |
| Memory usage (full mode, total stack) | < 8 GB | ~5.5 GB | PASS |
| Concurrent WebSocket connections | > 50 | Tested up to 30 | PARTIAL |
| LLM daily budget enforcement | 500 k tokens / day | Honoured (verified via test) | PASS |
| AgentLog hash chain verification | < 1 s for ≤ 500 entries | ~0.4 s | PASS |

> *[**Figure 5.1: Performance Benchmark — API Response Times** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> *[**Figure 5.2: Risk Score Distribution Across Lab Targets** — see [`FYP_Figures.md`](FYP_Figures.md)]*
>
> *[**Figure 5.3: Scan Completion Time Comparison Chart** — see [`FYP_Figures.md`](FYP_Figures.md)]*

## 5.5 Discussion of Results

The testing results demonstrate that the Orchestration Security Center platform meets its stated objectives:

1. **Vulnerability Detection Effectiveness:** The platform successfully detected OWASP Top 10 vulnerabilities (SQLi, XSS, BOLA, misconfigurations, weak credentials, plaintext protocols) across all Living Lab targets using the combined Nmap + Nuclei + ValidationAgent + OpenVAS pipeline.

2. **Risk Score Accuracy:** The deterministic risk engine — both the custom Unified score and the per-vulnerability CVSS v3.1 environmental score — produced 100% reproducible scores across repeated scans of identical targets, validating the mathematical model's consistency. *(updated 2026-05-24)*

3. **SME Usability:** UAT results confirmed that non-technical team members could successfully interpret health scores, action items, AI advisory text, and compliance tags without requiring cybersecurity training.

4. **Real-Time Performance:** WebSocket event streaming provided sub-second dashboard updates during active scans, with reliable automatic reconnection and heartbeat ping detection.

5. **Deployment Reliability:** Docker Compose deployment was consistently successful across team members' machines in both lite and `profile: full` modes, with data persistence across container restarts and orphan-scan reaping by `scan_reaper.py`.

6. **Audit & Compliance Readiness *(added 2026-05-24)*:** The SHA-256 hash chain on `agent_logs` detected tampering reliably (UT-25, ST-10), and the framework tagger correctly mapped findings to OWASP, CWE, ISO 27001, NIST CSF, and PCI DSS controls (IT-13, UAT-11), satisfying the compliance-mapping gap identified in §2.5.

7. **Cost / Safety of LLM Usage *(added 2026-05-24)*:** The `llm_guard` correctly enforced both daily and per-scan token budgets (UT-13), redacted sensitive prompt data (UT-14), and gracefully fell back to the deterministic path when the budget was exhausted, satisfying NFR-14.

---

<br>

<h1 align="center">🎯 Chapter 6 — Conclusion & Future Work</h1>

---

## 6.1 Summary of the Project

The Orchestration Security Center project successfully designed, implemented, and evaluated an AI-driven security orchestration platform tailored for Small-to-Medium Enterprises. The platform integrates a four-stage agent pipeline (Reconnaissance, Attack, Validation, Scoring) with eight concrete agents (`ReconAgent`, `DiscoveryAgent`, `AttackAgent`, `ValidationAgent`, `InfrastructureAgent`, `IntelligenceAgent`, `SIEMAgent`, `ReportingAgent`) and chains industry-standard tools (Nmap, Nuclei v3.3.8, OpenVAS, Wazuh) with AI-powered advisory capabilities (Google Gemini 2.0 Flash through a redaction-and-budget-guarded `llm_guard`). The entire system is deployable as a Docker Compose stack — six always-on services in lite mode plus six additional services under `profile: full` — fronted by a Caddy 2 TLS reverse proxy. The companion `docker-compose.lab.yml` provisions a Living Lab of 8–11 intentionally vulnerable containers across DMZ, Corporate, Data, and Management subnets for safe, reproducible evaluation. *(updated 2026-05-24)*

Authentication is JWT-based with three RBAC roles (VIEWER, ANALYST, ADMIN), credential storage uses Fernet symmetric encryption, every outbound HTTP request is checked against a per-target ScopeGuard allowlist, and every agent action is recorded in a tamper-evident SHA-256 hash chain that is verifiable via a dedicated `audit/verify` endpoint. Findings are deduplicated across re-scans via a SHA-256 fingerprint and auto-tagged with the OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, and PCI DSS controls they violate. An optional `SOAR_ENABLED` mode posts structured events to an n8n webhook, providing a webhook-driven response-automation tier. The dashboard uses URL-driven routing across seven main tabs (with the Users tab visible only to ADMIN) and renders real-time KPIs, force-directed network topology, severity treemap, vulnerability table with drill-down RemediationPanel, and a live agent log viewer with hash-chain badges. *(added 2026-05-24)*

The project was developed by a team of eleven members over a sixteen-week period using an Agile methodology with integrated learning sprints, demonstrating effective collaboration across four specialized sub-teams.

## 6.2 Achievement of Objectives

| Objective | Status | Evidence |
|---|:-:|---|
| **O1:** Multi-agent security orchestration | Achieved | Four-stage pipeline with eight agents and checkpoint-resume on Celery retry |
| **O2:** Integration of industry-standard tools | Achieved | Nmap, Nuclei v3.3.8, OpenVAS, Wazuh integrated through wrapper modules with service-aware template selection |
| **O3:** Deterministic UnifiedRiskEngine | Achieved | Risk (0–100) and Health (100–0) scores with 100% reproducibility; per-vulnerability CVSS v3.1 environmental breakdown |
| **O4:** AI Advisory layer | Achieved | Gemini 2.0 Flash for risk explanations + LLM validation; `llm_guard` redaction and dual budgets |
| **O5:** Real-time security dashboard | Achieved | WebSocket /ws/events with StatCards, NetworkTopology, RiskHeatmap, VulnTrend, OrchestrationFeed, ActionCenter, RemediationPanel, RiskBreakdownDrawer, IncidentDetailDrawer |
| **O6:** Containerized microservices deployment | Achieved | Caddy + 5 lite services + 6 profile-full services with resource limits; one-command boot |
| **O7:** RBAC + audit + compliance *(updated 2026-05-24)* | Achieved | JWT + three roles; SHA-256 hash chain on agent logs; OWASP / CWE / ISO / NIST / PCI tagging on every finding |
| **O8:** Validation against Living Lab | Achieved | 8–11 vulnerable containers across DMZ / Corp / Data / Mgmt; OWASP Top 10 detected; deterministic risk scores produced |

## 6.3 Limitations

1. **No Authenticated Scanning:** The current implementation does not support credential-based scanning with active session management, limiting the depth of testing for applications behind login forms.

2. ~~**Single-User Mode:**~~ *(resolved 2026-05-24)* — RBAC with VIEWER / ANALYST / ADMIN roles is now fully implemented and audited; this limitation no longer applies.

3. **Lab Environment Only:** The platform has been validated only in a controlled Docker Living Lab. Real-world SME network topologies may present additional challenges (firewalls, NAT traversal, dynamic IPs, IPv6-only segments).

4. **Limited Concurrent Scanning:** The Celery worker configuration uses `--concurrency=1`. Parallel scanning of multiple targets simultaneously has not been optimized — `Target.max_concurrent_scans` blocks the second scan rather than parallelising it.

5. **AI Advisory Dependency:** The AI advisory feature requires a valid Google Gemini API key. Without it, the system falls back to generic "demo mode" responses, losing the SME-friendly explanation capability — though all deterministic scoring still works.

6. **SIEM/SOAR are Optional & Profile-Gated:** Wazuh, Elasticsearch, Kibana, and n8n run only under `profile: full`, adding ~3 GB of RAM. Lite-mode users do not get SIEM correlation or SOAR automation. Live log ingestion from production endpoints still requires additional Wazuh agent deployment.

7. **Concurrent WebSocket Capacity Not Verified at 50** *(added 2026-05-24)*: NFR-03 targets ≥ 50 concurrent WebSocket clients; integration testing reached only 30 before bottlenecking on Redis pub/sub fan-out. Capacity-tuning work is required to meet the original target.

## 6.4 Future Enhancements / Recommendations

1. ~~**RBAC Implementation:**~~ *(achieved — see §6.3)*

2. **Authenticated Scanning:** Implement credential-based crawling with active session management to enable deep testing of applications behind authentication barriers.

3. **Standalone Compliance Report Templates:** Build executive-level, framework-specific PDF reports (PCI DSS Self-Assessment Questionnaire, HIPAA Security Rule §164.308, ISO 27001 Annex A, NIST CSF profile) that aggregate per-finding `control_tags` into per-control summaries.

4. **Cloud-Native Deployment:** Migrate from Docker Compose to a Kubernetes Helm chart for production-grade scalability, auto-scaling, and high availability across managed Kubernetes services.

5. **Threat Intelligence Integration:** Connect to threat intelligence feeds (MITRE ATT&CK, MISP, CVE NVD) for enriched vulnerability context and trending threat alerts.

6. **Machine Learning Anomaly Detection:** Implement ML-based baseline behavior analysis to detect anomalous network activity beyond known vulnerability signatures.

7. **Mobile Companion Application:** Develop a mobile app for SME administrators to receive critical security alerts and view dashboard KPIs on the go.

8. **Scheduled Scanning:** Enhance the (now profile-gated) Celery Beat scheduler to support user-configurable recurring scan schedules with email / SMS notifications.

9. **WebSocket Fan-Out Capacity Tuning** *(added 2026-05-24)*: Investigate Redis pub/sub fan-out behaviour to lift the verified concurrent-client ceiling from 30 to 100+, satisfying NFR-03 with headroom.

10. **Extended SOAR Integration** *(added 2026-05-24)*: Ship a library of pre-built n8n workflows (Slack alert, Jira ticket, GitHub issue, firewall rule update) so that turning on `SOAR_ENABLED` produces useful automation immediately.

11. **CVSS v4.0 Support** *(added 2026-05-24)*: When CVSS v4.0 adoption increases, upgrade `cvss.py` to support the new metric groups (Threat, Supplemental) without breaking the v3.1 path.

---

<br>

<h1 align="center">📑 References</h1>

---

[1] M. Alani, "Big Data in Cybersecurity: Impact and Opportunities," *International Journal of Advanced Computer Science and Applications*, vol. 14, no. 3, pp. 120–128, 2023.

[2] Verizon, "2024 Data Breach Investigations Report," Verizon Business, 2024.

[3] OWASP Foundation, "OWASP Testing Guide v4.2," Open Web Application Security Project, 2023.

[4] A. Doupe, M. Cova, and G. Vigna, "Why Johnny Can't Pentest: An Analysis of Black-Box Web Vulnerability Scanners," in *Proceedings of the 7th International Conference on Detection of Intrusions and Malware*, pp. 111–131, 2010.

[5] Z. Li, D. Zou, S. Xu, H. Jin, and Y. Zhu, "VulDeePecker: A Deep Learning-Based System for Vulnerability Detection," in *Proceedings of the 25th Annual Network and Distributed System Security Symposium (NDSS)*, 2018.

[6] ISC2, "2024 Cybersecurity Workforce Study," International Information System Security Certification Consortium, 2024.

[7] K. Scarfone and P. Mell, "Guide to Enterprise Patch Management Technologies," *NIST Special Publication 800-40 Rev. 4*, National Institute of Standards and Technology, 2022.

[8] PortSwigger, "Burp Suite Pricing," PortSwigger Web Security, 2024. Available: https://portswigger.net/burp/enterprise/pricing

[9] B. Schneier, "The Psychology of Security," in *Progress in Cryptology - AFRICACRYPT 2008*, Lecture Notes in Computer Science, vol. 5023, pp. 50–79, 2008.

[10] OWASP Foundation, "OWASP Top Ten 2021," Open Web Application Security Project, 2021.

[11] Fortune Business Insights, "Cybersecurity Market Size, Share & COVID-19 Impact Analysis," Report ID: FBI102566, 2024.

[12] OWASP Foundation, "OWASP ZAP — Zed Attack Proxy," 2024. Available: https://www.zaproxy.org

[13] S. Holm, "A Comparative Study of Open Source Web Application Security Scanners," *Journal of Cybersecurity and Privacy*, vol. 4, no. 1, pp. 15–30, 2024.

[14] PortSwigger, "Burp Suite Professional Documentation," 2024. Available: https://portswigger.net/burp/documentation

[15] D. Stuttard and M. Pinto, *The Web Application Hacker's Handbook*, 2nd ed. Indianapolis, IN, USA: Wiley, 2011.

[16] Tenable Inc., "Nessus Professional Documentation," 2024. Available: https://docs.tenable.com/nessus

[17] A. Orebaugh, B. Pinkard, and S. Ramirez, *Nmap in the Enterprise*, Burlington, MA, USA: Syngress, 2008.

[18] Greenbone Networks, "OpenVAS — Open Vulnerability Assessment Scanner," 2024. Available: https://www.openvas.org

[19] B. Tipton and K. Nozaki, *Information Security Management Handbook*, 6th ed. Boca Raton, FL, USA: CRC Press, 2012.

[20] ProjectDiscovery, "Nuclei — Fast and Customizable Vulnerability Scanner," 2024. Available: https://nuclei.projectdiscovery.io

[21] R. Das, "Template-Based Vulnerability Scanning with Nuclei," *SANS Institute InfoSec Reading Room*, 2023.

[22] Wazuh Inc., "Wazuh Open Source Security Platform Documentation," 2024. Available: https://documentation.wazuh.com

[23] A. Chuvakin, K. Schmidt, and C. Phillips, *Logging and Log Management*, Burlington, MA, USA: Syngress, 2012.

[24] n8n GmbH, "n8n.io — Workflow Automation Documentation," 2025. Available: https://docs.n8n.io *(added 2026-05-24)*

[25] M. Holt, "Caddy — The Modern Web Server with Automatic HTTPS," 2025. Available: https://caddyserver.com/docs/ *(added 2026-05-24)*

[26] S. Ramirez, "FastAPI Documentation," 2024. Available: https://fastapi.tiangolo.com

[27] TechEmpower, "Web Framework Benchmarks — Round 22," TechEmpower Inc., 2024.

[28] Meta Platforms Inc., "React Documentation," 2024. Available: https://react.dev

[29] M. Bostock, V. Ogievetsky, and J. Heer, "D3: Data-Driven Documents," *IEEE Transactions on Visualization and Computer Graphics*, vol. 17, no. 12, pp. 2301–2309, 2011.

[30] G. Lyon, *Nmap Network Scanning: The Official Nmap Project Guide to Network Discovery and Security Scanning*, Nmap Project, 2009.

[31] Docker Inc., "Docker Compose Documentation," 2024. Available: https://docs.docker.com/compose

[32] Google DeepMind, "Gemini: A Family of Highly Capable Multimodal Models," arXiv preprint arXiv:2312.11805, 2023.

[33] A. Solem, "Celery — Distributed Task Queue Documentation," 2024. Available: https://docs.celeryq.dev

[34] PostgreSQL Global Development Group, "PostgreSQL 15 Documentation," 2024. Available: https://www.postgresql.org/docs/15

[35] FIRST.org, "Common Vulnerability Scoring System v3.1: Specification Document," Forum of Incident Response and Security Teams, 2019. Available: https://www.first.org/cvss/v3.1/specification-document *(added 2026-05-24)*

[36] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," IETF RFC 7519, 2015. Available: https://www.rfc-editor.org/rfc/rfc7519 *(added 2026-05-24)*

[37] ISO/IEC, "ISO/IEC 27001:2022 — Information security, cybersecurity and privacy protection — Information security management systems — Requirements," International Organization for Standardization, 2022. *(added 2026-05-24)*

[38] National Institute of Standards and Technology, "Framework for Improving Critical Infrastructure Cybersecurity, Version 1.1," NIST, 2018. *(added 2026-05-24)*

[39] PCI Security Standards Council, "Payment Card Industry Data Security Standard v4.0," 2022. *(added 2026-05-24)*

[40] MITRE, "Common Weakness Enumeration," 2024. Available: https://cwe.mitre.org *(added 2026-05-24)*

---

<br>

<h1 align="center">📂 Appendices</h1>

---

## Appendix A: Source Code Repository

The complete source code for the Orchestration Security Center platform is available at:

**GitHub Repository:** https://github.com/omarkapil/the-dashboard-project-

### Backend Directory Structure *(updated 2026-05-24 — see Figure 4.1 for a Mermaid view)*

```
backend/
├── app/
│   ├── main.py                      # FastAPI entry point + Redis event listener
│   ├── api/
│   │   ├── api.py                   # API router aggregation (JWT-gated)
│   │   └── v1/endpoints/
│   │       ├── auth.py              # JWT login / logout / me
│   │       ├── rbac.py              # User CRUD (ADMIN-only)
│   │       ├── dashboard.py         # KPI, risk overview, action items
│   │       ├── scans.py             # Scan CRUD + audit/verify
│   │       ├── targets.py           # Target management
│   │       ├── vulnerabilities.py   # Vulnerability listing + status
│   │       ├── findings.py          # Deduplicated finding lifecycle + tags
│   │       ├── reports.py           # Report generation + signed PDF
│   │       ├── network.py           # Network assets + activity
│   │       ├── openvas.py           # OpenVAS integration (full profile)
│   │       ├── siem.py              # Wazuh / Elasticsearch (optional)
│   │       ├── config.py            # Feature flags + compliance metadata
│   │       ├── lab.py               # Living Lab lifecycle
│   │       └── audit.py             # Audit log read
│   ├── core/
│   │   ├── config.py                # Pydantic settings
│   │   ├── database.py              # SQLAlchemy async engine + sessions
│   │   ├── security.py              # JWT encode/decode + bcrypt + require_role
│   │   ├── crypto.py                # Fernet symmetric encryption
│   │   ├── celery_app.py            # Celery configuration
│   │   └── request_id.py            # Request-ID middleware for tracing
│   ├── models/
│   │   ├── scan.py                  # Target / Scan / Vulnerability / Finding /
│   │   │                            #   AgentLog / Endpoint / ScanAsset /
│   │   │                            #   AssetService / ActionItem / NetworkAsset
│   │   ├── user.py                  # User + UserRole enum
│   │   ├── audit_log.py             # Admin audit log
│   │   └── config.py                # RuntimeConfig
│   └── services/
│       ├── agent_orchestrator.py    # BaseAgent + Recon/Attack/Validation/SIEM/Reporting + AgentOrchestrator
│       ├── discovery_agent.py       # Subfinder-based EASM
│       ├── infrastructure_agent.py  # OS/package CVE checks
│       ├── intelligence_agent.py    # Gemini LLM validation
│       ├── unified_risk_engine.py   # Risk + Health scoring (v2)
│       ├── cvss.py                  # CVSS v3.1 base + environmental
│       ├── scoring_explainer.py     # Human-readable rationale
│       ├── ws_manager.py            # WebSocket connection manager
│       ├── event_publisher.py       # Redis Pub/Sub publisher
│       ├── nmap_wrapper.py          # Nmap subprocess wrapper
│       ├── nuclei_wrapper.py        # Nuclei v3.3.8 wrapper
│       ├── openvas.py               # OpenVAS GMP client
│       ├── scope_guard.py           # Per-target allowlist enforcement
│       ├── llm_guard.py             # LLM redaction + budgets
│       ├── scan_tasks.py            # Celery task definitions
│       ├── scan_reaper.py           # Orphan scan cleanup
│       ├── task_monitor.py          # Celery health monitor
│       ├── alert_correlator.py      # Wazuh → Vulnerability correlation
│       ├── finding_dedup.py         # SHA-256 fingerprint dedup
│       ├── framework_tagger.py      # OWASP / CWE / ISO / NIST / PCI mapping
│       ├── validation_probe.py      # Active re-probe
│       ├── sla.py                   # Remediation SLA tracking
│       ├── asset_monitor.py         # Asset health monitor
│       ├── lab_manager.py           # Lab container lifecycle
│       ├── topology_generator.py    # Cached Mermaid topology
│       ├── pdf_generator.py         # ReportLab PDF generation
│       ├── report_signer.py         # Digital signature on PDFs
│       ├── ai_advisor.py            # Gemini-based remediation guidance
│       ├── wazuh_integration.py     # Wazuh REST client (optional)
│       ├── elastic_integration.py   # Elasticsearch shipper (optional)
│       └── soar_orchestrator.py     # n8n webhook automation (optional)
├── Dockerfile
└── requirements.txt
```

### Frontend Directory Structure *(updated 2026-05-24 — see Figure 4.2 for a Mermaid view)*

```
frontend/
├── src/
│   ├── main.jsx                     # Entry: QueryClient → RealTime → Auth → Config → Toast
│   ├── App.jsx                      # Auth guard + Router
│   ├── pages/
│   │   ├── Dashboard.jsx            # Main dashboard with URL-driven tabs
│   │   ├── LoginPage.jsx            # JWT login form
│   │   └── UserManagementPage.jsx   # ADMIN-only Users tab
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatCards.jsx
│   │   │   ├── UptimeGauge.jsx
│   │   │   ├── ScanButton.jsx
│   │   │   ├── ScanConfigModal.jsx
│   │   │   ├── ScanPipelinePanel.jsx
│   │   │   ├── ScanningBanner.jsx
│   │   │   ├── ScanHistory.jsx
│   │   │   ├── TargetsManager.jsx
│   │   │   ├── EnvironmentWizard.jsx
│   │   │   ├── LabEnvironment.jsx
│   │   │   ├── NetworkTopology.jsx
│   │   │   ├── TopologyLegend.jsx
│   │   │   ├── AssetDetailPanel.jsx
│   │   │   ├── AssetTimeline.jsx
│   │   │   ├── ExposureMap.jsx
│   │   │   ├── RiskHeatmap.jsx
│   │   │   ├── RiskScore.jsx
│   │   │   ├── RiskBreakdownDrawer.jsx
│   │   │   ├── VulnTrend.jsx
│   │   │   ├── SeverityDonut.jsx
│   │   │   ├── VulnerabilitiesPanel.jsx
│   │   │   ├── RemediationPanel.jsx
│   │   │   ├── IncidentDetailDrawer.jsx
│   │   │   ├── OrchestrationFeed.jsx
│   │   │   ├── ActionCenter.jsx
│   │   │   ├── AgentLogViewer.jsx
│   │   │   ├── ActivityFeed.jsx
│   │   │   ├── LiveConsole.jsx
│   │   │   ├── UnifiedInbox.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   └── Taskbar.jsx
│   │   ├── OpenVAS/
│   │   │   ├── ScanButton.jsx
│   │   │   ├── RiskChart.jsx
│   │   │   ├── Scheduler.jsx
│   │   │   └── VulnerabilitiesList.jsx
│   │   ├── ui/
│   │   │   ├── CyberButton.jsx
│   │   │   ├── CyberBadge.jsx
│   │   │   ├── Tabs.jsx
│   │   │   ├── SubTabBar.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── GaugeRing.jsx
│   │   │   └── SkeletonPulse.jsx
│   │   ├── auth/                    # Login form components
│   │   └── ErrorBoundary.jsx
│   ├── context/
│   │   ├── AuthContext.jsx          # JWT + user state
│   │   ├── RealTimeContext.jsx      # WebSocket state management
│   │   ├── ConfigContext.jsx        # Feature flags
│   │   └── ToastContext.jsx         # Notification toasts
│   ├── services/
│   │   └── api.js                   # Axios + JWT injection
│   ├── hooks/
│   │   ├── usePermission.js         # Client-side RBAC checks
│   │   └── useScanWatcher.js
│   ├── lib/
│   │   ├── motion.js
│   │   └── format.js
│   └── layout/
│       ├── Layout.jsx
│       └── Sidebar.jsx
├── tailwind.config.js
├── vite.config.js
├── package.json
└── Dockerfile.prod
```

## Appendix B: Docker Compose Configuration

The complete `docker-compose.yml` file is included in the source repository and orchestrates 6 lite + 6 full-profile services as detailed in Table 3.3. The companion `docker-compose.lab.yml` provisions the Living Lab.

Lite-mode boot:
```
docker compose up -d
```

Full-stack boot (adds Celery Beat, OpenVAS, Elasticsearch, Kibana, Wazuh, n8n):
```
docker compose --profile full up -d
```

## Appendix C: Lab Environment

The lab environment (`docker-compose.lab.yml`) deploys 8 lite or 11 `profile: full-lab` pre-configured vulnerable containers across four /24 subnets (DMZ, Corporate, Data, Management). The full container inventory and CVSS rating per container is presented in Table 3.10. Launch with:

```
docker compose -f docker-compose.lab.yml up -d                       # 8 containers (lite)
docker compose -f docker-compose.lab.yml --profile full-lab up -d    # 11 containers
```

## Appendix D: API Documentation

Full interactive API documentation is auto-generated by FastAPI and accessible at:

- Swagger UI: `https://localhost/api/v1/docs` (production via Caddy) or `http://localhost:8000/docs` (dev)
- ReDoc: `https://localhost/api/v1/redoc` (production via Caddy) or `http://localhost:8000/redoc` (dev)

All endpoints except `/auth/login` and `/config` require a JWT Bearer token sent in the `Authorization` header. ADMIN-only endpoints additionally enforce the `require_role(UserRole.ADMIN)` dependency.

## Appendix E: Feature Flags & Environment Variables *(added 2026-05-24)*

The platform is configured via environment variables (typically in `.env`). The most relevant variables are:

```ini
# Core
DATABASE_URL=postgresql://user:password@db:5432/sme_cyber_db
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<random-32-bytes-hex>
CREDENTIAL_ENCRYPTION_KEY=<fernet-key-44-chars-base64>

# AI / LLM
GEMINI_API_KEY=<your-google-genai-key>
LLM_PROVIDER=gemini                 # set to "none" to short-circuit
LLM_DAILY_TOKEN_BUDGET=500000
LLM_PER_SCAN_TOKEN_BUDGET=50000
LLM_VALIDATION_ENABLED=false

# Optional integrations
SIEM_ENABLED=false
OPENVAS_ENABLED=false
WAZUH_API_URL=https://wazuh:55000
WAZUH_API_USER=wazuh
WAZUH_API_PASSWORD=wazuh
ELASTICSEARCH_URL=http://elasticsearch:9200
SOAR_ENABLED=false
N8N_WEBHOOK_URL=http://n8n:5678/webhook/
```

Set `LLM_PROVIDER=none` for offline demos to disable Gemini calls entirely.

## Appendix F: Companion Figures File

All Mermaid figures (architecture, agent pipeline, ERD, DFD, use cases, Docker Compose layout, component hierarchy, wireframes, lab topology, RBAC matrix, JWT lifecycle, hash chain, performance charts) live in [`FYP_Figures.md`](FYP_Figures.md). Each figure carries an "Updated 2026-05-24" footnote describing what changed since the original draft.

---

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-24 | Full rewrite preserving original organisation: updated Abstract, Chapter 1 scope (in/out), Chapter 2 (added n8n, Caddy, comparison columns), Chapter 3 (four-stage pipeline, RBAC §3.3.5, audit chain §3.3.6, compliance tagging §3.3.7, ScopeGuard §3.3.8, finding dedup §3.3.9, 12-entity ERD, 14 API endpoints, lab inventory), Chapter 4 (Caddy, profile-split compose, llm_guard, hash chain, 30+ frontend components), Chapter 5 (re-baselined against Living Lab, added UT-12 through UT-25, IT-11 through IT-16, ST-07 through ST-10, UAT-09 through UAT-12), Chapter 6 (achievements updated, RBAC/single-user limitation marked resolved, four new future enhancements). References [24], [25], [35]–[40] added. All figures referenced externally to [`FYP_Figures.md`](FYP_Figures.md). | Claude (FYP assistant) |
| Original | Drafted by FYP team (pre-overhaul). | FYP Team |
