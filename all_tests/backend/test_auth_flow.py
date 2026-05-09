"""End-to-end tests for the auth lifecycle: login → me → change password → re-login."""
import allure


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Login")
@allure.title("Admin login returns access token with correct role")
@allure.severity(allure.severity_level.BLOCKER)
def test_login_success(client, admin_user):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test", "password": "TestPass123!"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    assert body["role"] == "ADMIN"
    assert body["token_type"] == "bearer"


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Login")
@allure.title("Login with wrong password returns 401")
@allure.severity(allure.severity_level.CRITICAL)
def test_login_wrong_password(client, admin_user):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test", "password": "wrong-password"},
    )
    assert r.status_code == 401


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Login")
@allure.title("Login with unknown email returns 401")
@allure.severity(allure.severity_level.CRITICAL)
def test_login_unknown_email(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test", "password": "anything"},
    )
    assert r.status_code == 401


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Logout")
@allure.title("Logout returns 204 No Content")
@allure.severity(allure.severity_level.NORMAL)
def test_logout_returns_204(client, admin_headers):
    r = client.post("/api/v1/auth/logout", headers=admin_headers)
    assert r.status_code == 204


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Password Change")
@allure.title("After password change, login succeeds with new password")
@allure.severity(allure.severity_level.CRITICAL)
def test_change_password_then_login_with_new(client, admin_user, admin_headers):
    r = client.post(
        "/api/v1/auth/change-password",
        headers=admin_headers,
        json={"current_password": "TestPass123!", "new_password": "NewPass456!"},
    )
    assert r.status_code == 204

    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test", "password": "NewPass456!"},
    )
    assert r.status_code == 200


@allure.epic("Security")
@allure.feature("Auth Lifecycle")
@allure.story("Password Change")
@allure.title("Wrong current password is rejected during password change")
@allure.severity(allure.severity_level.CRITICAL)
def test_change_password_rejects_wrong_current(client, admin_user, admin_headers):
    r = client.post(
        "/api/v1/auth/change-password",
        headers=admin_headers,
        json={"current_password": "totally-wrong", "new_password": "AnyNew123!"},
    )
    assert r.status_code in (400, 401)
