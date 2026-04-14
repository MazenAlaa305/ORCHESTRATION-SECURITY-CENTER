"""
scan_reaper.py — Mark stale RUNNING/QUEUED scans as FAILED on startup.

Phase 2.2 hardening: when a Celery worker crashes mid-scan the
Scan.status=RUNNING row is left in the database forever and the UI shows
a phantom in-progress scan.  The reaper runs during FastAPI lifespan
startup (before any new work is accepted) and applies a FAILED terminal
state with an explicit failure_reason so the difference between a crash
and a normal failure is auditable.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import update

from app.models.scan import Scan, ScanStatus

logger = logging.getLogger(__name__)

# Default threshold: scans running longer than this are considered orphaned.
# 60 minutes is generous — even a full Nmap + Nuclei scan should complete in < 20 min.
DEFAULT_STALE_MINUTES = 60


async def reap_orphan_scans(db, stale_after_minutes: int = DEFAULT_STALE_MINUTES) -> int:
    """
    Mark any RUNNING or QUEUED scan older than *stale_after_minutes* as FAILED.

    Args:
        db:                   An open async SQLAlchemy session.
        stale_after_minutes:  Age threshold in minutes.  Scans whose
                              ``started_at`` is older than this are reaped.

    Returns:
        Number of scans that were reaped.

    Call from the FastAPI ``lifespan`` startup event **before** the Redis
    event-listener task is started so orphan records are cleaned before any
    new WebSocket events flow in.
    """
    threshold = datetime.utcnow() - timedelta(minutes=stale_after_minutes)

    result = await db.execute(
        update(Scan)
        .where(
            Scan.status.in_([ScanStatus.RUNNING, ScanStatus.QUEUED]),
            Scan.started_at < threshold,
        )
        .values(
            status=ScanStatus.FAILED,
            failure_reason="orphaned_on_restart",
            completed_at=datetime.utcnow(),
        )
        .execution_options(synchronize_session="fetch")
    )

    count: int = result.rowcount or 0
    if count:
        logger.warning(
            "[ScanReaper] Reaped %d orphaned scan(s) on startup — "
            "they were RUNNING/QUEUED for more than %d minutes.",
            count,
            stale_after_minutes,
        )
    else:
        logger.info("[ScanReaper] No orphaned scans found on startup.")

    await db.commit()
    return count
