from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.scan import NetworkAsset, ScanAsset, AssetService, Vulnerability

router = APIRouter()


class NetworkAssetResponse(BaseModel):
    id: int
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    device_type: str
    status: str
    first_seen: datetime
    last_seen: datetime
    open_ports: Optional[str] = None
    criticality: Optional[str] = "MEDIUM"
    risk_score: float = 0.0

    class Config:
        from_attributes = True


@router.get("/assets", response_model=List[NetworkAssetResponse])
def get_network_inventory(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(NetworkAsset)
    if status:
        query = query.filter(NetworkAsset.status == status)
    return query.order_by(NetworkAsset.last_seen.desc()).all()


@router.get("/assets/new", response_model=List[NetworkAssetResponse])
def get_new_devices(db: Session = Depends(get_db)):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    return (
        db.query(NetworkAsset)
        .filter(NetworkAsset.first_seen >= cutoff)
        .order_by(NetworkAsset.first_seen.desc())
        .all()
    )


@router.get("/assets/{asset_id}")
def get_asset_detail(asset_id: int, db: Session = Depends(get_db)):
    """Return full asset detail including services and recent vulnerabilities."""
    asset = db.query(NetworkAsset).filter(NetworkAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Pull services from the most recent scan that covered this IP
    # Join to scans to order by completion time
    from app.models.scan import Scan as _Scan
    latest_scan_asset = (
        db.query(ScanAsset)
        .join(_Scan, _Scan.id == ScanAsset.scan_id)
        .filter(ScanAsset.ip_address == asset.ip_address)
        .order_by(_Scan.completed_at.desc().nullslast())
        .first()
    )
    services = []
    os_family = None
    uptime = None
    mac_vendor = None
    if latest_scan_asset:
        mac_vendor = getattr(latest_scan_asset, "mac_vendor", None)
        os_family = getattr(latest_scan_asset, "os_family", None)
        uptime = getattr(latest_scan_asset, "uptime", None)
        rows = (
            db.query(AssetService)
            .filter(AssetService.asset_id == latest_scan_asset.id, AssetService.state == "open")
            .order_by(AssetService.port)
            .all()
        )
        services = [
            {
                "port": r.port,
                "protocol": r.protocol,
                "state": r.state,
                "service_name": r.service_name,
                "product": r.product or "",
                "version": r.version or "",
                "cpe": r.cpe or "",
            }
            for r in rows
        ]

    # Vulnerabilities linked to this IP
    vulns = (
        db.query(Vulnerability)
        .filter(Vulnerability.host == asset.ip_address)
        .order_by(Vulnerability.severity)
        .limit(50)
        .all()
    )
    vuln_list = [
        {
            "id": str(v.id),
            "title": v.title or v.type or "Vulnerability",
            "severity": str(v.severity.value if hasattr(v.severity, "value") else v.severity).lower(),
            "type": v.type or "",
            "url": v.url or "",
            "cve_id": v.cve_id or "",
            "description": v.simplified_description or v.description or "",
            "status": str(v.status.value if hasattr(v.status, "value") else v.status).lower(),
        }
        for v in vulns
    ]

    return {
        "id": asset.id,
        "ip_address": asset.ip_address,
        "hostname": asset.hostname,
        "mac_address": asset.mac_address,
        "mac_vendor": mac_vendor,
        "os_name": asset.os_name,
        "os_family": os_family,
        "device_type": asset.device_type,
        "status": asset.status,
        "criticality": str(asset.criticality.value if hasattr(asset.criticality, "value") else asset.criticality) if asset.criticality else "MEDIUM",
        "risk_score": asset.risk_score or 0.0,
        "open_ports": asset.open_ports,
        "first_seen": asset.first_seen.isoformat() if asset.first_seen else None,
        "last_seen": asset.last_seen.isoformat() if asset.last_seen else None,
        "uptime": uptime,
        "services": services,
        "vulnerabilities": vuln_list,
        "vuln_count": len(vuln_list),
    }


@router.get("/activity")
def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    from app.models.scan import ActionItem
    events = (
        db.query(ActionItem)
        .filter(ActionItem.type.in_(["new_device", "alert"]))
        .order_by(ActionItem.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "type": e.type,
            "title": e.title,
            "description": e.description,
            "priority": e.priority,
            "timestamp": e.created_at,
        }
        for e in events
    ]
