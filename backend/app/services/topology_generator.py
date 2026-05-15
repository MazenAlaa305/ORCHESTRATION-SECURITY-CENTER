"""
Topology Generator — auto-builds a Mermaid diagram from NetworkAsset DB records.

Called automatically by AssetMonitor after every scan. Result is cached in
Redis (key: osc:topology:mermaid, TTL 1 h) so the API endpoint is instant.

Color palette mirrors NetworkTopology.jsx exactly:
  critical    → #ff0055  (risk >= 75 or CRITICAL)
  high        → #ff6a00  (risk >= 50 or HIGH)
  warning     → #ffaa00  (risk >= 20 or MEDIUM)
  operational → #00ff88  (low / clean)
  hub         → #00ffff  (gateway hub node)
"""

import logging
from typing import List
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

REDIS_KEY = "osc:topology:mermaid"

_ZONE_MAP = {
    "10.10.10.": ("DMZ",  "🌐 DMZ — 10.10.10.0/24"),
    "10.10.20.": ("CORP", "🏢 CORP — 10.10.20.0/24"),
    "10.10.30.": ("DATA", "🗄 DATA — 10.10.30.0/24"),
    "10.10.40.": ("MGMT", "📡 MGMT — 10.10.40.0/24"),
    "172.":      ("DASH", "🖥 Dashboard Stack"),
    "192.168.":  ("LAN",  "🔌 LAN"),
}

_DEVICE_ICONS = {
    "database":    "🗄",
    "cache":       "⚡",
    "router":      "🌐",
    "gateway":     "🔀",
    "firewall":    "🛡",
    "server":      "🖥",
    "workstation": "💻",
    "desktop":     "💻",
    "mobile":      "📱",
    "printer":     "🖨",
}


def _infer_zone(ip: str):
    for prefix, (zone_id, zone_label) in _ZONE_MAP.items():
        if ip.startswith(prefix):
            return zone_id, zone_label
    return "OTHER", "🔷 Other"


def _infer_device_type(asset) -> str:
    t     = (asset.device_type or "").lower()
    os_   = (asset.os_name     or "").lower()
    ports = asset.open_ports   or ""

    if "database" in t or "db" in t:                                        return "database"
    if "cache" in t or "redis" in t:                                        return "cache"
    if any(p in ports for p in ["5432", "3306", "27017", "1521", "1433"]): return "database"
    if "6379" in ports or "6380" in ports:                                  return "cache"
    if "router" in t or "gateway" in t or "wap" in t:                      return "router"
    if "firewall" in t:                                                     return "firewall"
    if "workstation" in t or "desktop" in t or "windows" in os_:           return "workstation"
    if "mobile" in t or "ios" in os_ or "android" in os_:                  return "mobile"
    if "server" in t or "linux" in os_ or "ubuntu" in os_ or "debian" in os_: return "server"
    return "server"


def _risk_class(asset) -> str:
    score = asset.risk_score or 0.0
    crit  = str(asset.criticality or "").upper()
    if score >= 75 or crit == "CRITICAL": return "critical"
    if score >= 50 or crit == "HIGH":     return "high"
    if score >= 20 or crit == "MEDIUM":   return "warning"
    return "operational"


def _node_shape(device_type: str, label: str) -> str:
    if device_type in ("database", "cache"):
        return f'[("{label}")]'   # Mermaid cylinder
    if device_type in ("router", "gateway"):
        return f'{{{{{label}}}}}'  # Mermaid hexagon
    if device_type == "firewall":
        return f'[/"{label}"/]'   # Mermaid trapezoid
    return f'["{label}"]'         # default rectangle


def build_mermaid(assets: list) -> str:
    """Build Mermaid graph TD from a list of NetworkAsset ORM objects."""
    if not assets:
        return 'graph TD\n    EMPTY["No assets discovered yet\\nRun a network scan to populate"]'

    lines = ["graph TD"]
    lines.append('    HUB(["🔵 Gateway Hub"]):::hub')

    # Group nodes by zone
    zones: dict[str, dict] = {}
    for asset in assets:
        zone_id, zone_label = _infer_zone(asset.ip_address)
        dtype      = _infer_device_type(asset)
        icon       = _DEVICE_ICONS.get(dtype, "❓")
        risk_cls   = _risk_class(asset)

        name       = (asset.hostname or asset.ip_address)[:24]
        ports_str  = f":{asset.open_ports}" if asset.open_ports else ""
        os_str     = (asset.os_name or "")[:20]

        # Build the multi-line node label (\\n is Mermaid newline inside quotes)
        label_parts = [f"{icon} {name}", f"{asset.ip_address}{ports_str}"]
        if os_str:
            label_parts.append(os_str)
        label = "\\n".join(label_parts)

        safe_id   = f"N{asset.id}"
        shape_str = _node_shape(dtype, label)
        node_line = f"    {safe_id}{shape_str}:::{risk_cls}"

        if zone_id not in zones:
            zones[zone_id] = {"label": zone_label, "nodes": [], "sg_id": f"SG_{zone_id}"}
        zones[zone_id]["nodes"].append(node_line)

    # Write subgraphs then hub edges
    for zone_id, zone in zones.items():
        lines.append(f'    subgraph {zone["sg_id"]} ["{zone["label"]}"]')
        for node_line in zone["nodes"]:
            lines.append(f"    {node_line.strip()}")
        lines.append("    end")

    lines.append("")
    for zone in zones.values():
        lines.append(f'    HUB --> {zone["sg_id"]}')

    # classDef — exact colours from NetworkTopology.jsx / TopologyLegend.jsx
    lines.append("")
    lines.append("    classDef hub         fill:#06b6d4,color:#000,stroke:#00ffff,stroke-width:2px")
    lines.append("    classDef critical    fill:#1a0510,color:#ff0055,stroke:#ff0055,stroke-width:2px")
    lines.append("    classDef high        fill:#1a1005,color:#ff6a00,stroke:#ff6a00,stroke-width:2px")
    lines.append("    classDef warning     fill:#1a1205,color:#ffaa00,stroke:#ffaa00,stroke-width:1.5px")
    lines.append("    classDef operational fill:#051a10,color:#00ff88,stroke:#00ff88,stroke-width:1px")

    return "\n".join(lines)


def generate_and_cache(db: Session) -> str:
    """Regenerate diagram from DB and write to Redis. Returns the diagram string."""
    from app.models.scan import NetworkAsset
    assets  = db.query(NetworkAsset).filter(NetworkAsset.status == "active").all()
    diagram = build_mermaid(assets)

    try:
        import redis as _redis
        from app.core.config import settings
        r = _redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.set(REDIS_KEY, diagram, ex=3600)
        r.close()
        logger.info("Topology diagram cached (%d assets, %d chars)", len(assets), len(diagram))
    except Exception as exc:
        logger.warning("Redis unavailable — topology not cached: %s", exc)

    return diagram


def get_cached_or_generate(db: Session) -> str:
    """Return cached diagram from Redis, or regenerate from DB if cache is empty."""
    try:
        import redis as _redis
        from app.core.config import settings
        r = _redis.from_url(settings.REDIS_URL, decode_responses=True)
        cached = r.get(REDIS_KEY)
        r.close()
        if cached:
            return cached
    except Exception:
        pass
    return generate_and_cache(db)
