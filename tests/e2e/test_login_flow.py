"""Smoke: a valid admin can sign in and reach the dashboard."""
import os


def test_login_succeeds(page, base_url):
    admin_email = os.environ.get("E2E_ADMIN_EMAIL", "admin@local")
    admin_password = os.environ.get("E2E_ADMIN_PASSWORD", "ChangeMe123!")

    page.goto(f"{base_url}/login")
    page.fill("input[type=email], input[type=text]", admin_email)
    page.fill("input[type=password]", admin_password)
    page.click("button[type=submit]")

    page.wait_for_url(lambda u: "/login" not in u, timeout=10_000)
    assert page.locator("text=Dashboard").first.is_visible()


def test_login_fails_with_bad_password(page, base_url):
    page.goto(f"{base_url}/login")
    page.fill("input[type=email], input[type=text]", "admin@local")
    page.fill("input[type=password]", "definitely-not-the-password")
    page.click("button[type=submit]")

    error = page.locator("text=/invalid|incorrect|failed/i").first
    error.wait_for(timeout=5_000)
    assert "/login" in page.url
