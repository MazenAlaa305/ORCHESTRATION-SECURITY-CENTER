# Found 404 — Hardening & Professionalization Plan

**Audience:** An autonomous coding agent (Claude / GPT / etc.) that will execute this plan step by step.
**Scope:** Harden and refine the existing "Found 404" SME DAST platform. **Do not add new features.** Every step removes a broken promise, closes a reliability gap, or makes an existing capability defensible to a real SME buyer.
**Repository:** `d:/FINAL PROJECT/the-dashboard-project-/`
**Duration:** 6 phases, ~1 week each for a single engineer. Phases can be done in order; do not skip ahead.

---

## How to use this document

For every step below the executing agent MUST:

1. **Read the "Files" list first** and confirm they exist before editing.
2. **Run the "Pre-check" commands** and record the baseline output in the PR description.
3. **Apply the "Changes"** exactly as described. If a described symbol has been renamed, search for it with grep before inventing a new name.
4. **Run the "Acceptance tests"** and paste the output into the PR description.
5. **Commit with the message template** at the end of each step.
6. **Stop and ask the human** if an acceptance test fails or if a file has drifted materially from the description — do not "fix it up" silently.

Every step is independently shippable. Never batch steps across phase boundaries in a single PR.

---

## Global conventions

- **Branch naming:** `hardening/phase<N>-<short-slug>` (e.g. `hardening/phase1-remove-mocked-siem`)
- **Commit style:** follow existing repo style — short imperative subject, body explains the *why*.
- **No new dependencies without justification.** If a step adds a package, add it to `backend/requirements.txt` or `frontend/package.json` and pin the version.
- **No silent deletions.** If code is removed, it must be referenced in the commit message.
- **Tests:** if a test suite exists, run it. If not, the "Acceptance tests" in each step are the contract.
- **Never bypass pre-commit hooks.** Never use `--no-verify`.
- **Secrets:** never commit keys. Use `.env.example` for new env vars.

---

# PHASE 1 — Stop the product from lying (Week 1)

**Goal of the phase:** Every panel, agent, and field shown to the user must be backed by real work. Dormant or mocked code paths are removed or clearly gated behind a feature flag that is OFF by default.

## Step 1.1 — Remove the mocked `SIEMAgent` from the active scan pipeline

