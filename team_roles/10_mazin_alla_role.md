# Mazin Alla — QA Engineer (E2E & Frontend Testing)
# مازن علاء — مهندس ضمان الجودة (الاختبار الشامل والواجهة الأمامية)

> **Sub-Team:** 4 — DevOps & QA | **الفريق الفرعي:** 4 — العمليات وضمان الجودة
> **Stack:** Playwright (Python), Browser DevTools, Cross-browser testing, UAT coordination

---

## Role Summary | ملخص الدور

**English:** Mazin owns the "does it actually work in a real browser?" side of testing. He tests every user journey end-to-end (login → scan → see results → export PDF) using Playwright — a browser automation tool that controls Chrome, Firefox, and Edge programmatically. He also coordinates UAT (collecting bug reports from all 11 team members) and produces the browser compatibility report.

**عربي:** مازن يمتلك جانب "هل يعمل فعليًا في متصفح حقيقي؟" من الاختبار. يختبر كل رحلة مستخدم من البداية للنهاية (تسجيل دخول → مسح → رؤية النتائج → تصدير PDF) باستخدام Playwright — أداة أتمتة متصفح تتحكم في Chrome وFirefox وEdge برمجيًا. كما ينسّق UAT (جمع تقارير الأخطاء من جميع الـ 11 عضوًا) وينتج تقرير توافق المتصفح.

---

## Files He Owns | الملفات التي يمتلكها

All test files he creates from scratch:

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `tests/e2e/conftest.py` | Playwright browser fixture, base URL, auth helper | تركيب متصفح Playwright والمصادقة |
| `tests/e2e/test_login_flow.py` | Login → dashboard loads correctly | تسجيل الدخول → تحميل لوحة التحكم |
| `tests/e2e/test_scan_trigger.py` | Enter URL → scan → results appear | إدخال URL → مسح → ظهور النتائج |
| `tests/e2e/test_report_export.py` | Click export → PDF downloads | النقر على تصدير → تنزيل PDF |
| `UAT_REPORT.md` | Structured bug report from all UAT sessions | تقرير أخطاء منظّم من جميع جلسات UAT |
| `BROWSER_COMPAT_REPORT.md` | Screenshot evidence across Chrome/Firefox/Edge | دليل لقطات عبر المتصفحات |

---

## Key Code Explained | شرح الكود الرئيسي

### How Playwright Works

**English:** Playwright launches a real browser (not a simulation), navigates to pages, clicks buttons, fills forms, and checks what appears on screen. It's like having a robot that uses the app the same way a human would — but 100x faster and repeatable.

**عربي:** يُشغّل Playwright متصفحًا حقيقيًا (وليس محاكاة)، ويتنقل بين الصفحات، وينقر الأزرار، ويملأ النماذج، ويتحقق مما يظهر على الشاشة. إنه مثل وجود روبوت يستخدم التطبيق بنفس طريقة الإنسان — لكن أسرع 100 مرة وقابل للتكرار.

```python
# tests/e2e/conftest.py — Base setup Mazin creates first

import pytest
from playwright.sync_api import sync_playwright, Page, Browser

BASE_URL = "https://localhost"  # Dashboard URL

@pytest.fixture(scope="session")
def browser():
    """Start ONE browser for the entire test session."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,           # Run without opening a window (for CI)
            # headless=False,        # Uncomment to WATCH the browser during debug
            args=["--ignore-certificate-errors"]  # Accept self-signed cert
        )
        yield browser
        browser.close()

@pytest.fixture
def page(browser):
    """Open a fresh browser page (tab) for each test."""
    page = browser.new_page()
    yield page
    page.close()

@pytest.fixture
def logged_in_page(page):
    """Opens the login page, logs in, and returns the authenticated page."""
    page.goto(f"{BASE_URL}")
    # Fill in login form
    page.fill('[data-testid="email-input"]', "admin@local")
    page.fill('[data-testid="password-input"]', "Admin@1234")
    page.click('[data-testid="login-button"]')
    # Wait for dashboard to load
    page.wait_for_url(f"{BASE_URL}/dashboard")
    return page
```

