# PLAN — Orchestration Security Center

> Consolidated planning index. Merged from:
> - `project_plan.md` *(kept in place — see [project_plan.md](project_plan.md))*
> - `DR_descution.md` *(kept in place — see [DR_descution.md](DR_descution.md))*
> - `FINISHINGPLAN.md` *(merged in full below — original deleted)*
> - `newplan24/4/2026.md` *(merged in full below — original deleted)*

---

## Index

1. [Project Plan summary](#1-project-plan-summary) — high-level reference to [project_plan.md](project_plan.md)
2. [Defense Study Guide summary](#2-defense-study-guide-summary) — high-level reference to [DR_descution.md](DR_descution.md)
3. [Stabilization & Refinement Execution Plan (2026-04-24)](#3-stabilization--refinement-execution-plan-2026-04-24) — full content
4. [Finishing Plan (2026-04-25)](#4-finishing-plan-2026-04-25) — full content

---

# 1. Project Plan summary

> The full master plan is in [project_plan.md](project_plan.md) and is the source of truth.
> This is a one-page reminder.

- **Project:** Orchestration Security Center — AI-driven DAST for SMEs.
- **Timeline:** March 2 → July 2 2026 (16 weeks). Currently week 10 of 16 as of 2026-04-19.
- **Team:** 11 members across 4 sub-teams; team lead Omar Kapil.
  - **Sub-Team 1 — Backend & AI Core** (lead: Reem Amin) — FastAPI, SQLAlchemy, Postgres, Celery, Redis, Gemini.
  - **Sub-Team 2 — Frontend & Visualization** (lead: Marize Ehap) — React 18, Vite, Tailwind, D3, Recharts.
  - **Sub-Team 3 — Security & Scanning** (lead: Shahd Paher) — Nmap, Nuclei, Wazuh, Elastic, Kibana, OpenVAS.
  - **Sub-Team 4 — DevOps & QA** (lead: Omar Kapil) — Docker Compose, GitHub Actions, Pytest, Postman.
- **Phases:** 1 Foundation (✅ done) · 2 Core Dev (✅ done) · 3 Integration & Enhancement (🔄 in progress, weeks 10–13) · 4 Presentation & Finalization (weeks 14–16).
- **Grading mix:** Live demo 40% · code & docs 20% · individual contribution 20% · presentation 10% · testing 10%.
- **Critical gate (Week 13):** RBAC implemented, PDF export end-to-end, security audit passed, all UAT bugs closed, ≥ 15 automated tests passing, lab fully operational. After Week 13 → feature freeze.
- **File ownership:** see Appendix A in [project_plan.md](project_plan.md) for the full audit table mapping every repo file to a primary owner.

---

# 2. Defense Study Guide summary

> The full defense guide is in [DR_descution.md](DR_descution.md) and is the source of truth for FYP oral defense prep.
> This is a one-page reminder.

- **Audience:** All 11 team members preparing for FYP oral defense (deadline 2026-07-02).
- **Purpose:** Single source — read it and you can confidently explain (a) the entire platform and (b) your personal contribution.
- **Read order:** Sections 1–3 cover-to-cover; your own per-member subsection (Section 5) word-for-word; skim 6–8 the morning of the defense.
- **Key sections:**
  1. Project Overview — what it is, goals, target users, academic context, ASCII architecture diagram, full verified tech stack.
  2. Repository Structure — top-level tree + module responsibilities for backend, frontend, lab.
  3. End-to-End Data Flow — request lifecycle from browser click → DB write → WS event → UI render.
  4. Detailed Function Reference — public API surface of every key service.
  5. Per-Member Deep Dive (11 sections) — what each owner built and how to defend it.
  6. Anticipated Q&A.
  7. Run / Demo Guide.
  8. Glossary.

---

# 3. Stabilization & Refinement Execution Plan (2026-04-24)

> Originally `newplan24/4/2026.md`. Personas applied: Lead Full-Stack Engineer · Senior Penetration Tester · Expert UI/UX Dashboard Designer · Professional Security Auditor.
> **Scope: Stabilization / Refinement ONLY — no new features.**

## 0. Guiding Constraints (Read Before Executing Any Phase)

1. **NO new features.** Every task must terminate in: bug fix, UX refinement of an existing screen, data-pipeline correction, isolation/hardening, or audit/verification artifact. If a task drifts into "we should also add X" — stop and mark it out of scope.
2. **No regressions.** Each phase ends with a regression pass: login → dashboard → scan → history → vulnerabilities → report.
3. **Evidence first, change second.** Every refactor preceded by reproducible log/screenshot/network trace under `/evidence/<phase>/<task>/`.
4. **Two-tier acceptance.** Each task has (a) functional acceptance (it works) and (b) professional-standard acceptance (matches the industry baseline from Phase 1).
5. **Isolation is inviolable.** No phase may weaken the lab's network isolation guarantees.

## Phase 1 — Research & Baseline Audit (foundational)

**Output:** written baseline document, not code changes.

### 1.1 Industry Standards Research → produce `/docs/audit/baseline_2026-04-24.md` with citations:

1. **Full-Stack QA & Pipelines** — ISTQB taxonomy (unit → integration → contract → E2E → exploratory); contract-testing pattern (OpenAPI as SSOT); WebSocket reliability patterns (heartbeat, backoff, resume-from-sequence); observability triad (structured logs, request-id propagation, RED metrics).
2. **Cybersecurity Dashboard UI/UX** — Mitre ATT&CK Navigator, Elastic Security, Wazuh, OpenVAS GSA review; NIST SP 800-160 Vol 2; alert-fatigue literature; severity-tiered color palette; progressive disclosure; density tiers; WCAG 2.2 AA; 4.5:1 contrast; keyboard-only navigation.
3. **Isolated Pentest Lab SOPs** — OffSec / SANS GPEN; Docker `internal: true`, no bridge-to-host, iptables egress deny-all + allowlist, DNS scoping; reference: HackTheBox/TryHackMe/WebGoat.
4. **Vuln-Mgmt & Scanner-Accuracy Auditing** — CVSS 3.1/4.0 normalization; EPSS; golden-dataset approach (planted CVEs with known IDs/CWE/signature); TP/FP/FN matrix; recall ≥ 0.90 industry baseline on planted criticals.

### 1.2 Current-State Snapshot Audit (output to `/evidence/phase1/`)

1. **Inventory of routes** — walk [backend/app/api/v1](backend/app/api/v1) and enumerate every endpoint; cross-ref against [frontend/src/api](frontend/src/api) and [frontend/src/services](frontend/src/services). Flag orphans (both directions).
2. **Inventory of screens** — walk [frontend/src/pages](frontend/src/pages) and [frontend/src/components](frontend/src/components); document tabs and feeding endpoints.
3. **Data contract diff** — for each API pair, diff backend Pydantic against frontend expectations. Flag silent coercions, missing fields, `any`-typed escape hatches.
4. **Service inventory** — [backend/app/services](backend/app/services) — for each service document owner endpoint, execution path (sync vs Celery vs thread), data it writes, screen rendering its output.
5. **Known defects list** — grep `TODO|FIXME|XXX|HACK` across `backend/` and `frontend/src/`. Append each to `/evidence/phase1/defect_backlog.md`.

**Phase 1 Exit:** baseline doc written + peer-reviewed, route↔consumer map produced, contract-diff triaged, defect backlog populated.

## Phase 2 — End-to-End Functional Validation (Backend ↔ Frontend Pipeline)

### 2.1 Contract Lock
1. Export OpenAPI from FastAPI `/openapi.json` to `/docs/contracts/openapi_2026-04-24.json`.
2. Generate typed client (openapi-typescript or openapi-fetch) into `frontend/src/api/generated/` — reference for drift detection only, don't replace call sites.
3. Diff generated types against hand-written ones — every mismatch becomes a 2.2 task.

### 2.2 Route-by-Route Validation
- [ ] Happy path returns 2xx with payload matching schema.
- [ ] Error paths (401/403/404/422/500) each return documented error envelope (not stack trace, not HTML).
- [ ] snake_case on the wire; frontend converts at boundary, not ad-hoc.
- [ ] Timestamps ISO 8601 UTC with `Z`; frontend renders in user locale.
- [ ] Pagination envelope uniform `{items,total,page,page_size}` — pick one shape and enforce.
- [ ] Numeric precision preserved (CVSS 9.8 stays 9.8, not 9.800000001 or 9).
- [ ] Empty-state: backend returns `[]` (not `null`); frontend renders empty-state component.

### 2.3 Real-Time Channel Validation — audit [ws_manager.py](backend/app/services/ws_manager.py) and [event_publisher.py](backend/app/services/event_publisher.py)
- [ ] WS reconnects with exponential backoff; documented max interval.
- [ ] Messages carry monotonic sequence numbers; client rejects out-of-order.
- [ ] Heartbeat every N seconds; disconnect detected within 2× heartbeat.
- [ ] Backpressure: latest-wins for status, append-only for events.
- [ ] All WS events also retrievable via REST (late joiners can catch up).

### 2.4 E2E Regression Suite (existing only — no new features) — at minimum:
1. Login → token stored → protected route reachable.
2. Launch scan → task enqueued → WS progress events → completion → result on History.
3. Click vuln row → detail modal populates.
4. Generate report → PDF downloads → opens uncorrupted.
5. Logout → token cleared → protected route redirects.

### 2.5 Observability Sanity Check
- [ ] Each request has `request_id` propagated to logs and returned as response header.
- [ ] structlog (or equivalent) JSON logs at INFO for all state-changing endpoints.
- [ ] One trace followable: button-click → nginx → FastAPI → Celery → DB.

**Phase 2 Exit:** OpenAPI locked & committed; zero orphans; contract-diff blockers resolved; E2E suite green on CI; one trace stored at `/evidence/phase2/trace_sample.log`.

## Phase 3 — Scan Screen UI/UX Rebuild (Refinement)

### 3.1 Heuristic Audit — score current scan screen against NN/g 10 heuristics + Shneiderman's 8 golden rules → `/evidence/phase3/heuristic_audit.md`. Focus on: visibility of system status, real-world vocabulary, error prevention (block out-of-scope at `scope_guard`), recognition over recall.

### 3.2 Information Architecture (wireframe only):
```
[ Scan Configuration ]
├── 1. Target            (presets from lab inventory + manual entry, validated by scope_guard)
├── 2. Scan Profile      (Quick / Standard / Deep — each maps to existing backend preset)
├── 3. Advanced (collapsed by default)
│   ├── Port range
│   ├── Nuclei templates (checkbox tree, grouped by severity)
│   ├── Rate limiting
│   └── Auth (existing credentials pickers only)
├── 4. Scheduling        (Run now / Scheduled — existing scheduler only)
└── 5. Review & Launch   (human-readable summary of every choice)
```
Principles: progressive disclosure (advanced collapsed; 80% never open it), single primary action (one dominant Launch button), inline non-blocking validation, preview before launch (step 5 shows exact backend call).

### 3.3 Implementation (refactor existing component only)
- [ ] Replace flat form with stepper/accordion matching IA above.
- [ ] Extract reusable pieces into `frontend/src/components/scan/` (no new deps).
- [ ] Wire validation to existing backend `scope_guard` (don't re-implement on client).
- [ ] All labels/help/errors reviewed by pentester persona for accuracy.

### 3.4 UX Acceptance
- [ ] Non-expert launches scoped scan in < 60 s without help (3-participant usability test).
- [ ] Expert reaches advanced options in ≤ 2 clicks.
- [ ] Keyboard-accessible labels; linear/sane tab order.
- [ ] Color never the only signal (severity uses icon + text too).
- [ ] axe-core passes WCAG 2.2 AA.

**Phase 3 Exit:** heuristic audit signed off; wireframes approved before code; rebuilt screen passes usability + accessibility; no new endpoints, no new scan capabilities added.

## Phase 4 — History Tab Reorganization

### 4.1 Data-Model Review (read-only)
- [ ] Backing endpoint(s) return only fields actually needed (over-fetch = noise).
- [ ] Stable indexed `created_at DESC` ordering at DB layer (not client-sorted).
- [ ] Server-side pagination (client-slicing amplifies noise).

### 4.2 Visual De-Noise
1. **Column discipline.** Max 7 columns visible: Time · Target · Profile · Status · Findings (sev-tiered count) · Duration · Actions. Rest moves to row-expansion.
2. **Severity pill only** — one coloured pill per row summarizing highest sev; avoid rainbow chips.
3. **Time relative on hover-absolute** ("2h ago", tooltip shows exact UTC).
4. **Zebra striping off; row hover on.** Striping = noise; hover + subtle divider reads cleaner.
5. **Status lexical, not emoji.** "Completed" / "Failed" / "Cancelled" with left-border colour accent.
6. **Dense mode toggle** — compact/comfortable.

### 4.3 Filtering, Sorting, Pagination
- [ ] Filters: date range, status, profile, target (type-ahead from history, not free text).
- [ ] Sort: Time (default desc), Duration, Findings count — always server-side.
- [ ] Pagination: server-side, page size 25, URL-synced.
- [ ] Empty/loading/error states all rendered as components.
- [ ] Persist filter state in URL params (shareable / deep-linkable).

### 4.4 Row Expansion & Drill-Down
- [ ] Inline expansion shows: command executed, duration breakdown, findings by severity, link to full report.
- [ ] Row click navigates to detail; expand chevron expands inline. Different visual affordances.

### 4.5 Performance Budget
- [ ] Initial render (25 rows) < 150 ms on mid-tier hardware.
- [ ] No re-render cascade on filter change (memoize rows).
- [ ] Virtualization deferred unless default page size > 100.

**Phase 4 Exit:** ≤ 7 default columns; server-side filter/sort/pagination + URL sync; empty/loading/error validated; perf budget met (`/evidence/phase4/perf_trace.json`).

## Phase 5 — Lab Isolation & Simplified Configuration Workflow

### 5.1 Isolation Audit — inspect [docker-compose.lab.yml](docker-compose.lab.yml) and [infra](infra/)
- [ ] All lab services on `internal: true` networks (verify via `docker network inspect`).
- [ ] No host port publishing on lab services (`expose:` only where scanner needs it).
- [ ] Scanner is the only bridge: two NICs (lab network + scanner-control network). No third NIC.
- [ ] Host iptables/Windows Firewall denies egress from lab subnet to internet and user LAN. Idempotent scripts under `/infra/isolation/`.
- [ ] Lab DNS resolves only inside lab network.
- [ ] Egress test: from inside lab container, `curl -m 5 https://1.1.1.1` must fail; ping host gateway must fail. Capture to `/evidence/phase5/egress_denied.txt`.

### 5.2 Failure-Mode Testing
- [ ] Stop/crash scanner → lab remains isolated (no accidental bridge).
- [ ] Restart host → isolation rules re-apply (persistent, not ephemeral).
- [ ] Add rogue container on default bridge → cannot reach lab subnet.

### 5.3 Simplified Configuration Workflow (existing surfaces only)

Non-expert end-to-end:
1. Open app → "Lab" panel shows status `Up / Down / Starting`.
2. One **Start Lab** button → runs existing `lab_manager` action; streams progress via WS.
3. Once Up, lab inventory auto-populates scan-screen target dropdown.
4. Pick target → scan → progress → results. No terminal, no YAML.
5. **Stop Lab** tears down cleanly; no orphan containers/networks.

Refinements: button states reflect real container state; docker-daemon errors translated to human messages ("Docker is not running", not Python stack); status polled at 5–10 s or pushed via WS, never per-second.

### 5.4 Documentation — update [HOW_TO_RUN.md](HOW_TO_RUN.md) with prereqs checklist, the 3-click workflow, isolation-verification commands, and recovery from half-up state.

**Phase 5 Exit:** isolation verified by egress-denied test; persists across host restart + scanner crash; non-expert (validated by teammate dry-run) completes Start-Lab → Scan → Stop-Lab without CLI; HOW_TO_RUN section updated and dated.

## Phase 6 — Vulnerabilities Tab Refinement & Detection-Accuracy Audit

### 6.1 Visual Refinement of Existing Tab — audit [VulnerabilityList.jsx](frontend/src/components/VulnerabilityList.jsx)
1. **Severity-first hierarchy.** Critical/High dominate; Info/Low de-saturated, not hidden.
2. **One row = one finding = one glance.** Columns: Severity · Title · Affected Asset · CVSS · First Seen · Status. Nothing else by default.
3. **Severity palette discipline.** 5 semantic colors total (Critical/High/Med/Low/Info). No gradients, no pattern fills.
4. **Grouping toggle** (existing mechanism only): by Asset / by CVE / by Severity. No free-form.
5. **Detail drawer, not modal storm.** Right-side drawer with enriched payload (6.2). Keyboard nav (↑/↓ between findings).

### 6.2 Finding Enrichment — drawer shows (only fields backend already produces; no new scrapers):
- CVE ID (linked to NVD) · CWE · CVSS 3.1 vector + score · EPSS if available.
- Affected asset: hostname, IP, port, service banner.
- Detection source: scanner name, plugin/template ID, timestamp.
- Evidence: raw scanner snippet (request/response, packet, log line) that produced the finding.
- Remediation guidance from `ai_advisor` — flagged as AI-generated.
- Duplicate/dedup info: "also seen as X other findings, grouped by `finding_dedup`".
- Validation status: `validation_probe` outcome.
- Framework mapping from `framework_tagger` (MITRE ATT&CK, OWASP Top 10).

Fields not currently produced are **omitted, not stubbed**.

### 6.3 Alert-Fatigue Countermeasures
- [ ] Default view: `status != closed AND severity >= medium`. User can opt out.
- [ ] Deduped findings collapsed to single row with count badge (already supported by `finding_dedup`).
- [ ] `validation_probe` failures surfaced as second-tier warning, not new Critical.
- [ ] "New since last visit" indicator uses user's last-seen timestamp.

### 6.4 Scanner-Accuracy Audit (Auditor persona) — single most load-bearing quality gate

1. **Build golden dataset.** Every intentionally-vulnerable component in lab → record host, service, port, expected CVE(s), expected CWE, expected detection signature (scanner + template/plugin ID), expected severity bucket. Store as `/evidence/phase6/golden_dataset.yaml`.
2. **Freeze lab.** Commit lab version/image digests for reproducibility.
3. **Run full scan profile** end-to-end via UI (not backdoor). Export results.
4. **Build truth matrix.** Per golden entry:
   - **TP** — detected with correct CVE/CWE and severity bucket.
   - **FN** — planted but not detected. Each FN needs root-cause: scanner missing plugin / template disabled / wrong scope / timeout / misparsed output.
   - **FP** — detected but no golden entry. Each FP needs root-cause: noisy template / banner-only match / misattribution.
5. **Target metrics:**
   - Recall on Critical/High ≥ 0.95.
   - Recall overall ≥ 0.90.
   - Precision ≥ 0.80.
6. **Fix gaps within existing scanner configs only.** Enable right templates, correct port lists, tune rate limits. Do **not** write a new scanner.
7. **Re-run.** Lock numbers into `/evidence/phase6/accuracy_report.md` with before/after tables.

**Phase 6 Exit:** vulns tab redesigned to severity-first IA; drawer enrichment live; default filters + dedup active; golden dataset committed + truth matrix produced; recall/precision targets met or each gap has documented root-cause + accepted-risk sign-off; no new detection capability — only configuration tuning.

## Phase 7 — Cross-Cutting Regression & Sign-Off

1. Full E2E regression suite (from 2.4) green.
2. axe-core accessibility pass across login, dashboard, scan, history, vulnerabilities, reports.
3. Performance budget: dashboard first paint, scan submission latency, history page render, vuln drawer open.
4. Security pass: run `/security-review` on the branch; triage all high/critical.
5. Re-verify isolation (5.1) after any phase touching `infra/` or `docker-compose*.yml`.
6. Documentation freshness: HOW_TO_RUN, PROJECT_OVERVIEW, route/consumer map all dated within the stabilization window.

**Final Sign-Off Checklist:** all six phase exit-criteria checked · defect backlog (1.2.5) closed or explicitly deferred · `/evidence/` populated as listed · no new endpoints/screens/scanners/DB fields · single page-by-page walkthrough video or screenshot set captured as the release artifact.

## Execution Notes
- Work phase-by-phase. Don't interleave. Phase 1's baseline is the reference every later phase cites.
- Every change lands as a small atomic PR tagged `stabilization/phaseN/<task>`.
- PR description includes: task ID, acceptance criteria evaluated, evidence path, one-line risk note.
- If a task appears to need a new feature to satisfy its acceptance criteria, **stop and escalate** — either the criteria are wrong or the task is.
- Prefer deleting over adding. Stabilization PR is the right place to remove unused fields/columns/routes.
- Do not touch files outside the current phase's task. Drive-by refactors are the enemy of clean stabilization.

---

# 4. Finishing Plan (2026-04-25)

> Originally `FINISHINGPLAN.md`. Owner: Omar Kapil · target completion gate: Week 13 (May 16, 2026).
> Every missing artifact from `project_plan.md` enumerated below with: file path, why it must exist, dependencies, full skeleton, and acceptance criteria. Each section is self-contained.

## How to use this plan

1. Pick one section. Read **Goal**, **Why**, **Dependencies**, **Implementation**, **Acceptance**.
2. Verify dependencies exist before starting (paths cited absolutely).
3. Copy skeleton, fill marked `# TODO` blocks against existing services.
4. Run the acceptance command at section bottom. Don't claim done until green.
5. Update `MEMORY.md` index only if changing repo-wide architecture (new directory, new top-level service).

**Order of execution (priority chain):**

```
P0 (blockers for everything else)
 └─ Track 1: backend conftest + endpoint tests   (Section A)
 └─ Track 2: GitHub Actions CI                   (Section H)

P1 (Phase 3 product features)
 ├─ Backend RBAC endpoint + scoring_explainer    (Section B, C)
 ├─ Frontend ProtectedRoute / RoleGuard / hooks  (Section D)
 └─ Missing dashboard panels                     (Section E)

P2 (academic / demo deliverables)
 ├─ Lab attack scenarios + Wazuh rules          (Section F)
 ├─ SIEM correlation                             (Section G)
 ├─ E2E Playwright suite                         (Section I)
 └─ Demo + presentation docs                     (Section J)

P3 (nice-to-have / polish)
 └─ Postman collection, Trivy audit, BROWSER_COMPAT (Section K)
```

**Stack reminders:**
- Backend: FastAPI + SQLAlchemy 2.0 (sync `Session` for endpoints, async for services). Auth uses `app.api.deps.get_current_user` and `require_role(*roles)` factories at [backend/app/api/deps.py:46](backend/app/api/deps.py#L46).
- User roles enum (in [backend/app/models/user.py:13](backend/app/models/user.py#L13)): `VIEWER` / `ANALYST` / `ADMIN`.
- All endpoints registered through [backend/app/api/api.py](backend/app/api/api.py).
- Frontend uses `useAuth()` from [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx); token in `sessionStorage`.
- Frontend API client: [frontend/src/services/api.js](frontend/src/services/api.js).
- Tests run inside backend container: `docker compose exec backend pytest`.

## Section A — Backend test foundation (P0)

The Week 13 freeze gate requires ≥ 15 passing tests. This section is the foundation everything else builds on.

### A.1 — `backend/tests/conftest.py`

**Goal:** Single source of test fixtures (in-memory SQLite, FastAPI `TestClient`, authenticated headers, mocked Gemini).

**Why:** Every other test file depends on these. Without it each test re-imports the world and pytest collection breaks.

**Dependencies:** `backend/app/main.py` (FastAPI `app`), `backend/app/core/database.py` (`Base` + `get_db`), `backend/app/models/user.py` (User + UserRole), `backend/app/core/security.py` (`hash_password`, `create_access_token`).

```python
# backend/tests/conftest.py
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Force test config BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["GEMINI_API_KEY"] = "test-key-not-real"
os.environ["SECRET_KEY"] = "test-secret-do-not-use-in-prod"
os.environ["FERNET_KEY"] = "fernet-test-key-32bytes-padded___="

from app.main import app  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password, create_access_token  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def _override_get_db():
    db = TestingSessionLocal()
    try: yield db
    finally: db.close()

@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine); yield; Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try: yield db
    finally: db.close()

@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c: yield c
    app.dependency_overrides.clear()

def _seed_user(db, email, role):
    user = User(email=email, password_hash=hash_password("TestPass123!"), role=role)
    db.add(user); db.commit(); db.refresh(user); return user

@pytest.fixture()
def admin_user(db_session): return _seed_user(db_session, "admin@test", UserRole.ADMIN)
@pytest.fixture()
def analyst_user(db_session): return _seed_user(db_session, "analyst@test", UserRole.ANALYST)
@pytest.fixture()
def viewer_user(db_session): return _seed_user(db_session, "viewer@test", UserRole.VIEWER)

def _auth_headers_for(user): 
    return {"Authorization": f"Bearer {create_access_token(subject=user.email, role=user.role.value)}"}

@pytest.fixture()
def admin_headers(admin_user): return _auth_headers_for(admin_user)
@pytest.fixture()
def analyst_headers(analyst_user): return _auth_headers_for(analyst_user)
@pytest.fixture()
def viewer_headers(viewer_user): return _auth_headers_for(viewer_user)

@pytest.fixture(autouse=True)
def _mock_gemini(monkeypatch):
    """Prevent any test from hitting the real Gemini API."""
    class _Stub:
        def generate_content(self, *a, **kw):
            class R: text = '{"summary":"mock","steps":["mock"]}'
            return R()
    try:
        import google.generativeai as genai
        monkeypatch.setattr(genai, "GenerativeModel", lambda *a, **kw: _Stub())
    except ImportError:
        pass
```

**Acceptance:** `docker compose exec backend pytest backend/tests/conftest.py --collect-only -q` → no errors.

### A.2 — `backend/tests/test_endpoints.py`

**Goal:** Smoke-test every router. One happy-path + one auth-failure per route family.

```python
import pytest

def test_health_open(client):
    r = client.get("/health"); assert r.status_code == 200
    assert r.json()["status"] in ("ok", "healthy")

@pytest.mark.parametrize("path", [
    "/api/v1/scans/", "/api/v1/targets/", "/api/v1/findings/",
    "/api/v1/dashboard/kpi", "/api/v1/reports/",
])
def test_protected_routes_reject_unauthenticated(client, path):
    r = client.get(path); assert r.status_code in (401, 403)

def test_me_returns_current_user(client, admin_headers):
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test" and r.json()["role"] == "ADMIN"

def test_targets_list_empty(client, admin_headers):
    r = client.get("/api/v1/targets/", headers=admin_headers)
    assert r.status_code == 200 and isinstance(r.json(), list)

def test_targets_create_requires_admin(client, viewer_headers):
    r = client.post("/api/v1/targets/", headers=viewer_headers, json={"name":"x","ip_address":"10.0.0.1"})
    assert r.status_code == 403

def test_dashboard_kpi_shape(client, analyst_headers):
    r = client.get("/api/v1/dashboard/kpi", headers=analyst_headers); assert r.status_code == 200
    body = r.json()
    for key in ("total_scans","active_scans","critical_findings"): assert key in body
```

### A.3 — `backend/tests/test_auth_flow.py`

```python
def test_login_success(client, admin_user):
    r = client.post("/api/v1/auth/login", json={"email":"admin@test","password":"TestPass123!"})
    assert r.status_code == 200; assert "access_token" in r.json(); assert r.json()["role"] == "ADMIN"

def test_login_wrong_password(client, admin_user):
    assert client.post("/api/v1/auth/login", json={"email":"admin@test","password":"wrong"}).status_code == 401

def test_login_unknown_email(client):
    assert client.post("/api/v1/auth/login", json={"email":"nobody@test","password":"x"}).status_code == 401

def test_logout_is_204(client, admin_headers):
    assert client.post("/api/v1/auth/logout", headers=admin_headers).status_code == 204

def test_change_password_then_login_with_new(client, db_session, admin_user, admin_headers):
    assert client.post("/api/v1/auth/change-password", headers=admin_headers,
        json={"current_password":"TestPass123!","new_password":"NewPass456!"}).status_code == 204
    assert client.post("/api/v1/auth/login", json={"email":"admin@test","password":"NewPass456!"}).status_code == 200
```

### A.4 — `backend/tests/test_rbac.py`

```python
import pytest
ADMIN_ONLY_POSTS = [
    ("/api/v1/targets/", {"name":"t","ip_address":"10.0.0.1"}),
    ("/api/v1/rbac/users", {"email":"x@y","password":"x","role":"VIEWER"}),
]

@pytest.mark.parametrize("path,body", ADMIN_ONLY_POSTS)
def test_viewer_blocked(client, viewer_headers, path, body):
    assert client.post(path, json=body, headers=viewer_headers).status_code in (403, 404)

def test_analyst_can_trigger_scan(client, analyst_headers):
    r = client.post("/api/v1/scans/", json={"target_url":"http://example.test","scan_type":"quick"}, headers=analyst_headers)
    assert r.status_code in (200, 202)

def test_viewer_cannot_trigger_scan(client, viewer_headers):
    assert client.post("/api/v1/scans/", json={"target_url":"http://example.test","scan_type":"quick"}, headers=viewer_headers).status_code == 403
```

### A.5 — `backend/tests/test_websocket.py`

```python
from app.services.ws_manager import manager

def test_ws_envelope_shape(client):
    with client.websocket_connect("/ws/events") as ws:
        import asyncio
        asyncio.get_event_loop().run_until_complete(manager.broadcast_event("TEST_EVENT", {"hello":"world"}))
        msg = ws.receive_json()
        assert msg["type"] == "TEST_EVENT" and msg["payload"] == {"hello":"world"}
        assert "seq" in msg and "ts" in msg
```

### A.6 — `backend/tests/test_risk_engine.py`

```python
import pytest
from app.services.unified_risk_engine import UnifiedRiskEngine
from app.models.scan import SeverityLevel

@pytest.mark.parametrize("severity,expected_min,expected_max", [
    (SeverityLevel.CRITICAL, 70, 100),
    (SeverityLevel.HIGH,     40, 79),
    (SeverityLevel.MEDIUM,   15, 49),
    (SeverityLevel.LOW,       1, 19),
    (SeverityLevel.INFO,      0,  9),
])
def test_severity_weight_bands_are_monotonic(severity, expected_min, expected_max):
    w = UnifiedRiskEngine.SEVERITY_WEIGHTS[severity]; assert w >= 0
    if severity == SeverityLevel.CRITICAL:
        assert w > UnifiedRiskEngine.SEVERITY_WEIGHTS[SeverityLevel.HIGH]

def test_high_risk_ports_includes_smb_telnet_rdp():
    for port in (23, 445, 3389): assert port in UnifiedRiskEngine.HIGH_RISK_PORTS

def test_asset_value_critical_higher_than_low():
    assert UnifiedRiskEngine.ASSET_VALUE_MAP["CRITICAL"] > UnifiedRiskEngine.ASSET_VALUE_MAP["LOW"]
```

### A.7 — `backend/tests/test_agents.py`

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_intelligence_agent_returns_structured_advice():
    from app.services.intelligence_agent import IntelligenceAgent
    agent = IntelligenceAgent()
    with patch.object(agent, "_call_gemini", new=AsyncMock(return_value='{"summary":"x","steps":["a"]}')):
        result = await agent.advise({"finding":"open port 23"})
    assert "summary" in result and isinstance(result["steps"], list)

@pytest.mark.asyncio
async def test_validation_probe_drops_low_confidence():
    from app.services.validation_probe import ValidationProbe
    findings = [{"id":1,"confidence":0.4},{"id":2,"confidence":0.9}]
    kept = await ValidationProbe().filter(findings)
    assert all(f["confidence"] >= 0.6 for f in kept)
    assert {f["id"] for f in kept} == {2}
```

Adjust method names to match the actual public surface in [intelligence_agent.py](backend/app/services/intelligence_agent.py) and [validation_probe.py](backend/app/services/validation_probe.py) before committing.

### A.8 — `backend/tests/test_scan_tasks.py`

```python
import pytest
from app.core.celery_app import celery_app

@pytest.fixture(autouse=True)
def _eager_mode():
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    yield
    celery_app.conf.task_always_eager = False

def test_scan_task_registered():
    assert "app.services.scan_tasks.run_ai_scan" in celery_app.tasks

def test_scan_task_returns_dict_on_invalid_target(monkeypatch):
    from app.services import scan_tasks
    monkeypatch.setattr(scan_tasks, "_run_async", lambda coro: {"status":"FAILED","error":"bad target"})
    result = scan_tasks.run_ai_scan.apply(args=("not-a-target","quick",None)).get()
    assert isinstance(result, dict)
```

### A.9 — `backend/tests/test_nmap_wrapper.py`

```python
from pathlib import Path
from app.services.nmap_wrapper import parse_nmap_xml

FIXTURE = Path(__file__).parent / "fixtures" / "nmap_sample.xml"

def test_parser_extracts_open_ports():
    if not FIXTURE.exists():
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_text('''<?xml version="1.0"?>
<nmaprun><host>
  <address addr="10.0.0.10" addrtype="ipv4"/>
  <ports>
    <port protocol="tcp" portid="22"><state state="open"/><service name="ssh"/></port>
    <port protocol="tcp" portid="445"><state state="open"/><service name="smb"/></port>
  </ports>
</host></nmaprun>''')
    result = parse_nmap_xml(FIXTURE.read_text())
    assert any(p["port"] == 445 for p in result)
    assert any(p["service"] == "ssh" for p in result)
```

### A.10 — `backend/tests/test_siem_integration.py`

```python
from unittest.mock import patch
from app.services.wazuh_integration import WazuhIntegration

def test_get_alerts_normalises_payload():
    fake_alert = {
        "rule":{"level":12,"description":"SSH brute force","id":"5712"},
        "agent":{"name":"lab_webserver"},
        "timestamp":"2026-04-25T10:00:00Z",
    }
    with patch.object(WazuhIntegration, "_request", return_value={"data":{"alerts":[fake_alert]}}):
        alerts = WazuhIntegration().get_alerts()
    assert len(alerts) == 1
    a = alerts[0]
    assert a["severity"] in ("CRITICAL","HIGH","MEDIUM","LOW")
    assert a["source"] == "wazuh"
```

## Section B — Backend RBAC endpoint (P1)

### B.1 — `backend/app/api/v1/endpoints/rbac.py`

**Goal:** Admin-only user management (create user, list users, change role, disable user).

```python
"""
Admin-only user & role management.
Wire via app/api/api.py:
    from app.api.v1.endpoints import rbac
    api_router.include_router(rbac.router, prefix="/rbac", tags=["rbac"])
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import require_role, get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

router = APIRouter()
admin_only = Depends(require_role(UserRole.ADMIN))

class UserCreate(BaseModel):
    email: EmailStr; password: str; role: UserRole = UserRole.VIEWER

class UserOut(BaseModel):
    id: str; email: str; role: str; disabled: bool
    class Config: from_attributes = True

class RoleUpdate(BaseModel): role: UserRole

@router.get("/users", response_model=list[UserOut], dependencies=[admin_only])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/users", response_model=UserOut, status_code=201, dependencies=[admin_only])
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(email=body.email, password_hash=hash_password(body.password), role=body.role)
    db.add(user); db.commit(); db.refresh(user); return user

@router.patch("/users/{user_id}/role", response_model=UserOut, dependencies=[admin_only])
def change_role(user_id: str, body: RoleUpdate, db: Session = Depends(get_db),
                current=Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.id == current.id: raise HTTPException(400, "Cannot demote yourself")
    user.role = body.role; db.commit(); db.refresh(user); return user

@router.post("/users/{user_id}/disable", response_model=UserOut, dependencies=[admin_only])
def disable_user(user_id: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.id == current.id: raise HTTPException(400, "Cannot disable yourself")
    user.disabled = True; db.commit(); db.refresh(user); return user
```

**Wiring step:** edit [backend/app/api/api.py](backend/app/api/api.py) and add the two `import`/`include_router` lines.

**Acceptance:** `pytest backend/tests/test_rbac.py` green; `curl -H "Authorization: Bearer $ADMIN" /api/v1/rbac/users` returns list; viewer POST returns 403.

### B.2 — `backend/tests/test_auth.py`

```python
import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token

def test_hash_round_trip():
    h = hash_password("SecretPass1!"); assert verify_password("SecretPass1!", h); assert not verify_password("wrong", h)

def test_jwt_round_trip():
    token = create_access_token(subject="x@test", role="ADMIN")
    payload = decode_token(token)
    assert payload["sub"] == "x@test" and payload["role"] == "ADMIN"

def test_jwt_rejects_tampering():
    from jose import JWTError
    token = create_access_token(subject="x@test", role="ADMIN") + "tamper"
    with pytest.raises(JWTError): decode_token(token)
```

## Section C — Backend feature services (P1)

### C.1 — `backend/app/services/scoring_explainer.py`

**Goal:** Plain-English explanation of any risk score so the dashboard can show *why* an asset is risky.

```python
"""
Translates a numeric risk score + contributing factors into a short human-readable
paragraph. Pure function — no I/O, no LLM.
"""
from __future__ import annotations
from typing import TypedDict
from app.services.unified_risk_engine import UnifiedRiskEngine
from app.models.scan import SeverityLevel

class ScoreFactors(TypedDict, total=False):
    severity_counts: dict[str, int]
    open_high_risk_ports: list[int]
    asset_criticality: str
    cvss_max: float

def explain(score: float, factors: ScoreFactors) -> str:
    band = _band(score)
    parts: list[str] = [f"Risk band: {band} ({score:.0f}/100)."]
    sev = factors.get("severity_counts", {})
    notable = [f"{n} {lvl.lower()}" for lvl, n in sev.items() if n and lvl in ("CRITICAL","HIGH")]
    if notable: parts.append("Driven by " + ", ".join(notable) + " findings.")
    ports = factors.get("open_high_risk_ports") or []
    risky = [p for p in ports if p in UnifiedRiskEngine.HIGH_RISK_PORTS]
    if risky:
        names = [UnifiedRiskEngine.HIGH_RISK_PORTS[p][0] for p in risky[:3]]
        parts.append(f"High-risk services exposed: {', '.join(names)}.")
    crit = factors.get("asset_criticality")
    if crit and crit.upper() in ("CRITICAL","HIGH"):
        parts.append(f"Asset is {crit.lower()} business value, multiplying impact.")
    return " ".join(parts)

def _band(score: float) -> str:
    if score >= 80: return "CRITICAL"
    if score >= 60: return "HIGH"
    if score >= 30: return "MEDIUM"
    if score > 0:   return "LOW"
    return "INFO"
```

**Wiring:** in `unified_risk_engine.py`, after computing the score call `explain()` and persist on the `ScanAsset.risk_explanation` column (add via Alembic migration if not present).

### C.2 — `backend/app/services/task_monitor.py`

```python
"""Wraps Celery's AsyncResult into a JSON-friendly status payload."""
from celery.result import AsyncResult
from app.core.celery_app import celery_app

def get_task_status(task_id: str) -> dict:
    res = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id, "state": res.state, "ready": res.ready(),
        "successful": res.successful() if res.ready() else None,
        "info": _safe_info(res),
    }

def _safe_info(res):
    info = res.info
    if isinstance(info, Exception):
        return {"error": type(info).__name__, "message": str(info)}
    return info
```

**Wiring:** add `@router.get("/{scan_id}/task-status")` route in [scans.py](backend/app/api/v1/endpoints/scans.py) calling `get_task_status(scan.celery_task_id)`.

### C.3 — `backend/app/services/alert_correlator.py`

**Goal:** Match Wazuh alerts to scan findings by IP + port + ±10 min window.

```python
"""
Correlates Wazuh alerts with Vulnerability records.
Match rule: same target IP, port mentioned in alert metadata, within ±10 min.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Iterable
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.scan import Vulnerability, ScanAsset

WINDOW = timedelta(minutes=10)

async def correlate(db: AsyncSession, alerts: Iterable[dict]) -> list[dict]:
    enriched = []
    for alert in alerts:
        ip = alert.get("source_ip") or alert.get("agent",{}).get("ip")
        port = alert.get("port") or _port_from_description(alert.get("description",""))
        ts = _parse_ts(alert.get("timestamp"))
        matches: list[str] = []
        if ip and ts:
            stmt = (select(Vulnerability.id)
                .join(ScanAsset, Vulnerability.scan_asset_id == ScanAsset.id)
                .where(ScanAsset.ip_address == ip)
                .where(Vulnerability.created_at.between(ts - WINDOW, ts + WINDOW)))
            if port: stmt = stmt.where(Vulnerability.port == port)
            result = await db.execute(stmt)
            matches = [str(r[0]) for r in result.all()]
        enriched.append({**alert, "matched_vulnerability_ids": matches})
    return enriched

def _port_from_description(desc: str) -> int | None:
    import re
    m = re.search(r"port[\s:=]+(\d{1,5})", desc, re.IGNORECASE)
    return int(m.group(1)) if m else None

def _parse_ts(ts: str | None) -> datetime | None:
    if not ts: return None
    try: return datetime.fromisoformat(ts.replace("Z","+00:00"))
    except ValueError: return None
```

### C.4 — `infra/healthcheck.sh`

```bash
#!/usr/bin/env bash
# infra/healthcheck.sh — exits 0 only if all critical services respond.
set -euo pipefail
ok=0; fail=0
check() {
  local name=$1; local cmd=$2
  if eval "$cmd" >/dev/null 2>&1; then echo "[OK] $name"; ok=$((ok+1));
  else echo "[FAIL] $name"; fail=$((fail+1)); fi
}
check "Backend /health"     'curl -fsS http://localhost:8000/health'
check "Frontend (vite)"     'curl -fsS http://localhost:5173 -o /dev/null'
check "Postgres"            'docker compose exec -T db pg_isready -U user'
check "Redis"               'docker compose exec -T redis redis-cli PING | grep -q PONG'
check "Celery worker"       'docker compose exec -T celery_worker celery -A app.core.celery_app inspect ping'
echo "---"; echo "$ok OK, $fail FAIL"
[ "$fail" -eq 0 ]
```

## Section D — Frontend auth & guards (P1)

### D.1 — Move `LoginPage.jsx` to `frontend/src/pages/`
`git mv frontend/src/components/LoginPage.jsx frontend/src/pages/LoginPage.jsx` and update imports in `App.jsx`. Restyle with Tailwind classes from existing UI primitives — no inline styles. Reuse `CyberButton`, `CyberBadge` from [frontend/src/components/ui/](frontend/src/components/ui/).

### D.2 — `frontend/src/hooks/useAuth.js` (thin re-export)
```js
export { useAuth } from '../context/AuthContext';
```
Mass-edit imports: `grep -rl "from.*context/AuthContext" frontend/src`.

### D.3 — `ProtectedRoute.jsx`
```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
```
Wire in `App.jsx`: `<Route path="/" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />`.

### D.4 — `RoleGuard.jsx`
```jsx
import { useAuth } from '../../hooks/useAuth';
export default function RoleGuard({ allow = [], children, fallback = null }) {
  const { user } = useAuth();
  const role = user?.role;
  if (!role || !allow.includes(role)) return fallback;
  return children;
}
```
Acceptance: wrap "Trigger Scan" with `<RoleGuard allow={['ADMIN','ANALYST']}>` — VIEWER no longer sees it.

### D.5 — `ConfirmDialog.jsx`
Cyber-themed modal with Esc-to-close and click-outside-to-cancel. Cancel + destructive Confirm button. Keyboard-accessible.

### D.6 — `EmptyState.jsx`
Centered icon + title + message + optional action. Replace ad-hoc "No data" markup in `VulnerabilitiesPanel`, `ScanHistory`, `Reports`.

### D.7 — `SettingsPage.jsx`
Account section (email, role, logout) + Change-password form + admin-only Users table (via `RoleGuard allow={['ADMIN']}`).

## Section E — Missing dashboard panels (P1)

### E.1 — `SeverityDonut.jsx`
Recharts donut. Reads `kpi.severity_counts` from `useRealTime()`. Empty state if no findings. Colors: CRITICAL `#ef4444`, HIGH `#f97316`, MEDIUM `#facc15`, LOW `#22d3ee`, INFO `#71717a`.

### E.2 — `AssetTimeline.jsx`
Vertical timeline of scan events per asset. Fetches `GET /api/v1/network/assets/{id}/timeline` returning `[{id, ts, action, detail}]`. Backend dependency: add the route or mock with existing scan history.

### E.3 — `ExposureMap.jsx`
Subnet heatmap. Groups assets by `/24` subnet from IP. Each asset rendered as colored square (red ≥80, orange ≥60, yellow ≥30, cyan >0, zinc 0). Tooltip = IP + score.

### E.4 — `RemediationPanel.jsx`
Vulnerability detail block: Recommendation, ordered Steps, References. Rendered inside `IncidentDetailDrawer` when a vuln is selected.

## Section F — Lab attack scenarios (P2)

Each scenario file template: **Goal · Pre-conditions · Attacker steps · Expected detections · Cleanup**.

### F.1 — `lab/scenarios/sqli_scenario.md`
SQLi on Juice Shop login. Payload `' OR 1=1--`. Expected: Nuclei `sqli-detect` CRITICAL (CVSS 9.0+); Wazuh rule 5712 level ≥10 within 30 s; red node + RemediationPanel ORM advice.

### F.2 — `lab/scenarios/xss_scenario.md`
Reflected XSS on Juice Shop search. Payload `<iframe src="javascript:alert(1)">`. Expected: Nuclei `xss-reflected` HIGH.

### F.3 — `lab/scenarios/misconfig_scenario.md`
SMB null-session on `lab_smb` (445) + unauthenticated Redis on `lab_redis` (6379). Expected: Nmap NSE + Nuclei `redis-unauth-detect`.

### F.4 — `lab/wazuh/custom_rules.xml`
```xml
<group name="orchestration_lab,">
  <rule id="100100" level="10"><if_sid>5712</if_sid>
    <description>Lab: SSH brute force attempt against vulnerable host</description></rule>
  <rule id="100101" level="12"><decoded_as>json</decoded_as>
    <field name="event">sqli_detected</field>
    <description>Lab: SQL injection signature observed</description></rule>
  <rule id="100102" level="11"><decoded_as>json</decoded_as>
    <field name="event">xss_detected</field>
    <description>Lab: Reflected XSS signature observed</description></rule>
  <rule id="100103" level="9"><decoded_as>json</decoded_as>
    <field name="port">445</field><field name="action">null_session</field>
    <description>Lab: SMB null session — misconfiguration</description></rule>
</group>
```
Mount via volume in `docker-compose.lab.yml`; restart manager; verify rule listed in `/var/ossec/etc/decoders/local_rules.xml`.

### F.5 — `lab/kibana/dashboards/sme_overview.ndjson`
Build manually in Kibana (alert-count over time, top rule IDs, alerts per agent), then **Stack Management → Saved Objects → Export**.

## Section G — SIEM integration tests (P2)

Already covered by `backend/tests/test_siem_integration.py` in **A.10**.

## Section H — CI / CD (P0)

### H.1 — `.github/workflows/ci.yml`
```yaml
name: CI
on: { pull_request: , push: { branches: [main] } }
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: password, POSTGRES_USER: user, POSTGRES_DB: sme_cyber_db }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U user" --health-interval 10s --health-timeout 5s --health-retries 5
      redis: { image: redis:7, ports: ['6379:6379'] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.10' }
      - run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
          pip install pytest pytest-asyncio httpx
      - run: pip install ruff && ruff check backend/app || true
      - env:
          DATABASE_URL: postgresql://user:password@localhost:5432/sme_cyber_db
          REDIS_URL: redis://localhost:6379/0
          SECRET_KEY: ci-secret
          GEMINI_API_KEY: stub
        run: pytest backend/tests -v --maxfail=1
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
  docker:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
      - uses: aquasecurity/trivy-action@master
        with: { image-ref: 'the-dashboard-project--backend:latest', severity: 'CRITICAL,HIGH', exit-code: '0' }
```

### H.2 — `.github/workflows/cd.yml`
Optional staging deploy on main merge. Build images via `docker compose build`. Replace placeholder echo with real deployment target (SSH, AWS ECR push, etc.).

### H.3 — `infra/nginx.conf`
Alternative reverse-proxy (the repo uses Caddy by default). Provides 80→443 redirect; TLS server with `proxy_pass` to `backend:8000` (`/api/`, `/ws/` with Upgrade headers) and `frontend:5173` (`/`); `client_max_body_size 25m`.

### H.4 — `SECURITY_AUDIT.md`
Now lives in [docs/REPORTS.md](docs/REPORTS.md) (merged with the other reports). Template populated with trivy + bandit + OWASP self-check.

### H.5 — `FINAL_DEMO_SCRIPT.md`
Now lives in [demo/DEMO.md](demo/DEMO.md) (merged with all demo/presentation docs).

## Section I — End-to-end Playwright (P2)

### I.1 — `tests/e2e/conftest.py`
```python
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "https://localhost"

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True); yield b; b.close()

@pytest.fixture()
def page(browser):
    ctx = browser.new_context(ignore_https_errors=True); pg = ctx.new_page()
    yield pg; ctx.close()

@pytest.fixture()
def base_url(): return BASE_URL
```

### I.2 — `test_login_flow.py`
Goto `/login`, fill `admin@local` + seed password (capture from docker logs), click submit, assert URL leaves `/login` and dashboard heading visible.

### I.3 — `test_scan_trigger.py`
Click Scan → fill URL `http://lab_webserver:3000` → Quick → Continue ×2 → Launch Scan → wait_for_selector `text=Scan started` (timeout 10 s).

### I.4 — `test_report_export.py`
Click Reports → `expect_download` while clicking Export PDF → assert filename ends with `.pdf`.

### I.5 — `UAT_REPORT.md` and **I.6 — `BROWSER_COMPAT_REPORT.md`**
Both now live in [docs/REPORTS.md](docs/REPORTS.md) (merged).

## Section J — Demo & docs (P2)

### J.1 — `demo/demo_script.md`, **J.2 — `demo/demo_checklist.md`**, **J.3 — `FINAL_DEMO_SCRIPT.md`**, **J.4 — `FINAL_PRESENTATION.md`**
All merged into [demo/DEMO.md](demo/DEMO.md).

### J.5 — `docs/API_GUIDE.md`
Reviewer-friendly REST guide that mirrors `/docs` in plain Markdown. Base URL prod `https://localhost/api/v1`, dev `http://localhost:8000/api/v1`. All routes (except `/health`, `/auth/login`) require Bearer token. Lists Auth, RBAC (admin), Scans, Targets, Findings, Vulnerabilities, Reports, Network, SIEM, Audit, Lab, OpenVAS — paths + verbs mirroring FastAPI router decorators. WS `wss://localhost/ws/events` pushes `{type, payload, seq, ts}` envelopes (`SCAN_STARTED`, `SCAN_STATUS`, `RISK_UPDATE`, `FINDING_ADDED`, `SCAN_COMPLETED`). Errors return `{detail: string}`; every response carries `X-Request-ID` for log correlation.

### J.6 — `docs/ARCHITECTURE_DIAGRAM.md`
Mermaid `flowchart LR` (Browser → Caddy → FastAPI/WS → Celery → Nmap/Nuclei/OpenVAS/Gemini → Postgres/Redis → Wazuh+Elastic). Mermaid `classDiagram` (User → Scan, Target → Scan, Scan → ScanAsset → Vulnerability → ActionItem, Scan → AuditLog). Mermaid `sequenceDiagram` (single scan: Browser → API → DB → Redis → Worker → Stage 1–4 → DB → broadcast → Browser).

## Section K — Polish (P3)

### K.1 — `postman/OrchestrationSecurityCenter_API.postman_collection.json`
Build manually in Postman: folder per router (`auth`, `scans`, `targets`, `findings`, `reports`, `rbac`, …); one request per endpoint with example body and `{{base_url}}` + `{{token}}`; pre-request script auto-logs-in if `{{token}}` empty; export collection v2.1.

**Acceptance:** `newman run …` ≥ 90% pass against live stack.

## Phase-3 migration follow-up

`backend/alembic/versions/002_add_rbac.py` is mentioned in the plan, but `User.role` already exists in the model ([backend/app/models/user.py:25](backend/app/models/user.py#L25)) — meaning the migration already happened (probably under a different filename). Verify with `docker compose exec backend alembic current` and `alembic history`. If equivalent migration exists, mark ✅ — **do not create a duplicate**.

## Master tracker

```
P0
[ ] A.1 conftest.py
[ ] A.2 test_endpoints.py
[ ] A.3 test_auth_flow.py
[ ] A.4 test_rbac.py             (depends on B.1)
[ ] A.5 test_websocket.py
[ ] A.6 test_risk_engine.py
[ ] A.7 test_agents.py
[ ] A.8 test_scan_tasks.py
[ ] A.9 test_nmap_wrapper.py
[ ] A.10 test_siem_integration.py
[ ] H.1 .github/workflows/ci.yml
[ ] H.2 .github/workflows/cd.yml
[ ] H.3 infra/nginx.conf
[ ] C.4 infra/healthcheck.sh

P1
[ ] B.1 rbac.py endpoint + wire in api.py
[ ] B.2 test_auth.py
[ ] C.1 scoring_explainer.py
[ ] C.2 task_monitor.py + scans.py route
[ ] C.3 alert_correlator.py
[ ] D.1 LoginPage move + restyle
[ ] D.2 hooks/useAuth.js
[ ] D.3 ProtectedRoute.jsx
[ ] D.4 RoleGuard.jsx
[ ] D.5 ConfirmDialog.jsx
[ ] D.6 EmptyState.jsx
[ ] D.7 SettingsPage.jsx
[ ] E.1 SeverityDonut.jsx
[ ] E.2 AssetTimeline.jsx
[ ] E.3 ExposureMap.jsx
[ ] E.4 RemediationPanel.jsx

P2
[ ] F.1 sqli_scenario.md
[ ] F.2 xss_scenario.md
[ ] F.3 misconfig_scenario.md
[ ] F.4 wazuh/custom_rules.xml
[ ] F.5 kibana/sme_overview.ndjson
[ ] H.4 SECURITY_AUDIT (now in docs/REPORTS.md)
[ ] I.1 tests/e2e/conftest.py
[ ] I.2 test_login_flow.py
[ ] I.3 test_scan_trigger.py
[ ] I.4 test_report_export.py
[ ] I.5 UAT_REPORT (now in docs/REPORTS.md)
[ ] I.6 BROWSER_COMPAT_REPORT (now in docs/REPORTS.md)
[ ] J.1–J.4 demo/presentation docs (now in demo/DEMO.md)
[ ] J.5 docs/API_GUIDE.md
[ ] J.6 docs/ARCHITECTURE_DIAGRAM.md

P3
[ ] K.1 postman collection
```

## Final acceptance gate (Week 13 freeze)

On a fresh clone, **all of these must return green**:

```bash
docker compose down -v && docker compose up -d
docker compose -f docker-compose.lab.yml up -d
infra/healthcheck.sh                                       # exit 0
docker compose exec backend pytest backend/tests -v        # ≥ 15 tests pass
cd frontend && npm run build                                # builds clean
cd .. && pytest tests/e2e -v                                # 3 E2E pass
gh workflow view "CI" --web                                 # latest run green
```

If any one fails, the freeze is rejected and the failing item is added back to the tracker.

---

*Last updated: 2026-05-07 — merged from `project_plan.md` (kept), `DR_descution.md` (kept), `FINISHINGPLAN.md` (deleted), `newplan24/4/2026.md` (deleted).*
