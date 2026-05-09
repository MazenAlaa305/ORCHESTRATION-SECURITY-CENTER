"""Smoke: a logged-in user can trigger a scan and see it appear in history."""
import os


def _login(page, base_url):
    email = os.environ.get("E2E_ADMIN_EMAIL", "admin@local")
    password = os.environ.get("E2E_ADMIN_PASSWORD", "ChangeMe123!")
    page.goto(f"{base_url}/login")
    page.fill("input[type=email], input[type=text]", email)
    page.fill("input[type=password]", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10_000)


def test_scan_appears_in_history(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/")

    page.click("text=Scan")
    page.fill("input[placeholder*=URL i]", "http://lab_webserver:3000")
    page.click("text=Quick")
    page.click("text=Continue")  # schedule step
    page.click("text=Continue")  # review step
    page.click("text=Launch Scan")

    page.wait_for_selector("text=Scan started", timeout=10_000)
