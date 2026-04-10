from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel

from ....core.database import get_db
from ....models.scan import Scan, Vulnerability, NetworkAsset, ActionItem, SeverityLevel
from ....services.unified_risk_engine import UnifiedRiskEngine

router = APIRouter()


# ── Response Schemas ──────────────────────────────────────────────────────────

class RiskOverview(BaseModel):
    total_assets: int
    high_risk_assets: int
    critical_vulnerabilities: int
    overall_risk_score: float


class KPISnapshot(BaseModel):
    overall_score: float
    health_score: float
    counts: Dict[str, int]
    total_assets: int
    last_scan_id: Optional[str]


class ActionItemResponse(BaseModel):
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/risk-overview", response_model=RiskOverview)
def get_risk_overview(db: Session = Depends(get_db)):
    """High-level risk statistics for the dashboard overview cards."""
    assets = db.query(NetworkAsset).all()
    total = len(assets)
    high_risk = sum(1 for a in assets if (a.risk_score or 0) > 50)

    critical_vulnerabilities = db.query(Vulnerability).filter(
        Vulnerability.severity == SeverityLevel.CRITICAL
    ).count()

    avg_risk = sum((a.risk_score or 0) for a in assets) / total if total > 0 else 0.0

    return {
        "total_assets": total,
        "high_risk_assets": high_risk,
        "critical_vulnerabilities": critical_vulnerabilities,
        "overall_risk_score": round(avg_risk, 2),
    }


@router.get("/kpi-snapshot", response_model=KPISnapshot)
def get_kpi_snapshot(db: Session = Depends(get_db)):
    """
    Comprehensive KPI snapshot for real-time dashboard initialisation.
    Called once on page load; live updates arrive via WebSocket RISK_UPDATE events.
    """
    latest_scan = (
        db.query(Scan)
        .order_by(Scan.started_at.desc())
        .first()
    )

    counts = {
        "critical": db.query(Vulnerability).filter(
            Vulnerability.severity == SeverityLevel.CRITICAL
        ).count(),
        "high": db.query(Vulnerability).filter(
            Vulnerability.severity == SeverityLevel.HIGH
        ).count(),
        "medium": db.query(Vulnerability).filter(
            Vulnerability.severity == SeverityLevel.MEDIUM
        ).count(),
        "low": db.query(Vulnerability).filter(
            Vulnerability.severity == SeverityLevel.LOW
        ).count(),
    }

    assets_count = db.query(NetworkAsset).count()
    overall_score = 0.0
    health_score = 100.0

    if latest_scan:
        overall_score = round(latest_scan.risk_score or 0.0, 2)
        # Null-safe dict access — agent_thoughts may be None or missing 'health_score'
        thoughts = latest_scan.agent_thoughts or {}
        health_score = round(float(thoughts.get("health_score", 100.0 - overall_score)), 2)

    return {
        "overall_score": overall_score,
        "health_score": health_score,
        "counts": counts,
        "total_assets": assets_count,
        "last_scan_id": latest_scan.id if latest_scan else None,
    }


@router.get("/actions", response_model=List[ActionItemResponse])
def get_action_items(status: str = "OPEN", db: Session = Depends(get_db)):
    """Prioritised list of open action items for the Action Center widget."""
    actions = (
        db.query(ActionItem)
        .filter(ActionItem.status == status)
        .order_by(ActionItem.priority.desc(), ActionItem.created_at.desc())
        .all()
    )
    return actions


@router.post("/refresh-risk")
async def refresh_risk_scores(db: Session = Depends(get_db)):
    """
    Force-recalculate risk scores for the most recent scan.
    Called from the dashboard refresh button.
    """
    from ....core.database import async_session_maker

    latest_scan = db.query(Scan).order_by(Scan.started_at.desc()).first()
    if not latest_scan:
        raise HTTPException(status_code=404, detail="No scans found to recalculate.")

    try:
        async with async_session_maker() as async_db:
            engine = UnifiedRiskEngine(async_db)
            await engine.update_scan_risk(latest_scan.id)
            await engine.generate_action_items(latest_scan.id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Risk recalculation failed: {exc}")

    return {"status": "ok", "scan_id": latest_scan.id}
