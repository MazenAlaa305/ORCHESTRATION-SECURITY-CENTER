#!/usr/bin/env python3
"""
Compatibility test runner for the SME Cyber Dashboard.

This wrapper keeps the old `python run_tests.py` entry point working while
delegating to `generate_test_report.py`, which runs backend, e2e, and frontend
tests and overwrites `test-report.html` on every run.
"""

from generate_test_report import main


if __name__ == "__main__":
    raise SystemExit(main())
