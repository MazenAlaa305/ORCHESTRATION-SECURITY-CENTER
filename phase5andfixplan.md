# Orchestration Security Center — Phase 5 + Gap-Fix Execution Plan

**Audience:** An autonomous AI coding agent (Claude / GPT / Gemini).
**Repository root:** `d:/بروجيكت/last update/the-dashboard-project--main(1)/the-dashboard-project--main/`
**Branch for Part A (fixes):** `hardening/fix-phase1to4-gaps`
**Branch for Part B (Phase 5):** `hardening/phase5-audit-compliance`
**Today's date:** 2026-04-16

---

## Mandatory rules before touching any file

1. **Read every listed file in full before editing it.** Never assume line numbers — verify them.
2. **Run every Pre-check command** and record the output before making changes.
3. **Apply changes exactly as written.** If a symbol was renamed in the real code, `grep` for it first; never invent a new name.
4. **Run every Acceptance test** after each step. Paste the output into the commit body.
5. **Commit after every numbered step** using the provided commit message template. Never batch two steps into one commit.
6. **Stop and ask the human** when an acceptance test fails or a file has drifted from the description.
7. **Never use `--no-verify`** on any git command.
8. **Never commit `.env`** values; only commit `.env.example` documentation lines.

---

## Source-of-truth file locations (verified before writing this plan)

| Symbol | File | Lines |
|--------|------|-------|
| `docker-compose.yml` elasticsearch `ports` duplicate | `docker-compose.yml` | 167–172 |
| `.env` (root) — missing secrets | `.env` | entire file (6 lines) |
| `llm_guard.py` credit-card regex | `backend/app/services/llm_guard.py` | 41 |
| `Vulnerability` model | `backend/app/models/scan.py` | 158–218 |
| `Finding` model | `backend/app/models/scan.py` | 233–268 |
| `AgentLog` model | `backend/app/models/scan.py` | 275–293 |
| `BaseAgent.log_action()` | `backend/app/services/agent_orchestrator.py` | 67–81 |
| `google.generativeai` import | `backend/app/services/agent_orchestrator.py` | 12 |
| `RiskScore.jsx` (no breakdown UI) | `frontend/src/components/dashboard/RiskScore.jsx` | 1–61 |
| `pdf_generator.py` | `backend/app/services/pdf_generator.py` | 1–226 |
| `reports.py` (no signing endpoints) | `backend/app/api/v1/endpoints/reports.py` | 1–94 |
| `api.py` (router registry) | `backend/app/api/api.py` | 1–33 |
| `config.py` (Settings class) | `backend/app/core/config.py` | 1–121 |
| `finding_dedup.py` | `backend/app/services/finding_dedup.py` | 1–138 |
| Alembic versions dir | `backend/alembic/versions/` | 10 files present |

---

# PART A — Fix All Gaps and Bugs from runreporphase1to4.md

---

## Step A-1 — Fix C1: Remove duplicate `ports` key from `docker-compose.yml`

### Why
The `elasticsearch` service has two `ports:` keys (lines 167 and 171). Docker Compose rejects duplicate YAML mapping keys, so `docker compose up`, `docker compose ps`, and every other Compose command fails with a parse error. Nothing starts until this is fixed.

### Pre-check
```bash
# Run from repo root
grep -n "^    ports:" docker-compose.yml
# Expected output contains two entries near lines 167 and 171
```

### Exact change
Open `docker-compose.yml`. Find the `elasticsearch:` service block. It looks exactly like this:

```yaml
    ports:
      - "9200:9200"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"     # exposed to host so backend can reach via localhost:9200
```

Delete the **second** `ports:` block (the one after `volumes:`) including its comment. The result must be:

```yaml
    ports:
      - "9200:9200"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data
```

Do not touch any other part of the file.

### Acceptance test
```bash
docker compose config --quiet && echo "YAML_OK"
# Expected: YAML_OK  (zero error lines before it)

docker compose ps
# Expected: tabular output (not a YAML error)
```

### Commit message
```
fix(infra): remove duplicate ports key from elasticsearch service

docker-compose.yml had two ports: blocks for the elasticsearch service,
causing a YAML parse error that prevented any docker compose command from
running. Removed the duplicate at the second occurrence (after the volumes
key). Kept the first occurrence at line 167.
```

---

## Step A-2 — Fix C2: Add `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` to `.env`

### Why
`backend/app/core/config.py` lines 97–114 contain a `model_validator` that raises `ValueError` at startup when either `JWT_SECRET` or `CREDENTIAL_ENCRYPTION_KEY` is empty (unless `SKIP_SECRET_VALIDATION=1`). The root `.env` file currently only contains `GEMINI_API_KEY`. The backend will refuse to boot in production without these two secrets.

### Pre-check
```bash
cat .env
# Expected: only GEMINI_API_KEY line is present — confirms both secrets are missing

grep -n "JWT_SECRET\|CREDENTIAL_ENCRYPTION_KEY" .env
# Expected: no output
```

### Exact changes

**Step 1 — Generate the values** (run these commands, capture their stdout):
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# → capture this as JWT_SECRET value

python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# → capture this as CREDENTIAL_ENCRYPTION_KEY value
```

**Step 2 — Append to `.env`** using the Write tool (preserve the existing `GEMINI_API_KEY` line):
```
# Root .env — read by Docker Compose for variable substitution.
# Copy this file, fill in real values, and never commit it (already in .gitignore).

# Google Gemini API key (required for AI-driven report generation)
# Obtain from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-actual-google-ai-api-key-here

# JWT signing secret — required, app refuses to boot if empty
# Generate: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=<paste generated value here>

# Fernet key for encrypting Target.auth_credentials at rest — required
# Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CREDENTIAL_ENCRYPTION_KEY=<paste generated value here>
```

**Step 3 — Verify `.env.example` documents both keys.**
Read `backend/.env.example` or the root `.env.example` (whichever exists). If either key is undocumented there, add a documentation-only line (no real value):
```
JWT_SECRET=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
CREDENTIAL_ENCRYPTION_KEY=<generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
```

### Acceptance test
```bash
docker compose up -d backend db redis
sleep 20

# Backend must be reachable (not stuck in restart loop)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
# Expected: 200

# Boot logs must contain no ValueError about secrets
docker compose logs backend --tail 30 | grep -i "valueerror\|jwt_secret\|credential_encryption"
# Expected: no output
```

### Commit message
```
fix(config): add JWT_SECRET and CREDENTIAL_ENCRYPTION_KEY to .env

Both required secrets were absent from .env. config.py model_validator
raises ValueError at startup when either is empty. Generated and added
both secrets; also documented them in .env.example.
```

---

## Step A-3 — Fix N1: Credit card redaction misses space/dash-formatted numbers

### Why
`llm_guard.py` line 41 contains a regex with strict `\b` word boundaries that only matches compact digit strings like `4111111111111111`. Human-formatted card numbers like `4111 1111 1111 1111` or `4111-1111-1111-1111` are NOT matched and pass through to Gemini unredacted. This violates the plan's PII redaction contract.

### Pre-check
```bash
grep -n "REDACTED-CARD\|credit\|\[0-9\]" backend/app/services/llm_guard.py
# Records the exact current regex on line 41

