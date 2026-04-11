"""
Celery scan tasks — Nmap infrastructure scan → Nuclei deep scan → Risk Engine → AI → Event publish.

Key design decisions:
  - All async helpers are called through _run_async() to safely use asyncio inside
    a synchronous Celery worker without nested event-loop conflicts.
  - Each phase (intelligence, nuclei, risk) fails independently so one broken
    integration never aborts the entire scan pipeline.
  - Scan status is always updated (COMPLETED or FAILED) in the finally block.
"""

import asyncio
import logging
from datetime import datetime
from urllib.parse import urlparse

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.scan import Scan, Vulnerability, ScanStatus, ScanAsset, AssetService
from app.services.nmap_wrapper import NmapWrapper
from app.services.event_publisher import publisher

logger = logging.getLogger(__name__)


# ── Async helper ─────────────────────────────────────────────────────────────

def _run_async(coro):
    """
    Run an async coroutine safely from within a synchronous Celery task.
    Creates a fresh event loop and sets it as current to avoid "Future attached
    to a different loop" errors from inherited module-level async engines.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        except Exception:
            pass
        loop.close()
        asyncio.set_event_loop(None)


def _make_async_session():
    """
    Create a fresh async engine + session factory bound to the current event loop.
    Required in Celery workers to avoid the module-level engine's pool being
    attached to the main process's event loop.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.core.config import settings
    engine = create_async_engine(settings.ASYNC_DATABASE_URL, pool_pre_ping=True)
    return engine, async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ── URL / host sanitiser ──────────────────────────────────────────────────────

def _sanitise_target(raw: str) -> str:
    """
    Extract a clean hostname or IP from a URL string.
    Preserves CIDR notation (e.g. 192.168.1.0/24).
    """
    if "://" in raw:
        parsed = urlparse(raw)
        return parsed.hostname or raw.split("/")[0]
    # CIDR — keep as-is
    if "/" in raw and not raw.startswith("/"):
        return raw
    return raw


