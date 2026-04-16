from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel

from ....core.database import get_db
from ....models.scan import Scan, Vulnerability, NetworkAsset, ActionItem, SeverityLevel, Finding, FindingStatus
from ....services.unified_risk_engine import UnifiedRiskEngine
from datetime import date
from app.api.deps import require_role
from app.models.user import UserRole

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
    overdue_findings: int = 0   # Phase 4.3 — SLA breach count


class RiskBreakdownItem(BaseModel):
    vuln_id: Optional[str]
    cvss_vector: Optional[str]
    cvss_env_score: float
    confidence: float
    contribution: float
    severity: str
    reason: str
    url: str


class RiskBreakdown(BaseModel):
    scan_id: str
    score: float
    breakdown: List[RiskBreakdownItem]


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

@router.get("/summary", response_model=KPISnapshot)
def get_summary_alias(db: Session = Depends(get_db)):
    """Alias for /kpi-snapshot — frontend compatibility."""
    return get_kpi_snapshot(db)


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

    # Phase 4.3 — count OPEN findings whose due_date has passed
    try:
        overdue = (
            db.query(Finding)
            .filter(Finding.status == FindingStatus.OPEN, Finding.due_date < date.today())
            .count()
        )
    except Exception:
        overdue = 0

    return {
        "overall_score": overall_score,
        "health_score": health_score,
        "counts": counts,
        "total_assets": assets_count,
        "last_scan_id": latest_scan.id if latest_scan else None,
        "overdue_findings": overdue,
    }


@router.get("/risk/{scan_id}", response_model=RiskBreakdown)
def get_risk_breakdown(scan_id: str, db: Session = Depends(get_db)):
    """
    Phase 4.1 — Return the stored CVSS risk breakdown for a specific scan.
    The breakdown is populated by UnifiedRiskEngine.update_scan_risk() at scan completion.
    Each item explains exactly how much a vulnerability contributed to the final score.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    stored = scan.risk_breakdown or {}
    score = stored.get("score", scan.risk_score or 0.0)
    raw_items = stored.get("breakdown", [])

    items = [
        RiskBreakdownItem(
            vuln_id=item.get("vuln_id"),
            cvss_vector=item.get("cvss_vector"),
            cvss_env_score=item.get("cvss_env_score", 0.0),
            confidence=item.get("confidence", 1.0),
            contribution=item.get("contribution", 0.0),
            severity=item.get("severity", "low"),
            reason=item.get("reason", ""),
            url=item.get("url", ""),
        )
        for item in raw_items
    ]

    return RiskBreakdown(scan_id=scan_id, score=score, breakdown=items)


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


@router.post("/refresh-risk",
             dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
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