# Quick functional test (run from backend dir with SKIP_SECRET_VALIDATION=1)
cd backend
SKIP_SECRET_VALIDATION=1 python -c "
from app.services.llm_guard import redact
t = 'card: 4111 1111 1111 1111'
result = redact(t)
print('FAIL' if '4111' in result else 'PASS', repr(result))
"
# Currently outputs: FAIL — the number is not redacted
```

### Exact change
In `backend/app/services/llm_guard.py`, replace **line 41** (the credit card `re.compile` line) with:

**Old line 41:**
```python
    (re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b"), "[REDACTED-CARD]"),
```

**New lines (replace line 41 with these 9 lines):**
```python
    (re.compile(
        r"\b(?:"
        r"4[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}(?:[0-9]{3})?|"  # Visa (13 or 16 digit)
        r"5[1-5][0-9]{2}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}|"           # Mastercard
        r"3[47][0-9]{2}[\s\-]?[0-9]{6}[\s\-]?[0-9]{5}|"                            # Amex (15 digit)
        r"6(?:011|5[0-9]{2})[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}"        # Discover
        r")\b"
    ), "[REDACTED-CARD]"),
```

No other changes to this file.

### Acceptance test
```bash
cd backend
SKIP_SECRET_VALIDATION=1 python -c "
from app.services.llm_guard import redact

tests = [
    ('4111 1111 1111 1111', 'spaced Visa'),
    ('4111-1111-1111-1111', 'dashed Visa'),
    ('4111111111111111',    'compact Visa'),
    ('5500 0000 0000 0004', 'spaced Mastercard'),
    ('3714 496353 98431',   'Amex'),
    ('6011 1111 1111 1117', 'Discover'),
]
all_pass = True
for card, label in tests:
    result = redact(f'card={card}')
    passed = '[REDACTED-CARD]' in result
    print(f'{'PASS' if passed else 'FAIL'} {label}: {repr(result)}')
    if not passed:
        all_pass = False
print('ALL PASS' if all_pass else 'SOME FAILED')
"
# Expected: all lines show PASS, final line ALL PASS
```

### Commit message
```
fix(security): extend CC redaction to cover space/dash-formatted card numbers

The word-boundary regex on line 41 of llm_guard.py only matched compact
digit strings (e.g. 4111111111111111). Human-readable formats with spaces
or dashes (4111 1111 1111 1111) bypassed redaction and reached Gemini.
Replaced with a pattern that allows optional [\s\-] separators between
digit groups for all four major card types.
```

---

## Step A-4 — Fix N2: Add `validation_notes` column to `Vulnerability`

### Why
HARDENING_PLAN.md step 1.3 specified a dedicated `Vulnerability.validation_notes` column for storing LLM justification text. Currently that text is appended to `vuln.description`, mixing source data with audit commentary and making structured queries impossible. The column is missing from `scan.py` and no migration exists for it.

### Pre-check
```bash
grep -n "validation_notes" backend/app/models/scan.py
# Expected: no output — confirms the column is missing

grep -n "validation_notes\|description" backend/app/services/agent_orchestrator.py | head -20
# Shows where LLM justification is currently written — it goes into vuln.description
```

### Exact changes

**Change 1 — Add column to `Vulnerability` model in `backend/app/models/scan.py`.**

Find the `Vulnerability` class. After the `description` column (currently around line 192), add one new line:

```python
    # ── Phase 1.3: Validation notes (LLM justification, never overrides reprobe) ─
    validation_notes = Column(Text, nullable=True)
```

The surrounding context to locate the insertion point:
```python
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

Insert after `description`, before `created_at`.

**Change 2 — Create Alembic migration.**

Run:
```bash
cd backend
SKIP_SECRET_VALIDATION=1 alembic revision --autogenerate -m "add_vuln_validation_notes"
```

Open the generated migration file in `backend/alembic/versions/`. Verify that the `upgrade()` function contains:
```python
op.add_column('vulnerabilities', sa.Column('validation_notes', sa.Text(), nullable=True))
```
And `downgrade()` contains:
```python
op.drop_column('vulnerabilities', 'validation_notes')
```
If autogenerate produced something different, edit it to match the above.

**Change 3 — Fix write location in `agent_orchestrator.py`.**

Search for where LLM justification is currently appended to `description` inside `ValidationAgent.execute()`:
```bash
grep -n "validation_reason\|description.*=.*llm\|description.*\+" backend/app/services/agent_orchestrator.py
```

Find the line that appends LLM text to `vuln.description` (it may look like `vuln.description = (vuln.description or "") + "\n[LLM: ...]"`). Change it to write to `vuln.validation_notes` instead:
```python
vuln.validation_notes = llm_justification  # LLM text only; never overrides reprobe verdict
```

### Acceptance test
```bash
# Apply the migration to dev DB
cd backend
SKIP_SECRET_VALIDATION=1 alembic upgrade head

# Verify column exists
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "\d vulnerabilities" | grep validation_notes
# Expected: validation_notes | text |
```

### Commit message
```
feat(validation): add validation_notes column to Vulnerability

LLM justification was appended to vuln.description, mixing primary source
data with audit commentary. Store it in a dedicated validation_notes column
so description remains clean and both fields are independently queryable.
Added Alembic migration and updated ValidationAgent to write to the new
column.
```

---

## Step A-5 — Fix N3: Add Alembic data migration to re-encrypt existing `auth_credentials`

### Why
HARDENING_PLAN.md step 3.2 required an Alembic data migration that reads all existing `Target.auth_credentials` rows, detects plaintext JSON, and re-encrypts with Fernet. Only schema migrations exist. Any upgrade from a pre-Phase-3 installation would leave existing plaintext credentials in the database until each row is individually overwritten through the API.

### Pre-check
```bash
ls backend/alembic/versions/ | grep -i "auth\|encrypt\|reencrypt\|credential"
# Expected: no output — confirms the migration is missing

# Verify crypto module works
cd backend
SKIP_SECRET_VALIDATION=1 python -c "
import os; os.environ['CREDENTIAL_ENCRYPTION_KEY'] = __import__('cryptography.fernet', fromlist=['Fernet']).Fernet.generate_key().decode()
from app.core.crypto import encrypt_json, decrypt_json
enc = encrypt_json({'user': 'test', 'pass': 'secret'})
print('Fernet prefix OK:', enc.startswith('gA'))
print('Roundtrip OK:', decrypt_json(enc) == {'user': 'test', 'pass': 'secret'})
"
# Expected: Fernet prefix OK: True  /  Roundtrip OK: True
```

### Exact changes

Create the file `backend/alembic/versions/g1h2i3j4k5l6_reencrypt_auth_credentials.py` with this exact content:

```python
"""re-encrypt plaintext auth_credentials rows with Fernet

IMPORTANT: Back up the database before running this migration.
Any row whose auth_credentials is valid JSON (not already a Fernet blob)
will be encrypted in-place. Rows that are already encrypted (Fernet tokens
start with 'gAAAAAB') are skipped. NULL rows are left as NULL.

Revision ID: g1h2i3j4k5l6
Revises: f1e2d3c4b5a6
Create Date: 2026-04-16

"""
from alembic import op
from sqlalchemy import text
import json
import logging

revision = 'g1h2i3j4k5l6'
down_revision = 'f1e2d3c4b5a6'
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)


def upgrade() -> None:
    # Import here so the module is not loaded at Alembic discovery time
    # (settings require env vars that may not be set during discovery).
    try:
        from app.core.crypto import encrypt_json
    except Exception as exc:
        raise RuntimeError(
            "Cannot import app.core.crypto — ensure CREDENTIAL_ENCRYPTION_KEY "
            "is set in the environment before running this migration."
        ) from exc

    conn = op.get_bind()
    rows = conn.execute(
        text("SELECT id, auth_credentials FROM targets WHERE auth_credentials IS NOT NULL")
    ).fetchall()

    re_encrypted = 0
    skipped_already_encrypted = 0
    skipped_not_json = 0

    for row in rows:
        val = row.auth_credentials
        if not val:
            continue

        # Fernet tokens always start with 'gAAAAAB' — already encrypted, skip
        if isinstance(val, str) and val.startswith("gAAAAAB"):
            skipped_already_encrypted += 1
            continue

        # Attempt to parse as JSON dict
        try:
            if isinstance(val, dict):
                parsed = val
            else:
                parsed = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                "Target %s: auth_credentials is not JSON — skipping (manual review needed)",
                row.id,
            )
            skipped_not_json += 1
            continue

        try:
            encrypted = encrypt_json(parsed)
            conn.execute(
                text("UPDATE targets SET auth_credentials = :enc WHERE id = :id"),
                {"enc": encrypted, "id": row.id},
            )
            re_encrypted += 1
        except Exception as exc:
            logger.error("Target %s: encryption failed — %s", row.id, exc)
            # Do not raise — continue with remaining rows
            skipped_not_json += 1

    logger.info(
        "auth_credentials re-encryption: %d encrypted, %d already encrypted (skipped), "
        "%d could not be processed",
        re_encrypted, skipped_already_encrypted, skipped_not_json,
    )


def downgrade() -> None:
    # Decryption-in-place is intentionally not implemented.
    # Re-encryption is a one-way security upgrade; reversing it would expose
    # credentials in plaintext again.
    logger.warning(
        "Downgrade of g1h2i3j4k5l6 is a no-op — auth_credentials remain encrypted. "
        "Restore from a pre-migration backup if plaintext is required."
    )
```

### Acceptance test
```bash
# Apply migration
cd backend
SKIP_SECRET_VALIDATION=1 alembic upgrade head

# Check: any non-null auth_credentials must start with Fernet prefix
docker exec sme_dashboard_db psql -U postgres -d dashboard -c \
  "SELECT id, LEFT(auth_credentials::text, 10) AS prefix
   FROM targets
   WHERE auth_credentials IS NOT NULL
   LIMIT 10;"
# Expected: every value in 'prefix' column starts with 'gAAAAAB' or the table is empty
# (empty is fine on a fresh install — migration is a no-op)
```

### Commit message
```
feat(security): add data migration to re-encrypt plaintext auth_credentials

Phase 3.2 added Fernet encryption to new rows but existing plaintext rows
were never re-encrypted. Migration g1h2i3j4k5l6 reads all non-null
auth_credentials rows, skips already-encrypted Fernet tokens, parses
JSON, and re-encrypts in-place. Downgrade is a no-op — restore from
backup if rollback is needed. Includes per-row error handling so a single
bad row does not abort the migration.
```

---

## Step A-6 — Fix N4: Add "Why this number?" expandable to `RiskScore.jsx`

### Why
HARDENING_PLAN.md step 4.1 explicitly requires: *"Frontend: the risk score tile gets a 'Why this number?' expandable that shows the breakdown."* The backend already exposes a full CVSS-based breakdown at `GET /api/v1/dashboard/risk/{scan_id}` (implemented in `dashboard.py` lines 150–179). The frontend `RiskScore.jsx` (61 lines total) only accepts a `score` prop and shows a `GaugeRing` — it never fetches or displays the breakdown.

### Pre-check
```bash
grep -n "breakdown\|Why\|fetch\|scanId\|scan_id" frontend/src/components/dashboard/RiskScore.jsx
# Expected: no output — confirms no breakdown logic exists

# Verify the backend endpoint exists
grep -n "risk_breakdown\|risk/{scan" backend/app/api/v1/endpoints/dashboard.py
# Expected: shows the route definition
```

### Exact change

Replace the entire content of `frontend/src/components/dashboard/RiskScore.jsx` with:

```jsx
import React, { useEffect, useState } from 'react';
import { GaugeRing } from '../ui/GaugeRing';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';

const RiskScore = ({ score = 0, scanId = null }) => {
    const safeScore = Math.min(Math.max(Math.round(score || 0), 0), 100);
    const [expanded, setExpanded] = useState(false);
    const [breakdown, setBreakdown] = useState(null);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    useEffect(() => {
        if (!scanId) return;
        setLoadingBreakdown(true);
        api.get(`/dashboard/risk/${scanId}`)
            .then(res => {
                const data = res.data;
                if (data && Array.isArray(data.breakdown) && data.breakdown.length > 0) {
                    setBreakdown(data.breakdown);
                }
            })
            .catch(() => setBreakdown(null))
            .finally(() => setLoadingBreakdown(false));
    }, [scanId]);

    let label = 'Critical';
    if (safeScore >= 80) label = 'Excellent';
    else if (safeScore >= 60) label = 'Good';
    else if (safeScore >= 40) label = 'Fair';
    else if (safeScore >= 20) label = 'Poor';

    const color =
        safeScore >= 70 ? '#00ff88' :
        safeScore >= 40 ? '#ffaa00' :
        '#ff0055';

    return (
        <div className="glass-card p-5 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in">
            {/* Ambient radial glow */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-1000"
                style={{ background: `radial-gradient(circle at center, ${color}12 0%, transparent 70%)` }}
            />

            {/* Title */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">
                    Security Health
                </span>
            </div>

            {/* Canvas gauge */}
            <div className="relative z-10 w-full max-w-[180px]">
                <GaugeRing score={safeScore} max={100} size={180} label={label.toUpperCase()} color={color} />
            </div>

            {/* Score bar */}
            <div className="w-full space-y-2 relative z-10 mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase font-mono">
                        Health Index
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                        {safeScore}/100
                    </span>
                </div>
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${safeScore}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }}
                    />
                </div>
            </div>

            {/* "Why this number?" expandable — shown only when breakdown data is available */}
            {breakdown && breakdown.length > 0 && (
                <div className="w-full relative z-10 mt-3">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-[9px] font-mono text-gray-500 hover:text-gray-300 transition-colors duration-200 mx-auto"
                        aria-expanded={expanded}
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Why this number?
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                            {breakdown.slice(0, 10).map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-start text-[8px] font-mono border-b border-white/5 pb-1"
                                >
                                    <span className="text-gray-400 truncate max-w-[65%]" title={item.reason || item.vuln_id}>
                                        {item.reason
                                            ? item.reason.slice(0, 40)
                                            : (item.vuln_id || '').slice(0, 8) + '…'}
                                    </span>
                                    <span className="text-white font-bold ml-2 shrink-0">
                                        {typeof item.cvss_env_score === 'number'
                                            ? item.cvss_env_score.toFixed(1)
                                            : typeof item.cvss === 'number'
                                            ? item.cvss.toFixed(1)
                                            : '—'}
                                    </span>
                                </div>
                            ))}
                            {breakdown.length > 10 && (
                                <p className="text-[8px] text-gray-600 text-center pt-1">
                                    +{breakdown.length - 10} more findings
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Loading state */}
            {loadingBreakdown && !breakdown && (
                <p className="text-[8px] text-gray-600 font-mono mt-2 relative z-10">loading breakdown…</p>
            )}
        </div>
    );
};

export default RiskScore;
```

**Then find where `RiskScore` is used in the dashboard and pass `scanId`.**

Search:
```bash
grep -rn "RiskScore" frontend/src/
```

In the parent component (likely `frontend/src/pages/Dashboard.jsx` or a dashboard layout component), find the `<RiskScore score={...} />` usage and add `scanId={latestScanId}` where `latestScanId` is the ID of the most recent scan already fetched by the parent. If the parent already has a `latestScan` or `currentScan` object in state, pass `scanId={latestScan?.id}`.

### Acceptance test
- Start dev server: `cd frontend && npm run dev`
- Log in to the dashboard.
- Verify the Security Health tile renders without errors.
- When a completed scan exists, a "Why this number?" button appears below the score bar.
- Clicking it expands a list of up to 10 per-vulnerability CVSS scores.
- Clicking again collapses it.
- When no scan exists or breakdown is empty, the button does not render.

### Commit message
```
feat(ui): add CVSS breakdown expandable to RiskScore tile

The backend has exposed per-vulnerability CVSS breakdowns at
/api/v1/dashboard/risk/{scan_id} since Phase 4.1 but the frontend
RiskScore component only showed a gauge ring with no explanation.

Added a "Why this number?" toggle that fetches the breakdown for the
current scan and renders the top-10 contributing findings with their
CVSS environmental scores. The toggle is hidden when no breakdown data
is available so the component degrades cleanly for scans without it.
```

---

## Step A-7 — Fix N6: Migrate off deprecated `google.generativeai` to `google-genai`

### Why
`agent_orchestrator.py` line 12 uses `import google.generativeai as genai`. This package raises `FutureWarning: All support for the google.generativeai package has ended` on import. When Anthropic/Google removes the package, all LLM calls will break silently.

### Pre-check
```bash
grep -n "google.generativeai\|google-generativeai" backend/app/services/agent_orchestrator.py backend/requirements.txt
# Records current import statement and pinned package version

# Verify the warning fires
cd backend
SKIP_SECRET_VALIDATION=1 python -W error::FutureWarning -c "import google.generativeai" 2>&1
# Expected: FutureWarning raised — confirms the issue
```

### Exact changes

**Change 1 — `backend/requirements.txt`**

Find the line containing `google-generativeai`. Replace it with:
```
google-genai>=0.8.0
```

**Change 2 — `backend/app/services/agent_orchestrator.py` line 12**

Old line 12:
```python
import google.generativeai as genai
```

New line 12:
```python
from google import genai
```

**Change 3 — Fix API usage in `agent_orchestrator.py`.**

The old SDK uses `genai.configure(api_key=...)` and `genai.GenerativeModel(model_name)`. The new `google-genai` SDK uses a client object.

Find these lines in `BaseAgent.__init__()` (around lines 60–65):
```python
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            try:
                self.llm = genai.GenerativeModel('gemini-2.0-flash')
            except Exception:
                self.llm = genai.GenerativeModel('gemini-pro')
```

Replace with:
```python
        if settings.GEMINI_API_KEY:
            try:
                _client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self.llm = _client
                self._llm_model = "gemini-2.0-flash"
            except Exception:
                self.llm = None
                self._llm_model = None
```

Find the `llm_reason` method call to `llm.generate_content` (around line 119):
```python
            response = llm.generate_content(safe_prompt)
            return str(response.text)
```

Replace with:
```python
            response = llm.models.generate_content(
                model=getattr(self, '_llm_model', 'gemini-2.0-flash'),
                contents=safe_prompt,
            )
            return str(response.text)
```

### Acceptance test
```bash
# Rebuild the backend image to pick up the new package
docker compose build backend

# Verify import works without any warning
docker compose run --rm backend python -W error -c "from google import genai; print('OK')"
# Expected: OK  (exit 0, no FutureWarning)

# Verify the agent initialises
docker compose run --rm backend python -c "
import os; os.environ['SKIP_SECRET_VALIDATION']='1'
from app.services.agent_orchestrator import BaseAgent
print('BaseAgent import OK')
"
# Expected: BaseAgent import OK
```

### Commit message
```
fix(deps): migrate from deprecated google-generativeai to google-genai SDK

google.generativeai raised FutureWarning on every import indicating full
end-of-support. Switched to the google-genai package (google.genai namespace)
and updated BaseAgent to use the new Client + models.generate_content API.
Updated requirements.txt to pin google-genai>=0.8.0.
```

---

## Part A Exit Checklist

Run all checks before creating the Part B branch.

```bash
# 1. Compose YAML is valid
docker compose config --quiet && echo "YAML OK"

# 2. All services start
docker compose up -d
sleep 30
docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -v "Up"
# Expected: no lines (all services Up)

# 3. Backend health
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
# Expected: 200

# 4. CC redaction
docker compose exec backend python -c "
from app.services.llm_guard import redact
assert '[REDACTED-CARD]' in redact('4111 1111 1111 1111'), 'FAIL spaced'
assert '[REDACTED-CARD]' in redact('4111111111111111'), 'FAIL compact'
print('CC redaction OK')
"

# 5. validation_notes column exists
docker compose exec db psql -U postgres -d dashboard -c \
  "\d vulnerabilities" | grep validation_notes

# 6. auth_credentials are encrypted (if any rows exist)
docker compose exec db psql -U postgres -d dashboard -c \
  "SELECT COUNT(*) FROM targets WHERE auth_credentials IS NOT NULL AND LEFT(auth_credentials::text,7) != 'gAAAAAB';"
# Expected: 0

# 7. No deprecated google.generativeai warning
docker compose exec backend python -W error -c "from google import genai; print('OK')"
```

---

# PART B — Phase 5: Evidence, Compliance, Auditability

**Create branch:** `hardening/phase5-audit-compliance` from the tip of Part A.

---

## Step B-1 — Step 5.1: Append-only `AgentLog` with hash-chained tamper evidence

### Why
`AgentLog` rows (the audit trail of every agent action) can currently be freely `UPDATE`d or `DELETE`d. A malicious insider or SQL injection could alter the evidence trail after a report is issued. Phase 5.1 requires: (a) a Postgres trigger blocking mutation, and (b) a SHA-256 hash chain per scan so any tampering is detectable by recomputing the chain.

### Pre-check
```bash
# Confirm no hash columns exist yet
grep -n "prev_hash\|this_hash" backend/app/models/scan.py
# Expected: no output

# Confirm log_action does not compute hashes
grep -n "prev_hash\|this_hash\|sha256\|hashlib" backend/app/services/agent_orchestrator.py
# Expected: no output

# Check no trigger exists
docker compose exec db psql -U postgres -d dashboard -c \
  "\dy" | grep agent_log
# Expected: no output (no triggers yet)
```

### Exact changes

**Change 1 — Add columns to `AgentLog` in `backend/app/models/scan.py`.**

The `AgentLog` class currently ends at line 293 (`scan = relationship(...)`). Add two columns before the relationship line:

```python
    # ── Phase 5.1: Tamper-evident hash chain ──────────────────────────────────
    prev_hash = Column(String(64), nullable=True)
    # SHA-256 of the previous log row's this_hash (or '0'*64 for the first row in a scan)
    this_hash = Column(String(64), nullable=True)
    # SHA-256 of (prev_hash + canonical JSON of {scan_id, agent_name, action, reasoning})
    # Verified by GET /api/v1/scans/{id}/audit/verify
```

**Change 2 — Create Alembic migration `backend/alembic/versions/h2i3j4k5l6m7_agent_log_append_only.py`:**

```python
"""agent_log append-only trigger and hash chain columns

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add hash chain columns
    op.add_column('agent_logs', sa.Column('prev_hash', sa.String(64), nullable=True))
    op.add_column('agent_logs', sa.Column('this_hash', sa.String(64), nullable=True))

    # 2. Create trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION _block_agent_log_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION
                'agent_logs is append-only: % is not permitted on this table',
                TG_OP;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 3. Attach trigger for UPDATE
    op.execute("""
        CREATE TRIGGER agent_logs_no_update
            BEFORE UPDATE ON agent_logs
            FOR EACH ROW
            EXECUTE FUNCTION _block_agent_log_mutation();
    """)

    # 4. Attach trigger for DELETE
    op.execute("""
        CREATE TRIGGER agent_logs_no_delete
            BEFORE DELETE ON agent_logs
            FOR EACH ROW
            EXECUTE FUNCTION _block_agent_log_mutation();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS agent_logs_no_delete ON agent_logs;")
    op.execute("DROP TRIGGER IF EXISTS agent_logs_no_update ON agent_logs;")
    op.execute("DROP FUNCTION IF EXISTS _block_agent_log_mutation();")
    op.drop_column('agent_logs', 'this_hash')
    op.drop_column('agent_logs', 'prev_hash')
```

**Change 3 — Update `BaseAgent.log_action()` in `backend/app/services/agent_orchestrator.py` to compute hashes.**

The current `log_action` method (lines 67–81) is:
```python
    async def log_action(self, action: str, reasoning: Optional[Dict] = None, 
                   input_data: Optional[Dict] = None, output_data: Optional[Dict] = None):
        """Log agent action to database for transparency"""
        log_entry = AgentLog(
            scan_id=self.scan_id,
            agent_name=self.name,
            action=action,
            reasoning=reasoning,
            input_data=input_data,
            output_data=output_data
        )
        self.db.add(log_entry)
        await self.db.commit()
        await manager.broadcast(f"[{self.name.upper()}] {action}")
        logger.info(f"[{self.name}] {action}")
```

Replace it with:
```python
    async def log_action(self, action: str, reasoning: Optional[Dict] = None,
                         input_data: Optional[Dict] = None, output_data: Optional[Dict] = None):
        """
        Log agent action to database with SHA-256 hash chaining for tamper evidence.

        Each row's this_hash = sha256(prev_hash + canonical_payload).
        prev_hash is the this_hash of the most recent log for the same scan,
        or '0' * 64 if this is the first log entry for the scan.
        """
        import hashlib, json as _json

        # 1. Find the previous hash for this scan (most recent row by rowid order)
        prev_row = await self.db.execute(
            select(AgentLog.this_hash)
            .where(AgentLog.scan_id == self.scan_id)
            .order_by(AgentLog.id.desc())
            .limit(1)
        )
        prev_result = prev_row.scalar()
        prev_hash = prev_result if prev_result else "0" * 64

        # 2. Build canonical payload (must be deterministic — sorted keys, no indent)
        payload = _json.dumps(
            {
                "scan_id": self.scan_id,
                "agent_name": self.name,
                "action": action,
                "reasoning": reasoning,
            },
            sort_keys=True,
            ensure_ascii=True,
        )

        # 3. Compute this row's hash
        this_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()

        # 4. Insert (trigger blocks UPDATE/DELETE, so only INSERT is permitted)
        log_entry = AgentLog(
            scan_id=self.scan_id,
            agent_name=self.name,
            action=action,
            reasoning=reasoning,
            input_data=input_data,
            output_data=output_data,
            prev_hash=prev_hash,
            this_hash=this_hash,
        )
        self.db.add(log_entry)
        await self.db.commit()
        await manager.broadcast(f"[{self.name.upper()}] {action}")
        logger.info("[%s] %s | hash=%s", self.name, action, this_hash[:12])
```

Also add to the top of the file (if not already present): `from sqlalchemy import select` — verify line 15 already has it; if not, add it.

**Change 4 — Add audit verify endpoint.**

Create the file `backend/app/api/v1/endpoints/audit.py`:

```python
"""
Audit chain verification endpoint.
Phase 5.1 — Orchestration Security Center Hardening Plan.

GET /api/v1/scans/{scan_id}/audit/verify
    Walks the agent_logs hash chain for the given scan and returns whether
    the chain is intact.  A broken chain means a row was tampered with
    after insertion (which the DB trigger normally prevents, but an admin
    could bypass the trigger by disabling it).
"""
import hashlib
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import AgentLog, Scan

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/scans/{scan_id}/audit/verify")
def verify_audit_chain(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """
    Recompute the SHA-256 hash chain for all AgentLog rows belonging to
    *scan_id* and confirm each row's stored this_hash matches the recomputed
    value.

    Returns:
        {
          "valid": true | false,
          "broken_at": null | "<log_row_id>",
          "chain_length": <int>,
          "scan_id": "<scan_id>"
        }
    """
    # Confirm the scan exists
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    logs = (
        db.query(AgentLog)
        .filter(AgentLog.scan_id == scan_id)
        .order_by(AgentLog.id)
        .all()
    )

    broken_at = None
    prev_hash = "0" * 64

    for log in logs:
        payload = json.dumps(
            {
                "scan_id": log.scan_id,
                "agent_name": log.agent_name,
                "action": log.action,
                "reasoning": log.reasoning,
            },
            sort_keys=True,
            ensure_ascii=True,
        )
        expected_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()

        if log.this_hash != expected_hash:
            logger.warning(
                "Audit chain broken at log %s for scan %s — "
                "stored=%s expected=%s",
                log.id, scan_id, log.this_hash, expected_hash,
            )
            broken_at = log.id
            break

        prev_hash = log.this_hash

    return {
        "valid": broken_at is None,
        "broken_at": broken_at,
        "chain_length": len(logs),
        "scan_id": scan_id,
    }
```

**Change 5 — Register the audit router in `backend/app/api/api.py`.**

Add the import and include_router call. Current `api.py` line 2:
```python
from .v1.endpoints import scans, reports, network, targets, vulnerabilities, dashboard, openvas, siem, config
```

Change to:
```python
from .v1.endpoints import scans, reports, network, targets, vulnerabilities, dashboard, openvas, siem, config, audit
```

After the existing `api_router.include_router(siem.router, ...)` line, add:
```python
api_router.include_router(audit.router, prefix="", tags=["audit"], dependencies=_auth)
```

The prefix is `""` because the route in `audit.py` already includes `/scans/{scan_id}/audit/verify`.

### Acceptance test
```bash
# Apply migration
cd backend && SKIP_SECRET_VALIDATION=1 alembic upgrade head

# Restart stack
docker compose up -d

# 1. Trigger a scan so some agent_logs are created
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"<get from docker logs>"}' | jq -r .access_token)

# 2. Attempt to UPDATE an agent_log row — must be blocked
LOGID=$(docker compose exec db psql -U postgres -d dashboard -tAc \
  "SELECT id FROM agent_logs LIMIT 1;")
docker compose exec db psql -U postgres -d dashboard -c \
  "UPDATE agent_logs SET action='tampered' WHERE id='$LOGID';"
# Expected: ERROR:  agent_logs is append-only: UPDATE is not permitted on this table

# 3. Chain verification returns valid=true
SCAN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/scans | jq -r '.[0].id')
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/scans/$SCAN_ID/audit/verify | jq .
# Expected: {"valid": true, "broken_at": null, "chain_length": N, "scan_id": "..."}
```

### Commit message
```
feat(audit): make AgentLog append-only with hash-chained tamper evidence

Agent reasoning and actions could previously be edited or deleted after the
fact, making reports indefensible in audit. This commit:
- Adds prev_hash and this_hash columns to agent_logs.
- Adds a Postgres trigger (via Alembic migration h2i3j4k5l6m7) that raises
  an exception on any UPDATE or DELETE attempt.
- Updates BaseAgent.log_action() to compute sha256(prev_hash + payload)
  for each row, forming a per-scan tamper-evident chain.
- Adds GET /api/v1/scans/{id}/audit/verify that recomputes and validates
  the full chain, returning {"valid": true/false, "broken_at": ...}.
```

---

## Step B-2 — Step 5.2: Signed, reproducible PDF reports

### Why
PDF reports have no tamper evidence. An auditor receiving a report cannot verify it matches the findings stored in the database, and the report could be modified after generation with no detectable trace. Phase 5.2 requires: (a) a reproducible SHA-256 of the canonical findings set embedded in the PDF footer, and (b) an HMAC-SHA256 signature stored in the database and verifiable on demand.

### Pre-check
```bash
# Confirm no signing logic exists
grep -n "sign\|hmac\|findings_hash\|REPORT_SIGNING" backend/app/services/pdf_generator.py backend/app/api/v1/endpoints/reports.py
# Expected: no output

# Confirm REPORT_SIGNING_KEY not in config
grep -n "REPORT_SIGNING_KEY" backend/app/core/config.py
# Expected: no output

# Confirm no Report model or signature column
grep -n "class Report\|signature\|findings_hash" backend/app/models/scan.py
# Expected: no output
```

### Exact changes

**Change 1 — Add `REPORT_SIGNING_KEY` to `config.py`.**

After the `APP_VERSION` line (line 81) in `backend/app/core/config.py`, add:

```python
    # ── Phase 5.2: Report signing ──────────────────────────────────────────────
    # REPORT_SIGNING_KEY is used to HMAC-sign generated PDF bytes.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    # If empty, signing is skipped with a warning (not a boot failure).
    REPORT_SIGNING_KEY: str = ""
```

Add to `.env.example`:
```
REPORT_SIGNING_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
```

Add to `.env` (generate the real value):
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Change 2 — Add `Report` model to `backend/app/models/scan.py`.**

After the `ActionItem` class (the last model, ending around line 409), append:

```python
# ============================================================================
# REPORTS  (Phase 5.2 — signed, reproducible reports)
# ============================================================================

class Report(Base):
    """
    Metadata record for each generated PDF report.

    findings_hash  — SHA-256 of the canonical JSON of all findings included.
                     Recomputing this from the same findings must produce the
                     same value (deterministic serialisation, sorted keys).
    signature      — HMAC-SHA256 of the PDF bytes, keyed by REPORT_SIGNING_KEY.
                     Verified by GET /api/v1/reports/{id}/verify.
    pdf_bytes      — The raw PDF stored as BYTEA so it can be re-served and
                     re-verified without regeneration.
    """
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    findings_hash = Column(String(64), nullable=True)   # SHA-256 of canonical findings JSON
    signature = Column(Text, nullable=True)             # HMAC-SHA256 hex of pdf_bytes
    pdf_bytes = Column(sa.LargeBinary, nullable=True)   # stored PDF for re-verification
```

Also add `import sqlalchemy as sa` near the top of `scan.py` imports if not already present. Check line 5 — it currently imports from `sqlalchemy` directly; add `import sqlalchemy as sa` on a new line before the existing imports.

**Change 3 — Create Alembic migration `backend/alembic/versions/i3j4k5l6m7n8_add_reports_table.py`:**

```python
"""add reports table for signed PDF metadata

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('scan_id', sa.String(36), sa.ForeignKey('scans.id'), nullable=False, index=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('findings_hash', sa.String(64), nullable=True),
        sa.Column('signature', sa.Text(), nullable=True),
        sa.Column('pdf_bytes', sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('reports')
```

**Change 4 — Create `backend/app/services/report_signer.py`:**

```python
"""
Report signing utilities.
Phase 5.2 — Orchestration Security Center Hardening Plan.

canonical_findings_hash(findings)
    Deterministic SHA-256 of the sorted canonical JSON of all finding dicts.
    Same findings always produce the same hash regardless of insertion order.

sign_pdf(pdf_bytes) -> str
    HMAC-SHA256 of the PDF bytes using settings.REPORT_SIGNING_KEY.
    Returns hex digest.

verify_signature(pdf_bytes, stored_sig) -> bool
    Constant-time comparison of recomputed vs stored signature.
"""
import hashlib
import hmac
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def canonical_findings_hash(findings: list[dict]) -> str:
    """
    Return a stable SHA-256 of the findings list.

    Findings are sorted by 'id' before serialisation so that insertion order
    does not affect the hash.  Keys within each finding dict are also sorted.
    """
    try:
        sorted_findings = sorted(findings, key=lambda f: str(f.get("id", "")))
        canonical = json.dumps(sorted_findings, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    except Exception as exc:
        logger.error("canonical_findings_hash failed: %s", exc)
        return "0" * 64


def sign_pdf(pdf_bytes: bytes, key: Optional[str] = None) -> str:
    """
    Return the HMAC-SHA256 hex digest of *pdf_bytes* using *key*.
    Falls back to settings.REPORT_SIGNING_KEY when *key* is None.
    Returns an empty string if no key is configured (with a warning).
    """
    from app.core.config import settings
    signing_key = key or settings.REPORT_SIGNING_KEY
    if not signing_key:
        logger.warning("REPORT_SIGNING_KEY is not set — PDF will not be signed")
        return ""
    mac = hmac.new(signing_key.encode(), pdf_bytes, hashlib.sha256)
    return mac.hexdigest()


def verify_signature(pdf_bytes: bytes, stored_sig: str, key: Optional[str] = None) -> bool:
    """
    Return True iff the HMAC of *pdf_bytes* matches *stored_sig*.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not stored_sig:
        return False
    recomputed = sign_pdf(pdf_bytes, key=key)
    if not recomputed:
        return False
    return hmac.compare_digest(recomputed, stored_sig)
```

**Change 5 — Update `backend/app/services/pdf_generator.py`.**

The `generate_report` static method currently ends with `buffer.seek(0); return buffer` (lines 197–199). Make the following changes:

1. Change the method signature to accept `scan_id` and `findings_hash` parameters:

   ```python
   @staticmethod
   def generate_report(scan_data: dict, scan_id: str = "", findings_hash: str = "") -> BytesIO:
   ```

2. Replace the existing footer section (lines 183–198 — the `footer_style` paragraph and final `doc.build`) with:

   ```python
           # Footer — Phase 5.2: embed audit metadata
           footer_style = ParagraphStyle(
               'Footer',
               parent=styles['Normal'],
               fontSize=7,
               textColor=colors.grey,
               alignment=TA_RIGHT
           )
           from app.core.config import settings as _settings
           footer_text = (
               f"Orchestration Security Center v{_settings.APP_VERSION} | "
               f"Report ID: {scan_id or 'N/A'} | "
               f"Generated UTC: {datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')} | "
               f"Findings SHA-256: {findings_hash[:16]}…{findings_hash[-8:] if findings_hash else 'N/A'} | "
               f"CONFIDENTIAL"
           )
           elements.append(Spacer(1, 0.5 * inch))
           elements.append(Paragraph(footer_text, footer_style))

           doc.build(elements)
           buffer.seek(0)
           return buffer
   ```

**Change 6 — Rewrite `backend/app/api/v1/endpoints/reports.py`** to add generation with signing and a verify endpoint.

Replace the entire file with:

```python
"""
Reports API endpoints.
Phase 5.2 — Orchestration Security Center Hardening Plan.

POST /reports/{scan_id}/generate  — build PDF, sign it, store metadata
GET  /reports/{scan_id}/pdf       — download the stored PDF
GET  /reports/{report_id}/meta    — return metadata (findings_hash, signature)
GET  /reports/{report_id}/verify  — re-sign and compare stored signature
"""
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.database import get_db
from app.models.scan import Scan, Vulnerability, Finding, Report
from app.services.pdf_generator import PDFReportGenerator
from app.services.report_signer import canonical_findings_hash, sign_pdf, verify_signature

router = APIRouter()
logger = logging.getLogger(__name__)


def _findings_for_scan(scan: Scan) -> list[dict]:
    """Build the canonical findings list used for hashing and the PDF."""
    return [
        {
            "id": str(v.finding_id or v.id),
            "type": v.type,
            "severity": str(v.severity),
            "url": v.url,
            "template_id": v.template_id,
            "cvss_score": v.cvss_score,
            "status": str(v.status),
        }
        for v in scan.vulnerabilities
    ]


@router.post("/{scan_id}/generate")
def generate_report(scan_id: str, db: Session = Depends(get_db)):
    """Generate a signed PDF report for a completed scan and store the metadata."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = _findings_for_scan(scan)
    fhash = canonical_findings_hash(findings)

    # Resolve target name
    target_name = (
        scan.target.base_url if scan.target and scan.target.base_url
        else scan.target_url or "unknown_target"
    )

    scan_data = {
        "scan_id": scan_id,
        "target": target_name,
        "completed_at": scan.completed_at,
        "risk_score": scan.risk_score or 0.0,
        "assets": [
            {"ip": a.ip_address, "hostname": a.hostname, "device_type": a.device_type}
            for a in scan.assets
        ],
        "actions": [
            {"title": a.title, "description": a.description, "priority": a.priority, "type": a.type}
            for a in scan.actions
        ],
        "vulnerabilities": [
            {"host": v.host, "port": v.port, "service": v.service, "severity": str(v.severity)}
            for v in scan.vulnerabilities
        ],
    }

    report_id = str(uuid.uuid4())
    pdf_buffer = PDFReportGenerator.generate_report(scan_data, scan_id=report_id, findings_hash=fhash)
    pdf_bytes = pdf_buffer.read()
    sig = sign_pdf(pdf_bytes)

    report = Report(
        id=report_id,
        scan_id=scan_id,
        generated_at=datetime.utcnow(),
        findings_hash=fhash,
        signature=sig,
        pdf_bytes=pdf_bytes,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "report_id": report.id,
        "scan_id": scan_id,
        "generated_at": report.generated_at.isoformat(),
        "findings_hash": fhash,
        "signed": bool(sig),
    }


@router.get("/{report_id}/meta")
def get_report_meta(report_id: str, db: Session = Depends(get_db)):
    """Return report metadata without regenerating the PDF."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "report_id": report.id,
        "scan_id": report.scan_id,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "findings_hash": report.findings_hash,
        "signature": report.signature,
    }


@router.get("/{report_id}/pdf")
def download_report(report_id: str, db: Session = Depends(get_db)):
    """Download the stored PDF."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not report.pdf_bytes:
        raise HTTPException(status_code=404, detail="Report PDF not found")
    return Response(
        content=report.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id[:8]}.pdf"},
    )


@router.get("/{report_id}/verify")
def verify_report(report_id: str, db: Session = Depends(get_db)):
    """Re-sign the stored PDF bytes and compare with the stored signature."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.pdf_bytes:
        return {"valid": False, "reason": "No PDF bytes stored", "report_id": report_id}

    signature_match = verify_signature(report.pdf_bytes, report.signature or "")
    return {
        "valid": signature_match,
        "signature_match": signature_match,
        "findings_hash": report.findings_hash,
        "report_id": report_id,
    }


# ── Legacy endpoints preserved for backwards compatibility ────────────────────

@router.get("/{scan_id}")
async def get_report_legacy(scan_id: str, db: Session = Depends(get_db)):
    """Legacy: returns AI analysis text. Use /generate for signed reports."""
    from app.services.ai_advisor import AIAdvisor
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    advisor = AIAdvisor()
    analysis = await advisor.generate_report(scan)
    return {"scan_id": scan.id, "ai_analysis": analysis}
```

**Change 7 — Register the new report router correctly in `api.py`.**

The `reports` router is already registered at line 23. No change needed — the new endpoints are in the same file.

### Acceptance test
```bash
# Apply migration
cd backend && SKIP_SECRET_VALIDATION=1 alembic upgrade head
docker compose up -d

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"<seeded>"}' | jq -r .access_token)

# Get a completed scan ID
SCAN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/scans | jq -r '[.[] | select(.status=="completed")][0].id')

# Generate report
REPORT_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$SCAN_ID/generate" | jq -r .report_id)
echo "Report ID: $REPORT_ID"

# Findings hash must be identical on two meta calls
H1=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/meta" | jq -r .findings_hash)
H2=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/meta" | jq -r .findings_hash)
[ "$H1" = "$H2" ] && echo "HASH STABLE OK" || echo "HASH UNSTABLE FAIL"

# Signature verification
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/verify" | jq .
# Expected: {"valid": true, "signature_match": true, "findings_hash": "...", "report_id": "..."}
```

### Commit message
```
feat(reports): sign PDFs and embed a reproducible findings-set hash

Reports were not tamper-evident. An auditor could not verify a received
PDF matched the findings stored in the database.

- Added Report model with findings_hash (SHA-256 of canonical findings
  JSON) and signature (HMAC-SHA256 of PDF bytes) columns.
- Created report_signer.py with canonical_findings_hash(), sign_pdf(),
  and verify_signature() functions.
- PDF footer now embeds Report ID, UTC timestamp, and findings hash.
- New POST /reports/{scan_id}/generate stores the signed PDF in the DB.
- GET /reports/{id}/verify recomputes and compares the signature.
- GET /reports/{id}/meta returns metadata without regenerating the PDF
  so the same scan always produces the same findings_hash.
- Alembic migration i3j4k5l6m7n8 creates the reports table.
```

---

## Step B-3 — Step 5.3: Framework tagging (OWASP / CWE / ISO 27001 / NIST / PCI)

### Why
SMEs undergoing audits need each finding mapped to recognised control frameworks (OWASP Top 10, CWE, ISO 27001 Annex A, NIST CSF, PCI DSS). Without these tags the tool cannot be used as compliance evidence. The tags must be sourced from a curated static mapping — never invented by the LLM.

### Pre-check
```bash
# No control_tags on Finding
grep -n "control_tags\|framework\|owasp\|iso27001" backend/app/models/scan.py
# Expected: no output

# No tagger or mapping file
ls backend/app/services/framework_tagger.py 2>/dev/null && echo EXISTS || echo MISSING
ls backend/app/data/control_mappings.json 2>/dev/null && echo EXISTS || echo MISSING
# Expected: both MISSING

# No findings endpoint
grep -rn "findings" backend/app/api/v1/endpoints/ | grep "router\|def "
# Expected: no findings-specific router
```

### Exact changes

**Change 1 — Add `Finding.control_tags` column to `backend/app/models/scan.py`.**

In the `Finding` class, after the `owner_user_id` column (around line 264), add:

```python
    # ── Phase 5.3: Framework control tags ────────────────────────────────────
    control_tags = Column(JSON, nullable=True)
    # Example: {"owasp_top10": "A03:2021", "cwe": "CWE-89",
    #           "iso27001_annex_a": "A.12.6.1", "nist_csf_function": "PR.IP",
    #           "pci_dss_requirement": "6.3.1"}
    # Empty dict {} when template category is unknown — never invented.
```

**Change 2 — Create Alembic migration `backend/alembic/versions/j4k5l6m7n8o9_add_finding_control_tags.py`:**

```python
"""add control_tags column to findings

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('findings', sa.Column('control_tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('findings', 'control_tags')
```

**Change 3 — Create the data directory and mapping file.**

Create directory `backend/app/data/` if it does not exist (check with `ls backend/app/data/`).

Create `backend/app/data/control_mappings.json`:

```json
{
  "_comment": "Static mapping of Nuclei template categories and CWE IDs to control frameworks. Never invent — only add entries with official framework references.",
  "nuclei_category": {
    "sqli": {
      "owasp_top10": "A03:2021",
      "cwe": "CWE-89",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.1"
    },
    "xss": {
      "owasp_top10": "A03:2021",
      "cwe": "CWE-79",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.2"
    },
    "ssrf": {
      "owasp_top10": "A10:2021",
      "cwe": "CWE-918",
      "iso27001_annex_a": "A.13.1.3",
      "nist_csf_function": "PR.AC",
      "pci_dss_requirement": "1.3.2"
    },
    "rce": {
      "owasp_top10": "A03:2021",
      "cwe": "CWE-78",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.1"
    },
    "lfi": {
      "owasp_top10": "A01:2021",
      "cwe": "CWE-22",
      "iso27001_annex_a": "A.9.4.1",
      "nist_csf_function": "PR.AC",
      "pci_dss_requirement": "6.3.1"
    },
    "xxe": {
      "owasp_top10": "A05:2021",
      "cwe": "CWE-611",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.1"
    },
    "misconfiguration": {
      "owasp_top10": "A05:2021",
      "cwe": "CWE-16",
      "iso27001_annex_a": "A.12.1.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "2.2"
    },
    "exposure": {
      "owasp_top10": "A01:2021",
      "cwe": "CWE-200",
      "iso27001_annex_a": "A.9.4.1",
      "nist_csf_function": "PR.AC",
      "pci_dss_requirement": "6.2.4"
    },
    "cves": {
      "owasp_top10": "A06:2021",
      "cwe": "CWE-1035",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "ID.RA",
      "pci_dss_requirement": "6.3.3"
    },
    "authentication": {
      "owasp_top10": "A07:2021",
      "cwe": "CWE-287",
      "iso27001_annex_a": "A.9.4.2",
      "nist_csf_function": "PR.AC",
      "pci_dss_requirement": "8.3"
    },
    "injection": {
      "owasp_top10": "A03:2021",
      "cwe": "CWE-74",
      "iso27001_annex_a": "A.12.6.1",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.1"
    },
    "redirect": {
      "owasp_top10": "A01:2021",
      "cwe": "CWE-601",
      "iso27001_annex_a": "A.14.1.2",
      "nist_csf_function": "PR.IP",
      "pci_dss_requirement": "6.3.1"
    },
    "default-logins": {
      "owasp_top10": "A07:2021",
      "cwe": "CWE-521",
      "iso27001_annex_a": "A.9.4.3",
      "nist_csf_function": "PR.AC",
      "pci_dss_requirement": "8.3.6"
    }
  }
}
```

**Change 4 — Create `backend/app/services/framework_tagger.py`:**

```python
"""
Framework tagging service.
Phase 5.3 — Orchestration Security Center Hardening Plan.

Maps Nuclei template categories (and template IDs) to control frameworks:
  OWASP Top 10 2021, CWE, ISO 27001:2013 Annex A,
  NIST CSF function, PCI DSS v4.0 requirement.

Rules:
  - ONLY return tags from the static control_mappings.json seed file.
  - NEVER invent tags.
  - Return an empty dict {} when no mapping is found.
"""
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_MAPPINGS_PATH = Path(__file__).parent.parent / "data" / "control_mappings.json"
_CATEGORY_MAP: dict = {}


def _load() -> None:
    global _CATEGORY_MAP
    if _CATEGORY_MAP:
        return
    try:
        data = json.loads(_MAPPINGS_PATH.read_text(encoding="utf-8"))
        _CATEGORY_MAP = data.get("nuclei_category", {})
        logger.info("framework_tagger: loaded %d category mappings", len(_CATEGORY_MAP))
    except Exception as exc:
        logger.error("framework_tagger: failed to load control_mappings.json — %s", exc)
        _CATEGORY_MAP = {}


def tag_finding(
    template_id: Optional[str],
    vuln_type: Optional[str],
    category: Optional[str] = None,
) -> dict:
    """
    Return a control framework mapping dict for the given template/category.

    Lookup order:
      1. Exact match on *category* (e.g. "sqli", "xss").
      2. Prefix match on *template_id* (e.g. "sqli-generic-..." → "sqli").
      3. Prefix match on *vuln_type* (e.g. "SQL Injection" → "sqli").
      4. Return {} — never invent.

    Args:
        template_id:  Nuclei template ID string (e.g. "sqli-generic-error-based")
        vuln_type:    Vulnerability.type string (e.g. "SQLi", "XSS")
        category:     Explicit category override (rarely needed)

    Returns:
        Dict with framework keys, or {} if unknown.
    """
    _load()

    candidates = [
        (category or "").lower(),
        (template_id or "").lower().split("-")[0],
        (vuln_type or "").lower().replace(" ", "").replace("_", ""),
    ]

    # Normalisation aliases so common shorthand resolves to mapping keys
    _ALIASES = {
        "sqli": "sqli",
        "sqlinjection": "sqli",
        "sql": "sqli",
        "xss": "xss",
        "crosssitescripting": "xss",
        "ssrf": "ssrf",
        "rce": "rce",
        "remotecommandexecution": "rce",
        "remotecodeexecution": "rce",
        "lfi": "lfi",
        "localfileinclusion": "lfi",
        "xxe": "xxe",
        "xmlexternalentity": "xxe",
        "misconfiguration": "misconfiguration",
        "misconfig": "misconfiguration",
        "exposure": "exposure",
        "informationdisclosure": "exposure",
        "cve": "cves",
        "cves": "cves",
        "authentication": "authentication",
        "auth": "authentication",
        "injection": "injection",
        "redirect": "redirect",
        "openredirect": "redirect",
        "defaultlogins": "default-logins",
        "defaultcredentials": "default-logins",
    }

    for raw in candidates:
        if not raw:
            continue
        normalised = _ALIASES.get(raw, raw)
        if normalised in _CATEGORY_MAP:
            return dict(_CATEGORY_MAP[normalised])

    return {}
```

**Change 5 — Call `tag_finding` in `finding_dedup.py` when creating a new `Finding`.**

In `backend/app/services/finding_dedup.py`, add the import at the top (after the existing imports):
```python
from app.services.framework_tagger import tag_finding
```

Inside `deduplicate_scan`, in the `else` branch (new Finding creation, around line 115), after building the `finding` object and before `db.add(finding)`, add:
```python
            # Phase 5.3: Tag with control framework mappings
            finding.control_tags = tag_finding(
                template_id=vuln.template_id,
                vuln_type=vuln.type,
            )
```

**Change 6 — Create `backend/app/api/v1/endpoints/findings.py`:**

```python
"""
Findings API endpoint.
Phase 5.3 — Orchestration Security Center Hardening Plan.

GET /api/v1/findings
    Returns paginated Finding records with optional filtering by framework,
    control, scan_id, and status.

Query parameters:
    framework  — e.g. "iso27001", "owasp_top10", "cwe", "nist_csf_function",
                 "pci_dss_requirement"
    control    — e.g. "A.12.6.1", "A03:2021", "CWE-89"
    scan_id    — filter findings that have at least one observation in this scan
    status     — filter by FindingStatus (open, fixed, accepted, reopened, false_positive)
    limit      — max results to return (default 50, max 200)
    offset     — pagination offset (default 0)
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import Finding, FindingStatus, Vulnerability

router = APIRouter()
logger = logging.getLogger(__name__)

# Map query param 'framework' to the JSON key used in control_tags
_FRAMEWORK_KEYS = {
    "owasp_top10": "owasp_top10",
    "owasp": "owasp_top10",
    "cwe": "cwe",
    "iso27001": "iso27001_annex_a",
    "iso27001_annex_a": "iso27001_annex_a",
    "nist": "nist_csf_function",
    "nist_csf": "nist_csf_function",
    "nist_csf_function": "nist_csf_function",
    "pci": "pci_dss_requirement",
    "pci_dss": "pci_dss_requirement",
    "pci_dss_requirement": "pci_dss_requirement",
}


@router.get("")
def list_findings(
    framework: Optional[str] = Query(None, description="Framework key (iso27001, owasp_top10, cwe, nist_csf_function, pci_dss_requirement)"),
    control: Optional[str] = Query(None, description="Control value to match within the framework"),
    scan_id: Optional[str] = Query(None, description="Filter findings observed in this scan"),
    status: Optional[str] = Query(None, description="FindingStatus filter"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List findings with optional framework/control filtering.

    Framework filter example: ?framework=iso27001&control=A.12.6.1
    This returns all findings whose control_tags['iso27001_annex_a'] == 'A.12.6.1'.
    """
    query = db.query(Finding)

    # Status filter
    if status:
        try:
            status_enum = FindingStatus(status.lower())
            query = query.filter(Finding.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status '{status}'. Valid values: {[s.value for s in FindingStatus]}"
            )

    # Scan filter — join through Vulnerability observations
    if scan_id:
        query = query.join(Vulnerability, Vulnerability.finding_id == Finding.id).filter(
            Vulnerability.scan_id == scan_id
        )

    # Framework + control filter — requires JSON containment
    if framework and control:
        framework_key = _FRAMEWORK_KEYS.get(framework.lower())
        if not framework_key:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown framework '{framework}'. Valid values: {list(_FRAMEWORK_KEYS.keys())}"
            )
        # Filter in Python after DB fetch when using SQLite (JSON path not supported);
        # for Postgres use the JSON containment operator.
        # We fetch all and filter in-process to stay DB-agnostic.
        findings_raw = query.offset(offset).limit(limit * 10).all()
        filtered = [
            f for f in findings_raw
            if (f.control_tags or {}).get(framework_key) == control
        ]
        findings = filtered[:limit]
        return _serialize_findings(findings)

    findings = query.offset(offset).limit(limit).all()
    return _serialize_findings(findings)


def _serialize_findings(findings: list[Finding]) -> list[dict]:
    return [
        {
            "id": f.id,
            "target_id": f.target_id,
            "title": f.title,
            "vuln_type": f.vuln_type,
            "severity": str(f.severity),
            "cvss_score": f.cvss_score,
            "status": str(f.status),
            "first_seen": f.first_seen.isoformat() if f.first_seen else None,
            "last_seen": f.last_seen.isoformat() if f.last_seen else None,
            "due_date": f.due_date.isoformat() if f.due_date else None,
            "control_tags": f.control_tags or {},
        }
        for f in findings
    ]
```

**Change 7 — Register the findings router in `backend/app/api/api.py`.**

Change line 2 import from:
```python
from .v1.endpoints import scans, reports, network, targets, vulnerabilities, dashboard, openvas, siem, config, audit
```
to:
```python
from .v1.endpoints import scans, reports, network, targets, vulnerabilities, dashboard, openvas, siem, config, audit, findings
```

After the `audit` router include line, add:
```python
api_router.include_router(findings.router, prefix="/findings", tags=["findings"], dependencies=_auth)
```

### Acceptance test
```bash
# Apply migrations
cd backend && SKIP_SECRET_VALIDATION=1 alembic upgrade head
docker compose up -d

# Trigger a scan so findings are created
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"<seeded>"}' | jq -r .access_token)

# 1. Findings endpoint responds
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/findings?limit=5" | jq 'length'
# Expected: integer >= 0

# 2. Framework filter works for known mapping
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/findings?framework=iso27001&control=A.12.6.1" | jq '.[0].control_tags'
# Expected: {"owasp_top10": "A03:2021", "cwe": "CWE-89", "iso27001_annex_a": "A.12.6.1", ...}

# 3. Unknown control returns empty array (not invented data)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/findings?framework=iso27001&control=Z.99.9" | jq 'length'
# Expected: 0

# 4. Tagger unit test
docker compose exec backend python -c "
from app.services.framework_tagger import tag_finding
r = tag_finding('sqli-generic-error-based', 'SQLi')
assert r.get('owasp_top10') == 'A03:2021', f'FAIL: {r}'
r2 = tag_finding('unknown-template-xyz', 'Unknown')
assert r2 == {}, f'FAIL should be empty: {r2}'
print('framework_tagger OK')
"
```

### Commit message
```
feat(compliance): tag findings with OWASP / CWE / ISO 27001 / NIST / PCI

SMEs facing audits need findings mapped to recognised control frameworks.

- Added Finding.control_tags JSON column (Alembic migration j4k5l6m7n8o9).
- Created backend/app/data/control_mappings.json with 13 Nuclei template
  category mappings covering OWASP Top 10 2021, CWE, ISO 27001:2013 Annex
  A, NIST CSF, and PCI DSS v4.0.
- Created framework_tagger.py: looks up the category from template_id or
  vuln_type; returns {} for unknown templates — never invents mappings.
- Updated finding_dedup.py to call tag_finding() when creating a new
  Finding, so tags are applied at ingest time.
- Added GET /api/v1/findings with ?framework=&control= filter so auditors
  can query all findings for a specific control (e.g. A.12.6.1).
```

---

# Phase 5 Exit Checklist

Run all of these before closing the branch.

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"<seeded>"}' | jq -r .access_token)

