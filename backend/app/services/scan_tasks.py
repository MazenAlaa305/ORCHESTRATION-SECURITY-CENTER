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
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.scan import Scan, Vulnerability, ScanStatus, ScanAsset, AssetService, Target, SeverityLevel, VulnStatus
from app.services.nmap_wrapper import NmapWrapper
from app.services.event_publisher import publisher
from sqlalchemy import select

logger = logging.getLogger(__name__)


# ── Agent log writer ──────────────────────────────────────────────────────────

def _write_agent_log(db, scan_id: str, agent_name: str, action: str,
                     reasoning=None, input_data=None, output_data=None):
    """Write a tamper-evident AgentLog entry using the sync SQLAlchemy session."""
    import hashlib, json as _json
    from app.models.scan import AgentLog

    prev_row = db.query(AgentLog.this_hash).filter(
        AgentLog.scan_id == scan_id
    ).order_by(AgentLog.id.desc()).first()
    prev_hash = prev_row[0] if prev_row and prev_row[0] else "0" * 64

    payload = _json.dumps(
        {"scan_id": scan_id, "agent_name": agent_name, "action": action, "reasoning": reasoning},
        sort_keys=True, ensure_ascii=True,
    )
    this_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()

    entry = AgentLog(
        scan_id=scan_id,
        agent_name=agent_name,
        action=action,
        reasoning=reasoning,
        input_data=input_data,
        output_data=output_data,
        prev_hash=prev_hash,
        this_hash=this_hash,
    )
    db.add(entry)
    db.commit()
    logger.info("[AgentLog] %s | %s | hash=%s", agent_name, action, this_hash[:12])


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


# ── Redis concurrency lock (Phase 2.4) ───────────────────────────────────────────────

def _acquire_scan_lock(target_id: str) -> bool:
    """
    Acquire a Redis SETNX lock for *target_id*.

    Returns True if the lock was acquired (scan may proceed).
    Returns False if another scan is already running for this target.
    TTL is 90 minutes — longer than any expected scan duration.
    """
    try:
        import redis as _redis
        r = _redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        acquired = r.set(f"scan_lock:{target_id}", "1", nx=True, ex=5400)
        r.close()
        return bool(acquired)
    except Exception as exc:
        # If Redis is unreachable, allow the scan to proceed rather than
        # silently blocking all scans.  Log a warning so ops can investigate.
        logger.warning("scan_lock: Redis unreachable (%s) — skipping lock check.", exc)
        return True


def _release_scan_lock(target_id: str) -> None:
    """Release the Redis concurrency lock for *target_id*."""
    try:
        import redis as _redis
        r = _redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        r.delete(f"scan_lock:{target_id}")
        r.close()
    except Exception as exc:
        logger.warning("scan_lock: could not release lock for %s: %s", target_id, exc)


# ── AI orchestrator pipeline (called from run_scan_task when mode='ai') ───────

async def _run_ai_pipeline(scan_id: str) -> None:
    """
    Run the full AgentOrchestrator pipeline for a single scan.

    This is an *async* function executed inside a fresh event loop by
    _run_async() so it is safe to call from a synchronous Celery worker.
    Uses _make_async_session() to avoid the module-level engine pool being
    attached to the main process's event loop.
    """
    from app.services.agent_orchestrator import AgentOrchestrator

    engine, maker = _make_async_session()
    try:
        async with maker() as db:
            scan_res = await db.execute(select(Scan).filter(Scan.id == scan_id))
            scan = scan_res.scalars().first()
            if not scan:
                logger.error("[AI pipeline] Scan %s not found — aborting.", scan_id)
                return
            target_url = (scan.target.base_url if scan.target else None) or scan.target_url
            auth_credentials = scan.target.auth_credentials if scan.target else None
            if not target_url:
                logger.error("[AI pipeline] Scan %s has no target URL — aborting.", scan_id)
                return
            orchestrator = AgentOrchestrator(scan_id, db)
            await orchestrator.run_full_scan(target_url, auth_credentials)
    finally:
        await engine.dispose()


