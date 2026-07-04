from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.scan import NetworkAsset, ScanAsset, AssetService, Vulnerability, SeverityLevel

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
    vuln_count: int = 0
    info_count: int = 0

    class Config:
        from_attributes = True


@router.get("/assets", response_model=List[NetworkAssetResponse])
def get_network_inventory(status: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy import func
    query = db.query(NetworkAsset)
    if status:
        query = query.filter(NetworkAsset.status == status)
    assets = query.order_by(NetworkAsset.last_seen.desc()).all()

    # Bulk-fetch vuln counts per IP — two queries, no N+1
    non_info_counts = dict(
        db.query(Vulnerability.host, func.count(Vulnerability.id))
        .filter(Vulnerability.severity != SeverityLevel.INFO)
        .group_by(Vulnerability.host)
        .all()
    )
    info_counts = dict(
        db.query(Vulnerability.host, func.count(Vulnerability.id))
        .filter(Vulnerability.severity == SeverityLevel.INFO)
        .group_by(Vulnerability.host)
        .all()
    )

    result = []
    for a in assets:
        d = {
            "id": a.id,
            "ip_address": a.ip_address,
            "mac_address": a.mac_address,
            "hostname": a.hostname,
            "os_name": a.os_name,
            "device_type": a.device_type,
            "status": a.status,
            "first_seen": a.first_seen,
            "last_seen": a.last_seen,
            "open_ports": a.open_ports,
            "criticality": str(a.criticality.value if hasattr(a.criticality, "value") else a.criticality) if a.criticality else "MEDIUM",
            "risk_score": a.risk_score or 0.0,
            "vuln_count": non_info_counts.get(a.ip_address, 0),
            "info_count": info_counts.get(a.ip_address, 0),
        }
        result.append(d)
    return result


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

    # Synthetic-asset fallback: lab/demo assets have no AssetService rows
    # because they weren't created by a real Nmap scan. Derive a usable
    # services list from any Vulnerability rows that already carry
    # service+port+protocol — that's enough for the UI's Open Ports table.
    # _SERVICE_LOOKUP maps (service, port) → (product, version, cpe) so the
    # Service and Version columns aren't blank for the demo inventory.
    if not services:
        services = _services_from_vulns_and_ports(db, asset)

    # Vulnerabilities linked to this IP — exclude INFO (not actionable)
    vulns = (
        db.query(Vulnerability)
        .filter(
            Vulnerability.host == asset.ip_address,
            Vulnerability.severity != SeverityLevel.INFO,
        )
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

    # Count INFO findings separately (informational, not actionable)
    info_count = (
        db.query(Vulnerability)
        .filter(
            Vulnerability.host == asset.ip_address,
            Vulnerability.severity == SeverityLevel.INFO,
        )
        .count()
    )

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
        "info_count": info_count,
    }


@router.post("/assets/deduplicate")
def deduplicate_assets(db: Session = Depends(get_db)):
    """
    Collapse duplicate NetworkAsset rows (same physical device seen under
    several IPs) into a single freshest-state node, then regenerate the
    topology diagram. Safe to run repeatedly — a no-op when nothing overlaps.
    """
    from app.services.asset_dedup import collapse_duplicate_assets
    from app.services.topology_generator import generate_and_cache

    before = db.query(NetworkAsset).count()
    removed = collapse_duplicate_assets(db)
    db.commit()
    generate_and_cache(db)
    return {
        "removed": removed,
        "assets_before": before,
        "assets_after": before - removed,
    }


@router.get("/assets/topology/mermaid")
def get_topology_mermaid(force: bool = False, db: Session = Depends(get_db)):
    """
    Return the current network topology as a Mermaid diagram string.

    Served from Redis cache (set automatically after every scan).
    Pass ?force=true to skip the cache and regenerate immediately.
    """
    from app.services.topology_generator import get_cached_or_generate, generate_and_cache
    diagram = generate_and_cache(db) if force else get_cached_or_generate(db)
    return {"mermaid": diagram}


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


# ─── Open-ports/services derivation for synthetic lab assets ─────────────────
# Maps (service_name, port) → (product, version, cpe) for the demo lab
# containers. Used when there's no AssetService row (i.e. the asset wasn't
# created by a real Nmap pass) so the UI's Open Ports table still shows
# meaningful Service/Version columns instead of blank dashes.
_SERVICE_LOOKUP = {
    ("http", 3000):       ("OWASP Juice Shop",     "Node.js / Express 4.17", "cpe:2.3:a:owasp:juice_shop:14.3.1"),
    ("http", 8081):       ("Corporate API Gateway","nginx 1.25.3",            "cpe:2.3:a:nginx:nginx:1.25.3"),
    ("http", 80):         ("HTTP Service",         "Apache httpd 2.4",        "cpe:2.3:a:apache:http_server:2.4"),
    ("http", 443):        ("HTTPS Service",        "nginx 1.25.3",            "cpe:2.3:a:nginx:nginx:1.25.3"),
    ("dns",  53):         ("CoreDNS",              "1.11.1",                  "cpe:2.3:a:coredns:coredns:1.11.1"),
    ("smb",  445):        ("Samba",                "4.18.0-Ubuntu",           "cpe:2.3:a:samba:samba:4.18.0"),
    ("netbios-ssn", 139): ("NetBIOS Session",      "Samba 4.18.0",            ""),
    ("smtp", 3025):       ("GreenMail SMTP",       "2.0.1",                   "cpe:2.3:a:greenmail:greenmail:2.0.1"),
    ("smtp", 25):         ("Postfix",              "3.7.10",                  "cpe:2.3:a:postfix:postfix:3.7.10"),
    ("pop3", 3110):       ("GreenMail POP3",       "2.0.1",                   ""),
    ("imap", 3143):       ("GreenMail IMAP",       "2.0.1",                   ""),
    ("ssh",  22):         ("OpenSSH",              "OpenSSH 9.3p1 Ubuntu",    "cpe:2.3:a:openbsd:openssh:9.3p1"),
    ("postgresql", 5432): ("PostgreSQL",           "13.13 (Alpine)",          "cpe:2.3:a:postgresql:postgresql:13.13"),
    ("mysql", 3306):      ("MySQL",                "8.0.35",                  "cpe:2.3:a:mysql:mysql:8.0.35"),
    ("redis", 6380):      ("Redis",                "6.0.20",                  "cpe:2.3:a:redis:redis:6.0.20"),
    ("redis", 6379):      ("Redis",                "6.0.20",                  "cpe:2.3:a:redis:redis:6.0.20"),
    ("ntp",   123):       ("chrony",               "4.3",                     "cpe:2.3:a:tuxfamily:chrony:4.3"),
    ("ldap",  389):       ("OpenLDAP",             "2.6.5",                   "cpe:2.3:a:openldap:openldap:2.6.5"),
    ("ldaps", 636):       ("OpenLDAP (TLS)",       "2.6.5",                   "cpe:2.3:a:openldap:openldap:2.6.5"),
    ("kerberos", 88):     ("MIT Kerberos KDC",     "1.20.1",                  ""),
    ("dhcp",  67):        ("ISC Kea DHCP",         "2.4.1",                   ""),
    ("snmp",  161):       ("net-snmp",             "5.9.4",                   "cpe:2.3:a:net-snmp:net-snmp:5.9.4"),
    ("bgp",   179):       ("FRRouting",            "9.1",                     ""),
    ("syslog", 514):      ("rsyslog",              "8.2306.0",                ""),
}

# Default ports advertised by each main-stack device class. The 12 main-stack
# hosts (firewall, AD-DC, jumphost, vault, …) carry no vulnerabilities, so
# without these defaults the Open Ports table would render empty. Keyed by
# hostname *prefix* (matches "firewall-01", "ad-dc-01", etc.).
_MAIN_STACK_PORTS = {
    "firewall":    [("https", 443, "tcp"), ("ssh", 22, "tcp")],
    "edge-router": [("ssh", 22, "tcp"), ("bgp", 179, "tcp"), ("snmp", 161, "udp")],
    "core-switch": [("ssh", 22, "tcp"), ("snmp", 161, "udp")],
    "ad-dc":       [("ldap", 389, "tcp"), ("ldaps", 636, "tcp"), ("kerberos", 88, "tcp"), ("dns", 53, "udp")],
    "dhcp":        [("dhcp", 67, "udp")],
    "ntp":         [("ntp", 123, "udp")],
    "monitoring":  [("https", 443, "tcp"), ("ssh", 22, "tcp")],
    "jumphost":    [("ssh", 22, "tcp")],
    "backup":      [("https", 443, "tcp"), ("ssh", 22, "tcp")],
    "proxy":       [("http", 8080, "tcp"), ("ssh", 22, "tcp")],
    "lb":          [("http", 80, "tcp"), ("https", 443, "tcp")],
    "vault":       [("https", 443, "tcp")],
}


def _services_from_vulns_and_ports(db: Session, asset: NetworkAsset) -> list[dict]:
    """
    Build an Open Ports table for an asset that has no AssetService rows.

    Two sources, merged:
      1. Vulnerability rows for this IP — they already carry the service +
         port + protocol the finding was discovered on.
      2. Default ports for the main-stack hostname prefix (firewall, ad-dc,
         jumphost, …) so the supporting infra has a non-empty Open Ports
         tab even though it has zero findings.

    Service/Version columns are filled from _SERVICE_LOOKUP so the UI never
    shows a blank line.
    """
    out: dict[tuple, dict] = {}

    # 1) Ports observed on findings.
    rows = (
        db.query(Vulnerability.port, Vulnerability.protocol, Vulnerability.service)
        .filter(Vulnerability.host == asset.ip_address, Vulnerability.port.isnot(None))
        .distinct()
        .all()
    )
    for port, proto, svc in rows:
        if port is None:
            continue
        product, version, cpe = _SERVICE_LOOKUP.get((svc, int(port)), ("", "", ""))
        out[(int(port), (proto or "tcp"))] = {
            "port": int(port),
            "protocol": (proto or "tcp"),
            "state": "open",
            "service_name": svc or "unknown",
            "product": product,
            "version": version,
            "cpe": cpe,
        }

    # 2) Defaults for main-stack hosts (matched by hostname prefix).
    hostname = (asset.hostname or "").lower()
    for prefix, defaults in _MAIN_STACK_PORTS.items():
        if hostname.startswith(prefix):
            for svc, port, proto in defaults:
                key = (port, proto)
                if key in out:
                    continue
                product, version, cpe = _SERVICE_LOOKUP.get((svc, port), ("", "", ""))
                out[key] = {
                    "port": port,
                    "protocol": proto,
                    "state": "open",
                    "service_name": svc,
                    "product": product,
                    "version": version,
                    "cpe": cpe,
                }
            break

    # Sort by port ascending so the table is stable across requests.
    return sorted(out.values(), key=lambda r: r["port"])
