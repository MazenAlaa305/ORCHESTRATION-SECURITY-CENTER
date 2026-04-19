# Yosef Ali — QA Engineer (API & Integration Testing)
# يوسف علي — مهندس ضمان الجودة (اختبارات API والتكامل)

> **Sub-Team:** 4 — DevOps & QA | **الفريق الفرعي:** 4 — العمليات وضمان الجودة
> **Stack:** Pytest, FastAPI TestClient, httpx AsyncClient, SQLite (test DB), Postman/Newman

---

## Role Summary | ملخص الدور

**English:** Yosef owns ALL backend automated tests — unit tests, integration tests, and API endpoint tests. His job is to write a test suite of ≥ 15 passing tests that prove the backend works correctly before it's released. He also creates the Postman collection for manual API testing and participates in UAT (User Acceptance Testing) to hunt for bugs.

**عربي:** يوسف يمتلك جميع الاختبارات الآلية للـ backend — اختبارات الوحدة، واختبارات التكامل، واختبارات نقاط نهاية API. مهمته كتابة مجموعة اختبارات ≥ 15 اختبارًا ناجحًا يُثبتون أن الـ backend يعمل بشكل صحيح قبل إصداره. كما ينشئ مجموعة Postman للاختبار اليدوي ويشارك في UAT للبحث عن الأخطاء.

---

## Files He Owns | الملفات التي يمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/tests/test_e2e_scans.py` | End-to-end scan flow tests | اختبارات تدفق المسح الشامل |
| `backend/tests/test_risk.py` | Risk engine output validation | التحقق من مخرجات محرك المخاطر |
| `backend/tests/test_risk_engine_manual.py` | Manual risk score calculation tests | اختبارات حساب درجة الخطر اليدوية |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `backend/tests/conftest.py` | Shared fixtures: test DB, test client, mock user | تركيبات مشتركة: قاعدة بيانات اختبار، عميل اختبار |
| `backend/tests/test_endpoints.py` | All REST endpoint tests (happy + error paths) | جميع اختبارات نقاط النهاية |
| `backend/tests/test_auth_flow.py` | Login, token, protected route tests | اختبارات تسجيل الدخول والرمز والمسارات المحمية |
| `backend/tests/test_websocket.py` | WebSocket connection + message format tests | اختبارات WebSocket |
| `postman/Found404_API.postman_collection.json` | Full Postman collection | مجموعة Postman الكاملة |

---

## Key Code Explained | شرح الكود الرئيسي

### `conftest.py` — The Foundation of All Tests

**English:** `conftest.py` is a special pytest file — fixtures defined here are automatically available to ALL test files in the same folder. Yosef must build this first, because all other tests depend on it.

**عربي:** `conftest.py` ملف pytest خاص — التركيبات المحددة هنا متاحة تلقائيًا لجميع ملفات الاختبار في نفس المجلد. يجب على يوسف بناء هذا أولًا، لأن جميع الاختبارات الأخرى تعتمد عليه.

```python
# backend/tests/conftest.py — What Yosef must create

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.models.scan import Base

# ── Test Database ─────────────────────────────────────────────────────────
# Use SQLite in-memory — fast, no side effects, cleaned up after every test
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def test_engine():
    """Creates a SQLite test database once for the entire test session."""
    engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)  # Create all tables
    yield engine
    Base.metadata.drop_all(engine)   # Cleanup after all tests done

@pytest.fixture
def db_session(test_engine):
    """Creates a fresh DB session for each test — rolled back after the test."""
    TestingSessionLocal = sessionmaker(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()  # Undo any DB changes made in the test
    session.close()

@pytest.fixture
def client(db_session):
    """
    Creates a FastAPI TestClient with the real app,
    but with the DB swapped to the test SQLite DB.
    """
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client):
    """Returns a valid JWT token for an admin user — used in auth-required tests."""
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@local",
        "password": "Admin@1234"
    })
    return response.json()["access_token"]

@pytest.fixture
def auth_headers(admin_token):
    """Returns the Authorization header dict for authenticated requests."""
    return {"Authorization": f"Bearer {admin_token}"}
```

**عربي للكود:**
```python
# ما يجب على يوسف إنشاؤه في conftest.py:

# test_engine: ينشئ قاعدة بيانات SQLite في الذاكرة مرة واحدة للجلسة
# db_session: ينشئ جلسة DB جديدة لكل اختبار — يُراجع بعد الاختبار
# client: ينشئ TestClient لـ FastAPI مع DB المبدّلة لـ SQLite للاختبار
# admin_token: يُرجع رمز JWT صالح لمستخدم admin
# auth_headers: يُرجع قاموس رأس Authorization للطلبات المصادق عليها
```

---

### `test_endpoints.py` — API Endpoint Tests

**English:** Each test function tests ONE thing — one endpoint, one scenario. Pytest runs them all automatically with `pytest backend/tests/`.

**عربي:** كل دالة اختبار تختبر شيئًا واحدًا — نقطة نهاية واحدة، سيناريو واحد. Pytest يشغّلها كلها تلقائيًا بـ `pytest backend/tests/`.

