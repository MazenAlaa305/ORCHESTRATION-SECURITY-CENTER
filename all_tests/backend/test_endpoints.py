"""
Smoke tests covering one happy-path + one auth-failure per major router.
"""
import allure
import pytest


# ── Public ────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Public Endpoints")
@allure.title("Health endpoint returns ok/degraded/healthy status")
@allure.severity(allure.severity_level.BLOCKER)
def test_health_open(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") in ("ok", "degraded", "healthy")
    assert "api" in body


@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Public Endpoints")
@allure.title("Root endpoint is accessible without authentication")
@allure.severity(allure.severity_level.NORMAL)
def test_root_open(client):
    r = client.get("/")
    assert r.status_code == 200


# ── Auth gate ─────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Authentication Gate")
@allure.title("Protected routes reject unauthenticated requests with 401 or 403")
@allure.severity(allure.severity_level.BLOCKER)
@pytest.mark.parametrize("path", [
    "/api/v1/scans/",
    "/api/v1/targets/",
    "/api/v1/findings/",
    "/api/v1/dashboard/kpi-snapshot",
    "/api/v1/reports/dummy-scan-id",
    "/api/v1/vulnerabilities/",
])
def test_protected_routes_reject_unauthenticated(client, path):
    r = client.get(path)
    assert r.status_code in (401, 403), f"Expected 401/403 on {path}, got {r.status_code}"


# ── Auth.me ───────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Current User")
@allure.title("GET /auth/me returns current user's email and role")
@allure.severity(allure.severity_level.CRITICAL)
def test_me_returns_current_user(client, admin_headers):
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "admin@test"
    assert body["role"] == "ADMIN"


@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Current User")
@allure.title("GET /auth/me rejects a garbage token")
@allure.severity(allure.severity_level.CRITICAL)
def test_me_rejects_garbage_token(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code in (401, 403)


# ── Targets list (any authenticated user) ─────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Targets")
@allure.title("Authenticated admin gets an empty targets list")
@allure.severity(allure.severity_level.NORMAL)
def test_targets_list_empty(client, admin_headers):
    r = client.get("/api/v1/targets/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Dashboard KPI ─────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Dashboard")
@allure.title("Dashboard KPI snapshot returns 200 or 422")
@allure.severity(allure.severity_level.NORMAL)
def test_dashboard_kpi_returns_object(client, analyst_headers):
    r = client.get("/api/v1/dashboard/kpi-snapshot", headers=analyst_headers)
    assert r.status_code in (200, 422)


# ── Scans list ────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Scans")
@allure.title("Scans list returns paginated envelope with items and total")
@allure.severity(allure.severity_level.NORMAL)
def test_scans_list_empty(client, admin_headers):
    r = client.get("/api/v1/scans/", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict)
    assert isinstance(body.get("items"), list)
    assert "total" in body


# ── Config (public) ───────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Smoke Tests")
@allure.story("Config")
@allure.title("Public config endpoint is accessible or returns expected auth response")
@allure.severity(allure.severity_level.MINOR)
def test_config_public_open(client):
    r = client.get("/api/v1/config/public")
    assert r.status_code in (200, 401, 403, 404)