# ── Main scan task ─────────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def run_scan_task(self, scan_id: str, mode: str = "nmap"):
    """
    Unified scan task — dispatches to the correct pipeline based on `mode`.

    mode='nmap'  (default): Nmap → Nuclei → Risk Engine → Asset Monitor
    mode='ai':              Full AgentOrchestrator pipeline (Phase 1 hardening)

    Both modes survive a backend restart since they run inside the Celery worker.
    Previously, mode='ai' ran inside FastAPI BackgroundTasks and was lost on restart.
    """
    # ── AI mode: delegate entirely to the async orchestrator ─────────────────
    if mode == "ai":
        logger.info("[Scan %s] Dispatching to AI orchestrator pipeline.", scan_id)
        return _run_async(_run_ai_pipeline(scan_id))

    # ── Nmap mode: existing pipeline below (unchanged) ────────────────────────
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if not scan:
        logger.error("Scan %s not found — aborting.", scan_id)
        db.close()
        return

    # ── Concurrency lock: at most one scan per target at a time (Phase 2.4) ──
    if scan.target_id and not _acquire_scan_lock(str(scan.target_id)):
        scan.status = ScanStatus.FAILED
        scan.failure_reason = "concurrency_limit"
        db.commit()
        db.close()
        logger.warning(
            "[Scan %s] Rejected — target %s already has a running scan.",
            scan_id, scan.target_id,
        )
        return

    vuln_count = 0
    acquired_lock = bool(scan.target_id)  # track whether we need to release

    try:
        # ── Status: RUNNING ──────────────────────────────────────────────────
        scan.status = ScanStatus.RUNNING
        scan.started_at = datetime.utcnow()
        if scan.configuration is None:
            scan.configuration = {}
        db.commit()

        # Notify frontend: scanning banner activates, orchestration log clears
        publisher.publish_sync("SCAN_STARTED", {"scan_id": scan_id})
        raw_target = (scan.target.base_url if scan.target else None) or scan.target_url
        if not raw_target:
            raise ValueError(f"No valid target URL for scan {scan_id}")
        clean_target = _sanitise_target(raw_target)

        # ── Tool selection (Part C) ───────────────────────────────────────────
        # The scan's `configuration["tools"]` overrides the default pipeline when
        # scan_type is "custom". Otherwise, the feature flags from runtime config
        # still gate phases (e.g. OPENVAS_ENABLED, LLM_VALIDATION_ENABLED).
        from app.core.config import settings as _rt_settings
        cfg = scan.configuration or {}
        tools_requested = cfg.get("tools") if isinstance(cfg, dict) else None

        def _tool_enabled(name: str, default: bool = True) -> bool:
            if tools_requested is not None:
                return name in tools_requested
            return default

        run_nmap   = _tool_enabled("nmap") and _rt_settings.NMAP_ENABLED
        run_nuclei = _tool_enabled("nuclei") and _rt_settings.NUCLEI_ENABLED
        run_ai     = _tool_enabled("ai_validation", default=False) and _rt_settings.LLM_VALIDATION_ENABLED
        # Persist the resolved tool gates on the scan config so downstream
        # consumers (AI pipeline, report renderer) can inspect what ran.
        cfg["resolved_tools"] = {"nmap": run_nmap, "nuclei": run_nuclei, "ai_validation": run_ai}
        scan.configuration = cfg

        # ── Phase 1: Nmap ────────────────────────────────────────────────────
        results: list = []
        if run_nmap:
            logger.info("[Scan %s] Phase 1: Nmap → %s", scan_id, clean_target)
            publisher.publish_sync("LOG_STREAM", {
                "agent": "recon_agent",
                "level": "info",
                "message": f"[RECON] Starting Nmap reconnaissance on {clean_target}…",
                "scan_id": scan_id,
            })
            scanner = NmapWrapper()
            results = scanner.scan_target(clean_target, scan.scan_type)
        else:
            logger.info("[Scan %s] Phase 1: Nmap skipped (disabled)", scan_id)


        seen_hosts: set[str] = set()
        all_vulns: list[dict] = []

        # Services considered high-risk when exposed without explicit auth layer
        _HIGH_RISK_SERVICES = {
            "redis", "mysql", "mssql", "postgres", "postgresql", "mongodb",
            "smb", "netbios-ssn", "msrpc", "rdp", "vnc", "telnet",
            "ftp", "rpcbind", "nfs", "ldap", "elasticsearch",
        }
        _MEDIUM_RISK_SERVICES = {
            "ssh", "smtp", "pop3", "imap", "snmp", "tftp", "memcached",
            "http-proxy", "socks5", "cassandra", "couchdb", "neo4j",
        }

        def _service_severity(service_name: str, port: int) -> str:
            svc = (service_name or "").lower()
            if svc in _HIGH_RISK_SERVICES:
                return "high"
            if svc in _MEDIUM_RISK_SERVICES:
                return "medium"
            if port in (80, 8080, 8000, 8888):
                return "low"
            return "info"

        def _vuln_title(service_name: str, product: str, port: int, ip: str) -> str:
            label = product or service_name or "Unknown Service"
            return f"{label.title()} Exposed on {ip}:{port}"

        def _vuln_description(service_name: str, product: str, version: str, port: int, severity: str) -> str:
            svc_label = f"{product} {version}".strip() if (product or version) else service_name or "unknown service"
            base = f"Port {port} is open and running {svc_label}."
            if severity == "high":
                base += " This service type is commonly targeted in attacks and should not be exposed without authentication and access control."
            elif severity == "medium":
                base += " Ensure this service is properly authenticated and patched against known CVEs."
            return base

        def _remediation(service_name: str, severity: str) -> str:
            svc = (service_name or "").lower()
            if svc == "redis":
                return "Bind Redis to 127.0.0.1, enable requirepass, and use AUTH. Do not expose Redis to the internet."
            if svc in ("mysql", "postgresql", "postgres", "mssql"):
                return "Restrict database access to application servers only. Disable remote root login. Use TLS for connections."
            if svc == "rdp":
                return "Enable Network Level Authentication (NLA). Use VPN for RDP access. Apply all Windows security patches."
            if svc == "smb":
                return "Disable SMBv1. Restrict SMB to internal networks only. Apply all security patches."
            if svc == "ftp":
                return "Migrate to SFTP or FTPS. Disable anonymous FTP access. Apply access controls."
            if svc == "telnet":
                return "Replace telnet with SSH immediately. Telnet transmits credentials in plaintext."
            if severity == "high":
                return "Restrict access via firewall rules. Implement authentication. Monitor for unauthorized access attempts."
            if severity == "medium":
                return "Verify this service is intentionally exposed. Apply latest patches and enable logging."
            return "Review if this service needs to be publicly accessible. Apply the principle of least exposure."

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
                os_family=host_data.get("os_family"),
                is_new="true",
            )
            db.add(asset)
            db.flush()

            open_ports = []
            for port_data in host_data["ports"]:
                if port_data.get("state") != "open":
                    continue
                svc_name = port_data.get("service", "unknown")
                product  = port_data.get("product", "")
                version  = port_data.get("version", "")
                port_num = port_data["port"]
                severity = _service_severity(svc_name, port_num)
                open_ports.append(str(port_num))

                db.add(AssetService(
                    asset_id=asset.id,
                    port=port_num,
                    protocol=port_data["protocol"],
                    state=port_data["state"],
                    service_name=svc_name,
                    product=product,
                    version=version,
                    cpe=port_data.get("cpe"),
                    extra_info=port_data.get("extra_info"),
                ))
                vuln = Vulnerability(
                    scan_id=scan.id,
                    host=ip,
                    port=port_num,
                    protocol=port_data["protocol"],
                    service=svc_name,
                    type="Service Exposure",
                    title=_vuln_title(svc_name, product, port_num, ip),
                    severity=severity,
                    url=f"{port_data['protocol']}://{ip}:{port_num}",
                    description=_vuln_description(svc_name, product, version, port_num, severity),
                    remediation=_remediation(svc_name, severity),
                )
                db.add(vuln)
                vuln_count += 1
                all_vulns.append({
                    "host": ip,
                    "severity": severity,
                    "cve_id": "",
                    "description": f"{product or svc_name} on port {port_num}",
                })

            # Enrich the persistent network_assets inventory with latest scan data
            try:
                from app.models.scan import NetworkAsset
                net_asset = db.query(NetworkAsset).filter(NetworkAsset.ip_address == ip).first()
                if net_asset:
                    if host_data.get("os_name"):
                        net_asset.os_name = host_data["os_name"]
                    if host_data.get("mac"):
                        net_asset.mac_address = host_data["mac"]
                    if host_data.get("hostnames"):
                        net_asset.hostname = host_data["hostnames"]
                    if host_data.get("device_type") and host_data["device_type"] != "unknown":
                        net_asset.device_type = host_data["device_type"]
                    if open_ports:
                        net_asset.open_ports = ",".join(open_ports)
                    net_asset.last_seen = datetime.utcnow()
            except Exception as _enrich_err:
                logger.warning("[Scan %s] NetworkAsset enrich failed: %s", scan_id, _enrich_err)

        # Commit nmap results so the async risk engine session can see them
        db.commit()

        # Publish recon phase log to Orchestration Feed
        publisher.publish_sync("LOG_STREAM", {
            "agent": "recon_agent",
            "level": "info",
            "message": f"[RECON] Nmap scan completed on {clean_target} — {len(seen_hosts)} host(s), {vuln_count} service(s) found",
            "scan_id": scan_id,
        })

        _write_agent_log(
            db, scan_id, "recon_agent", "Network Reconnaissance Completed",
            reasoning=f"Nmap discovered {len(seen_hosts)} host(s) with {vuln_count} initial findings on target {clean_target}.",
            output_data={"hosts_found": len(seen_hosts), "open_services": vuln_count},
        )

        # ── Phase 2: AI Intelligence (Gemini) ─────────────────────────────
        logger.info("[Scan %s] Phase 2: AI Intelligence analysis", scan_id)
        publisher.publish_sync("LOG_STREAM", {
            "agent": "intelligence_agent",
            "level": "info",
            "message": f"[INTELLIGENCE] Running AI advisory analysis on {len(results)} host(s)…",
            "scan_id": scan_id,
        })
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
            publisher.publish_sync("LOG_STREAM", {
                "agent": "intelligence_agent",
                "level": "warning",
                "message": f"[INTELLIGENCE] AI advisory skipped (no valid API key or network error)",
                "scan_id": scan_id,
            })

        # ── Phase 3: Nuclei deep scan ──────────────────────────────────────
        # Use the full URL (raw_target) so Nuclei scans the correct port,
        # not just the sanitised hostname which strips non-standard ports.
        nuclei_target = raw_target if raw_target and "://" in raw_target else clean_target
        if not run_nuclei:
            logger.info("[Scan %s] Phase 3: Nuclei skipped (disabled)", scan_id)
        else:
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
                        status="open",
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

        # Commit nuclei findings before risk engine's async session reads them
        db.commit()

        nuclei_count = sum(1 for v in all_vulns if v.get("host") == clean_target)
        publisher.publish_sync("LOG_STREAM", {
            "agent": "attack_agent",
            "level": "info",
            "message": f"[NUCLEI] Scan complete on {nuclei_target} — {nuclei_count} web vulnerability finding(s) recorded",
            "scan_id": scan_id,
        })
        _write_agent_log(
            db, scan_id, "attack_agent", "Vulnerability Scan Completed",
            reasoning=f"Nuclei deep scan finished against {clean_target}. {nuclei_count} web vulnerability finding(s) recorded.",
            output_data={"target": clean_target, "findings": nuclei_count, "total_vulns": len(all_vulns)},
        )

        # ── Phase 4: Risk Engine ───────────────────────────────────────────
        logger.info("[Scan %s] Phase 4: Risk Engine", scan_id)
        publisher.publish_sync("LOG_STREAM", {
            "agent": "validation_agent",
            "level": "info",
            "message": f"[RISK] Running Unified Risk Engine — scoring {len(all_vulns)} finding(s)…",
            "scan_id": scan_id,
        })
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

        _write_agent_log(
            db, scan_id, "validation_agent", "Risk Scoring Completed",
            reasoning=f"Unified Risk Engine scored all findings for scan {scan_id}. Severity distribution analysed and action items generated.",
            output_data={"total_vulns": len(all_vulns)},
        )

        # ── Phase 5: Asset Monitor ─────────────────────────────────────────
        try:
            from app.services.asset_monitor import AssetMonitor
            AssetMonitor.process_scan_results(db, scan.id, results)
        except Exception as exc:
            logger.warning("[Scan %s] Asset monitor skipped: %s", scan_id, exc)

        # ── Phase 4.2: Finding deduplication ───────────────────────────────
        _run_finding_dedup(scan_id, str(scan.target_id) if scan.target_id else None)

        _write_agent_log(
            db, scan_id, "reporting_agent", "AI Advisory Report Generated",
            reasoning=f"Scan pipeline complete. {len(all_vulns)} vulnerability finding(s) across {len(seen_hosts)} host(s). Remediation advice and risk scores are ready for review.",
            output_data={"hosts": len(seen_hosts), "total_findings": len(all_vulns)},
        )

        # ── Finalise: COMPLETED ────────────────────────────────────────────
        scan.status = ScanStatus.COMPLETED
        scan.completed_at = datetime.utcnow()
        if scan.target_id:
            _tgt = db.query(Target).filter(Target.id == scan.target_id).first()
            if _tgt:
                _tgt.last_scanned_at = scan.completed_at
        db.commit()
        db.refresh(scan)

        # Count ALL open vulnerabilities across every scan so the WebSocket
        # update reflects cumulative risk, not just this scan's findings.
        counts = {
            "critical": db.query(Vulnerability).filter(Vulnerability.severity == SeverityLevel.CRITICAL, Vulnerability.status == VulnStatus.OPEN).count(),
            "high":     db.query(Vulnerability).filter(Vulnerability.severity == SeverityLevel.HIGH,     Vulnerability.status == VulnStatus.OPEN).count(),
            "medium":   db.query(Vulnerability).filter(Vulnerability.severity == SeverityLevel.MEDIUM,   Vulnerability.status == VulnStatus.OPEN).count(),
            "low":      db.query(Vulnerability).filter(Vulnerability.severity == SeverityLevel.LOW,      Vulnerability.status == VulnStatus.OPEN).count(),
            "info":     db.query(Vulnerability).filter(Vulnerability.severity == SeverityLevel.INFO,     Vulnerability.status == VulnStatus.OPEN).count(),
        }

        from app.models.scan import NetworkAsset as _NA
        total_assets = db.query(_NA).count()

        # Health derived from cumulative open vulns — mirrors kpi-snapshot formula.
        _c, _h, _m, _l = counts["critical"], counts["high"], counts["medium"], counts["low"]
        _risk = (
            min(_c, 5)  / 5.0  * 60 +
            min(_h, 10) / 10.0 * 25 +
            min(_m, 20) / 20.0 * 10 +
            min(_l, 30) / 30.0 *  5
        )
        cumulative_health = round(max(0.0, 100.0 - _risk), 2)

        # Publish ALERT_NEW for critical/high findings so the notifications bell populates
        _now_iso = datetime.utcnow().isoformat()
        _alerted_sevs = {"critical", "high"}
        _alerted_vulns = [v for v in all_vulns if v.get("severity", "").lower() in _alerted_sevs]
        for _av in _alerted_vulns[:15]:
            publisher.publish_sync("ALERT_NEW", {
                "title": f"{_av['severity'].title()} — {_av['description'][:80]}",
                "severity": _av["severity"].lower(),
                "message": _av["description"],
                "target": _av.get("host", raw_target),
                "timestamp": _now_iso,
            })
        # Always publish a scan-complete summary notification
        _top_sev = "critical" if counts["critical"] > 0 else "high" if counts["high"] > 0 else "medium" if counts["medium"] > 0 else "info"
        publisher.publish_sync("ALERT_NEW", {
            "title": f"Scan Complete — {vuln_count} finding(s) on {_sanitise_target(raw_target)}",
            "severity": _top_sev,
            "message": (
                f"{counts['critical']} critical, {counts['high']} high, "
                f"{counts['medium']} medium, {counts['low']} low"
            ),
            "target": raw_target,
            "timestamp": _now_iso,
        })

        publisher.publish_sync("SCAN_STATUS", {"scan_id": scan.id, "status": "COMPLETED"})
        publisher.publish_sync("RISK_UPDATE", {
            "scan_id": scan.id,
            "overall_score": round(scan.risk_score or 0.0, 2),
            "health_score": cumulative_health,
            "vuln_count": sum(counts.values()),
            "counts": counts,
            "total_assets": total_assets,
        })
        logger.info("[Scan %s] Completed — %d vulnerabilities found.", scan_id, vuln_count)

    except Exception as exc:
        logger.exception("[Scan %s] Fatal error: %s", scan_id, exc)
        scan.status = ScanStatus.FAILED
        scan.failure_reason = str(exc)[:120]
        scan.risk_score = 0
        # Notify frontend so the scan button unlocks immediately
        try:
            publisher.publish_sync("SCAN_STATUS", {"scan_id": scan_id, "status": "IDLE"})
        except Exception:
            pass
        try:
            self.retry(exc=exc)
        except Exception:
            pass  # max_retries exceeded — final failure logged above
    finally:
        db.commit()
        if acquired_lock and scan and scan.target_id:
            _release_scan_lock(str(scan.target_id))
        db.close()


