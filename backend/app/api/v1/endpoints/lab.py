"""
Living Lab API Endpoints — Orchestration Security Center
Manage, monitor, and interact with the SME simulation lab.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_async_db
from app.services.lab_manager import lab_manager

router = APIRouter()


@router.get("/status")
async def get_lab_status():
    """
    Get the current status of the Living Lab environment.
    Returns container states, network info, and telemetry stats.
    """
    status = await lab_manager.get_status()
    telemetry = await lab_manager.get_telemetry_stats()
    return {**status, "telemetry": telemetry}


@router.post("/seed")
async def seed_lab_targets(db: AsyncSession = Depends(get_async_db)):
    """
    Register all lab targets in the dashboard database.
    Only seeds HTTP-based targets that the scanner can reach.
    Idempotent — skips targets that already exist.
    """
    result = await lab_manager.seed_targets(db)
    return {"seeded": result, "count": len(result)}


@router.get("/events")
async def get_lab_events(limit: int = 50, category: Optional[str] = None):
    """
    Fetch recent lab events from Elasticsearch.
    Optionally filter by event category (web, dns, database, suspicious, etc.).
    """
    events = await lab_manager.get_event_feed(limit=limit)
    if category:
        events = [e for e in events if e.get("event", {}).get("category") == category]
    return {"events": events, "count": len(events)}


@router.get("/targets")
async def get_lab_targets():
    """
    List all lab targets with their vulnerability profiles.
    Used by the frontend to display the lab network map.
    """
    from app.services.lab_manager import LAB_TARGETS
    return {"targets": LAB_TARGETS}


@router.get("/telemetry")
async def get_lab_telemetry():
    """
    Get aggregated telemetry statistics from the lab.
    """
    return await lab_manager.get_telemetry_stats()
