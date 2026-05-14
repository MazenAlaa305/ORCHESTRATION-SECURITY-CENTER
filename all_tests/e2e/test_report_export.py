"""Smoke: a logged-in user can export a PDF report."""
import os


def _login(page, base_url):
    email = os.environ.get("E2E_ADMIN_EMAIL", "admin@local")
    password = os.environ.get("E2E_ADMIN_PASSWORD", "ChangeMe123!")
    page.goto(f"{base_url}/login")
    page.fill("input[type=email], input[type=text]", email)
    page.fill("input[type=password]", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10_000)


def test_pdf_download(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/")

    page.click("text=Reports")
    with page.expect_download() as dl_info:
        page.click("text=Export PDF")
    download = dl_info.value
    assert download.suggested_filename.endswith(".pdf")
