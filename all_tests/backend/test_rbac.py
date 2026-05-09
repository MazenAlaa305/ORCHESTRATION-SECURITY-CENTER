"""
Tests for the /rbac/* admin endpoints and role enforcement on key routes.
"""
import allure


# ── /rbac/users — admin-only endpoint ─────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Admin can list all users")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_list_users(client, admin_headers, viewer_user):
    r = client.get("/api/v1/rbac/users", headers=admin_headers)
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()}
    assert "admin@test" in emails
    assert "viewer@test" in emails


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Viewer cannot list users (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_viewer_cannot_list_users(client, viewer_headers):
    r = client.get("/api/v1/rbac/users", headers=viewer_headers)
    assert r.status_code == 403


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Analyst cannot list users (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_analyst_cannot_list_users(client, analyst_headers):
    r = client.get("/api/v1/rbac/users", headers=analyst_headers)
    assert r.status_code == 403


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Admin can create a new user")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_create_user(client, admin_headers):
    r = client.post(
        "/api/v1/rbac/users",
        headers=admin_headers,
        json={"email": "newby@test", "password": "NewPass123!", "role": "VIEWER"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "newby@test"
    assert body["role"] == "VIEWER"


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Duplicate email is rejected with 409")
@allure.severity(allure.severity_level.NORMAL)
def test_create_user_rejects_duplicate_email(client, admin_headers, admin_user):
    r = client.post(
        "/api/v1/rbac/users",
        headers=admin_headers,
        json={"email": "admin@test", "password": "Whatever1!", "role": "VIEWER"},
    )
    assert r.status_code == 409


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("Role Management")
@allure.title("Admin cannot demote themselves")
@allure.severity(allure.severity_level.CRITICAL)
def test_admin_cannot_demote_self(client, admin_headers, admin_user):
    r = client.patch(
        f"/api/v1/rbac/users/{admin_user.id}/role",
        headers=admin_headers,
        json={"role": "VIEWER"},
    )
    assert r.status_code == 400


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("Role Management")
@allure.title("Admin can change another user's role")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_change_other_user_role(client, admin_headers, viewer_user):
    r = client.patch(
        f"/api/v1/rbac/users/{viewer_user.id}/role",
        headers=admin_headers,
        json={"role": "ANALYST"},
    )
    assert r.status_code == 200
    assert r.json()["role"] == "ANALYST"


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Admin can disable another user account")
@allure.severity(allure.severity_level.NORMAL)
def test_admin_can_disable_user(client, admin_headers, viewer_user):
    r = client.post(
        f"/api/v1/rbac/users/{viewer_user.id}/disable",
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["disabled"] is True


@allure.epic("Security")
@allure.feature("Role-Based Access Control")
@allure.story("User Management")
@allure.title("Viewer cannot create a new user (403)")
@allure.severity(allure.severity_level.BLOCKER)
def test_viewer_cannot_create_user(client, viewer_headers):
    r = client.post(
        "/api/v1/rbac/users",
        headers=viewer_headers,
        json={"email": "x@y", "password": "x", "role": "VIEWER"},
    )
    assert r.status_code == 403
