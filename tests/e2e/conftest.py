"""End-to-end test fixtures (Playwright + pytest).

Run prerequisites:
    pip install pytest playwright
    playwright install chromium
    docker compose up -d         # main stack must be healthy on https://localhost
"""
import os
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "https://localhost")


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
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
