#!/usr/bin/env python3
"""
SME Cyber Dashboard — Test Report Generator
Runs backend (pytest) and frontend (vitest) tests, then writes test-report.html.

Usage:
    python generate_test_report.py

The HTML report is always overwritten at test-report.html next to this script.
"""

import ast
import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

ROOT        = Path(__file__).parent.resolve()
ALL_TESTS   = ROOT / "all_tests"
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
REPORT_HTML = ROOT / "test-report.html"
REPORT_CSS  = ROOT / "test-report.css"
_BACKEND_XML  = ROOT / "_tmp_backend_results.xml"
_E2E_XML      = ROOT / "_tmp_e2e_results.xml"
_FRONTEND_XML = ROOT / "_tmp_frontend_results.xml"


# ── Description extractors ────────────────────────────────────────────────────

def _extract_python_desc(path: Path) -> str:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8", errors="replace"))
        return ast.get_docstring(tree) or ""
    except Exception:
        return ""


def _extract_js_desc(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        m = re.match(r"\s*/\*\*(.*?)\*/", text, re.DOTALL)
        if m:
            lines = [ln.strip().lstrip("*").strip() for ln in m.group(1).splitlines()]
            return " ".join(ln for ln in lines if ln)
        m = re.match(r"\s*//\s*(.+)", text)
        if m:
            return m.group(1).strip()
    except Exception:
        pass
    return ""


# ── Test runners ──────────────────────────────────────────────────────────────

def _run_pytest(label: str, subdir: str, xml_path: Path) -> tuple[int, str]:
    xml_path.unlink(missing_ok=True)
    cmd = [
        sys.executable, "-m", "pytest",
        f"--junit-xml={xml_path}",
        "--tb=line", "-q", "--no-header",
        subdir,
    ]
    r = subprocess.run(cmd, cwd=str(ALL_TESTS), capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    rc = r.returncode
    # pytest exit 5 = no tests collected (e.g. all skipped at import) — treat as skip
    status = "PASS" if rc == 0 else ("SKIP" if rc == 5 else "FAIL")
    print(f"    {label}: {status}")
    if out:
        for line in out.splitlines()[-4:]:
            print(f"      {line}")
    return rc, out


def _run_backend() -> tuple[int, str]:
    print("\n[1/3] Running backend unit tests (pytest all_tests/backend/)...")
    return _run_pytest("Backend", "backend/", _BACKEND_XML)


def _run_e2e() -> tuple[int, str]:
    print("\n[2/3] Running e2e tests (pytest all_tests/e2e/)...")
    return _run_pytest("E2E", "e2e/", _E2E_XML)


def _find_node_executable(name: str) -> str | None:
    """Search for a Node.js executable in PATH and common install locations."""
    # Try name directly (works when node is in PATH)
    found = shutil.which(name) or shutil.which(f"{name}.cmd")
    if found:
        return found
    # Common Windows install locations
    candidates = [
        Path(os.environ.get("APPDATA", "")) / "npm" / f"{name}.cmd",
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "nodejs" / f"{name}.cmd",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "nodejs" / f"{name}.cmd",
        Path(os.environ.get("NVM_HOME", "")) / f"{name}.cmd",
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return None


def _run_frontend() -> tuple[int, str]:
    print("\n[3/3] Running frontend tests (vitest all_tests/frontend/)...")
    _FRONTEND_XML.unlink(missing_ok=True)

    npx_path = _find_node_executable("npx")
    if not npx_path:
        msg = "SKIP -- Node.js / npx not found in PATH or common install locations."
        print(f"    Frontend: {msg}")
        return -1, msg

    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        msg = "SKIP -- node_modules not found. Run 'npm install' inside frontend/ first."
        print(f"    Frontend: {msg}")
        return -1, msg

    cmd = [
        npx_path, "vitest", "run",
        "--reporter=junit",
        f"--outputFile={_FRONTEND_XML}",
    ]
    r = subprocess.run(
        cmd, cwd=str(FRONTEND_DIR), capture_output=True, text=True, shell=False
    )
    out = (r.stdout + r.stderr).strip()
    status = "PASS" if r.returncode == 0 else "FAIL"
    print(f"    Frontend: {status}")
    if out:
        for line in out.splitlines()[-6:]:
            print(f"    {line}")
    return r.returncode, out


# ── JUnit XML parser ──────────────────────────────────────────────────────────

def _parse_testcase(tc: ET.Element) -> dict:
    failure = tc.find("failure")
    error   = tc.find("error")
    skipped = tc.find("skipped")
    if failure is not None:
        status = "failed"
        msg = failure.get("message") or failure.text or ""
    elif error is not None:
        status = "error"
        msg = error.get("message") or error.text or ""
    elif skipped is not None:
        status = "skipped"
        msg = skipped.get("message") or ""
    else:
        status = "passed"
        msg = ""
    return {
        "name":      tc.get("name", ""),
        "classname": tc.get("classname", ""),
        "time":      tc.get("time", "0"),
        "status":    status,
        "msg":       msg[:500],
    }


def _cases_to_suite(name: str, cases: list[dict]) -> dict:
    failures = sum(1 for c in cases if c["status"] == "failed")
    errors   = sum(1 for c in cases if c["status"] == "error")
    skipped  = sum(1 for c in cases if c["status"] == "skipped")
    total_t  = sum(float(c["time"] or 0) for c in cases)
    return {
        "name":     name,
        "tests":    len(cases),
        "failures": failures,
        "errors":   errors,
        "skipped":  skipped,
        "time":     f"{total_t:.3f}",
        "cases":    cases,
    }


def _parse_xml(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        root = ET.parse(str(path)).getroot()
        elements = root.findall("testsuite") if root.tag == "testsuites" else [root]

        all_cases: list[dict] = []
        for el in elements:
            for tc in el.findall("testcase"):
                all_cases.append(_parse_testcase(tc))

        if not all_cases:
            return []

        # Group by classname — gives one card per test file.
        # If all cases share the same classname (or have none), fall back to a
        # single suite named after the root element.
        groups: dict[str, list[dict]] = {}
        for c in all_cases:
            key = c["classname"] or elements[0].get("name", "tests")
            groups.setdefault(key, []).append(c)

        # If there is only one group AND its name is generic ("pytest", "tests"),
        # try to split by the last dot-segment of the classname.
        if len(groups) == 1:
            key = next(iter(groups))
            if key in ("pytest", "tests", ""):
                # Re-group using the test name prefix (e.g. "test_auth")
                new_groups: dict[str, list[dict]] = {}
                for c in all_cases:
                    # pytest classnames look like "backend.tests.test_auth"
                    parts = c["classname"].split(".")
                    module = parts[-1] if parts else "tests"
                    new_groups.setdefault(module, []).append(c)
                if len(new_groups) > 1:
                    groups = new_groups

        suites = [_cases_to_suite(name, cases) for name, cases in groups.items()]
        return [s for s in suites if s["tests"] > 0]

    except Exception as exc:
        print(f"    Warning: could not parse {path.name}: {exc}")
        return []


# ── Description lookup ────────────────────────────────────────────────────────

_ALL_BACKEND  = ALL_TESTS / "backend"
_ALL_E2E      = ALL_TESTS / "e2e"
_ALL_FRONTEND = ALL_TESTS / "frontend"
_FRONTEND_TESTS = FRONTEND_DIR / "src" / "tests"   # originals (for import-correct copies)


def _backend_desc(suite_name: str) -> tuple[str, str]:
    module = suite_name.split(".")[-1]
    for search_dir in (_ALL_BACKEND, _ALL_E2E):
        path = search_dir / f"{module}.py"
        if not path.exists():
            for p in search_dir.glob("*.py"):
                if p.stem in suite_name:
                    path = p
                    break
        if path.exists():
            rel = path.relative_to(ROOT).as_posix()
            return rel, _extract_python_desc(path)
    return suite_name, ""


def _frontend_desc(suite_name: str) -> tuple[str, str]:
    for search_dir in (_ALL_FRONTEND, _FRONTEND_TESTS):
        for ext in ("*.test.js", "*.test.jsx", "*.spec.js", "*.spec.jsx"):
            for p in search_dir.rglob(ext):
                if p.stem in suite_name or p.name in suite_name or suite_name in str(p):
                    rel = p.relative_to(ROOT).as_posix()
                    return rel, _extract_js_desc(p)
    return suite_name, ""


# ── HTML helpers ──────────────────────────────────────────────────────────────

_ICON  = {"passed": "✓", "failed": "✗", "error": "⚠", "skipped": "⊘"}
_CLASS = {"passed": "passed", "failed": "failed", "error": "error", "skipped": "skipped"}


def _esc(s: str) -> str:
    return (s or "").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")


def _suite_html(suite: dict, desc_fn) -> str:
    filepath, desc = desc_fn(suite["name"])
    passed  = suite["tests"] - suite["failures"] - suite["errors"] - suite["skipped"]
    failed  = suite["failures"] + suite["errors"]
    skipped = suite["skipped"]
    border  = "suite-pass" if failed == 0 and suite["tests"] > 0 else "suite-fail"

    cases_html = ""
    for tc in suite["cases"]:
        icon = _ICON.get(tc["status"], "?")
        cls  = _CLASS.get(tc["status"], "passed")
        t    = f'{float(tc["time"]):.3f}s' if tc["time"] else ""
        msg_html = (
            f'<div class="tc-msg">{_esc(tc["msg"])}</div>'
            if tc["msg"] else ""
        )
        cases_html += (
            f'<div class="testcase {cls}">'
            f'<span class="tc-icon">{icon}</span>'
            f'<span class="tc-name">{_esc(tc["name"])}</span>'
            f'<span class="tc-time">{t}</span>'
            f'{msg_html}'
            f'</div>'
        )

    desc_html  = f'<p class="suite-desc">{_esc(desc)}</p>'       if desc     else ""
    path_html  = f'<span class="suite-path">{_esc(filepath)}</span>' if filepath else ""
    fail_html  = f'<span class="stat fail">{failed} failed</span>'   if failed   else ""
    skip_html  = f'<span class="stat skip">{skipped} skipped</span>' if skipped  else ""

    return (
        f'<div class="suite {border}">'
        f'  <div class="suite-header">'
        f'    <div class="suite-title">'
        f'      <span class="suite-name">{_esc(suite["name"])}</span>'
        f'      {path_html}'
        f'    </div>'
        f'    <div class="suite-stats">'
        f'      <span class="stat pass">{passed} passed</span>'
        f'      {fail_html}{skip_html}'
        f'      <span class="stat time">{float(suite["time"]):.2f}s</span>'
        f'    </div>'
        f'  </div>'
        f'  {desc_html}'
        f'  <div class="testcases">{cases_html}</div>'
        f'</div>'
    )


# ── HTML generator ────────────────────────────────────────────────────────────

def _generate_html(
    backend_suites: list[dict],
    e2e_suites: list[dict],
    frontend_suites: list[dict],
    backend_rc: int,
    e2e_rc: int,
    frontend_rc: int,
) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    py_suites = backend_suites + e2e_suites
    all_suites = py_suites + frontend_suites
    total   = sum(s["tests"]                  for s in all_suites)
    failed  = sum(s["failures"] + s["errors"] for s in all_suites)
    skipped = sum(s["skipped"]                for s in all_suites)
    passed  = total - failed - skipped
    overall = "pass" if failed == 0 else "fail"

    be_html = (
        "".join(_suite_html(s, _backend_desc) for s in py_suites)
        or '<p class="no-results">No backend/e2e test results found.</p>'
    )
    fe_html = (
        "".join(_suite_html(s, _frontend_desc) for s in frontend_suites)
        or '<p class="no-results">No frontend test results found.</p>'
    )

    # Combine backend + e2e for the overall label
    py_rc    = 0 if (backend_rc in (0, 5) and e2e_rc in (0, 5)) else max(backend_rc, e2e_rc)
    be_label = "PASS" if py_rc    == 0 else ("SKIP" if py_rc    == 5 else "FAIL")
    fe_label = "PASS" if frontend_rc == 0 else ("SKIP" if frontend_rc == -1 else "FAIL")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Test Report — SME Cyber Dashboard</title>
  <link rel="stylesheet" href="test-report.css" />
</head>
<body>
  <header>
    <div class="header-inner">
      <h1>SME Cyber Dashboard &mdash; Test Report</h1>
      <div class="header-meta">
        <span class="badge {overall}">{overall.upper()}</span>
        <span class="timestamp">Generated: {ts}</span>
      </div>
    </div>
  </header>

  <main>

    <section class="summary">
      <div class="stat-card total">
        <div class="stat-num">{total}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-num">{passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-num">{failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card skipped">
        <div class="stat-num">{skipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
    </section>

    <section class="test-section">
      <div class="section-header">
        <h2>Backend &amp; E2E Tests <span class="section-label">pytest</span></h2>
        <span class="run-status {be_label.lower()}">{be_label}</span>
      </div>
      <div class="suites">{be_html}</div>
    </section>

    <section class="test-section">
      <div class="section-header">
        <h2>Frontend Tests <span class="section-label">vitest</span></h2>
        <span class="run-status {fe_label.lower()}">{fe_label}</span>
      </div>
      <div class="suites">{fe_html}</div>
    </section>

  </main>
</body>
</html>
"""


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> int:
    print("=" * 60)
    print("  SME Cyber Dashboard — Test Report Generator")
    print("=" * 60)

    be_rc, _ = _run_backend()
    e2e_rc, _ = _run_e2e()
    fe_rc, _ = _run_frontend()

    backend_suites  = _parse_xml(_BACKEND_XML)
    e2e_suites      = _parse_xml(_E2E_XML)
    frontend_suites = _parse_xml(_FRONTEND_XML)

    _BACKEND_XML.unlink(missing_ok=True)
    _E2E_XML.unlink(missing_ok=True)
    _FRONTEND_XML.unlink(missing_ok=True)

    html = _generate_html(backend_suites, e2e_suites, frontend_suites, be_rc, e2e_rc, fe_rc)
    REPORT_HTML.write_text(html, encoding="utf-8")

    all_suites = backend_suites + e2e_suites + frontend_suites
    total  = sum(s["tests"]                  for s in all_suites)
    failed = sum(s["failures"] + s["errors"] for s in all_suites)

    def _label(rc):
        return "SKIP" if rc in (-1, 5) else ("PASS" if rc == 0 else "FAIL")

    print(f"\n{'='*60}")
    print(f"  Report saved -> {REPORT_HTML}")
    print(f"  Total: {total}  |  Failed: {failed}")
    print(f"  Backend : {_label(be_rc)}")
    print(f"  E2E     : {_label(e2e_rc)}")
    print(f"  Frontend: {_label(fe_rc)}")
    print("=" * 60)

    ok = be_rc == 0 and e2e_rc in (0, 5) and fe_rc in (0, -1)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