**Why:** [agent_orchestrator.py:757](backend/app/services/agent_orchestrator.py#L757) defines `SIEMAgent` which memory indicates is dormant / returns empty mock data. Showing SIEM output the product did not produce destroys trust on the first real demo.

**Files:**
- `backend/app/services/agent_orchestrator.py`
- `backend/app/api/v1/endpoints/siem.py`
- `frontend/src/components/dashboard/` (any panel that reads `/api/v1/siem`)
- `frontend/src/pages/Dashboard.jsx`

**Pre-check:**
```bash
grep -n "SIEMAgent" backend/app/services/agent_orchestrator.py
grep -rn "api/v1/siem" frontend/src
```

**Changes:**
1. In `agent_orchestrator.py`, remove `SIEMAgent` from the orchestrator sequence inside `run_full_scan`. Keep the class definition but guard its instantiation behind `settings.SIEM_ENABLED` (default `False`).
2. In `backend/app/core/config.py` add `SIEM_ENABLED: bool = False`.
3. In `backend/app/api/v1/endpoints/siem.py`, each endpoint should return HTTP 503 with body `{"detail": "SIEM integration disabled"}` when `settings.SIEM_ENABLED` is False. **Do not delete the routes** — we want a visible, honest disabled state.
4. In the frontend, locate any component that queries `/api/v1/siem` and render an explicit "SIEM integration not configured" empty state instead of fake counters. If the panel is on the main Dashboard and cannot show a useful empty state, hide it behind a `SIEM_ENABLED` check from a `/api/v1/config/public` endpoint (see step 1.4 for the public config endpoint).

**Acceptance tests:**
```bash
# SIEM endpoint returns 503 when disabled
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/siem/alerts
# Expected: 503

# Backend logs show no SIEMAgent entries during a scan
docker logs sme_dashboard_backend --tail 200 | grep -c SIEMAgent
# Expected: 0
```

**Commit message:**
```
fix(siem): gate SIEM integration behind SIEM_ENABLED flag

SIEMAgent previously ran on every scan and returned mocked data, which
misrepresented product capabilities. Route it through a disabled-by-default
flag and surface an honest "not configured" state in the UI.
```

---

## Step 1.2 — Replace hardcoded attack payloads with Nuclei / ZAP

**Why:** [agent_orchestrator.py:296](backend/app/services/agent_orchestrator.py#L296) `AttackAgent` iterates a small list of handwritten payloads ([line 431](backend/app/services/agent_orchestrator.py#L431)). This is neither DAST nor defensible. The stack already has `nuclei_wrapper.py`. Use it.

**Files:**
- `backend/app/services/agent_orchestrator.py`
- `backend/app/services/nuclei_wrapper.py`
- `backend/app/models/scan.py` (add evidence fields — see below)
- `backend/alembic/versions/` (new migration)

**Pre-check:**
```bash
grep -n "class AttackAgent" backend/app/services/agent_orchestrator.py
grep -n "safe_payloads\|payload = " backend/app/services/agent_orchestrator.py
ls backend/app/services/nuclei_wrapper.py
```

**Changes:**
1. In `Vulnerability` model (`backend/app/models/scan.py`) add columns if absent:
   - `raw_request: Text | None`
   - `raw_response: Text | None`
   - `evidence_hash: String(64) | None` (SHA-256 of `raw_request + raw_response`)
   - `detected_by: String(32) | None` (`nuclei` / `zap` / `recon` / `manual`)
   - `template_id: String(128) | None` (Nuclei template ID or ZAP rule ID)
2. Create Alembic migration `add_vuln_evidence_fields`. Run it in a dev DB and check `\d vulnerabilities`.
3. In `AttackAgent.execute()`, delete the hardcoded `safe_payloads` loop. Replace with:
   - A single call to `nuclei_wrapper.scan(target_url, templates=["cves", "vulnerabilities", "exposures", "misconfiguration"])` that returns parsed findings with `template_id`, `severity`, `matched_at`, `request`, `response`, `curl_command`.
   - For each finding, create a `Vulnerability` with the evidence fields populated. Compute `evidence_hash = sha256(request + response)`.
4. Keep the LLM call in `AttackAgent` **only** to produce a plain-English summary of the finding, not to invent findings. Feed it the Nuclei metadata; store the summary in `Vulnerability.description`.
5. Remove the standalone `payload = "' OR '1'='1"` test harness at [agent_orchestrator.py:966](backend/app/services/agent_orchestrator.py#L966) — it is dead code.

**Acceptance tests:**
```bash
# Trigger a scan against the lab Juice Shop
curl -X POST http://localhost:8000/api/v1/scans/ai \
  -H "Content-Type: application/json" \
  -d '{"target_url":"http://lab_broken_web:3000","scan_type":"FULL"}'

# After scan completes, verify every vulnerability has evidence
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT COUNT(*) FILTER (WHERE raw_request IS NULL) AS missing_evidence,
          COUNT(*) AS total FROM vulnerabilities
   WHERE scan_id = (SELECT id FROM scans ORDER BY start_time DESC LIMIT 1);"
# Expected: missing_evidence = 0
```

**Commit message:**
```
refactor(attack): replace hardcoded payloads with Nuclei wrapper

Handwritten SQLi/XSS/SSRF payloads were pattern-matching, not DAST, and
produced findings with no evidence. Delegate to the existing nuclei_wrapper
and store raw request/response + evidence_hash on every Vulnerability so
findings are auditable and deduplicable.
```

---

## Step 1.3 — Make `ValidationAgent` deterministic and evidence-backed

**Why:** Current `ValidationAgent` ([line 639](backend/app/services/agent_orchestrator.py#L639)) asks the LLM to return `REAL` or `FALSE_POSITIVE`. One bad prompt, one model change, and real vulns disappear. For an SME compliance tool this is unacceptable.

**Files:**
- `backend/app/services/agent_orchestrator.py`
- `backend/app/services/validation_probe.py` **(new file)**

**Changes:**
1. Create `validation_probe.py` with a single function:
   ```python
   async def reprobe(vuln: Vulnerability, http_client) -> ValidationResult:
       """Re-send the stored raw_request, diff the response, return
       (confirmed: bool, new_response: str, diff_ratio: float)."""
   ```
   - Use `httpx.AsyncClient`.
   - Compare the new response body against `raw_response` using `difflib.SequenceMatcher.ratio()`.
   - `confirmed = True` iff:
     - HTTP status matches AND
     - For injection findings (`detected_by == "nuclei"` with category `injection`), the response still contains the same match pattern as the original Nuclei match.
2. In `ValidationAgent.execute()`:
   - For every finding, call `reprobe()`.
   - If `confirmed = False`, set `vuln.status = VulnStatus.FALSE_POSITIVE` and append `validation_reason = "reprobe_failed"` to `vuln.description`.
   - If `confirmed = True`, set `vuln.status = VulnStatus.OPEN`.
   - **Only** if `settings.LLM_VALIDATION_ENABLED` (default `False`), additionally ask the LLM for a written justification and store it in a new `vuln.validation_notes` column. The LLM verdict NEVER overrides the deterministic reprobe.
3. Remove the `"REAL" in response.upper()` string-matching verdict parser.

**Acceptance tests:**
```bash
# Run twice against the same target; counts should be stable
for i in 1 2; do
  curl -s -X POST http://localhost:8000/api/v1/scans/ai \
    -d '{"target_url":"http://lab_api_gateway:8081","scan_type":"FULL"}' \
    -H "Content-Type: application/json" > /tmp/scan$i.json
done
# Compare OPEN vuln counts from both scans — should be identical +/- 1
```

**Commit message:**
```
fix(validation): make validation deterministic via reprobe

LLM-only REAL/FALSE_POSITIVE string matching is non-reproducible and has no
audit trail. Reprobe the stored raw_request, diff the response, and decide
from the diff. LLM justification is now optional commentary, not a verdict.
```

---

## Step 1.4 — Add a public config endpoint and gate dead UI panels

**Why:** The frontend needs to know which optional integrations are live so it can show honest empty states instead of fake data.

**Files:**
- `backend/app/api/v1/endpoints/config.py` **(new)**
- `backend/app/api/v1/api.py`
- `frontend/src/api/config.js` **(new)**
- `frontend/src/context/RealTimeContext.jsx` (or a new `ConfigContext`)

**Changes:**
1. New endpoint `GET /api/v1/config/public` returns:
   ```json
   {
     "siem_enabled": false,
     "soar_enabled": false,
     "openvas_enabled": false,
     "llm_validation_enabled": false,
     "version": "0.2.0-hardening"
   }
   ```
   Values read from `settings`. No auth required (this is public metadata only).
2. Frontend fetches this once on app load and stores it in context. Every panel whose backend is disabled renders `<EmptyIntegration name="..." />`.

**Acceptance tests:**
```bash
curl -s http://localhost:8000/api/v1/config/public | jq .
# Expected: all four flags present, version string present
```

**Commit message:**
```
feat(config): add public config endpoint and gate disabled UI

UI previously rendered panels backed by disabled integrations. Expose a
public feature flag map and replace dead panels with honest empty states.
```

---

# PHASE 2 — Reliability: one execution path, no orphan scans (Week 2)

**Goal:** A scan that starts always reaches a terminal state. Only one execution engine. Orphan records are reaped. Phase-level checkpoints allow resume.

## Step 2.1 — Collapse the dual scan execution path

**Why:** Verified: [scans.py:68](backend/app/api/v1/endpoints/scans.py#L68) calls `run_scan_task.delay(...)` (Celery). [scans.py:123](backend/app/api/v1/endpoints/scans.py#L123) uses `background_tasks.add_task(...)` (in-process). Two paths for what should be one operation. Choose Celery — it already has retries configured and survives API restarts.

**Files:**
- `backend/app/api/v1/endpoints/scans.py`
- `backend/app/services/scan_tasks.py`
- `backend/app/services/agent_orchestrator.py`

**Changes:**
1. In `scans.py`, the `/scans/ai` endpoint must call `run_scan_task.delay(scan_id=scan.id, mode="ai")` and return `202 Accepted` with the scan ID. Delete the inline `async def run_ai_scan(...)` closure and the `background_tasks.add_task(...)` call.
2. In `scan_tasks.py`, `run_scan_task` accepts `mode: str = "ai"` and dispatches to the orchestrator accordingly.
3. Delete `BackgroundTasks` from the function signature if it is no longer used.
4. Ensure the Celery worker is built and running in `docker-compose.yml` (it should already be — verify `celery_worker` service is healthy).

**Acceptance tests:**
```bash
# Issue a scan, kill the backend, restart, and the scan must still complete
curl -X POST http://localhost:8000/api/v1/scans/ai \
  -d '{"target_url":"http://lab_broken_web:3000"}' \
  -H "Content-Type: application/json"
docker restart sme_dashboard_backend
sleep 30
# Check the scan reached COMPLETED or FAILED (not stuck RUNNING)
curl -s http://localhost:8000/api/v1/scans | jq '.[-1].status'
```

**Commit message:**
```
fix(scans): route all scans through Celery, remove BackgroundTasks path

/scans/ai previously ran inside the FastAPI process, so a backend restart
abandoned the scan mid-flight. Celery already handles retries and survives
restarts; make it the only execution path.
```

---

## Step 2.2 — Orphan scan reaper on startup

**Why:** When a Celery worker dies mid-scan, the `Scan.status = RUNNING` row is left in the DB forever. The UI shows a fake in-progress scan.

**Files:**
- `backend/app/main.py` (lifespan)
- `backend/app/services/scan_reaper.py` **(new)**

**Changes:**
1. New module with:
   ```python
   async def reap_orphan_scans(db, stale_after_minutes: int = 60):
       """Mark any RUNNING or QUEUED scan older than stale_after_minutes as FAILED
       with failure_reason='orphaned_on_restart'."""
   ```
2. Call it from the FastAPI `lifespan` startup **before** the WebSocket listener starts.
3. Add a `failure_reason: String(128) | None` column to `Scan` if it does not already exist, via Alembic migration.

**Acceptance tests:**
```bash
# Seed a fake running scan, restart backend, verify it was marked FAILED
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "UPDATE scans SET status='RUNNING', start_time=NOW() - INTERVAL '2 hours' WHERE id=(SELECT id FROM scans LIMIT 1);"
docker restart sme_dashboard_backend
sleep 10
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT status, failure_reason FROM scans ORDER BY start_time DESC LIMIT 1;"
# Expected: status=FAILED, failure_reason=orphaned_on_restart
```

**Commit message:**
```
feat(reliability): reap orphaned scans on startup

A crashed Celery worker previously left scans in RUNNING forever and the UI
showed phantom progress. Mark stale RUNNING/QUEUED scans as FAILED with an
explicit reason during the FastAPI lifespan startup.
```

---

## Step 2.3 — Per-phase checkpointing

**Why:** If Recon passes and Attack fails, a retry re-runs Recon. Wasted time and LLM cost.

**Files:**
- `backend/app/models/scan.py` (add `checkpoint` column)
- `backend/app/services/agent_orchestrator.py`
- new Alembic migration

**Changes:**
1. Add `Scan.checkpoint: String(32) | None` — one of `recon_done`, `attack_done`, `validated`, `risk_scored`, `reported`.
2. In `run_full_scan`, after each agent succeeds, update `scan.checkpoint` and commit.
3. On retry, `run_full_scan` skips phases whose checkpoint is already reached.
4. Celery retry decorator stays (`max_retries=2`). Document that checkpoints make retries cheap.

**Acceptance tests:**
```bash
# Simulate an attack-phase failure by patching nuclei_wrapper to raise once,
# then let Celery retry. Scan should complete on the retry without
# re-running Recon (check agent_logs for a single ReconAgent entry).
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT agent_name, COUNT(*) FROM agent_logs WHERE scan_id=<id> GROUP BY 1;"
# Expected: ReconAgent count = 1, AttackAgent count = 2
```

**Commit message:**
```
feat(reliability): checkpoint each agent phase for resumable retries

Previously a retry restarted from ReconAgent, wasting time and LLM spend.
Record scan.checkpoint after each phase and skip completed phases on retry.
```

---

## Step 2.4 — Scope enforcement and rate limiting per scan

**Why:** An SME pointing the scanner at their own prod will take it down. There is no per-target concurrency cap, no requests/sec limit, no scope allow-list.

**Files:**
- `backend/app/models/scan.py` (`Target` model)
- `backend/app/services/agent_orchestrator.py` (all agents that hit the network)
- `backend/app/services/nuclei_wrapper.py`
- new Alembic migration

**Changes:**
1. On `Target` add:
   - `scope_allowlist: ARRAY(String)` — list of hostnames / CIDRs. Default `[base_url host]`.
   - `max_rps: Integer` default `10`.
   - `max_concurrent_scans: Integer` default `1`.
2. In `run_scan_task`, before starting, acquire a Redis lock `scan_lock:<target_id>` with TTL = `max_concurrent_scans` semaphore semantics. If not acquired, set `Scan.status=FAILED`, `failure_reason=concurrency_limit`, and return.
3. In every network-touching agent (Recon, Attack, Validation reprobe), pass `max_rps` into the HTTP client via a token bucket (`aiolimiter.AsyncLimiter(max_rps, 1)`).
4. Before every outbound request, assert the URL's hostname/IP is in `scope_allowlist`. Out-of-scope requests are dropped and logged to `agent_logs` as `scope_violation`.

**Acceptance tests:**
```bash
# Two concurrent scans on the same target — the second must fail fast
curl -X POST http://localhost:8000/api/v1/scans/ai -d '{"target_id":"<id>"}' &
curl -X POST http://localhost:8000/api/v1/scans/ai -d '{"target_id":"<id>"}'
# Expected: second scan ends with failure_reason=concurrency_limit within ~1s
```

**Commit message:**
```
feat(safety): enforce scope allowlist, RPS, and concurrency per target

Without scope/RPS controls the scanner can take down the customer's own
production. Add per-Target scope_allowlist, max_rps, and a Redis-based
concurrency lock. Out-of-scope requests are logged and dropped.
```

---

# PHASE 3 — Security of the security tool (Week 3)

**Goal:** Authentication, encrypted credentials, LLM redaction, cost ceilings. Enterprise customers will ask for a security questionnaire — the answers must be "yes."

## Step 3.1 — Add a User model, JWT auth, and RBAC

**Files:**
- `backend/app/models/user.py` **(new)**
- `backend/app/core/security.py` **(new)**
- `backend/app/api/v1/endpoints/auth.py` **(new)**
- `backend/app/api/deps.py` **(new or updated)**
- every file under `backend/app/api/v1/endpoints/` (add dependency)
- `frontend/src/api/axios.js` (inject Authorization header)
- `frontend/src/pages/Login.jsx` **(new)**

**Changes:**
1. `User` model: `id, email (unique), password_hash (bcrypt via passlib), role Enum(VIEWER, ANALYST, ADMIN), created_at, last_login_at, disabled`.
2. `core/security.py`: `hash_password`, `verify_password`, `create_access_token(subject, scopes)`, `decode_token`. Use `python-jose`. Token TTL 8 hours. Secret from `settings.JWT_SECRET` (required env var — app fails to boot if unset).
3. `auth.py` endpoints: `POST /auth/login` (issues JWT), `POST /auth/logout` (stateless no-op or token blacklist in Redis), `GET /auth/me`.
4. `deps.py`: `get_current_user`, `require_role(role)`.
5. Apply `Depends(get_current_user)` to every `/api/v1/*` route **except** `/config/public` and `/health`.
6. RBAC matrix:
   - VIEWER: GET everything, no mutations.
   - ANALYST: GET + trigger scans + update vuln status.
   - ADMIN: everything + target CRUD + user management.
7. Add one seeded admin via an Alembic data migration — password must be random, written to stdout on first start, and force-changed on first login.
8. Frontend: login page, token storage in `sessionStorage` (NOT `localStorage` — XSS risk), axios interceptor adds `Authorization: Bearer <token>`, 401 redirects to login.

**Acceptance tests:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/scans
# Expected: 401

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d '{"email":"admin@local","password":"<seeded>"}' \
  -H "Content-Type: application/json" | jq -r .access_token)

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/scans
# Expected: 200
```

**Commit message:**
```
feat(security): add JWT auth, User model, and RBAC

API was unauthenticated. Add User model with bcrypt passwords, JWT-based
session tokens, and three roles (VIEWER/ANALYST/ADMIN). All /api/v1 routes
except /config/public and /health now require authentication.
```

---

## Step 3.2 — Encrypt `Target.auth_credentials` at rest

**Why:** Customers give the scanner their app passwords. Plaintext in Postgres is indefensible.

**Files:**
- `backend/app/core/crypto.py` **(new)**
- `backend/app/models/scan.py` (`Target.auth_credentials` field)
- `backend/app/api/v1/endpoints/targets.py`
- new Alembic data migration to re-encrypt existing rows

**Changes:**
1. `core/crypto.py`: wrapper around `cryptography.fernet.Fernet`. Key loaded from `settings.CREDENTIAL_ENCRYPTION_KEY` (required env var, fail-fast).
2. `Target.auth_credentials` stays as `Text` but is always written through `encrypt_json(dict)` and read through `decrypt_json(str)`.
3. Never log or serialize the decrypted value. The `/targets` API returns `{"auth_credentials": "<encrypted>"}` as an opaque marker; only the scan worker decrypts.
4. Alembic migration: re-encrypts all existing rows on upgrade. **Back up the DB before running.**
5. Add `.env.example` entry: `CREDENTIAL_ENCRYPTION_KEY=<generate with python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">`

**Acceptance tests:**
```bash
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT auth_credentials FROM targets LIMIT 1;"
# Expected: base64-ish Fernet blob, NOT a readable JSON object
```

**Commit message:**
```
feat(security): encrypt Target.auth_credentials at rest with Fernet

Customer credentials were stored in plaintext. Encrypt via Fernet keyed by
CREDENTIAL_ENCRYPTION_KEY and keep the decrypted form out of logs and API
responses.
```

---

## Step 3.3 — LLM prompt redaction and cost ceiling

**Why:** `llm_reason()` sends raw scan data to Gemini. Customer URLs, response bodies, and any PII in those bodies are shipped to a third party. Also: one runaway scan could empty the LLM budget.

**Files:**
- `backend/app/services/llm_guard.py` **(new)**
- `backend/app/services/agent_orchestrator.py` (`BaseAgent.llm_reason`)
- `backend/app/core/config.py`

**Changes:**
1. `llm_guard.py`:
   - `redact(text: str) -> str` — strip `Cookie:`, `Authorization:`, `Set-Cookie:`, email-regex, credit-card-regex, SSN/NI-regex, and replace internal hostnames (anything matching `scope_allowlist`'s internal entries) with `<internal>`.
   - `TokenBudget` — Redis-backed counter keyed by `llm_budget:<yyyy-mm-dd>`, limit from `settings.LLM_DAILY_TOKEN_BUDGET` (default 500000). Raises `LLMBudgetExceeded` when exceeded.
   - `LLMCircuitBreaker` — per-scan token cap from `settings.LLM_PER_SCAN_TOKEN_BUDGET` (default 50000).
2. `BaseAgent.llm_reason(prompt)` must:
   - Call `redact(prompt)`.
   - Check both budgets before calling Gemini.
   - On `LLMBudgetExceeded`, log a structured event and return an empty string; the agent's deterministic path must still work.
3. Add `settings.LLM_PROVIDER` (`gemini` | `none`). When `none`, `llm_reason()` short-circuits to `""`. This lets enterprise customers disable all LLM calls entirely.

**Acceptance tests:**
```bash
# Point the scanner at a target and verify redaction
grep -r "Authorization:" backend/logs/ || echo "no leaks"
# Expected: "no leaks"

# Set a tiny budget and verify the breaker trips
LLM_DAILY_TOKEN_BUDGET=100 docker compose up -d backend
# Run a scan, check logs for LLMBudgetExceeded events
```

**Commit message:**
```
feat(security): redact LLM prompts and add token budget circuit breaker

llm_reason() shipped raw customer data to Gemini with no cost controls. Add
redaction for cookies/auth/PII/internal hostnames, per-scan and daily token
budgets, and an LLM_PROVIDER=none kill switch for air-gapped deployments.
```

---

## Step 3.4 — Isolate lab network and add TLS reverse proxy

**Files:**
- `docker-compose.yml`
- `docker-compose.lab.yml`
- `infra/caddy/Caddyfile` **(new)**

**Changes:**
1. Confirm `docker-compose.lab.yml` uses its own `networks: lab_net` and that the backend service is NOT on `lab_net`. The backend reaches lab containers only via published localhost ports, the same way a customer target would be reached.
2. Add a Caddy (or Traefik) reverse proxy service in `docker-compose.yml` that terminates TLS with a self-signed cert in dev and Let's Encrypt in prod, proxying to `backend:8000` and `frontend:5173`.
3. Update `CORS_ORIGINS` in `config.py` to only allow the proxy origin.
4. Document in `README.md`: dev URL becomes `https://localhost` (accept the self-signed cert).

**Acceptance tests:**
```bash
curl -kI https://localhost/
# Expected: HTTP/2 200, no plaintext :8000 or :5173 exposed externally
docker network inspect the-dashboard-project__lab_net | jq '.[0].Containers | length'
# Expected: 4 (lab containers only)
```

**Commit message:**
```
infra(security): isolate lab network and add TLS reverse proxy

Lab containers shared the compose bridge with the backend, giving a scanner
bug lateral-movement risk. Move labs to lab_net and front the app with a
Caddy reverse proxy terminating TLS.
```

---

# PHASE 4 — Credible risk model (Week 4)

**Goal:** Every number on the dashboard can be explained to a non-technical IT manager and defended to an auditor.

## Step 4.1 — Replace SEVERITY_WEIGHTS with CVSS v3.1

**Files:**
- `backend/app/services/unified_risk_engine.py`
- `backend/app/models/scan.py` (`Vulnerability.cvss_vector`, `cvss_score`)
- new Alembic migration
- `backend/app/services/cvss.py` **(new)**

**Changes:**
1. Add `Vulnerability.cvss_vector: String(128)`, `cvss_score: Float`. Nuclei templates frequently carry CVSS — parse and store it. For findings without a vector, compute one from severity + context (network/local, privileges required, etc.) using conservative defaults.
2. `cvss.py`: `base_score(vector)` and `environmental_score(vector, asset_value, data_sensitivity, exposure)`. Use the official formula — do not invent.
3. `UnifiedRiskEngine.calculate_scan_risk()`:
   - Replace the hardcoded `SEVERITY_WEIGHTS` table with the environmental CVSS score per vuln.
   - Aggregate: `scan_risk = min(100, sum(env_score_i) * exposure_modifier)`. Keep `asset_value` and `data_sensitivity` as CVSS environmental inputs, not ad-hoc multipliers.
4. Return a structured breakdown, not just a number:
   ```python
   {
     "score": 74.3,
     "breakdown": [
       {"vuln_id": "...", "cvss": 9.1, "contribution": 22.5, "reason": "CVE-2023-..., high confidentiality impact"},
       ...
     ]
   }
   ```
5. Store this breakdown on `Scan.risk_breakdown: JSONB`.
6. Frontend: the risk score tile gets a "Why this number?" expandable that shows the breakdown.

**Acceptance tests:**
```bash
curl -s http://localhost:8000/api/v1/dashboard/risk/<scan_id> | jq '.breakdown | length > 0'
# Expected: true
```

**Commit message:**
```
refactor(risk): replace static severity weights with CVSS v3.1 environmental

"Why is this a 74?" had no answer. Parse CVSS vectors from Nuclei findings,
compute environmental scores using asset_value and data_sensitivity as CVSS
inputs, and expose the per-vuln breakdown so scores are explainable.
```

---

## Step 4.2 — Finding deduplication and lifecycle history

**Files:**
- `backend/app/models/scan.py` (new `Finding` model)
- `backend/app/services/finding_dedup.py` **(new)**
- `backend/app/services/agent_orchestrator.py`
- new Alembic migration

**Changes:**
1. Add a `Finding` table: `id, target_id, fingerprint (unique per target), title, cvss_score, first_seen, last_seen, status, due_date, owner_user_id`.
2. `Vulnerability` rows become *observations* linked to a `Finding`. Add `Vulnerability.finding_id` FK.
3. `finding_dedup.fingerprint(vuln) = sha256(target_id + type + normalized_url + parameter + evidence_match_signature)`.
4. During scan ingest: for each new `Vulnerability`, look up or create the `Finding` by fingerprint. Update `last_seen`. If the Finding was previously marked FIXED and is seen again, transition to `REOPENED` and log an `agent_logs` event.
5. Dashboard trend/MTTR queries move from `Vulnerability` to `Finding`.

**Acceptance tests:**
```bash
# Run the same scan twice; Finding count should stay roughly flat, Vuln count should double
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT (SELECT COUNT(*) FROM findings) AS findings,
          (SELECT COUNT(*) FROM vulnerabilities) AS vulns;"
```

**Commit message:**
```
feat(findings): dedupe vulnerabilities into Finding lifecycle records

Every scan created new Vulnerability rows so trend lines and MTTR were lies.
Introduce a Finding table keyed by a stable fingerprint; vulnerabilities
become observations. Reopened findings transition explicitly.
```

---

## Step 4.3 — SLA clock on findings

**Files:**
- `backend/app/models/scan.py` (`Finding.due_date`)
- `backend/app/services/sla.py` **(new)**
- `backend/app/core/celery_app.py` (add beat schedule)
- `backend/app/services/scan_tasks.py`

**Changes:**
1. SLA defaults (configurable in `settings`):
   - CRITICAL: 7 days from first_seen
   - HIGH: 30 days
   - MEDIUM: 90 days
   - LOW: 180 days
2. On Finding creation, set `due_date = first_seen + sla_for(severity)`.
3. Celery beat task `check_sla_breaches` runs hourly: any OPEN Finding past `due_date` emits a `sla_breach` event via the Redis publisher and creates an `ActionItem` with priority `OVERDUE`.
4. Dashboard shows a new "Overdue" counter (repurpose existing KPI slot — **do not add a new panel**).

**Acceptance tests:**
```bash
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "UPDATE findings SET due_date = NOW() - INTERVAL '1 day' WHERE id = (SELECT id FROM findings LIMIT 1);"
# Trigger the beat task manually, then check ActionItems
docker exec sme_dashboard_backend celery -A app.core.celery_app call app.services.scan_tasks.check_sla_breaches
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT priority, title FROM action_items WHERE priority='OVERDUE';"
# Expected: at least one row
```

**Commit message:**
```
feat(sla): add per-severity SLA clock and overdue breach detection

SMEs need to know when a finding misses its remediation window. Add default
SLAs per severity, a Celery-beat breach checker, and surface overdue counts
in the existing KPI slot.
```

---

# PHASE 5 — Evidence, compliance, auditability (Week 5)

**Goal:** Every claim the product makes is backed by immutable evidence and mapped to a recognized control framework.

## Step 5.1 — Append-only AgentLog

**Files:**
- `backend/app/models/scan.py` (AgentLog)
- `backend/alembic/versions/...` (DB trigger)

**Changes:**
1. Add a Postgres trigger that blocks `UPDATE` and `DELETE` on `agent_logs`. Only `INSERT` is allowed.
2. Add `agent_logs.prev_hash` and `agent_logs.this_hash`: each row's `this_hash = sha256(prev_hash || payload)`, forming a tamper-evident chain per scan. Compute in application code, verify on read.
3. Backend verification endpoint `GET /api/v1/scans/{id}/audit/verify` walks the chain and returns `{ "valid": true, "broken_at": null }`.

**Acceptance tests:**
```bash
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "UPDATE agent_logs SET action='tampered' WHERE id='<any>';"
# Expected: ERROR — update blocked by trigger
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/scans/<id>/audit/verify | jq .valid
# Expected: true
```

**Commit message:**
```
feat(audit): make AgentLog append-only with hash-chained tamper evidence

Agent reasoning and actions could previously be edited after the fact,
making reports indefensible in audit. Block UPDATE/DELETE via DB trigger
and chain rows with sha256(prev || payload) for verifiable integrity.
```

---

## Step 5.2 — Signed, reproducible PDF reports

**Files:**
- `backend/app/services/pdf_generator.py`
- `backend/app/services/report_signer.py` **(new)**
- `backend/app/api/v1/endpoints/reports.py`

**Changes:**
1. Every PDF footer includes `Report ID`, `Generated (UTC)`, `Finding set SHA-256`, `Signed by Found 404 (v<version>)`.
2. `report_signer.py`: HMAC-SHA256 of the PDF bytes using `settings.REPORT_SIGNING_KEY`. Store signature in a new `reports.signature` column. Expose a `GET /reports/{id}/verify` endpoint that recomputes and compares.
3. The findings set hash is computed from a canonical JSON (sorted keys) of all findings included in the report, so the same inputs always produce the same hash.

**Acceptance tests:**
```bash
# Generate a report twice; finding set hashes must match
R1=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/reports/<scan>/meta | jq -r .findings_hash)
R2=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/reports/<scan>/meta | jq -r .findings_hash)
[ "$R1" = "$R2" ] && echo OK
```

**Commit message:**
```
feat(reports): sign PDFs and embed a reproducible findings-set hash

Reports were not tamper-evident and an auditor could not verify they matched
the stored findings. Add HMAC signing and embed a canonical findings-set
SHA-256 in the PDF footer.
```

---

## Step 5.3 — Framework tagging (OWASP / CWE / ISO 27001 / NIST)

**Files:**
- `backend/app/data/control_mappings.json` **(new)**
- `backend/app/services/framework_tagger.py` **(new)**
- `backend/app/models/scan.py` (`Finding.control_tags: ARRAY`)

**Changes:**
1. Seed file maps Nuclei template categories / CWE IDs → `{owasp_top10, cwe, iso27001_annex_a, nist_csf_function, pci_dss_requirement}`.
2. On Finding creation, tag it from the mapping. Unknown templates leave `control_tags` empty — never invent.
3. Reports and the Finding detail view render the tag chips.
4. Add `GET /api/v1/findings?framework=iso27001&control=A.12.6.1` filter.

**Acceptance tests:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/findings?framework=iso27001&control=A.12.6.1" | jq 'length > 0'
```

**Commit message:**
```
feat(compliance): tag findings with OWASP / CWE / ISO 27001 / NIST / PCI

SMEs facing audits need control-framework mappings. Seed a static mapping
table and tag each Finding at ingest; expose framework-filtered queries.
```

---

# PHASE 6 — Observability and supportability (Week 6)

**Goal:** One engineer can operate this in production without guessing.

## Step 6.1 — Prometheus metrics

**Files:**
- `backend/app/main.py`
- `backend/app/core/metrics.py` **(new)**
- `docker-compose.yml` (add Prometheus service, optional Grafana)

**Changes:**
1. Use `prometheus-fastapi-instrumentator`. Expose `/metrics`.
2. Custom metrics in `metrics.py`:
   - `found404_scan_started_total{mode}` counter
   - `found404_scan_completed_total{status}` counter
   - `found404_scan_duration_seconds` histogram
   - `found404_findings_open` gauge by severity
   - `found404_llm_tokens_used_total` counter
   - `found404_sla_breaches_total` counter
3. Add a Prometheus container scraping `/metrics`. Grafana is optional but provide a seed dashboard JSON at `infra/grafana/found404.json`.

**Acceptance tests:**
```bash
curl -s http://localhost:8000/metrics | grep -c found404_
# Expected: >= 6
```

**Commit message:**
```
feat(observability): expose Prometheus metrics for scans, findings, LLM

Added scan lifecycle counters, open-findings gauges, LLM token usage, and
SLA breach counters so operators can alert on real product signals.
```

---

## Step 6.2 — Structured logging and request IDs

**Files:**
- `backend/app/main.py`
- `backend/app/core/logging.py` **(new)**

**Changes:**
1. Configure `structlog` (or stdlib JSON formatter) to emit JSON logs with `timestamp, level, logger, message, request_id, user_id, scan_id` where available.
2. Add middleware that generates a `request_id` per HTTP request and binds it to the log context.
3. Every log line emitted inside a scan binds `scan_id` via a contextvar.

**Acceptance tests:**
```bash
docker logs sme_dashboard_backend --tail 5 | jq .
# Expected: each line is valid JSON with request_id/scan_id where applicable
```

**Commit message:**
```
chore(logging): emit structured JSON logs with request_id and scan_id

Logs were human-readable only, making production triage slow. Emit JSON with
request/scan correlation IDs so a single scan can be traced across services.
```

---

## Step 6.3 — Health and readiness split

**Files:**
- `backend/app/main.py`

**Changes:**
1. `/health` — liveness only (process is up). Always 200 if the event loop is responsive.
2. `/ready` — readiness. Returns 200 only if: DB reachable, Redis reachable, Celery worker registered. Used by `docker-compose` healthcheck.
3. Update Docker Compose healthchecks to hit `/ready`, not `/health`.

**Acceptance tests:**
```bash
docker stop sme_dashboard_redis
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ready
# Expected: 503
docker start sme_dashboard_redis
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ready
# Expected: 200
```

**Commit message:**
```
fix(health): split liveness and readiness endpoints

/health previously returned 200 even if the DB was down, so compose would
keep routing traffic to a broken backend. Split into /health (liveness)
and /ready (DB + Redis + Celery reachable).
```

---

## Step 6.4 — Operator runbook

**Files:**
- `docs/RUNBOOK.md` **(new)**

**Changes:**
Document, for each likely failure, the symptom, the check, and the fix:
- Scan stuck in RUNNING → reaper query + manual Celery inspect command
- LLM budget exceeded → how to raise, how to disable LLM entirely
- DB connection pool exhausted → how to drain and what likely caller is leaking
- Redis down → impact (no realtime UI, scans queue but don't run) + restart sequence
- Certificate expired → Caddy renewal command
- Lab container crashed → `docker compose -f docker-compose.lab.yml up -d` sequence

This is the only new doc the plan creates. It is required; without it "operational reliability" is a claim not a capability.

**Commit message:**
```
docs: add operator runbook for common production failures
```

---

# Exit criteria for the whole plan

The plan is complete when **all** of the following are true:

- [ ] `GET /api/v1/config/public` lists every integration, with honest disabled states.
- [ ] Every `Vulnerability` row has `raw_request`, `raw_response`, and `evidence_hash`.
- [ ] Validation is deterministic; LLM verdicts cannot override reprobe.
- [ ] Only Celery executes scans. `BackgroundTasks` is not imported in `scans.py`.
- [ ] Restarting the backend mid-scan leaves no `RUNNING` rows older than one hour.
- [ ] Every `/api/v1/*` route (except `/config/public` and `/health`) returns 401 without a token.
- [ ] `Target.auth_credentials` is unreadable in raw DB dumps.
- [ ] `llm_reason()` never sends `Cookie:`, `Authorization:`, or regex-matched PII to Gemini.
- [ ] Risk scores include a per-vulnerability CVSS-based breakdown.
- [ ] Running the same scan twice does not double-count findings.
- [ ] Every OPEN Finding has a `due_date` and overdue findings raise ActionItems.
- [ ] `agent_logs` rejects UPDATE/DELETE at the DB level.
- [ ] PDF reports embed a reproducible findings-set hash and an HMAC signature.
- [ ] Findings carry OWASP/CWE/ISO 27001/NIST/PCI tags where known.
- [ ] Prometheus `/metrics` exposes `found404_*` metrics.
- [ ] `/ready` correctly flips to 503 when Redis or DB is unavailable.
- [ ] `docs/RUNBOOK.md` exists and covers the six failure modes above.

---

# What this plan deliberately does NOT do

- Does not add new agents, new integrations, or new dashboard panels.
- Does not refactor the React component tree beyond what is required to honor `config/public`.
- Does not introduce a microservice split. The monolith is fine at SME scale.
- Does not adopt a new ORM, new LLM provider, or new package manager.
- Does not write marketing docs, architecture diagrams, or ADRs unless the user explicitly asks for them.

**Rule for the executing agent:** if a step tempts you into work that is not in this plan, stop and ask. Scope creep is how hardening projects die.
