"""
PentesterFlow API Endpoints - Scans
Extended scan endpoints with AI agent integration
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
import asyncio

from app.core.database import get_db, get_async_db, async_session_maker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, asc, desc
from app.models.scan import Scan, ScanStatus, Target, ScanAsset, Vulnerability
from app.schemas.scan import (
    ScanCreate, ScanResponse, ScanDetail,
    AgentLogResponse, ScanListPage,
)
from app.services.scan_tasks import run_scan_task
from app.api.deps import require_role
from app.models.user import UserRole

router = APIRouter()


# ============================================================================
# SCAN ENDPOINTS
# ============================================================================

@router.post("/", response_model=ScanResponse,
             dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
def create_scan(scan_in: ScanCreate, db: Session = Depends(get_db)):
    """
    Create a new scan and start it in the background.
    Supports both legacy (target_url) and new (target_id) formats.
    """
    # Handle legacy format
    target_url = scan_in.target_url
    target_id = scan_in.target_id
    
    # If target_id provided, get URL from target
    if target_id:
        target = db.query(Target).filter(Target.id == target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        target_url = target.base_url
    
    if not target_url:
        raise HTTPException(status_code=400, detail="Either target_id or target_url required")
    
    # Merge tool selection and automation flags into the configuration JSON
    # so the Celery worker can read them alongside the raw scan_type.
    configuration = dict(scan_in.configuration or {})
    if scan_in.tools is not None:
        configuration["tools"] = scan_in.tools
    configuration.setdefault("auto_report", scan_in.auto_report)
    configuration.setdefault("siem_forward", scan_in.siem_forward)

    # Apply scan_type presets when tools aren't explicitly chosen.
    if scan_in.tools is None:
        presets = {
            "quick":    ["nmap"],
            "standard": ["nmap", "nuclei"],
            "full":     ["nmap", "nuclei", "ai_validation"],
        }
        preset = presets.get(scan_in.scan_type)
        if preset is not None:
            configuration["tools"] = preset

    # Create scan record
    scan = Scan(
        target_id=target_id,
        target_url=target_url,
        scan_type=scan_in.scan_type,
        configuration=configuration,
        status=ScanStatus.QUEUED
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    scan = db.query(Scan).options(
        selectinload(Scan.vulnerabilities),
        selectinload(Scan.assets),
        selectinload(Scan.actions),
        selectinload(Scan.agent_logs)
    ).filter(Scan.id == scan.id).first()

    # Trigger Celery Task (legacy Nmap scan)
    # For AI-powered scans, use /ai endpoint below
    run_scan_task.delay(scan_id=scan.id)

    return scan


# ── Scan scheduling (Part C) ─────────────────────────────────────────────────

_SCHEDULES: dict[str, dict] = {}
# Schedule store backed by Redis so schedules survive API restarts and are
# accessible from Celery workers.

def _redis_client():
    import redis as _redis
    from app.core.config import settings as _s
    return _redis.from_url(_s.REDIS_URL, decode_responses=True)

SCHED_KEY = "osc:schedules"


@router.post("/schedule",
             dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
def create_schedule(scan_in: ScanCreate):
    """Create a recurring scan schedule stored in Redis."""
    import uuid, json
    if not scan_in.schedule:
        raise HTTPException(status_code=400, detail="`schedule` (cron expression) is required")
    sid = str(uuid.uuid4())
    entry = {
        "id": sid,
        "target_id": str(scan_in.target_id) if scan_in.target_id else None,
        "target_url": scan_in.target_url,
        "scan_type": scan_in.scan_type or "quick",
        "schedule": scan_in.schedule,
        "enabled": True,
    }
    try:
        r = _redis_client()
        r.hset(SCHED_KEY, sid, json.dumps(entry))
        r.close()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}")
    return entry


@router.get("/schedules")
def list_schedules():
    """List active scan schedules from Redis."""
    import json
    try:
        r = _redis_client()
        raw = r.hgetall(SCHED_KEY)
        r.close()
        return {"schedules": [json.loads(v) for v in raw.values()]}
    except Exception:
        return {"schedules": []}


@router.delete("/schedules/{schedule_id}", status_code=204,
               dependencies=[Depends(require_role(UserRole.ADMIN))])
def delete_schedule(schedule_id: str):
    """Delete a schedule from Redis."""
    try:
        r = _redis_client()
        deleted = r.hdel(SCHED_KEY, schedule_id)
        r.close()
        if not deleted:
            raise HTTPException(status_code=404, detail="Schedule not found")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return None


@router.post("/ai", response_model=ScanResponse, status_code=202,
             dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
async def create_ai_scan(scan_in: ScanCreate, db: AsyncSession = Depends(get_async_db)):
    """
    Create a new AI-powered scan and enqueue it through Celery.

    Returns HTTP 202 Accepted — the scan is queued, not yet running.
    The Celery worker runs the full AgentOrchestrator pipeline:
    1. ReconAgent -> 2. AttackAgent (Nuclei) -> 3. ValidationAgent -> 4. ReportingAgent

    Phase 2.1 hardening: previously used FastAPI BackgroundTasks, which died
    on backend restart. Celery handles retries and survives restarts.
    """
    from app.services.agent_orchestrator import AgentOrchestrator
    
    # Handle target resolution
    target_url = scan_in.target_url
    target_id = scan_in.target_id
    auth_credentials = None
    
    if target_id:
        _t_res = await db.execute(select(Target).filter(Target.id == target_id))
        target = _t_res.scalars().first()
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        target_url = target.base_url
        auth_credentials = target.auth_credentials
    
    if not target_url:
        raise HTTPException(status_code=400, detail="Either target_id or target_url required")
    
    # Create scan record
    scan = Scan(
        target_id=target_id,
        target_url=target_url,
        scan_type=scan_in.scan_type or "full",
        configuration=scan_in.configuration,
        status=ScanStatus.QUEUED
    )
    db.add(scan)
    await db.commit()
    
    # Re-fetch with eager loading to avoid MissingGreenlet error during serialization
    _s_res = await db.execute(
        select(Scan)
        .options(selectinload(Scan.vulnerabilities), selectinload(Scan.assets), selectinload(Scan.actions))
        .filter(Scan.id == scan.id)
    )
    scan = _s_res.scalars().first()
    
    # Enqueue through Celery — survives backend restarts (Phase 2.1 hardening)
    # mode='ai' dispatches to _run_ai_pipeline() inside scan_tasks.py
    run_scan_task.delay(scan_id=scan.id, mode="ai")

    return scan


@router.get("/", response_model=ScanListPage)
def list_scans(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(25, ge=1, le=200, description="Rows per page (max 200)"),
    status: Optional[str] = Query(None, description="Filter by ScanStatus value"),
    scan_type: Optional[str] = Query(None, description="Filter by scan profile"),
    target: Optional[str] = Query(None, description="Substring match on target_url"),
    date_from: Optional[datetime] = Query(None, description="Inclusive lower bound on started_at (ISO 8601)"),
    date_to: Optional[datetime] = Query(None, description="Inclusive upper bound on started_at (ISO 8601)"),
    environment: Optional[str] = Query(None, description="Filter by environment_type (lab/production/staging/development); 'all' disables the filter"),
    sort: str = Query("started_at", description="Sort column: started_at | duration | risk_score"),
    order: str = Query("desc", description="asc | desc"),
    db: Session = Depends(get_db),
):
    """
    Paginated scan list used by the History tab (Phase 4).

    Returns a uniform `{items, total, page, page_size}` envelope. All filters
    and sorting are applied at the DB layer so the client never has to slice
    or re-sort a full-table fetch.
    """
    query = db.query(Scan)

    if status:
        query = query.filter(Scan.status == status)
    if scan_type:
        query = query.filter(Scan.scan_type == scan_type)
    if target:
        query = query.filter(Scan.target_url.ilike(f"%{target}%"))
    if date_from:
        query = query.filter(Scan.started_at >= date_from)
    if date_to:
        query = query.filter(Scan.started_at <= date_to)
    if environment and environment != "all":
        query = query.filter(Scan.environment_type == environment)

    total = query.with_entities(func.count(Scan.id)).scalar() or 0

    # Sort whitelist — any unknown value falls back to started_at.
    sort_map = {
        "started_at": Scan.started_at,
        "duration": Scan.completed_at,
        "risk_score": Scan.risk_score,
    }
    sort_col = sort_map.get(sort, Scan.started_at)
    direction = asc if order.lower() == "asc" else desc
    query = query.order_by(direction(sort_col))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{scan_id}", response_model=ScanDetail)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_async_db)):
    """
    Get detailed scan information including vulnerabilities and agent logs.
    """
    _s_res = await db.execute(
        select(Scan)
        .options(
            selectinload(Scan.vulnerabilities).selectinload(Vulnerability.finding),
            selectinload(Scan.assets).selectinload(ScanAsset.services),
            selectinload(Scan.agent_logs),
            selectinload(Scan.actions)
        )
        .filter(Scan.id == scan_id)
    )
    scan = _s_res.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/{scan_id}/logs", response_model=List[AgentLogResponse])
def get_scan_logs(scan_id: str, db: Session = Depends(get_db)):
    """
    Get AI agent logs for a specific scan.
    Shows the reasoning chain of all agents.
    """
    from app.models.scan import AgentLog
    
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    logs = db.query(AgentLog).filter(AgentLog.scan_id == scan_id).order_by(AgentLog.timestamp).all()
    return logs


@router.post("/{scan_id}/stop")
def stop_scan(scan_id: str, db: Session = Depends(get_db)):
    """
    Stop a running scan.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in [ScanStatus.QUEUED, ScanStatus.RUNNING]:
        raise HTTPException(status_code=400, detail="Scan is not running")
    
    scan.status = ScanStatus.FAILED
    db.commit()
    
    return {"message": "Scan stopped", "scan_id": scan_id}


@router.delete("/{scan_id}")
def delete_scan(scan_id: str, db: Session = Depends(get_db)):
    """
    Delete a scan and all its associated data.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    db.delete(scan)
    db.commit()
    
    return {"message": "Scan deleted", "scan_id": scan_id}
