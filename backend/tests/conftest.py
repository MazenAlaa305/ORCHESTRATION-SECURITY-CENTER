"""
Shared pytest fixtures.

The fixtures below give every test:
  • An in-memory SQLite database (single-pool, isolated per session)
  • A FastAPI TestClient with `get_db` overridden to that DB
  • Pre-seeded admin / analyst / viewer users
  • Authorization headers helpers
  • An auto-applied Gemini stub so no test ever hits the real LLM

The test runner is the backend container — run via:
    docker compose exec backend pytest backend/tests -v
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

# ── Compatibility shim: aioredis crashes on Python 3.13 ──────────────────────
# aioredis < 3.x defines `class TimeoutError(asyncio.TimeoutError, builtins.TimeoutError)`
# which is a duplicate base class error in Python 3.11+. Mock the whole module
# before any app code imports it so the test process never loads the real package.
if sys.version_info >= (3, 11):
    _aioredis_mock = MagicMock()
    _aioredis_mock.from_url = MagicMock(return_value=MagicMock())
    _aioredis_mock.Redis = MagicMock()
    sys.modules.setdefault("aioredis", _aioredis_mock)

# ── Stub optional heavy packages that may not be installed locally ────────────
# google-genai: only needed at runtime by intelligence_agent; never needed in tests.
try:
    from google import genai  # noqa: F401
except (ImportError, AttributeError):
    _genai_mock = MagicMock()
    _google_mock = sys.modules.get("google", MagicMock())
    _google_mock.genai = _genai_mock
    sys.modules["google"] = _google_mock
    sys.modules["google.genai"] = _genai_mock
    sys.modules["google.genai.types"] = MagicMock()
    sys.modules["google.generativeai"] = MagicMock()

# ── Test-only environment (must be set BEFORE any app import) ────────────────
os.environ["SKIP_SECRET_VALIDATION"] = "1"
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-do-not-use-in-prod")
os.environ.setdefault("CREDENTIAL_ENCRYPTION_KEY", "fNEmlUybd-2H4cKUUgLCnZx7iWP1a4_T2GJPg7cN0k0=")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("LAB_ENABLED", "false")

# Make sure `import app...` resolves whether pytest runs from repo root or
# from inside the backend/ directory.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password, create_access_token  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.main import app  # noqa: E402


# ── Single shared in-memory engine ───────────────────────────────────────────
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def db_session():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    """TestClient with get_db overridden. Lifespan is skipped (no Redis listener)."""
    app.dependency_overrides[get_db] = _override_get_db
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


# ── User fixtures ────────────────────────────────────────────────────────────

def _seed_user(db, email: str, role: UserRole) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(
        email=email,
        password_hash=hash_password("TestPass123!"),
        role=role,
    )
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


def _headers(user: User) -> dict:
    token = create_access_token(subject=user.email, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(admin_user):
    return _headers(admin_user)


@pytest.fixture()
def analyst_headers(analyst_user):
    return _headers(analyst_user)


@pytest.fixture()
def viewer_headers(viewer_user):
    return _headers(viewer_user)


# ── Auto-mock Gemini so no test ever calls the real API ──────────────────────

@pytest.fixture(autouse=True)
def _mock_gemini(monkeypatch):
    class _StubResponse:
        text = '{"summary":"mock","steps":["mock"]}'

    class _StubModel:
        def generate_content(self, *args, **kwargs):
            return _StubResponse()

    try:
        import google.generativeai as genai
        monkeypatch.setattr(genai, "GenerativeModel", lambda *a, **kw: _StubModel())
        monkeypatch.setattr(genai, "configure", lambda **kw: None)
    except Exception:
        pass