**عربي للكود:**
```python
# ما يُنشئه مازن في conftest.py:

# browser: يُشغّل متصفحًا واحدًا لجلسة الاختبار بالكامل
#   headless=True: يعمل بدون فتح نافذة (للـ CI)
#   headless=False: قم بإلغاء التعليق لـ مشاهدة المتصفح أثناء التصحيح

# page: يفتح صفحة متصفح جديدة (تبويب) لكل اختبار

# logged_in_page: يفتح صفحة تسجيل الدخول، يسجل الدخول، يُرجع الصفحة المصادق عليها
```

---

### `test_login_flow.py` — Login End-to-End

```python
# tests/e2e/test_login_flow.py

class TestLoginFlow:
    
    def test_login_page_renders(self, page):
        """The login page must load with email/password fields visible."""
        page.goto(f"{BASE_URL}")
        # Check the title is visible
        assert page.is_visible("text=Found 404")
        # Check form fields exist
        assert page.is_visible('[data-testid="email-input"]')
        assert page.is_visible('[data-testid="password-input"]')
    
    def test_successful_login_redirects_to_dashboard(self, page):
        """Valid credentials should redirect to the dashboard."""
        page.goto(f"{BASE_URL}")
        page.fill('[data-testid="email-input"]', "admin@local")
        page.fill('[data-testid="password-input"]', "Admin@1234")
        page.click('[data-testid="login-button"]')
        
        # Wait max 5 seconds for redirect
        page.wait_for_url(f"{BASE_URL}/dashboard", timeout=5000)
        
        # Dashboard elements must be visible after login
        assert page.is_visible("text=Risk Score")
        assert page.is_visible("text=Network Topology")
    
    def test_wrong_password_shows_error(self, page):
        """Wrong password must show an error message — not crash."""
        page.goto(f"{BASE_URL}")
        page.fill('[data-testid="email-input"]', "admin@local")
        page.fill('[data-testid="password-input"]', "WrongPassword!")
        page.click('[data-testid="login-button"]')
        
        # Must stay on login page (no redirect)
        assert "/login" in page.url or "/" in page.url
        # Error message must appear
        assert page.is_visible("text=Incorrect email or password")
    
    def test_logout_clears_session(self, logged_in_page):
        """After logout, user must be redirected to login page."""
        page = logged_in_page
        page.click('[data-testid="logout-button"]')
        page.wait_for_url(f"{BASE_URL}/login", timeout=3000)
        assert "login" in page.url
```

---

### `test_scan_trigger.py` — Scan Flow E2E

```python
# tests/e2e/test_scan_trigger.py

class TestScanFlow:
    
    def test_scan_button_visible_on_dashboard(self, logged_in_page):
        """The scan button must be present and enabled."""
        page = logged_in_page
        scan_button = page.locator('[data-testid="scan-trigger-button"]')
        assert scan_button.is_visible()
        assert scan_button.is_enabled()
    
    def test_invalid_url_shows_validation_error(self, logged_in_page):
        """Invalid URL input must show error before enabling the scan button."""
        page = logged_in_page
        page.fill('[data-testid="scan-url-input"]', "not-a-valid-url")
        page.click('[data-testid="scan-trigger-button"]')
        # Validation error must appear inline
        assert page.is_visible("text=Please enter a valid URL or IP")
    
    def test_scan_starts_and_shows_progress(self, logged_in_page):
        """Triggering a scan must show a loading state."""
        page = logged_in_page
        page.fill('[data-testid="scan-url-input"]', "http://localhost:3000")
        page.click('[data-testid="scan-trigger-button"]')
        
        # Scanning state must appear within 2 seconds
        page.wait_for_selector("text=Scanning", timeout=2000)
        # The OrchestrationFeed must show agent messages
        page.wait_for_selector('[data-testid="orchestration-feed"]', timeout=2000)
```

---

### `test_report_export.py` — PDF Export E2E

