"""
Tests for app/services/scan_reaper.py — reap_orphan_scans (async)
"""
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.scan import Scan, ScanStatus, Target
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

@pytest.mark.asyncio
async def test_no_orphans_returns_zero():
    db = _make_mock_db(rowcount=0)
    count = await reap_orphan_scans(db)
    assert count == 0


@pytest.mark.asyncio
async def test_orphans_found_returns_count():
    db = _make_mock_db(rowcount=3)
    count = await reap_orphan_scans(db)
    assert count == 3


@pytest.mark.asyncio
async def test_commit_always_called():
    db = _make_mock_db(rowcount=0)
    await reap_orphan_scans(db)
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_execute_called_once():
    db = _make_mock_db(rowcount=1)
    await reap_orphan_scans(db)
    db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_custom_stale_minutes_accepted():
    db = _make_mock_db(rowcount=0)
    count = await reap_orphan_scans(db, stale_after_minutes=60)
    assert count == 0


@pytest.mark.asyncio
async def test_none_rowcount_treated_as_zero():
    db = _make_mock_db(rowcount=None)
    count = await reap_orphan_scans(db)
    assert count == 0
