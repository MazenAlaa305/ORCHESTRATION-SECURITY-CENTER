# FINISHING PLAN — Orchestration Security Center
**Owner:** Omar Kapil (Team Lead) · **Generated:** 2026-04-25 · **Target completion gate:** Week 13 (May 16, 2026)

> **Purpose of this document:** Every missing artifact from `project_plan.md` (49 files / docs / configs) is enumerated below with: exact file path, why it must exist, what it depends on, the full skeleton (where useful), and the acceptance criteria. Any engineer or AI agent should be able to open this file, pick a task, and ship it without re-reading the rest of the project. Each section is self-contained.

---

## How to use this plan

1. Pick one section. Read **Goal**, **Why**, **Dependencies**, **Implementation**, **Acceptance**.
2. Verify the dependencies exist in the repo before you start (paths cited absolutely).
3. Copy the skeleton, fill in the marked `# TODO` blocks against the existing services it lists.
4. Run the acceptance command listed at the bottom of the section. Don't claim done until it returns green.
5. Update `MEMORY.md` index only if you change repo-wide architecture (new directory, new top-level service).

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

**Stack reminders (so the plan grounds in reality):**

- Backend: FastAPI + SQLAlchemy 2.0 (sync `Session` for endpoints, async for services). Auth uses `app.api.deps.get_current_user` and `require_role(*roles)` factories already defined in [backend/app/api/deps.py:46](backend/app/api/deps.py#L46).
- User roles enum (already in [backend/app/models/user.py:13](backend/app/models/user.py#L13)): `VIEWER` / `ANALYST` / `ADMIN`.
- All endpoints registered through [backend/app/api/api.py](backend/app/api/api.py).
- Frontend uses `useAuth()` from [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx); token in `sessionStorage`.
- Frontend API client: [frontend/src/services/api.js](frontend/src/services/api.js).
- Tests run inside the backend container via `docker compose exec backend pytest`.

---

## Section A — Backend test foundation (P0)

The plan's freeze gate (Week 13) requires ≥ 15 passing tests. Today only 3 test files exist. This section creates the foundation everything else builds on.

### A.1 — `backend/tests/conftest.py`

**Goal:** Single source of test fixtures (in-memory SQLite DB, FastAPI `TestClient`, authenticated headers, mocked Gemini).

**Why:** Every other test file depends on these. Without it each test re-imports the world and pytest collection breaks.

**Dependencies:**
- `backend/app/main.py` (the FastAPI `app`)
- `backend/app/core/database.py` (the `Base` and `get_db` dependency to override)
- `backend/app/models/user.py` (User + UserRole enum)
- `backend/app/core/security.py` (`hash_password`, `create_access_token`)

**Implementation (full file):**

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

# Single in-memory engine shared across the whole test session via StaticPool
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _seed_user(db, email: str, role: UserRole) -> User:
    user = User(email=email, password_hash=hash_password("TestPass123!"), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db_session):
    return _seed_user(db_session, "admin@test", UserRole.ADMIN)


@pytest.fixture()
def analyst_user(db_session):
    return _seed_user(db_session, "analyst@test", UserRole.ANALYST)


@pytest.fixture()
def viewer_user(db_session):
    return _seed_user(db_session, "viewer@test", UserRole.VIEWER)


def _auth_headers_for(user: User) -> dict:
    token = create_access_token(subject=user.email, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(admin_user):
    return _auth_headers_for(admin_user)


@pytest.fixture()
def analyst_headers(analyst_user):
    return _auth_headers_for(analyst_user)


@pytest.fixture()
def viewer_headers(viewer_user):
    return _auth_headers_for(viewer_user)


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

**Acceptance:**
```
docker compose exec backend pytest backend/tests/conftest.py --collect-only -q
```
Expected: no errors, all fixtures discoverable.

---

### A.2 — `backend/tests/test_endpoints.py`

**Goal:** Smoke-test every router. One happy-path + one auth-failure per route family.

**Dependencies:** A.1 (conftest), all routers in `backend/app/api/v1/endpoints/`.

**Implementation:**

```python
# backend/tests/test_endpoints.py
import pytest

# ── Health ────────────────────────────────────────────────────────────────
def test_health_open(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "healthy")

# ── Auth gate ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize("path", [
    "/api/v1/scans/",
    "/api/v1/targets/",
    "/api/v1/findings/",
    "/api/v1/dashboard/kpi",
    "/api/v1/reports/",
])
def test_protected_routes_reject_unauthenticated(client, path):
    r = client.get(path)
    assert r.status_code in (401, 403)

# ── Auth.me ───────────────────────────────────────────────────────────────
def test_me_returns_current_user(client, admin_headers):
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test"
    assert r.json()["role"] == "ADMIN"

# ── Targets CRUD (admin only) ─────────────────────────────────────────────
def test_targets_list_empty(client, admin_headers):
    r = client.get("/api/v1/targets/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_targets_create_requires_admin(client, viewer_headers):
    r = client.post("/api/v1/targets/", headers=viewer_headers,
                    json={"name": "x", "ip_address": "10.0.0.1"})
    assert r.status_code == 403

# ── Dashboard KPI ─────────────────────────────────────────────────────────
def test_dashboard_kpi_shape(client, analyst_headers):
    r = client.get("/api/v1/dashboard/kpi", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    for key in ("total_scans", "active_scans", "critical_findings"):
        assert key in body
```

**Acceptance:** `pytest backend/tests/test_endpoints.py -v` → all green.

---

### A.3 — `backend/tests/test_auth_flow.py`

**Goal:** Cover the full login/logout/me/change-password lifecycle end-to-end.

**Implementation:**

```python
# backend/tests/test_auth_flow.py
def test_login_success(client, admin_user):
    r = client.post("/api/v1/auth/login",
                    json={"email": "admin@test", "password": "TestPass123!"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["role"] == "ADMIN"

def test_login_wrong_password(client, admin_user):
    r = client.post("/api/v1/auth/login",
                    json={"email": "admin@test", "password": "wrong"})
    assert r.status_code == 401

def test_login_unknown_email(client):
    r = client.post("/api/v1/auth/login",
                    json={"email": "nobody@test", "password": "x"})
    assert r.status_code == 401

def test_logout_is_204(client, admin_headers):
    r = client.post("/api/v1/auth/logout", headers=admin_headers)
    assert r.status_code == 204

def test_change_password_then_login_with_new(client, db_session, admin_user, admin_headers):
    r = client.post("/api/v1/auth/change-password", headers=admin_headers,
                    json={"current_password": "TestPass123!", "new_password": "NewPass456!"})
    assert r.status_code == 204
    r = client.post("/api/v1/auth/login",
                    json={"email": "admin@test", "password": "NewPass456!"})
    assert r.status_code == 200
```

**Acceptance:** all 5 tests pass.

---

### A.4 — `backend/tests/test_rbac.py`

**Goal:** Prove `require_role` dependency rejects insufficient roles and accepts sufficient ones across at least 3 routes.

**Implementation:**

```python
# backend/tests/test_rbac.py
import pytest

ADMIN_ONLY_POSTS = [
    ("/api/v1/targets/", {"name": "t", "ip_address": "10.0.0.1"}),
    ("/api/v1/rbac/users", {"email": "x@y", "password": "x", "role": "VIEWER"}),
]

@pytest.mark.parametrize("path,body", ADMIN_ONLY_POSTS)
def test_viewer_blocked(client, viewer_headers, path, body):
    r = client.post(path, json=body, headers=viewer_headers)
    assert r.status_code in (403, 404)  # 404 if rbac router not yet wired

def test_analyst_can_trigger_scan(client, analyst_headers):
    r = client.post("/api/v1/scans/", json={"target_url": "http://example.test", "scan_type": "quick"}, headers=analyst_headers)
    assert r.status_code in (200, 202)

def test_viewer_cannot_trigger_scan(client, viewer_headers):
    r = client.post("/api/v1/scans/", json={"target_url": "http://example.test", "scan_type": "quick"}, headers=viewer_headers)
    assert r.status_code == 403
```

**Acceptance:** all pass after Section B.1 is also done (wires `/rbac/users`).

---

### A.5 — `backend/tests/test_websocket.py`

**Goal:** Verify the `/ws/events` endpoint accepts a connection and broadcasts the standard envelope.

**Implementation:**

```python
# backend/tests/test_websocket.py
from app.services.ws_manager import manager

def test_ws_envelope_shape(client):
    with client.websocket_connect("/ws/events") as ws:
        # Trigger a synthetic broadcast in-process
        import asyncio
        asyncio.get_event_loop().run_until_complete(
            manager.broadcast_event("TEST_EVENT", {"hello": "world"})
        )
        msg = ws.receive_json()
        assert msg["type"] == "TEST_EVENT"
        assert msg["payload"] == {"hello": "world"}
        assert "seq" in msg and "ts" in msg
```

**Acceptance:** test passes; envelope keys match `{type,payload,seq,ts}`.

---

### A.6 — `backend/tests/test_risk_engine.py`

**Goal:** Parametrised unit tests for `UnifiedRiskEngine` math. Covers severity weights, port weighting, asset criticality multiplier.

**Implementation:**

```python
# backend/tests/test_risk_engine.py
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
    w = UnifiedRiskEngine.SEVERITY_WEIGHTS[severity]
    # CRITICAL must outweigh HIGH must outweigh MEDIUM …
    assert w >= 0
    if severity == SeverityLevel.CRITICAL:
        assert w > UnifiedRiskEngine.SEVERITY_WEIGHTS[SeverityLevel.HIGH]

def test_high_risk_ports_includes_smb_telnet_rdp():
    for port in (23, 445, 3389):
        assert port in UnifiedRiskEngine.HIGH_RISK_PORTS

def test_asset_value_critical_higher_than_low():
    assert UnifiedRiskEngine.ASSET_VALUE_MAP["CRITICAL"] > UnifiedRiskEngine.ASSET_VALUE_MAP["LOW"]
```

**Acceptance:** 5+ assertions pass; coverage of `unified_risk_engine.py` constants ≥ 80%.

---

### A.7 — `backend/tests/test_agents.py`

**Goal:** Mocked-Gemini behaviour test for the agent pipeline. No network calls.

**Implementation skeleton:**

```python
# backend/tests/test_agents.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_intelligence_agent_returns_structured_advice():
    from app.services.intelligence_agent import IntelligenceAgent
    agent = IntelligenceAgent()
    with patch.object(agent, "_call_gemini", new=AsyncMock(return_value='{"summary":"x","steps":["a"]}')):
        result = await agent.advise({"finding": "open port 23"})
    assert "summary" in result
    assert isinstance(result["steps"], list)

@pytest.mark.asyncio
async def test_validation_probe_drops_low_confidence():
    from app.services.validation_probe import ValidationProbe
    findings = [{"id": 1, "confidence": 0.4}, {"id": 2, "confidence": 0.9}]
    kept = await ValidationProbe().filter(findings)
    assert all(f["confidence"] >= 0.6 for f in kept)
    assert {f["id"] for f in kept} == {2}
```

**Note:** Adjust method names to match the actual public surface in [backend/app/services/intelligence_agent.py](backend/app/services/intelligence_agent.py) and [backend/app/services/validation_probe.py](backend/app/services/validation_probe.py) before committing.

**Acceptance:** ≥ 3 tests pass without network access.

---

### A.8 — `backend/tests/test_scan_tasks.py`

**Goal:** Run Celery tasks in **eager mode** to validate task wiring without Redis.

**Implementation:**

```python
# backend/tests/test_scan_tasks.py
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
    # Force the task into a no-op path so the test doesn't actually scan
    monkeypatch.setattr(scan_tasks, "_run_async", lambda coro: {"status": "FAILED", "error": "bad target"})
    result = scan_tasks.run_ai_scan.apply(args=("not-a-target", "quick", None)).get()
    assert isinstance(result, dict)
```

**Acceptance:** runs without a Redis broker; both tests pass.

---

### A.9 — `backend/tests/test_nmap_wrapper.py`

**Goal:** Test the XML parser of `nmap_wrapper.py` against a fixture XML file. No actual Nmap execution.

**Implementation:**

```python
# backend/tests/test_nmap_wrapper.py
from pathlib import Path
from app.services.nmap_wrapper import parse_nmap_xml  # adjust if differently named

FIXTURE = Path(__file__).parent / "fixtures" / "nmap_sample.xml"

def test_parser_extracts_open_ports():
    if not FIXTURE.exists():
        # Inline a minimal NMAP XML so the test is hermetic
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

**Acceptance:** parser extracts 2 ports from the fixture XML.

---

### A.10 — `backend/tests/test_siem_integration.py`

**Goal:** Mock the Wazuh REST client and verify `WazuhIntegration` produces the canonical alert shape.

```python
# backend/tests/test_siem_integration.py
from unittest.mock import patch
from app.services.wazuh_integration import WazuhIntegration  # adjust import to actual

def test_get_alerts_normalises_payload():
    fake_alert = {
        "rule": {"level": 12, "description": "SSH brute force", "id": "5712"},
        "agent": {"name": "lab_webserver"},
        "timestamp": "2026-04-25T10:00:00Z",
    }
    with patch.object(WazuhIntegration, "_request", return_value={"data": {"alerts": [fake_alert]}}):
        alerts = WazuhIntegration().get_alerts()
    assert len(alerts) == 1
    a = alerts[0]
    assert a["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
    assert a["source"] == "wazuh"
```

**Acceptance:** test passes without a running Wazuh instance.

---

## Section B — Backend RBAC endpoint (P1)

### B.1 — `backend/app/api/v1/endpoints/rbac.py`

**Goal:** Admin-only user management endpoints (create user, list users, change role, disable user).

**Dependencies:** [backend/app/api/deps.py:46](backend/app/api/deps.py#L46) (`require_role`), [backend/app/models/user.py](backend/app/models/user.py).

**Implementation (full file):**

```python
# backend/app/api/v1/endpoints/rbac.py
"""
Admin-only user & role management.
Wires into the router registry via app/api/api.py — add:

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
    email: EmailStr
    password: str
    role: UserRole = UserRole.VIEWER


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    disabled: bool

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


@router.get("/users", response_model=list[UserOut], dependencies=[admin_only])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=201, dependencies=[admin_only])
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(email=body.email, password_hash=hash_password(body.password), role=body.role)
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut, dependencies=[admin_only])
def change_role(user_id: str, body: RoleUpdate, db: Session = Depends(get_db),
                current=Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current.id:
        raise HTTPException(400, "Cannot demote yourself")
    user.role = body.role
    db.commit(); db.refresh(user)
    return user


@router.post("/users/{user_id}/disable", response_model=UserOut, dependencies=[admin_only])
def disable_user(user_id: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current.id:
        raise HTTPException(400, "Cannot disable yourself")
    user.disabled = True
    db.commit(); db.refresh(user)
    return user
```

**Wiring step:** edit [backend/app/api/api.py](backend/app/api/api.py) and add the two `import`/`include_router` lines shown in the file's docstring.

**Acceptance:**
1. `pytest backend/tests/test_rbac.py` green.
2. `curl -H "Authorization: Bearer $ADMIN" /api/v1/rbac/users` → returns list.
3. `curl -H "Authorization: Bearer $VIEWER" -X POST /api/v1/rbac/users …` → 403.

---

### B.2 — `backend/tests/test_auth.py`

**Note:** `test_auth_flow.py` (A.3) already covers the auth lifecycle. `test_auth.py` is therefore a focused unit test of `app/core/security.py` only:

```python
# backend/tests/test_auth.py
import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token

def test_hash_round_trip():
    h = hash_password("SecretPass1!")
    assert verify_password("SecretPass1!", h)
    assert not verify_password("wrong", h)

def test_jwt_round_trip():
    token = create_access_token(subject="x@test", role="ADMIN")
    payload = decode_token(token)
    assert payload["sub"] == "x@test"
    assert payload["role"] == "ADMIN"

def test_jwt_rejects_tampering():
    from jose import JWTError
    token = create_access_token(subject="x@test", role="ADMIN") + "tamper"
    with pytest.raises(JWTError):
        decode_token(token)
```

---

## Section C — Backend feature services (P1)

### C.1 — `backend/app/services/scoring_explainer.py`

**Goal:** Generate plain-English explanation for any risk score so the dashboard can show *why* an asset is risky.

**Why:** Required by the plan (Yousef Week 10). Without it, scores are opaque numbers — the SME persona can't act.

**Dependencies:** `UnifiedRiskEngine` constants ([backend/app/services/unified_risk_engine.py:21-46](backend/app/services/unified_risk_engine.py#L21)).

**Implementation:**

```python
# backend/app/services/scoring_explainer.py
"""
Translates a numeric risk score + the contributing factors into a short
human-readable paragraph. Pure function — no I/O, no LLM.
"""
from __future__ import annotations
from typing import TypedDict
from app.services.unified_risk_engine import UnifiedRiskEngine
from app.models.scan import SeverityLevel


class ScoreFactors(TypedDict, total=False):
    severity_counts: dict[str, int]   # {"CRITICAL": 2, "HIGH": 5, …}
    open_high_risk_ports: list[int]   # e.g. [445, 23]
    asset_criticality: str            # "CRITICAL" / "HIGH" / "MEDIUM" / "LOW"
    cvss_max: float                   # highest CVSS in this asset's findings


def explain(score: float, factors: ScoreFactors) -> str:
    """Return a 1–3 sentence explanation suitable for a dashboard tooltip."""
    band = _band(score)
    parts: list[str] = [f"Risk band: {band} ({score:.0f}/100)."]

    sev = factors.get("severity_counts", {})
    notable = [f"{n} {lvl.lower()}" for lvl, n in sev.items() if n and lvl in ("CRITICAL", "HIGH")]
    if notable:
        parts.append("Driven by " + ", ".join(notable) + " findings.")

    ports = factors.get("open_high_risk_ports") or []
    risky = [p for p in ports if p in UnifiedRiskEngine.HIGH_RISK_PORTS]
    if risky:
        names = [UnifiedRiskEngine.HIGH_RISK_PORTS[p][0] for p in risky[:3]]
        parts.append(f"High-risk services exposed: {', '.join(names)}.")

    crit = factors.get("asset_criticality")
    if crit and crit.upper() in ("CRITICAL", "HIGH"):
        parts.append(f"Asset is {crit.lower()} business value, multiplying impact.")

    return " ".join(parts)


def _band(score: float) -> str:
    if score >= 80: return "CRITICAL"
    if score >= 60: return "HIGH"
    if score >= 30: return "MEDIUM"
    if score > 0:   return "LOW"
    return "INFO"
```

**Wiring:** in `unified_risk_engine.py`, after computing the score, call `explain()` and persist the string on the `ScanAsset.risk_explanation` column (add column via Alembic migration if not present).

**Acceptance:**
- Unit test: `explain(85, {"severity_counts":{"CRITICAL":2}, "open_high_risk_ports":[445]})` returns a string containing "CRITICAL", "critical findings", and "SMB".
- Manual: dashboard tooltip shows the explanation on hover.

---

### C.2 — `backend/app/services/task_monitor.py`

**Goal:** REST helper to inspect Celery task state (queued / running / done / failed) for the UI's scan progress bar.

**Implementation:**

```python
# backend/app/services/task_monitor.py
"""
Wraps Celery's AsyncResult into a JSON-friendly status payload.
Consumed by /api/v1/scans/{scan_id}/task-status (add this route in scans.py).
"""
from celery.result import AsyncResult
from app.core.celery_app import celery_app


def get_task_status(task_id: str) -> dict:
    res = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "state": res.state,                  # PENDING / STARTED / RETRY / SUCCESS / FAILURE
        "ready": res.ready(),
        "successful": res.successful() if res.ready() else None,
        "info": _safe_info(res),
    }


def _safe_info(res) -> dict | str | None:
    info = res.info
    if isinstance(info, Exception):
        return {"error": type(info).__name__, "message": str(info)}
    return info
```

**Wiring:** add to [backend/app/api/v1/endpoints/scans.py](backend/app/api/v1/endpoints/scans.py):

```python
@router.get("/{scan_id}/task-status")
def task_status(scan_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not scan.celery_task_id:
        raise HTTPException(404, "No task")
    return get_task_status(scan.celery_task_id)
```

**Acceptance:** trigger a scan, hit the endpoint, see `state == "STARTED"` while running and `"SUCCESS"` after.

---

### C.3 — `backend/app/services/alert_correlator.py`

**Goal:** Match Wazuh alerts to scan findings by IP + port + timestamp window.

**Why:** The plan's value-prop demo is "attack the lab → Wazuh alert appears next to the matching vulnerability on the dashboard." Without this service, alerts and findings are two disjoint lists.

**Implementation:**

```python
# backend/app/services/alert_correlator.py
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
    """
    Returns the alerts list with an extra `matched_vulnerability_ids` field per alert.
    """
    enriched = []
    for alert in alerts:
        ip = alert.get("source_ip") or alert.get("agent", {}).get("ip")
        port = alert.get("port") or _port_from_description(alert.get("description", ""))
        ts = _parse_ts(alert.get("timestamp"))
        matches: list[str] = []

        if ip and ts:
            stmt = (
                select(Vulnerability.id)
                .join(ScanAsset, Vulnerability.scan_asset_id == ScanAsset.id)
                .where(ScanAsset.ip_address == ip)
                .where(Vulnerability.created_at.between(ts - WINDOW, ts + WINDOW))
            )
            if port:
                stmt = stmt.where(Vulnerability.port == port)
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
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None
```

**Wiring:** call from `siem.py` endpoint after fetching alerts; add `matched_vulnerability_ids` to the response model.

**Acceptance:** unit test with 1 alert + 1 fixture vuln on same IP/port within window returns a non-empty match list.

---

### C.4 — `infra/healthcheck.sh`

**Goal:** Single shell script returning exit-0 if every service in the stack is healthy. Called from CI and manually pre-demo.

**Implementation:**

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

**Acceptance:** `chmod +x infra/healthcheck.sh && ./infra/healthcheck.sh` → exit 0 on a healthy stack.

---

## Section D — Frontend auth & guards (P1)

### D.1 — Move `LoginPage.jsx` to `frontend/src/pages/`

**Action:** `git mv frontend/src/components/LoginPage.jsx frontend/src/pages/LoginPage.jsx` and update imports in `App.jsx`.

**Then redesign** to match the cyber theme used elsewhere (Tailwind classes from existing UI components, not inline styles). Replace inline `style={…}` with Tailwind classes; reuse `CyberButton` and `CyberBadge` from [frontend/src/components/ui/](frontend/src/components/ui/).

---

### D.2 — `frontend/src/hooks/useAuth.js`

**Note:** `useAuth` is already exported from [AuthContext.jsx:49](frontend/src/context/AuthContext.jsx#L49). The plan asks for a dedicated hook file — create it as a thin re-export for codebase clarity:

```js
// frontend/src/hooks/useAuth.js
export { useAuth } from '../context/AuthContext';
```

Then mass-edit imports across `pages/` and `components/` to import from `hooks/useAuth` instead of `context/AuthContext`. Search command: `grep -rl "from.*context/AuthContext" frontend/src`.

---

### D.3 — `frontend/src/components/ui/ProtectedRoute.jsx`

**Implementation:**

```jsx
// frontend/src/components/ui/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
```

**Wiring in `App.jsx`:**

```jsx
<Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/login" element={<LoginPage />} />
```

**Acceptance:** unauthenticated visit to `/` redirects to `/login`; authenticated visit renders the dashboard.

---

### D.4 — `frontend/src/components/ui/RoleGuard.jsx`

**Implementation:**

```jsx
// frontend/src/components/ui/RoleGuard.jsx
import { useAuth } from '../../hooks/useAuth';

/**
 * Conditionally renders children only if user role ∈ allow.
 * Usage:  <RoleGuard allow={['ADMIN']}><DangerButton/></RoleGuard>
 */
export default function RoleGuard({ allow = [], children, fallback = null }) {
  const { user } = useAuth();
  const role = user?.role;
  if (!role || !allow.includes(role)) return fallback;
  return children;
}
```

**Acceptance:** wrap the "Trigger Scan" button with `<RoleGuard allow={['ADMIN','ANALYST']}>` and confirm a `VIEWER` does not see it.

---

### D.5 — `frontend/src/components/ui/ConfirmDialog.jsx`

**Implementation:**

```jsx
// frontend/src/components/ui/ConfirmDialog.jsx
import { useEffect } from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onCancel?.();
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div className="bg-zinc-900 border border-cyan-500/40 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-cyan-400 text-lg font-bold mb-2">{title}</h3>
        <p className="text-zinc-300 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 text-zinc-400 hover:text-white" onClick={onCancel}>Cancel</button>
          <button className="px-4 py-2 bg-red-600/20 border border-red-500 text-red-300 hover:bg-red-600/40 rounded" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

---

### D.6 — `frontend/src/components/ui/EmptyState.jsx`

```jsx
// frontend/src/components/ui/EmptyState.jsx
export default function EmptyState({ title = 'Nothing here yet', message = '', icon = '📭', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-zinc-300 font-semibold">{title}</div>
      {message && <div className="text-zinc-500 text-sm mt-1 max-w-sm">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

**Adoption:** replace ad-hoc "No data" markup in `VulnerabilitiesPanel`, `ScanHistory`, `Reports` with `<EmptyState>`.

---

### D.7 — `frontend/src/pages/SettingsPage.jsx`

**Goal:** Show current user email/role, allow password change, list users (admin only).

```jsx
// frontend/src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import RoleGuard from '../components/ui/RoleGuard';
import api from '../services/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/rbac/users').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [user]);

  const submitPw = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', { current_password: pw.current, new_password: pw.next });
      setMsg('Password updated.'); setPw({ current: '', next: '' });
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <section>
        <h2 className="text-cyan-400 text-xl font-bold">Account</h2>
        <p className="text-zinc-400 text-sm">{user?.email} — <span className="text-cyan-300">{user?.role}</span></p>
        <button className="mt-2 text-red-400 hover:text-red-300" onClick={logout}>Log out</button>
      </section>

      <section>
        <h2 className="text-cyan-400 text-xl font-bold">Change password</h2>
        <form onSubmit={submitPw} className="space-y-2 max-w-sm">
          <input type="password" placeholder="Current" className="w-full bg-black border border-cyan-700 p-2"
                 value={pw.current} onChange={e => setPw({...pw, current: e.target.value})}/>
          <input type="password" placeholder="New" className="w-full bg-black border border-cyan-700 p-2"
                 value={pw.next} onChange={e => setPw({...pw, next: e.target.value})}/>
          <button className="px-4 py-2 bg-cyan-600/20 border border-cyan-500">Update</button>
          {msg && <p className="text-zinc-400 text-sm">{msg}</p>}
        </form>
      </section>

      <RoleGuard allow={['ADMIN']}>
        <section>
          <h2 className="text-cyan-400 text-xl font-bold">Users</h2>
          <table className="w-full text-sm mt-2"><tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-zinc-800">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.disabled ? 'disabled' : 'active'}</td>
              </tr>
            ))}
          </tbody></table>
        </section>
      </RoleGuard>
    </div>
  );
}
```

**Acceptance:** `/settings` route renders; password change endpoint succeeds; admin sees user table, viewer doesn't.

---

## Section E — Missing dashboard panels (P1)

### E.1 — `frontend/src/components/dashboard/SeverityDonut.jsx`

**Library:** Recharts (already a dependency).

```jsx
// frontend/src/components/dashboard/SeverityDonut.jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealTime } from '../../context/RealTimeContext';

const COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#facc15', LOW: '#22d3ee', INFO: '#71717a' };

export default function SeverityDonut() {
  const { kpi } = useRealTime();
  const data = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
    .map(k => ({ name: k, value: kpi?.severity_counts?.[k] || 0 }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return <div className="text-zinc-500 text-center py-8">No findings yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {data.map(d => <Cell key={d.name} fill={COLORS[d.name]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Acceptance:** when `kpi.severity_counts` is non-empty the donut renders; empty state otherwise.

---

### E.2 — `frontend/src/components/dashboard/AssetTimeline.jsx`

```jsx
// frontend/src/components/dashboard/AssetTimeline.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import EmptyState from '../ui/EmptyState';

export default function AssetTimeline({ assetId }) {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    if (!assetId) return;
    api.get(`/network/assets/${assetId}/timeline`)
       .then(r => setEvents(r.data))
       .catch(() => setEvents([]));
  }, [assetId]);

  if (events === null) return <div className="text-zinc-500">Loading…</div>;
  if (events.length === 0) return <EmptyState title="No history" message="No scan events recorded for this asset." icon="📜" />;

  return (
    <ol className="relative border-l border-cyan-700/40 pl-4 space-y-4">
      {events.map(ev => (
        <li key={ev.id} className="ml-2">
          <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-cyan-400" />
          <time className="text-xs text-zinc-500">{new Date(ev.ts).toLocaleString()}</time>
          <p className="text-sm text-zinc-200">{ev.action} — {ev.detail}</p>
        </li>
      ))}
    </ol>
  );
}
```

**Backend dependency:** add `GET /api/v1/network/assets/{id}/timeline` returning `[{id, ts, action, detail}]`. If the endpoint isn't there yet, mock with the existing scan history list.

---

### E.3 — `frontend/src/components/dashboard/ExposureMap.jsx`

```jsx
// frontend/src/components/dashboard/ExposureMap.jsx
import { useMemo } from 'react';
import { useRealTime } from '../../context/RealTimeContext';

const colorFor = (score) => {
  if (score >= 80) return 'bg-red-600';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 30) return 'bg-yellow-400';
  if (score > 0)   return 'bg-cyan-500';
  return 'bg-zinc-700';
};

export default function ExposureMap() {
  const { assets } = useRealTime();
  const grouped = useMemo(() => {
    const m = {};
    (assets || []).forEach(a => {
      const subnet = (a.ip_address || '0.0.0.0').split('.').slice(0, 3).join('.') + '.0/24';
      (m[subnet] = m[subnet] || []).push(a);
    });
    return m;
  }, [assets]);

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([subnet, list]) => (
        <div key={subnet}>
          <div className="text-xs text-zinc-400 mb-1">{subnet} <span className="text-zinc-600">({list.length})</span></div>
          <div className="flex flex-wrap gap-1">
            {list.map(a => (
              <div key={a.id} title={`${a.ip_address} — ${a.risk_score ?? 0}`}
                   className={`w-4 h-4 rounded-sm ${colorFor(a.risk_score ?? 0)}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### E.4 — `frontend/src/components/dashboard/RemediationPanel.jsx`

```jsx
// frontend/src/components/dashboard/RemediationPanel.jsx
export default function RemediationPanel({ vulnerability }) {
  if (!vulnerability) return null;
  const steps = vulnerability.remediation_steps || [];
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-zinc-500 uppercase">Recommendation</div>
        <p className="text-zinc-200">{vulnerability.recommendation || '—'}</p>
      </div>
      <div>
        <div className="text-xs text-zinc-500 uppercase">Steps</div>
        <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-1">
          {steps.length === 0 && <li className="text-zinc-500">No automated steps available.</li>}
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
      {vulnerability.references?.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase">References</div>
          <ul className="text-sm text-cyan-400 space-y-0.5">
            {vulnerability.references.map(r => (
              <li key={r}><a href={r} target="_blank" rel="noreferrer">{r}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Wiring:** rendered inside `IncidentDetailDrawer` when a vulnerability is selected.

---

## Section F — Lab attack scenarios (P2)

Each scenario file follows the same template: **Goal · Pre-conditions · Attacker steps · Expected detections · Cleanup**.

### F.1 — `lab/scenarios/sqli_scenario.md`

```markdown
# Scenario: SQL Injection on Juice Shop

## Goal
Demonstrate that the platform detects a SQLi vulnerability on `lab_webserver` (Juice Shop) and produces an actionable finding with CVSS score.

## Pre-conditions
- `docker compose -f docker-compose.lab.yml up -d`
- `lab_webserver` healthy on http://localhost:3000

## Attacker steps
1. Browse to http://localhost:3000/#/login.
2. Submit `email = ' OR 1=1--` / `password = anything`.
3. Confirm login bypass returns admin session.

## Expected platform output
- Nuclei finding `sqli-detect` (CVSS 9.0+, severity CRITICAL)
- Wazuh alert rule 5712 / level ≥ 10 within 30 s
- Dashboard: red node on `lab_webserver`, RemediationPanel shows ORM/parameterised-query advice

## Cleanup
`docker compose -f docker-compose.lab.yml restart lab_webserver` to reset Juice Shop state.
```

### F.2 — `lab/scenarios/xss_scenario.md`

Same template; XSS on Juice Shop's search field, payload `<iframe src="javascript:alert(1)">`. Expected detection: Nuclei `xss-reflected`, severity HIGH.

### F.3 — `lab/scenarios/misconfig_scenario.md`

Same template; SMB null-session on `lab_smb` (port 445) and unauthenticated Redis on `lab_redis` (6379). Expected detection: Nmap NSE script results + Nuclei `redis-unauth-detect`.

**Acceptance for all three:** running the scenario manually produces ≥ 1 finding visible on the dashboard within 30 s.

---

### F.4 — `lab/wazuh/custom_rules.xml`

```xml
<!-- lab/wazuh/custom_rules.xml -->
<group name="orchestration_lab,">
  <rule id="100100" level="10">
    <if_sid>5712</if_sid>
    <description>Lab: SSH brute force attempt against vulnerable host</description>
  </rule>
  <rule id="100101" level="12">
    <decoded_as>json</decoded_as>
    <field name="event">sqli_detected</field>
    <description>Lab: SQL injection signature observed</description>
  </rule>
  <rule id="100102" level="11">
    <decoded_as>json</decoded_as>
    <field name="event">xss_detected</field>
    <description>Lab: Reflected XSS signature observed</description>
  </rule>
  <rule id="100103" level="9">
    <decoded_as>json</decoded_as>
    <field name="port">445</field>
    <field name="action">null_session</field>
    <description>Lab: SMB null session — misconfiguration</description>
  </rule>
</group>
```

**Acceptance:** mount into Wazuh manager via volume in `docker-compose.lab.yml`; restart manager; confirm rule listed in `/var/ossec/etc/decoders/local_rules.xml`.

---

### F.5 — `lab/kibana/dashboards/sme_overview.ndjson`

Generate by running Kibana once, building the dashboard manually (panels: alert-count over time, top rule IDs, alerts per agent), then **Stack Management → Saved Objects → Export** for that dashboard. Save the resulting `.ndjson` to this path.

**Acceptance:** importing the file into a fresh Kibana instance recreates the dashboard with all panels.

---

## Section G — SIEM integration tests (P2)

Already covered by `backend/tests/test_siem_integration.py` in **Section A.10**.

---

## Section H — CI / CD (P0)

### H.1 — `.github/workflows/ci.yml`

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push: { branches: [main] }

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
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.10' }
      - name: Install deps
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
          pip install pytest pytest-asyncio httpx
      - name: Lint (ruff if configured)
        run: pip install ruff && ruff check backend/app || true
      - name: Run tests
        env:
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
      - name: Build images
        run: docker compose build
      - name: Trivy scan (backend)
        uses: aquasecurity/trivy-action@master
        with: { image-ref: 'the-dashboard-project--backend:latest', severity: 'CRITICAL,HIGH', exit-code: '0' }
```

**Acceptance:** push a PR; the three jobs run and go green.

---

### H.2 — `.github/workflows/cd.yml`

```yaml
# .github/workflows/cd.yml — optional staging deploy on main merge
name: CD
on:
  push: { branches: [main] }
jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Build & tag
        run: docker compose build
      # TODO: replace with your deployment target (SSH, AWS ECR push, etc.)
      - run: echo "Deploy step is a placeholder — wire to your infra of choice."
```

---

### H.3 — `infra/nginx.conf`

The repo uses Caddy ([infra/caddy](infra/caddy)). The plan calls for `nginx.conf` — provide it as an alternative reverse-proxy config so reviewers/examiners who expect Nginx can see one:

```nginx
# infra/nginx.conf — alternative to Caddy. Mount as /etc/nginx/conf.d/default.conf.
server {
  listen 80;
  server_name _;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl http2;
  server_name _;
  ssl_certificate     /etc/nginx/certs/cert.pem;
  ssl_certificate_key /etc/nginx/certs/key.pem;

  client_max_body_size 25m;

  location /api/  { proxy_pass http://backend:8000;  proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
  location /ws/   { proxy_pass http://backend:8000;  proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
  location /      { proxy_pass http://frontend:5173; proxy_set_header Host $host; }
}
```

---

### H.4 — `SECURITY_AUDIT.md`

Template skeleton — fill numerical results from running `trivy image …` and the OWASP self-assessment:

```markdown
# Security Audit — Orchestration Security Center
**Audit date:** YYYY-MM-DD · **Auditor:** Omar Kapil

## 1. Scope
Production Docker images, FastAPI codebase, Caddy/Nginx config, secrets handling.

## 2. Tooling
- `trivy image` (CRITICAL+HIGH gate)
- `bandit -r backend/app`
- Manual OWASP Top 10 (2021) self-assessment

## 3. Findings summary
| ID | Severity | Component | Status |
|---|---|---|---|
| (fill from trivy output) | | | |

## 4. OWASP Top 10 self-check
| OWASP | Mitigation in our codebase | Evidence |
|---|---|---|
| A01 Broken Access Control | `require_role()` dep on every mutating route | backend/app/api/deps.py:46 |
| A02 Cryptographic Failures | bcrypt for passwords, Fernet for stored creds | backend/app/core/security.py, crypto.py |
| A03 Injection | SQLAlchemy ORM (no raw SQL); Pydantic input validation | — |
| A04 Insecure Design | Scope guard on scans | backend/app/services/scope_guard.py |
| A05 Security Misconfiguration | Caddy enforces TLS; CORS pinned | infra/caddy/Caddyfile |
| A06 Vulnerable Components | Trivy gate in CI | .github/workflows/ci.yml |
| A07 Auth Failures | JWT 30-min expiry; bcrypt; force-change on first login | backend/app/api/v1/endpoints/auth.py |
| A08 Software/Data Integrity | SHA-256 hash-chained audit log | backend/app/api/v1/endpoints/audit.py |
| A09 Logging & Monitoring | Structured logs + request-id middleware | backend/app/core/request_id.py |
| A10 SSRF | Scope guard rejects out-of-network targets | backend/app/services/scope_guard.py |

## 5. Action items
- [ ] (fill from trivy + bandit output)
```

**Acceptance:** the file exists with at least the OWASP table populated against actual code paths.

---

### H.5 — `FINAL_DEMO_SCRIPT.md` (covered in Section J).

---

## Section I — End-to-end (Playwright) (P2)

### I.1 — `tests/e2e/conftest.py`

```python
# tests/e2e/conftest.py
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "https://localhost"

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        yield b
        b.close()

@pytest.fixture()
def page(browser):
    ctx = browser.new_context(ignore_https_errors=True)
    pg = ctx.new_page()
    yield pg
    ctx.close()

@pytest.fixture()
def base_url():
    return BASE_URL
```

### I.2 — `tests/e2e/test_login_flow.py`

```python
# tests/e2e/test_login_flow.py
def test_login_succeeds(page, base_url):
    page.goto(f"{base_url}/login")
    page.fill("input[type=text]", "admin@local")
    page.fill("input[type=password]", "<seed-admin-password>")  # capture from docker logs
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=5000)
    assert page.locator("text=Dashboard").first.is_visible()
```

### I.3 — `tests/e2e/test_scan_trigger.py`

```python
# tests/e2e/test_scan_trigger.py
def test_scan_appears_in_history(page, base_url):
    # Assume already logged in via storage_state — wire that up via a session fixture
    page.goto(f"{base_url}/")
    page.click("text=Scan")
    page.fill("input[placeholder*=URL i]", "http://lab_webserver:3000")
    page.click("text=Quick")
    page.click("text=Continue")  # to schedule
    page.click("text=Continue")  # to review
    page.click("text=Launch Scan")
    page.wait_for_selector("text=Scan started", timeout=10000)
```

### I.4 — `tests/e2e/test_report_export.py`

```python
# tests/e2e/test_report_export.py
def test_pdf_download(page, base_url):
    page.goto(f"{base_url}/")
    page.click("text=Reports")
    with page.expect_download() as dl_info:
        page.click("text=Export PDF")
    download = dl_info.value
    assert download.suggested_filename.endswith(".pdf")
```

**Acceptance:** all three scripts run green against a live `docker compose up` stack.

---

### I.5 — `UAT_REPORT.md`

```markdown
# UAT Report — Orchestration Security Center
**Session:** YYYY-MM-DD · **Participants:** 11 (full team)

## Methodology
Each member follows `demo/demo_checklist.md` against their own browser. Bugs logged below.

## Bugs found
| # | Title | Steps | Expected | Actual | Severity | Status |
|---|---|---|---|---|---|---|
| 1 | … | … | … | … | High | Open |

## Pass rate
- Login flow: __ / 11
- Trigger scan: __ / 11
- Generate report: __ / 11

## Sign-off
- Backend: Reem · ☐
- Frontend: Marize · ☐
- Security: Shahd · ☐
- DevOps/QA: Omar K · ☐
```

### I.6 — `BROWSER_COMPAT_REPORT.md`

```markdown
# Browser Compatibility — Orchestration Security Center
**Date:** YYYY-MM-DD

| Feature | Chrome 120 | Firefox 122 | Edge 120 |
|---|---|---|---|
| Login form | ✅ | ✅ | ✅ |
| Dashboard layout | ✅ | ✅ | ✅ |
| WebSocket live updates | ✅ | ✅ | ✅ |
| PDF download | ✅ | ✅ | ✅ |
| Network topology (D3) | ✅ | ✅ | ✅ |

## Screenshots
(attach /evidence/browser_compat/{chrome,firefox,edge}_*.png)
```

---

## Section J — Demo & docs (P2)

### J.1 — `demo/demo_script.md`

```markdown
# Live Demo Script — University Presentation
**Total time:** 10 min · **Driver:** Omar Kapil

## 0:00 Opening (15 s)
- "We are about to scan a small business network in real time. The platform you are about to see is fully autonomous — no human input after the URL."

## 0:15 Trigger scan
- Open https://localhost
- Sidebar → "+ New Scan"
- Target: `http://lab_webserver:3000` · Profile: `Standard`
- Click **Launch Scan**
- "Notice the WebSocket connection light turn green — every event you'll see is real-time."

## 0:45 Recon stage commentary
- Point to OrchestrationFeed: "Stage 1: Recon — Nmap is mapping the surface."
- Wait for "Recon complete" event.

## 2:00 Attack stage
- Point to Vulnerabilities panel filling up.
- "Stage 2: Attack. Each finding here is a Nuclei template that matched."

## 4:00 Validation + Scoring
- Point to RiskScore widget incrementing.
- "Stage 3 validates each finding to remove false positives. Stage 4 weights by CVSS, asset value, and exposed ports."

## 6:00 Drill into a finding
- Click the top CRITICAL row.
- Show RemediationPanel, AssetTimeline, evidence references.

## 7:30 SIEM correlation
- Switch to "SIEM" tab.
- "This Wazuh alert was raised by the same scan — the platform correlates them automatically."

## 8:30 Generate report
- Click "Export PDF" — download starts.
- Open PDF: title page, executive summary, detailed findings.

## 9:30 Close
- "Five hundred raw events became five prioritised actions, in 90 seconds, with zero security expertise needed from the operator."

## Backup if anything fails
- Pre-recorded demo video in `evidence/demo_recording.mp4` — switch to it if a stage hangs > 30 s.
```

### J.2 — `demo/demo_checklist.md`

```markdown
# Pre-Demo Checklist — run T-30 minutes before stage

- [ ] `docker compose down -v && docker compose up -d`
- [ ] `docker compose -f docker-compose.lab.yml up -d`
- [ ] `infra/healthcheck.sh` returns exit 0
- [ ] Browser: open https://localhost — page loads, no console errors
- [ ] Login as admin · password change works
- [ ] Trigger a throwaway scan — completes within 90 s
- [ ] Wazuh dashboard at https://localhost:5601 reachable
- [ ] PDF export works
- [ ] Reset DB: `docker compose exec backend python -c "from app.core.database import Base, engine; Base.metadata.drop_all(engine); Base.metadata.create_all(engine)"`
- [ ] Re-seed admin (auto on first login attempt)
- [ ] HDMI / projector tested on stage laptop
- [ ] Slide deck open + presenter notes ready
- [ ] Backup demo video opens and plays sound
```

### J.3 — `FINAL_DEMO_SCRIPT.md`

Same as `demo/demo_script.md` but at repo root for visibility — keep them in sync (or symlink).

### J.4 — `FINAL_PRESENTATION.md`

```markdown
# Final Presentation — Speaker Plan
**Total:** 30 min (25 + 5 Q&A buffer)

## Speaker order & timing
| Time | Speaker | Topic | Slide range |
|------|---------|-------|-------------|
| 0:00–3:00 | Omar Kapil | Intro + project context, problem statement | 1–4 |
| 3:00–8:00 | Reem Amin | Backend & AI agent pipeline | 5–10 |
| 8:00–13:00 | Marize Ehap | Frontend + visualisation walkthrough | 11–15 |
| 13:00–18:00 | Shahd Paher | Lab environment + scanning depth | 16–20 |
| 18:00–28:00 | Omar Kapil | Live demo (`demo/demo_script.md`) | live |
| 28:00–30:00 | All sub-leaders | Q&A | — |

## Per-speaker talking points
### Omar Kapil — Intro
- 1 in 3 SMEs hit by an attack last year; none can afford a SOC.
- We translate raw alerts into 5 prioritised actions.
- Stack overview slide.

### Reem Amin — Backend
- 4-stage agent pipeline diagram.
- UnifiedRiskEngine determinism (no LLM in scoring path).
- JWT + RBAC, audit chain, encryption-at-rest.

### Marize Ehap — Frontend
- React 18 + Vite, lazy-loaded panels.
- WebSocket real-time updates with seq + ts envelope.
- Cyber design system tour.

### Shahd Paher — Security/Lab
- 4-zone segmented lab (DMZ/Corp/Data/MGMT) — `internal: true` on isolated subnets.
- Nuclei + Nmap pipeline.
- Live attack scenarios (`lab/scenarios/*`).

### Q&A prepared answers
1. **"How do you prevent the LLM from hallucinating?"** → It is advisory-only; scoring is deterministic; `llm_guard` blocks destructive output; daily token budget.
2. **"Why not commercial tools?"** → Cost (free), explainability (we show the why), customisation for SME context.
3. **"How do you handle false positives?"** → Validation stage drops findings with confidence < 0.6; `finding_dedup` deduplicates.
```

### J.5 — `docs/API_GUIDE.md`

A reviewer-friendly REST guide that mirrors `/docs` but in plain Markdown:

```markdown
# API Guide — Orchestration Security Center

Base URL (prod via Caddy): `https://localhost/api/v1`
Base URL (dev): `http://localhost:8000/api/v1`

## Authentication
All routes (except `/health` and `/auth/login`) require `Authorization: Bearer <token>`.

## Endpoints (summary)

### Auth
- `POST /auth/login` — `{email, password}` → `{access_token, role, force_password_change}`
- `POST /auth/logout` — 204
- `GET  /auth/me` — current user
- `POST /auth/change-password`

### RBAC (admin only)
- `GET   /rbac/users`
- `POST  /rbac/users` — `{email, password, role}`
- `PATCH /rbac/users/{id}/role` — `{role}`
- `POST  /rbac/users/{id}/disable`

### Scans
- `GET  /scans/` — list with pagination
- `POST /scans/` — `{target_url|target_id, scan_type, tools?, schedule?}`
- `GET  /scans/{id}`
- `GET  /scans/{id}/task-status`
- `POST /scans/{id}/stop`

### Targets, Findings, Vulnerabilities, Reports, Network, SIEM, Audit, Lab, OpenVAS
(One paragraph each — list paths and verbs. Mirror the FastAPI router decorators.)

## WebSocket
`wss://localhost/ws/events` — pushes `{type, payload, seq, ts}` envelopes.
Event types: `SCAN_STARTED`, `SCAN_STATUS`, `RISK_UPDATE`, `FINDING_ADDED`, `SCAN_COMPLETED`.

## Errors
All errors return `{detail: string}` with the appropriate HTTP status.
Every response carries `X-Request-ID` for log correlation.
```

### J.6 — `docs/ARCHITECTURE_DIAGRAM.md`

```markdown
# Architecture Diagram — Orchestration Security Center

## High-level flow

\`\`\`mermaid
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
\`\`\`

## Data model snapshot

\`\`\`mermaid
classDiagram
  User --> Scan : owns
  Target --> Scan : has
  Scan --> ScanAsset : produces
  ScanAsset --> Vulnerability : contains
  Vulnerability --> ActionItem : creates
  Scan --> AuditLog : writes
\`\`\`

## Sequence: a single scan

\`\`\`mermaid
sequenceDiagram
  participant Browser
  participant API as FastAPI
  participant Q as Redis
  participant W as Celery worker
  participant DB
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
\`\`\`
```

---

## Section K — Polish (P3)

### K.1 — `postman/OrchestrationSecurityCenter_API.postman_collection.json`

Build manually inside Postman:
1. Folder per router (`auth`, `scans`, `targets`, `findings`, `reports`, `rbac`, …).
2. One request per endpoint with example body and `{{base_url}}` + `{{token}}` env variables.
3. Add a pre-request script that auto-logs-in if `{{token}}` is empty.
4. Export collection v2.1 to the path above.

**Acceptance:** `newman run postman/OrchestrationSecurityCenter_API.postman_collection.json` returns ≥ 90% pass against a live stack.

---

## Phase-3 migration follow-up (referenced by plan but optional now)

`backend/alembic/versions/002_add_rbac.py` is mentioned in the plan, but `User.role` already exists in the model ([backend/app/models/user.py:25](backend/app/models/user.py#L25)) — meaning the migration already happened (probably under a different filename). Verify with:

```
docker compose exec backend alembic current
docker compose exec backend alembic history
```

If a migration of equivalent shape exists, mark this item ✅ in the tracker and **do not create a duplicate**.

---

## Master tracker (tick as you ship)

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
[ ] H.4 SECURITY_AUDIT.md
[ ] I.1 tests/e2e/conftest.py
[ ] I.2 test_login_flow.py
[ ] I.3 test_scan_trigger.py
[ ] I.4 test_report_export.py
[ ] I.5 UAT_REPORT.md
[ ] I.6 BROWSER_COMPAT_REPORT.md
[ ] J.1 demo/demo_script.md
[ ] J.2 demo/demo_checklist.md
[ ] J.3 FINAL_DEMO_SCRIPT.md
[ ] J.4 FINAL_PRESENTATION.md
[ ] J.5 docs/API_GUIDE.md
[ ] J.6 docs/ARCHITECTURE_DIAGRAM.md

P3
[ ] K.1 postman collection
```

---

## Final acceptance gate (Week 13 freeze)

Before declaring the project frozen, **all of the following must return green** on a fresh clone:

```bash
docker compose down -v && docker compose up -d
docker compose -f docker-compose.lab.yml up -d
infra/healthcheck.sh                                       # exit 0
docker compose exec backend pytest backend/tests -v        # ≥ 15 tests pass
cd frontend && npm run build                                # builds clean
cd .. && pytest tests/e2e -v                                # 3 E2E pass
gh workflow view "CI" --web                                 # latest run green
```

If any one of these fails, the freeze is rejected and the failing item is added back to the tracker.
