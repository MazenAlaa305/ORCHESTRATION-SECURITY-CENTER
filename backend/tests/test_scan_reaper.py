"""
Tests for app/services/scan_reaper.py — reap_orphan_scans (async)
"""
import allure
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.scan_reaper import reap_orphan_scans


# ── Async DB mock helpers ─────────────────────────────────────────────────────

def _make_mock_db(rowcount=0):
    """Build a minimal async session mock that satisfies reap_orphan_scans."""
    db = AsyncMock()
    result = MagicMock()
    result.rowcount = rowcount
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    return db


# ── Tests ─────────────────────────────────────────────────────────────────────

@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("No orphan scans found returns zero")
@allure.severity(allure.severity_level.NORMAL)
@pytest.mark.asyncio
async def test_no_orphans_returns_zero():
    db = _make_mock_db(rowcount=0)
    count = await reap_orphan_scans(db)
    assert count == 0


@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("Found orphan scans returns the correct count")
@allure.severity(allure.severity_level.NORMAL)
@pytest.mark.asyncio
async def test_orphans_found_returns_count():
    db = _make_mock_db(rowcount=3)
    count = await reap_orphan_scans(db)
    assert count == 3


@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("commit() is always called after reaping")
@allure.severity(allure.severity_level.NORMAL)
@pytest.mark.asyncio
async def test_commit_always_called():
    db = _make_mock_db(rowcount=0)
    await reap_orphan_scans(db)
    db.commit.assert_called_once()


@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("execute() is called exactly once per reap")
@allure.severity(allure.severity_level.NORMAL)
@pytest.mark.asyncio
async def test_execute_called_once():
    db = _make_mock_db(rowcount=1)
    await reap_orphan_scans(db)
    db.execute.assert_called_once()


@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("Custom stale_after_minutes parameter is accepted")
@allure.severity(allure.severity_level.MINOR)
@pytest.mark.asyncio
async def test_custom_stale_minutes_accepted():
    db = _make_mock_db(rowcount=0)
    count = await reap_orphan_scans(db, stale_after_minutes=60)
    assert count == 0


@allure.epic("System Services")
@allure.feature("Scan Lifecycle")
@allure.story("Orphan Scan Reaper")
@allure.title("None rowcount is treated as zero")
@allure.severity(allure.severity_level.NORMAL)
@pytest.mark.asyncio
async def test_none_rowcount_treated_as_zero():
    db = _make_mock_db(rowcount=None)
    count = await reap_orphan_scans(db)
    assert count == 0