# 1. AgentLog trigger blocks UPDATE
docker compose exec db psql -U postgres -d dashboard -c \
  "UPDATE agent_logs SET action='tampered' WHERE id=(SELECT id FROM agent_logs LIMIT 1);" 2>&1 | \
  grep -i "append-only\|not permitted"
# Expected: line containing "append-only" or "not permitted"

# 2. Audit chain is valid
SCAN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/scans \
  | jq -r '[.[] | select(.status=="completed")][0].id // empty')
[ -n "$SCAN_ID" ] && curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/scans/$SCAN_ID/audit/verify" | jq .valid
# Expected: true

# 3. Generate a report and verify findings_hash is stable
REPORT_ID=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$SCAN_ID/generate" | jq -r .report_id)
H1=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/meta" | jq -r .findings_hash)
H2=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/meta" | jq -r .findings_hash)
[ "$H1" = "$H2" ] && echo "HASH STABLE" || echo "HASH UNSTABLE FAIL"

# 4. PDF signature verifies
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/reports/$REPORT_ID/verify" | jq .valid
# Expected: true

# 5. Framework filter returns non-empty for known control (requires at least one scan)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/findings" | jq '.[0].control_tags'
# Expected: object (possibly {}) — never null unless no findings exist

# 6. framework_tagger refuses to invent tags
docker compose exec backend python -c "
from app.services.framework_tagger import tag_finding
assert tag_finding('totally-unknown-xyz', 'Unknown') == {}, 'invented a tag!'
print('No invention OK')
"
```

---

# Full Plan Exit Checklist (Phases 1–5)

| # | Criterion | Implemented in |
|---|-----------|---------------|
| 1 | `GET /api/v1/config/public` lists every integration with honest disabled states | Phase 1 (pre-existing) |
| 2 | Every `Vulnerability` row has `raw_request`, `raw_response`, `evidence_hash` | Phase 1 (pre-existing) |
| 3 | Validation is deterministic; LLM verdict never overrides reprobe | Phase 1 (pre-existing) |
| 4 | Only Celery executes scans; `BackgroundTasks` not in `scans.py` | Phase 2 (pre-existing) |
| 5 | Restarting backend leaves no `RUNNING` rows older than 1 hour | Phase 2 (pre-existing) |
| 6 | Every `/api/v1/*` route returns 401 without a token | Phase 3 (pre-existing) |
| 7 | `Target.auth_credentials` unreadable in raw DB dumps | Phase 3 (pre-existing) |
| 8 | `llm_reason()` never sends Cookie / Auth / PII to Gemini — **including spaced CC numbers** | **Step A-3** |
| 9 | Risk scores include per-vulnerability CVSS breakdown; frontend shows "Why this number?" | Phase 4 + **Step A-6** |
| 10 | Same scan twice does not double-count findings | Phase 4 (pre-existing) |
| 11 | Every OPEN Finding has `due_date`; overdue findings raise ActionItems | Phase 4 (pre-existing) |
| 12 | `docker compose up` starts all services cleanly | **Step A-1 + A-2** |
| 13 | `validation_notes` column on `Vulnerability` for LLM justification | **Step A-4** |
| 14 | Existing `auth_credentials` rows re-encrypted on upgrade | **Step A-5** |
| 15 | `google.generativeai` replaced with `google-genai` | **Step A-7** |
| 16 | `agent_logs` rejects UPDATE/DELETE at DB level | **Step B-1** |
| 17 | Agent log chain verifiable via `GET /scans/{id}/audit/verify` | **Step B-1** |
| 18 | PDF reports embed reproducible findings-set SHA-256 and HMAC signature | **Step B-2** |
| 19 | `GET /reports/{id}/verify` confirms signature integrity | **Step B-2** |
| 20 | Findings carry OWASP / CWE / ISO 27001 / NIST / PCI tags where known | **Step B-3** |
| 21 | `GET /api/v1/findings?framework=iso27001&control=A.12.6.1` returns tagged findings | **Step B-3** |
| 22 | Unknown templates return empty `control_tags` — no invented mappings | **Step B-3** |
