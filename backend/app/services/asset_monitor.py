"""
Asset Monitor Service - Phase 2
Tracks network assets over time and detects changes.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.scan import NetworkAsset, ActionItem, Vulnerability, VulnStatus
from app.services.asset_dedup import (
    find_existing_asset,
    apply_freshest_state,
    collapse_duplicate_assets,
)
import logging

logger = logging.getLogger(__name__)


# ── Per-asset risk recomputation ────────────────────────────────────────────
# The scan pipeline persists Vulnerability rows but historically left
# NetworkAsset.risk_score and NetworkAsset.criticality at their insert
# defaults (0.0 and MEDIUM) forever. That meant the dashboard topology
# could never show a host as CRITICAL no matter what the scan found.
# This recomputes both fields from the asset's currently OPEN
# vulnerabilities so the topology + KPIs reflect actual findings.
def _recompute_asset_risk(db: Session, ip_addresses) -> int:
    """Recompute risk_score + criticality for each given IP from open vulns.
    Returns the number of assets whose values actually changed."""
    if not ip_addresses:
        return 0
    ips = list(ip_addresses)
    assets = db.query(NetworkAsset).filter(NetworkAsset.ip_address.in_(ips)).all()
    if not assets:
        return 0

    # Bulk-pull open vulns grouped by host so we issue ONE query, not N.
    rows = (
        db.query(
            Vulnerability.host,
            Vulnerability.severity,
            func.count(Vulnerability.id),
            func.max(Vulnerability.cvss_score),
        )
        .filter(
            Vulnerability.host.in_(ips),
            Vulnerability.status == VulnStatus.OPEN,
        )
        .group_by(Vulnerability.host, Vulnerability.severity)
        .all()
    )

    # Reshape into {ip: {severity_key: count, "_max_cvss": float}}
    per_host = {}
    for host, severity, count, max_cvss in rows:
        if not host:
            continue
        bucket = per_host.setdefault(host, {
            "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "_max_cvss": 0.0,
        })
        sev_key = (severity.value if hasattr(severity, "value") else severity or "").lower()
        if sev_key in bucket:
            bucket[sev_key] += int(count or 0)
        bucket["_max_cvss"] = max(bucket["_max_cvss"], float(max_cvss or 0.0))

    changed = 0
    for asset in assets:
        b = per_host.get(asset.ip_address, {
            "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "_max_cvss": 0.0,
        })

        # Criticality = worst non-INFO severity present. No actionable vulns → LOW.
        if   b["critical"] > 0: new_crit = "CRITICAL"
        elif b["high"]     > 0: new_crit = "HIGH"
        elif b["medium"]   > 0: new_crit = "MEDIUM"
        elif b["low"]      > 0: new_crit = "LOW"
        else:                   new_crit = "LOW"

        # Risk score (0-100). Prefer CVSS-derived when available; otherwise
        # fall back to a severity-weighted count so colours still differentiate.
        max_cvss = b["_max_cvss"]
        if max_cvss > 0:
            score = min(100.0, max_cvss * 10.0)
        else:
            score = float(min(
                100,
                b["critical"] * 25 + b["high"] * 15 + b["medium"] * 7 + b["low"] * 3,
            ))

        prev_crit  = (asset.criticality.value if hasattr(asset.criticality, "value") else asset.criticality)
        prev_score = float(asset.risk_score or 0.0)
        if prev_crit != new_crit or abs(prev_score - score) > 0.5:
            asset.criticality = new_crit
            asset.risk_score = score
            changed += 1

    return changed

class AssetMonitor:
    """
    Compares current scan results with historical data to detect:
    1. New devices (never seen before)
    2. Port changes (new ports opened on existing devices)
    3. Devices that went offline
    """
    
    @staticmethod
    def process_scan_results(db: Session, scan_id: int, scan_results: list):
        """
        Main entry point. Takes scan results and updates the persistent inventory.
        Returns a list of detected events (for action items).
        """
        # Hostnames of OSC stack containers — skip them from the asset inventory.
        # These appear when backend/celery are connected to the lab subnets for scanning.
        _EXCLUDE_HOSTNAME_FRAGMENTS = (
            'sme_dashboard_backend', 'sme_dashboard_beat',
            'sme_dashboard_celery', 'sme_dashboard_',
        )
        # Known lab container name prefixes — these are always kept.
        _LAB_PREFIXES = (
            'lab_webserver', 'lab_api_gateway', 'lab_dns_server',
            'lab_fileserver', 'lab_mailserver', 'lab_workstation',
            'lab_database', 'lab_redis_cache', 'lab_log_shipper',
            'lab_traffic_gen',
        )

        events = []
        current_ips = set()

        for host_data in scan_results:
            ip = host_data.get('ip')
            if not ip:
                continue

            hostname = (host_data.get('hostnames') or '').lower()

            # Always skip the Docker subnet gateway (.1 of each subnet)
            if ip.rsplit('.', 1)[-1] == '1':
                continue

            # Keep known lab containers regardless of anything else
            is_lab = any(hostname.startswith(p) for p in _LAB_PREFIXES)

            # Skip OSC stack containers (backend, celery, beat, caddy…)
            if not is_lab and any(frag in hostname for frag in _EXCLUDE_HOSTNAME_FRAGMENTS):
                continue

            # Skip unknown hosts whose hostname is a raw container-id (12 hex chars)
            # and that are NOT a known lab device — these are internal infra containers.
            import re as _re
            if not is_lab and _re.fullmatch(r'[0-9a-f]{12}', hostname):
                continue
                
            current_ips.add(ip)

            # Get current open ports from scan
            current_ports = ",".join(sorted([str(p.get('port')) for p in host_data.get('ports', []) if p.get('state') == 'open']))

            # Reconcile against the persistent inventory using a layered identity
            # (IP → MAC → meaningful hostname) so a device that changed IP is
            # matched onto its existing node instead of creating a duplicate.
            mac      = host_data.get('mac')
            hostname = host_data.get('hostnames')
            existing_asset = find_existing_asset(db, ip, mac, hostname)

            if existing_asset:
                # Device already known - check for changes
                old_ip    = existing_asset.ip_address
                old_ports = existing_asset.open_ports or ""

                # Port Change Detection
                if current_ports != old_ports:
                    new_ports = set(current_ports.split(",")) - set(old_ports.split(","))
                    if new_ports and new_ports != {''}:
                        event = {
                            "type": "alert",
                            "priority": "MEDIUM",
                            "title": f"New ports opened on {ip}",
                            "description": f"Ports {', '.join(new_ports)} were recently opened on this device."
                        }
                        events.append(event)
                        logger.info(f"Port change detected on {ip}: {new_ports}")

                # Merge the freshest observed state onto the existing node.
                ip_changed = apply_freshest_state(
                    existing_asset,
                    ip=ip,
                    mac=mac,
                    hostname=hostname,
                    os_name=host_data.get('os_name'),
                    device_type=host_data.get('device_type'),
                    open_ports=current_ports,
                )

                # Surface a DHCP move as an alert rather than a phantom new device.
                if ip_changed:
                    events.append({
                        "type": "alert",
                        "priority": "MEDIUM",
                        "title": f"Device changed IP: {old_ip} → {ip}",
                        "description": f"{hostname or mac or 'A known device'} moved from {old_ip} to {ip}.",
                    })
                    logger.info(f"Device IP change reconciled: {old_ip} -> {ip}")

            else:
                # NEW DEVICE DETECTED!
                new_asset = NetworkAsset(
                    ip_address=ip,
                    mac_address=mac,
                    hostname=hostname,
                    os_name=host_data.get('os_name'),
                    device_type=host_data.get('device_type', 'unknown'),
                    first_seen=datetime.utcnow(),
                    last_seen=datetime.utcnow(),
                    open_ports=current_ports
                )
                db.add(new_asset)

                event = {
                    "type": "new_device",
                    "priority": "HIGH",
                    "title": f"New device discovered: {ip}",
                    "description": f"A new device ({hostname or 'Unknown'}) has appeared on the network."
                }
                events.append(event)
                logger.info(f"New device discovered: {ip}")
        
        # Mark offline only assets that share the SAME /24 subnet as the scanned IPs.
        # This prevents a DMZ scan from marking CORP/DATA/MGMT assets as offline.
        if current_ips:
            scanned_subnets = {'.'.join(ip.split('.')[:3]) for ip in current_ips}
            previously_active = db.query(NetworkAsset).filter(
                NetworkAsset.status == "active"
            ).all()
            for asset in previously_active:
                asset_subnet = '.'.join(asset.ip_address.split('.')[:3])
                if asset_subnet in scanned_subnets and asset.ip_address not in current_ips:
                    asset.status = "offline"

        # Collapse any pre-existing duplicate rows (same device seen under
        # multiple IPs before reconciliation existed) into one node. Flush
        # first so freshly-added NEW assets are visible to the grouping query.
        try:
            db.flush()
            removed = collapse_duplicate_assets(db)
            if removed:
                logger.info("De-duplicated %d stale asset row(s)", removed)
        except Exception as exc:
            logger.warning("Asset de-duplication pass failed: %s", exc)

        # Create Action Items from events
        for event in events:
            action = ActionItem(
                scan_id=scan_id,
                title=event["title"],
                description=event["description"],
                priority=event["priority"],
                type=event["type"]
            )
            db.add(action)

        # Recompute per-asset risk_score + criticality from the vulnerabilities
        # this (and any prior) scan persisted. Run BEFORE the final commit so
        # all status/criticality/risk updates land in one transaction and the
        # topology regeneration that follows reads consistent data.
        try:
            ips_to_score = set(current_ips)
            # Also rescore any assets we just marked offline so their
            # historical risk is reflected if they later come back up.
            try:
                changed = _recompute_asset_risk(db, ips_to_score)
                if changed:
                    logger.info("Recomputed risk/criticality for %d asset(s)", changed)
            except Exception as exc:
                logger.warning("Per-asset risk recompute failed: %s", exc)
        except Exception as exc:
            logger.warning("Risk recompute setup failed: %s", exc)

        db.commit()

        # Regenerate the topology diagram now that assets have changed
        try:
            from app.services.topology_generator import generate_and_cache
            generate_and_cache(db)
        except Exception as exc:
            logger.warning("Topology regeneration failed: %s", exc)

        return events