# ── Phase 4.2: Finding deduplication (called after each scan) ─────────────────

def _run_finding_dedup(scan_id: str, target_id: str | None) -> None:
    """Run finding deduplication in a synchronous DB session."""
    db = SessionLocal()
    try:
        from app.services.finding_dedup import deduplicate_scan
        new_findings = deduplicate_scan(scan_id, target_id, db)
        logger.info("[Scan %s] Finding dedup: %d new findings.", scan_id, new_findings)
    except Exception as exc:
        logger.warning("[Scan %s] Finding dedup failed: %s", scan_id, exc)
    finally:
        db.close()


# ── Phase 4.3: SLA breach detection (hourly Celery beat task) ─────────────────

@celery_app.task
def check_sla_breaches():
    """
    Detect OPEN Findings past their SLA due_date, create OVERDUE ActionItems,
    and publish sla_breach events. Registered in celery_app.beat_schedule.
    """
    db = SessionLocal()
    try:
        from app.services.sla import check_and_action_breaches
        count = check_and_action_breaches(db)
        logger.info("SLA breach check completed: %d breaches actioned.", count)
        return count
    except Exception as exc:
        logger.error("SLA breach check failed: %s", exc)
        return 0
    finally:
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


# ── User-defined schedule runner (checks every minute) ────────────────────────

