"""
PentesterFlow API Endpoints - Scans
Extended scan endpoints with AI agent integration
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
import asyncio

from app.core.database import get_db, get_async_db, async_session_maker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.scan import Scan, ScanStatus, Target, ScanAsset
from app.schemas.scan import (
    ScanCreate, ScanResponse, ScanDetail, ScanSummary,
    AgentLogResponse
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
    configuration.setdefault("soar_trigger", scan_in.soar_trigger)
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
# Lightweight in-memory schedule store. Persistent scheduling is provided by
# Celery beat; this endpoint set exposes a simple CRUD surface so the frontend
# can manage recurring scans without editing beat_schedule at runtime.


@router.post("/schedule",
             dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
def create_schedule(scan_in: ScanCreate):
    """Create a recurring scan schedule."""
    import uuid
    if not scan_in.schedule:
        raise HTTPException(status_code=400, detail="`schedule` (cron expression) is required")
    sid = str(uuid.uuid4())
    _SCHEDULES[sid] = {
        "id": sid,
        "target_id": scan_in.target_id,
        "target_url": scan_in.target_url,
        "scan_type": scan_in.scan_type,
        "tools": scan_in.tools,
        "schedule": scan_in.schedule,
        "auto_report": scan_in.auto_report,
        "soar_trigger": scan_in.soar_trigger,
        "siem_forward": scan_in.siem_forward,
        "enabled": True,
    }
    return _SCHEDULES[sid]


@router.get("/schedules")
def list_schedules():
    """List active scan schedules."""
    return {"schedules": list(_SCHEDULES.values())}


@router.delete("/schedules/{schedule_id}", status_code=204,
               dependencies=[Depends(require_role(UserRole.ADMIN))])
def delete_schedule(schedule_id: str):
    """Cancel a scheduled scan."""
    if schedule_id not in _SCHEDULES:
        raise HTTPException(status_code=404, detail="Schedule not found")
    _SCHEDULES.pop(schedule_id)
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


@router.get("/", response_model=List[ScanSummary])
def list_scans(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all scans with optional status filter.
    """
    query = db.query(Scan)
    
    if status:
        query = query.filter(Scan.status == status)
    
    scans = query.order_by(Scan.started_at.desc()).offset(skip).limit(limit).all()
    return scans


@router.get("/{scan_id}", response_model=ScanDetail)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_async_db)):
    """
    Get detailed scan information including vulnerabilities and agent logs.
    """
    _s_res = await db.execute(
        select(Scan)
        .options(
            selectinload(Scan.vulnerabilities),
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
