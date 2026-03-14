from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ....core.database import get_db, SessionLocal
from ....models.scan import Scan, Vulnerability, ScanAsset, NetworkAsset, ActionItem
from ....services.unified_risk_engine import UnifiedRiskEngine

router = APIRouter()

# --- Schemas ---

class RiskOverview(BaseModel):
    total_assets: int
    high_risk_assets: int
    critical_vulnerabilities: int
    overall_risk_score: float

class ActionItemResponse(BaseModel):
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/risk-overview", response_model=RiskOverview)
def get_risk_overview(db: Session = Depends(get_db)):
    """
    Get high-level risk statistics for the dashboard.
    Triggers a risk recalculation (lazy update).
    """
    engine = UnifiedRiskEngine(db)
    # Trigger recalculation for freshness? Or maybe do it async?
    # For MVP, let's do it on read, but lightweight.
    # Actually, let's skip full recalc on every read to be fast.
    # Just read current state.
    
    assets = db.query(NetworkAsset).all()
    total = len(assets)
    high_risk = sum(1 for a in assets if (a.risk_score or 0) > 50)
    
    # Simple aggregation of vulnerability counts (mock logic for now if not joined)
    # Ideally link to Vulnerability table
    # This is a placeholder for the "Overall Risk" gauge
    avg_risk = sum((a.risk_score or 0) for a in assets) / total if total > 0 else 0
    
    return {
        "total_assets": total,
        "high_risk_assets": high_risk,
        "critical_vulnerabilities": 0, # TODO: specific query
        "overall_risk_score": avg_risk
    }

@router.get("/actions", response_model=List[ActionItemResponse])
def get_action_items(status: str = "OPEN", db: Session = Depends(get_db)):
    """
    Get prioritized list of action items.
    """
    # Helper to ensure we have fresh actions
    engine = UnifiedRiskEngine(db)
    
    actions = db.query(ActionItem).filter(
        ActionItem.status == status
    ).order_by(
        # Custom sort order: CRITICAL > HIGH > MEDIUM > LOW
        # SQLA encoding dependent, usually string sort works if named right
        # Or add numeric priority column
        ActionItem.priority.desc() 
    ).all()
    
    return actions

@router.post("/refresh-risk")
def refresh_risk_scores(db: Session = Depends(get_db)):
    """
    Force a recalculation of all risk scores by evaluating the latest scans.
    """
    engine = UnifiedRiskEngine(db)
    scans = db.query(Scan).limit(20).all()
    for s in scans:
        engine.update_scan_risk(s.id)
        engine.generate_action_items(s.id)
    return {"status": "Risk scores updated"}
