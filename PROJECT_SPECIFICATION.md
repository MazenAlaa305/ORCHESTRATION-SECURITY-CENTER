# Project Specification Document: found 404 (SME Cyber Exposure Dashboard)

**Role Context:** Senior Software Architect & Systems Integrator
**Objective:** Provide a "Map of Truth" for system optimization through logic refinement, strict integration hardening, and performance architecture. (No new features).

## 1. System Architecture
**High-Level Overview:**
The application is an AI-driven Dynamic Application Security Testing (DAST) platform tailored for SMEs. It operates on a standard client-server architecture with an agentic orchestration layer in the backend.

**Tech Stack:**
*   **Frontend:** React 18, Vite, Zustand (State Management), React Query, Axios, TailwindCSS, Recharts, React-Force-Graph-2D.
*   **Backend:** FastAPI 0.109, Python 3.11+, Uvicorn.
*   **Database/ORM:** PostgreSQL, SQLAlchemy 2.0, Alembic.
*   **Queue/Cache:** Celery 5.3, Redis 5.0 (Present in requirements, likely for async offloading).
*   **Tooling wrappers:** Playwright (for JS rendering/crawling), python-nmap (infrastructure discovery), python-gvm (OpenVAS).
*   **AI/LLM:** Google Generative AI (`gemini-2.0-flash` / `gemini-pro`).

**Communication Flow:**
1. User interacts with the React Frontend -> Updates Zustand/React Query state.
2. Axios HTTP wrappers (`api.js`) make RESTful calls to the FastAPI backend backend (`api/v1/endpoints`).
3. FastAPI endpoint resolves target, spawns the `AgentOrchestrator` workflow logic.
4. Orchestrator invokes synchronous/asynchronous AI Agents sequentially.
5. Agents utilize local wrapper tools (Nmap/Playwright) and LLM logic (Gemini) to generate findings.
6. Findings are pushed to `UnifiedRiskEngine` for deterministic risk scoring.
7. Data is committed via SQLAlchemy to a PostgreSQL database. 

---

## 2. Core Functional Logic
**Primary Workflow: The AI-Driven Scan (`/scans/ai`)**
Triggered via `pentesterService.startAIScan`. The `AgentOrchestrator` delegates work via distinct classes inheriting from `BaseAgent`:

*   **`ReconAgent`:**
    *   Accepts target URL. Uses `NmapWrapper` for infrastructure port scanning.
    *   Attempts `Playwright` to spawn a headless Chromium instance to extract links, forms, and footprint tech stacks. Falls back to `httpx` if JS execution fails.
    *   Writes `Endpoint` records to the DB.
*   **`AttackAgent`:**
    *   Receives discovered endpoints, forms, and network assets.
    *   Maps Nmap-discovered services to Nuclei-style tag structures (`SERVICE_TO_TEMPLATE`).
    *   Executes hardcoded payloads (SQLi, XSS, BOLA, SSRF) against endpoints dynamically based on URL parameter patterns (e.g., `?id=` -> BOLA; `?search=` -> XSS).
    *   Flags specific static heuristic lab conditions (e.g., Port 6379 -> Unprotected Redis, Port 3000 -> Juice shop).
    *   Writes `Vulnerability` records to the DB.
*   **`ValidationAgent`:**
    *   Filters false positives via a deterministic rule (confidence > 0.6 = REAL).
    *   Updates DB VulnStatus to `FALSE_POSITIVE` if criteria are failed.
    *   *Note:* Houses a dormant `_validate_with_llm` method that executes Gemini to analyze the vulnerability context.
*   **`SIEMAgent`:**
    *   Analyzes logs (Wazuh/Elastic) with Gemini to assign `THREAT` or `BENIGN` verdicts. 
    *   Generates internal actions (Placeholder SOAR execution).
*   **`ReportingAgent`:**
    *   Aggregates validated findings and scan summaries into human-readable executive markdown and remediation instructions.
*   **`UnifiedRiskEngine`:**
    *   Calculates deterministic scores (Health and Risk) based on CVSS standard weighted penalties, modifying with Asset Value and Internal IP Exposure constraints. Parses vulns and maps them to SME-focused `ActionItem` logs.

---

## 3. Dependency Mapping
### Frontend Dependencies
*   **Core:** `react`, `react-dom`, `vite`
*   **State / Query:** `zustand`, `@tanstack/react-query`
*   **Network:** `axios`
*   **UI / Vis:** `tailwindcss`, `lucide-react`, `framer-motion`, `recharts`, `react-force-graph-2d`, `d3-force`
*   **Misc:** `ldrs`

