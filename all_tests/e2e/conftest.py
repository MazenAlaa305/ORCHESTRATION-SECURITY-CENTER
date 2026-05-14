"""End-to-end test fixtures (Playwright + pytest).

Run prerequisites:
    pip install pytest playwright
    playwright install chromium
    docker compose up -d         # main stack must be healthy on https://localhost
"""
import os
import pytest

try:
    from playwright.sync_api import sync_playwright as _sync_playwright
    _PLAYWRIGHT_OK = True
except ImportError:
    _PLAYWRIGHT_OK = False

BASE_URL = os.environ.get("E2E_BASE_URL", "https://localhost")

_SKIP_REASON = "playwright not installed -- run: pip install playwright && playwright install chromium"


@pytest.fixture(scope="session")
def browser():
    if not _PLAYWRIGHT_OK:
        pytest.skip(_SKIP_REASON)
    with _sync_playwright() as p:
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