# ── Main scan task ─────────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def run_scan_task(self, scan_id: int):
    """
    Full scan pipeline:
      1. Nmap  — port/service enumeration
      2. IntelligenceAgent — Gemini AI analysis of findings
      3. Nuclei — template-based vulnerability detection
      4. UnifiedRiskEngine — risk score + action items
      5. AssetMonitor — new device / change detection
      6. EventPublisher — push RISK_UPDATE to WebSocket clients
    """
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if not scan:
        logger.error("Scan %s not found — aborting.", scan_id)
        db.close()
        return

    vuln_count = 0

    try:
        # ── Status: RUNNING ──────────────────────────────────────────────────
        scan.status = ScanStatus.RUNNING
        scan.started_at = datetime.utcnow()
        if scan.configuration is None:
            scan.configuration = {}
        db.commit()

        # ── Resolve target host ──────────────────────────────────────────────
        raw_target = (scan.target.base_url if scan.target else None) or scan.target_url
        if not raw_target:
            raise ValueError(f"No valid target URL for scan {scan_id}")
        clean_target = _sanitise_target(raw_target)

        # ── Phase 1: Nmap ────────────────────────────────────────────────────
        logger.info("[Scan %s] Phase 1: Nmap → %s", scan_id, clean_target)
        scanner = NmapWrapper()
        results = scanner.scan_target(clean_target, scan.scan_type)

        seen_hosts: set[str] = set()
        all_vulns: list[dict] = []

        for host_data in results:
            ip = host_data["ip"]
            if ip in seen_hosts:
                continue
            seen_hosts.add(ip)

            asset = ScanAsset(
                scan_id=scan.id,
                ip_address=ip,
                hostname=host_data.get("hostnames"),
                mac_address=host_data.get("mac"),
                mac_vendor=host_data.get("mac_vendor"),
                os_name=host_data.get("os_name"),
                os_accuracy=host_data.get("os_accuracy"),
                device_type=host_data.get("device_type", "unknown"),
                is_new="true",
            )
            db.add(asset)
            db.flush()

            for port_data in host_data["ports"]:
                db.add(AssetService(
                    asset_id=asset.id,
                    port=port_data["port"],
                    protocol=port_data["protocol"],
                    state=port_data["state"],
                    service_name=port_data["service"],
                    product=port_data["product"],
                    version=port_data["version"],
                    cpe=port_data.get("cpe"),
                    extra_info=port_data.get("extra_info"),
                ))
                vuln = Vulnerability(
                    scan_id=scan.id,
                    host=ip,
                    port=port_data["port"],
                    protocol=port_data["protocol"],
                    service=port_data["service"],
                    type="Service Exposure",
                    severity=port_data["severity"].lower(),
                    url=f"{port_data['protocol']}://{ip}:{port_data['port']}",
                    description=f"Service: {port_data['product']} {port_data['version']}",
                    remediation="Update service or restrict access with firewall rules.",
                )
                db.add(vuln)
                vuln_count += 1
                all_vulns.append({
                    "host": ip,
                    "severity": port_data["severity"].lower(),
                    "cve_id": "",
                    "description": f"Service: {port_data['product']}",
                })

        # ── Phase 2: AI Intelligence (Gemini) ─────────────────────────────
        logger.info("[Scan %s] Phase 2: AI Intelligence analysis", scan_id)
        try:
            from app.services.intelligence_agent import IntelligenceAgent

            async def _ai_analysis():
                _engine, _maker = _make_async_session()
                try:
                    async with _maker() as async_db:
                        await IntelligenceAgent(async_db).batch_analyze(scan.id, results)
                finally:
                    await _engine.dispose()

            _run_async(_ai_analysis())
        except Exception as exc:
            logger.warning("[Scan %s] Intelligence analysis skipped: %s", scan_id, exc)

        # ── Phase 3: Nuclei deep scan ──────────────────────────────────────
        # Use the full URL (raw_target) so Nuclei scans the correct port,
        # not just the sanitised hostname which strips non-standard ports.
        nuclei_target = raw_target if raw_target and "://" in raw_target else clean_target
        logger.info("[Scan %s] Phase 3: Nuclei → %s", scan_id, nuclei_target)
        try:
            from app.services.nuclei_wrapper import NucleiWrapper
            for finding in NucleiWrapper().scan_target(nuclei_target, scan_type=scan.scan_type):
                db.add(Vulnerability(
                    scan_id=scan.id,
                    type=finding["type"],
                    severity=finding["severity"],
                    description=finding["description"],
                    url=finding["url"],
                    host=clean_target,
                    service="http" if "http" in finding["url"] else "unknown",
                    cve_id=finding.get("cve_id", ""),
                    proof_of_concept=str(finding.get("evidence", "")),
                    remediation="Refer to CVE mitigation guidance.",
                    status="OPEN",
                ))
                vuln_count += 1
                all_vulns.append({
                    "host": clean_target,
                    "severity": finding["severity"],
                    "cve_id": finding.get("cve_id", ""),
                    "description": finding["description"],
                })
        except Exception as exc:
            logger.warning("[Scan %s] Nuclei scan skipped: %s", scan_id, exc)

        # ── Phase 4: Risk Engine ───────────────────────────────────────────
        logger.info("[Scan %s] Phase 4: Risk Engine", scan_id)
        try:
            from app.services.unified_risk_engine import UnifiedRiskEngine

            async def _risk_analysis():
                _engine, _maker = _make_async_session()
                try:
                    async with _maker() as async_db:
                        risk_engine = UnifiedRiskEngine(async_db)
                        await risk_engine.update_scan_risk(scan.id)
                        await risk_engine.generate_action_items(scan.id)
                finally:
                    await _engine.dispose()

            _run_async(_risk_analysis())
        except Exception as exc:
            logger.error("[Scan %s] Risk Engine failed: %s", scan_id, exc)

        # ── Phase 5: Asset Monitor ─────────────────────────────────────────
        try:
            from app.services.asset_monitor import AssetMonitor
            AssetMonitor.process_scan_results(db, scan.id, results)
        except Exception as exc:
            logger.warning("[Scan %s] Asset monitor skipped: %s", scan_id, exc)

        # ── Finalise: COMPLETED ────────────────────────────────────────────
        scan.status = ScanStatus.COMPLETED
        scan.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(scan)

        thoughts = scan.agent_thoughts or {}
        _run_async(publisher.publish("RISK_UPDATE", {
            "scan_id": scan.id,
            "overall_score": round(scan.risk_score or 0.0, 2),
            "health_score": round(float(thoughts.get("health_score", 100.0 - (scan.risk_score or 0))), 2),
            "vuln_count": vuln_count,
        }))
        logger.info("[Scan %s] Completed — %d vulnerabilities found.", scan_id, vuln_count)

    except Exception as exc:
        logger.exception("[Scan %s] Fatal error: %s", scan_id, exc)
        scan.status = ScanStatus.FAILED
        scan.risk_score = 0
        try:
            self.retry(exc=exc)
        except Exception:
            pass  # max_retries exceeded — final failure logged above
    finally:
        db.commit()
        db.close()


# ── Periodic scan trigger ─────────────────────────────────────────────────────

@celery_app.task
def trigger_periodic_scan(target: str = "localhost"):
    """Create a new scan record and enqueue it for processing."""
    db = SessionLocal()
    try:
        scan = Scan(target_url=target, scan_type="quick")
        db.add(scan)
        db.commit()
        db.refresh(scan)
        run_scan_task.delay(scan_id=scan.id)
        logger.info("Triggered periodic scan %s for %s", scan.id, target)
    except Exception as exc:
        logger.error("Failed to trigger periodic scan: %s", exc)
    finally:
        db.close()