```python
# backend/tests/test_endpoints.py — Yosef writes these

class TestTargetEndpoints:
    
    def test_create_target_happy_path(self, client, auth_headers):
        """Test that a valid target can be created."""
        response = client.post("/api/v1/targets/", 
            json={"name": "Test Target", "base_url": "http://example.com"},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Target"
        assert "id" in data  # ID was assigned by DB
    
    def test_create_target_missing_name(self, client, auth_headers):
        """Test that missing name returns 422 Unprocessable Entity."""
        response = client.post("/api/v1/targets/",
            json={"base_url": "http://example.com"},  # no "name" field
            headers=auth_headers
        )
        assert response.status_code == 422  # FastAPI validation error
    
    def test_create_target_unauthenticated(self, client):
        """Test that unauthenticated requests return 401."""
        response = client.post("/api/v1/targets/",
            json={"name": "Test", "base_url": "http://example.com"}
            # No auth_headers!
        )
        assert response.status_code == 401

    def test_list_targets_returns_list(self, client, auth_headers):
        """Test that GET /targets/ returns a list (even if empty)."""
        response = client.get("/api/v1/targets/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestDashboardEndpoints:
    
    def test_kpi_snapshot_returns_correct_shape(self, client, auth_headers):
        """Test that KPI endpoint returns expected fields."""
        response = client.get("/api/v1/dashboard/kpi", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "health_score" in data
        assert 0 <= data["overall_score"] <= 100  # Score must be in valid range
        assert 0 <= data["health_score"] <= 100

    def test_health_endpoint_no_auth_needed(self, client):
        """Health endpoint must be public (no auth required)."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["api"] == True
```

---

### `test_auth_flow.py` — Authentication Tests

```python
class TestAuthFlow:
    
    def test_login_valid_credentials(self, client):
        """Login with correct credentials returns a token."""
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@local",
            "password": "Admin@1234"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        assert len(token) > 50  # JWT tokens are long strings
    
    def test_login_wrong_password(self, client):
        """Wrong password must return 401, not 500."""
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@local",
            "password": "WrongPassword!"
        })
        assert response.status_code == 401
    
    def test_protected_route_without_token(self, client):
        """Accessing a protected route without token returns 401."""
        response = client.get("/api/v1/targets/")
        assert response.status_code == 401
    
    def test_protected_route_with_expired_token(self, client):
        """Expired tokens must be rejected."""
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # fake expired token
        response = client.get("/api/v1/targets/",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
    
    def test_get_me_returns_current_user(self, client, auth_headers):
        """GET /auth/me returns the logged-in user's profile."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@local"
        assert data["role"] == "admin"
```

---

### How to Run Tests | كيفية تشغيل الاختبارات

```bash
# Run all tests
pytest backend/tests/ -v

# Run only auth tests
pytest backend/tests/test_auth_flow.py -v

# Run with coverage report
pytest backend/tests/ --cov=app --cov-report=html
# Opens htmlcov/index.html — shows which lines are covered

# Run in a Docker container (same as CI)
docker compose exec backend pytest /app/tests/ -v
```

**عربي:**
```bash
# تشغيل جميع الاختبارات
pytest backend/tests/ -v

# تشغيل اختبارات المصادقة فقط
pytest backend/tests/test_auth_flow.py -v

# تشغيل مع تقرير التغطية
pytest backend/tests/ --cov=app --cov-report=html
# يفتح htmlcov/index.html — يُظهر الأسطر المُغطّاة

# التشغيل داخل حاوية Docker (نفس CI)
docker compose exec backend pytest /app/tests/ -v
```

---

## What Yosef Must Learn | ما يجب على يوسف تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| `pytest` fixtures: `@pytest.fixture`, scope, yield | Foundation of all tests | أساس جميع الاختبارات |
| `@pytest.mark.parametrize` | Test one function with many inputs | اختبار دالة واحدة بمدخلات متعددة |
| FastAPI `TestClient` | Simulate HTTP requests without running a server | محاكاة طلبات HTTP بدون تشغيل خادم |
| `assert` statements — what to assert | Understand HTTP status codes + response shapes | فهم رموز HTTP وأشكال الاستجابة |
| `pytest-cov` — coverage reports | Show ≥ 70% coverage to the examiner | إظهار تغطية ≥ 70% للممتحن |
| Postman collection structure | Build the manual API testing collection | بناء مجموعة اختبار API اليدوي |

**Resources | الموارد:**
- Pytest docs: https://docs.pytest.org/en/stable/
- FastAPI testing guide: https://fastapi.tiangolo.com/tutorial/testing/
- Postman learning: https://learning.postman.com/docs/collections/creating-collections/

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Set up `conftest.py`; write first 5 endpoint tests | إعداد `conftest.py`؛ كتابة أول 5 اختبارات |
| 11 | Write auth flow tests; participate in UAT (hunt for bugs) | كتابة اختبارات تدفق المصادقة؛ UAT |
| 12 | Reach ≥ 15 passing tests; add WebSocket test; coverage report | الوصول لـ ≥ 15 اختبارًا ناجحًا |
| 13 | Final regression run; generate HTML coverage report | تشغيل انحدار نهائي؛ تقرير التغطية |