```python
# tests/e2e/test_report_export.py

class TestReportExport:
    
    def test_reports_tab_is_accessible(self, logged_in_page):
        """Reports tab must load without errors."""
        page = logged_in_page
        page.click("text=Reports")
        page.wait_for_selector('[data-testid="reports-panel"]', timeout=3000)
        assert page.is_visible('[data-testid="reports-panel"]')
    
    def test_pdf_export_triggers_download(self, logged_in_page):
        """Clicking export must start a file download."""
        page = logged_in_page
        page.click("text=Reports")
        
        # Listen for the download event before clicking
        with page.expect_download() as download_info:
            page.click('[data-testid="export-pdf-button"]')
        
        download = download_info.value
        assert download.suggested_filename.endswith(".pdf")
```

---

### UAT Coordination — Mazin's Soft Skill Job

**English:** In Week 11, Mazin runs the UAT session — he walks all 11 team members through the dashboard and asks them to try every feature. He collects every bug they find and writes a structured report.

**عربي:** في الأسبوع 11، يدير مازن جلسة UAT — يُرشد جميع الـ 11 عضوًا في الفريق عبر لوحة التحكم ويطلب منهم تجربة كل ميزة. يجمع كل خطأ يجدونه ويكتب تقريرًا منظّمًا.

```markdown
# Bug report format Mazin must use in UAT_REPORT.md:

## Bug #001
**Reporter:** Rahma Ebrahem
**Date:** Week 11, May 2026
**Severity:** High
**Component:** ScanButton

**Steps to Reproduce:**
1. Open dashboard at https://localhost
2. Navigate to the Targets tab
3. Click Initiate Scan on the Juice Shop target
4. Wait for scan to complete

**Expected:** Scan completes and Risk Score updates
**Actual:** Scan hangs at "Scanning..." forever

**Root Cause (after investigation):** Celery worker crashed — Mohamed must fix
**Assigned To:** Mohamed Shaban
**Status:** OPEN
```

---

### Cross-Browser Testing | اختبار عبر المتصفحات

```python
# Test with different browsers by changing the browser launch:

# Chrome/Chromium:
browser = p.chromium.launch(args=["--ignore-certificate-errors"])

# Firefox:
browser = p.firefox.launch()

# WebKit (Safari engine):
browser = p.webkit.launch()

# Parametrize to run same tests on all 3 browsers:
@pytest.mark.parametrize("browser_type", ["chromium", "firefox", "webkit"])
def test_login_on_all_browsers(browser_type):
    with sync_playwright() as p:
        browser = getattr(p, browser_type).launch()
        page = browser.new_page()
        page.goto("https://localhost")
        assert page.title() == "Found 404"
        browser.close()
```

---

## What Mazin Must Learn | ما يجب على مازن تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| `playwright.sync_api`: `page.goto()`, `page.fill()`, `page.click()`, `page.is_visible()` | Core Playwright actions | إجراءات Playwright الأساسية |
| `page.wait_for_selector()` / `wait_for_url()` — timeouts | Prevent flaky tests (tests that fail randomly) | منع الاختبارات المتذبذبة |
| `page.expect_download()` | Test file downloads | اختبار تنزيلات الملفات |
| Browser DevTools: Network tab | Check which API calls the frontend makes | التحقق من استدعاءات API |
| How to write a good bug report | UAT coordination | تنسيق UAT |
| `data-testid` attributes in HTML | How to reliably target elements | كيفية استهداف العناصر بشكل موثوق |

**Resources | الموارد:**
- Playwright Python: https://playwright.dev/python/docs/intro
- Playwright selectors: https://playwright.dev/python/docs/selectors
- pytest-playwright: https://playwright.dev/python/docs/test-runners

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Set up Playwright; write `test_login_flow.py` | إعداد Playwright؛ كتابة اختبارات تسجيل الدخول |
| 11 | Run UAT session with all 11 members; log all bugs found | جلسة UAT؛ تسجيل جميع الأخطاء |
| 12 | Write `test_scan_trigger.py` and `test_report_export.py` | كتابة اختبارات المسح والتصدير |
| 13 | Cross-browser run; write `UAT_REPORT.md` + `BROWSER_COMPAT_REPORT.md` | اختبار عبر المتصفحات؛ الكتابة التقارير |