@celery_app.task
def check_due_schedules():
    """
    Read user-created schedules from Redis and fire any whose cron expression
    matches the current UTC minute. Runs every minute via Celery beat.
    """
    import json, redis as _redis
    from croniter import croniter
    from datetime import timezone

    try:
        r = _redis.from_url(settings.REDIS_URL, decode_responses=True)
        raw = r.hgetall("osc:schedules")
        r.close()
    except Exception as exc:
        logger.warning("check_due_schedules: Redis read failed: %s", exc)
        return

    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)

    for sid, val in raw.items():
        try:
            entry = json.loads(val)
        except Exception:
            continue

        if not entry.get("enabled"):
            continue

        cron_expr = entry.get("schedule", "")
        try:
            # croniter.match checks if `now` matches the cron expression
            if not croniter.match(cron_expr, now):
                continue
        except Exception as exc:
            logger.warning("check_due_schedules: bad cron '%s': %s", cron_expr, exc)
            continue

        # Fire the scan
        db = SessionLocal()
        try:
            scan = Scan(
                target_url=entry.get("target_url"),
                target_id=entry.get("target_id"),
                scan_type=entry.get("scan_type", "quick"),
            )
            db.add(scan)
            db.commit()
            db.refresh(scan)
            run_scan_task.delay(scan_id=scan.id)
            logger.info("Scheduled scan fired: %s for %s (cron=%s)", scan.id, entry.get("target_url"), cron_expr)
        except Exception as exc:
            logger.error("check_due_schedules: failed to fire scan for schedule %s: %s", sid, exc)
        finally:
            db.close()