### Backend Dependencies
*   **Core Server:** `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `python-multipart`
*   **Database:** `sqlalchemy`, `alembic`, `psycopg2-binary`
*   **AI Engine:** `google-generativeai`
*   **Task Management:** `celery`, `redis`
*   **Scanners / Integrations:** `python-nmap`, `playwright`, `python-gvm`
*   **Scraping / Requests:** `httpx`, `aiohttp`, `requests`, `beautifulsoup4`, `lxml`
*   **Templating / Reporting:** `jinja2`, `reportlab`

### Internal Module Mapping
*   `app.api.api` -> Root router.
*   `app.models.scan` -> Extrinsic mapped architecture handling Models (`Target`, `Scan`, `Vulnerability`, `AgentLog`, `Endpoint`, `ActionItem`).
*   `app.services.*` -> Houses the core `BaseAgent` overrides, `UnifiedRiskEngine`, and wrapper services (`NmapWrapper`, `NucleiWrapper`).

---

## 4. Integration Points & "Friction"
**Inefficient Handoffs & Bottlenecks:**

1.  **Sync/Async DB Confusion:** SQLAlchemy is implemented synchronously utilizing `SessionLocal`. The FastAPI routes and Agent services (e.g., `AgentOrchestrator.execute()`) are written using `async def`. Blocking DB `.commit()` calls exist throughout `async` execution, causing major event-loop friction.
2.  **Legacy Deprecation Friction:** The `SIEMAgent` references deprecated `elastic_integration`/`wazuh_integration`/`soar_orchestrator` packages and statically mocks out responses (`elastic_alerts = []`). The `Scan` and `Vulnerability` database models conflate `pentesterFlow` new structures with legacy structures (e.g., `ScanAsset`, `AssetService`), causing convoluted state sync issues.
3.  **Hardcoded Orchestration Payload Logic:** `AttackAgent` manually strings parameters into URLs (e.g., `?test=...`) using `httpx` in a blocking loop against pre-determined array slices (`min(20, len(endpoints))`). 
4.  **Dormant LLM Validation Pipeline:** The `ValidationAgent` relies solely on deterministic confidence checking (>0.6) and abandons its `_validate_with_llm` method, dropping the "AI-driven" validation requirement in practice.

---

## 5. Efficiency Audit
*   **Redundant Type Casting:** `UnifiedRiskEngine` has highly redundant typecasting (e.g., `p_val = float(cast(float, penalty))`) polluting calculation logic.
*   **Array Slicing "Safety" Fails:** In `ReconAgent` and `AttackAgent`, arbitrary array limits are processed (e.g. `max_ep = min(50, len(discovered_endpoints))`) which restricts system usefulness for broad domains without pagination logic.
*   **Unoptimized Crawling:** Playwright opens a browser per recon agent rather than maintaining a pool or context list, dramatically slowing performance.
*   **Error Handling Weakness:** Broad `except Exception as e:` blocks exist in crawler nodes without retry states or targeted graceful degradation logic. If Playwright fails, it reverts immediately to a static `httpx` dump, failing to parse modern JS apps.
*   **Database connection flooding:** `SessionLocal()` is spawned ad-hoc directly within `BaseAgent` execution rather than dynamically passing down a controlled Dependency Injection session from FastAPI route guards.

---

## 6. Instructions for Implementation (For Claude)
**Objective:** Focus entirely on refactoring the existing modules for seamless interoperability, strict adherence to architectural patterns, and raw performance throughput. Do not invent new capabilities.

1.  **Event Loop & DB Bottleneck Optimization:** Refactor `AgentOrchestrator` classes and their inherited agents to accept an asynchronous database bounded session. Rewrite blocking SQLAlchemy queries to properly utilize `asyncio`, or offload all sync interactions safely to thread pools.
2.  **Harmonize Concurrency:** Enhance `AttackAgent`'s endpoint payload injections to utilize asynchronous gathering (e.g., `asyncio.gather()`) instead of a single sequential `for` loop testing 2 payloads at a time.
3.  **Code Sanitation:** Remove dead array mocking in `SIEMAgent` and wire it up utilizing existing environment setups, or mock structurally via internal interfaces. Strip out redundant `float(cast())` logic in `UnifiedRiskEngine`.
4.  **Activate AI Workflows:** Stitch `_validate_with_llm()` logic directly into the `ValidationAgent` pipeline to cross-validate findings rather than blindly trusting the arbitrary `0.6` rule. 
5.  **Graceful Crawler Stability:** Rebuild the `ReconAgent` Playwright execution to utilize intelligent network idling timeout handlers and context reuse, mitigating the brute-force single-page wait paradigm that fails often. Provide structured exception trapping rather than `Exception as e:`.
6.  **Data Structure Cleanup:** Unify legacy models into their rightful relational structure within `app.models.scan`, properly deprecating unused scalar fields to tighten up database query speeds.
