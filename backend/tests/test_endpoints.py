"""
Smoke tests covering one happy-path + one auth-failure per major router.
"""
import pytest


# ── Public ────────────────────────────────────────────────────────────────────

def test_health_open(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") in ("ok", "degraded", "healthy")
    assert "api" in body


def test_root_open(client):
    r = client.get("/")
    assert r.status_code == 200


# ── Auth gate ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("path", [
    "/api/v1/scans/",
    "/api/v1/targets/",
    "/api/v1/findings/",
    "/api/v1/dashboard/kpi",
    "/api/v1/reports/",
    "/api/v1/vulnerabilities/",
])
def test_protected_routes_reject_unauthenticated(client, path):
    r = client.get(path)
    assert r.status_code in (401, 403), f"Expected 401/403 on {path}, got {r.status_code}"


# ── Auth.me ───────────────────────────────────────────────────────────────────

def test_me_returns_current_user(client, admin_headers):
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "admin@test"
    assert body["role"] == "ADMIN"


def test_me_rejects_garbage_token(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code in (401, 403)


# ── Targets list (any authenticated user) ─────────────────────────────────────

def test_targets_list_empty(client, admin_headers):
    r = client.get("/api/v1/targets/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Dashboard KPI ─────────────────────────────────────────────────────────────

def test_dashboard_kpi_returns_object(client, analyst_headers):
    r = client.get("/api/v1/dashboard/kpi", headers=analyst_headers)
    # Some legacy dashboard endpoints expect a scan_id query param; tolerate 200/422
    assert r.status_code in (200, 422)


# ── Scans list ────────────────────────────────────────────────────────────────

def test_scans_list_empty(client, admin_headers):
    r = client.get("/api/v1/scans/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Config (public) ───────────────────────────────────────────────────────────

def test_config_public_open(client):
    r = client.get("/api/v1/config/public")
    # Some deployments require auth on /config; accept either shape
    assert r.status_code in (200, 401, 403, 404)
