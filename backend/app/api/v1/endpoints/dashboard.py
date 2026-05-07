from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel

from ....core.database import get_db
from ....models.scan import Scan, Vulnerability, NetworkAsset, ActionItem, SeverityLevel, ScanStatus, VulnStatus
from ....services.unified_risk_engine import UnifiedRiskEngine
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
    in_progress_count: int = 0  # Vulnerabilities currently being remediated


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
    Shows stats only for the latest scan to avoid displaying stale/seed data before first run.
    """
    latest_scan = (
        db.query(Scan)
        .filter(Scan.status == ScanStatus.COMPLETED)
        .order_by(Scan.started_at.desc())
        .first()
    )

    # Initialise zeros
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    overall_score = 0.0
    health_score = 100.0
    assets_count = db.query(NetworkAsset).count()
    last_scan_id = None

    if latest_scan:
        last_scan_id = latest_scan.id
        overall_score = round(latest_scan.risk_score or 0.0, 2)

        # Count ALL open vulnerabilities across every scan so a clean
        # scan on a different target does not reset the board to zero.
        for severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH, SeverityLevel.MEDIUM, SeverityLevel.LOW, SeverityLevel.INFO]:
            counts[severity.value] = (
                db.query(Vulnerability)
                .filter(
                    Vulnerability.severity == severity,
                    Vulnerability.status == VulnStatus.OPEN,
                )
                .count()
            )

    # Derive health from cumulative open vuln counts.
    # Each severity is capped so a handful of real findings never push
    # the score to 0 — e.g. 3 criticals yield ~36 penalty points, not 60.
    c, h, m, l = counts["critical"], counts["high"], counts["medium"], counts["low"]
    risk = (
        min(c, 5)  / 5.0  * 60 +   # criticals: saturates at 5  → max 60 pts
        min(h, 10) / 10.0 * 25 +   # highs:     saturates at 10 → max 25 pts
        min(m, 20) / 20.0 * 10 +   # mediums:   saturates at 20 → max 10 pts
        min(l, 30) / 30.0 *  5     # lows:      saturates at 30 → max  5 pts
    )
    health_score = round(max(0.0, 100.0 - risk), 2)

    # SLA overdue — count OPEN vulnerabilities past their SLA window
    # Uses the vulnerabilities table directly (findings table is sparsely populated).
    # SLA windows: CRITICAL=1d, HIGH=3d, MEDIUM=7d, LOW=14d
    _SLA_WINDOWS = {
        SeverityLevel.CRITICAL: 1,
        SeverityLevel.HIGH:     3,
        SeverityLevel.MEDIUM:   7,
        SeverityLevel.LOW:      14,
    }
    try:
        from datetime import timedelta
        overdue = 0
        for sev, days in _SLA_WINDOWS.items():
            cutoff = datetime.utcnow() - timedelta(days=days)
            overdue += (
                db.query(Vulnerability)
                .filter(
                    Vulnerability.severity == sev,
                    Vulnerability.status == VulnStatus.OPEN,
                    Vulnerability.created_at < cutoff,
                )
                .count()
            )
    except Exception:
        overdue = 0

    # In-progress count — vulnerabilities actively being remediated
    in_progress_count = (
        db.query(Vulnerability)
        .filter(Vulnerability.status == VulnStatus.IN_PROGRESS)
        .count()
    )

    return {
        "overall_score": overall_score,
        "health_score": health_score,
        "counts": counts,
        "total_assets": assets_count,
        "last_scan_id": last_scan_id,
        "overdue_findings": overdue,
        "in_progress_count": in_progress_count,
    }


@router.get("/exposure-trend")
def get_exposure_trend(days: int = 14, db: Session = Depends(get_db)):
    """
    Return daily vulnerability discovery counts for the last N days.
    Counts ALL vulnerabilities (any status) discovered per day so the trend
    reflects real exposure over time rather than filtering by current status.
    """
    from datetime import timedelta, date as date_type
    from sqlalchemy import func, cast, Date as SADate

    end = datetime.utcnow()
    start = end - timedelta(days=days)

    rows = (
        db.query(
            cast(Vulnerability.created_at, SADate).label("day"),
            func.count(Vulnerability.id).label("count"),
        )
        .filter(Vulnerability.created_at >= start)
        .group_by(cast(Vulnerability.created_at, SADate))
        .order_by(cast(Vulnerability.created_at, SADate))
        .all()
    )

    # Build lookup of day → count
    day_counts = {str(r.day): r.count for r in rows}

    # Fill every calendar day in the range (missing days = 0)
    trend = []
    for i in range(days):
        day: date_type = (start + timedelta(days=i + 1)).date()
        trend.append({
            "date": day.strftime("%d %b"),
            "count": day_counts.get(str(day), 0),
        })

    return trend


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
