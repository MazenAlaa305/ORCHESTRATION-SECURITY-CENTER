"""
Living Lab Manager Service — Orchestration Security Center
Manages the lab environment lifecycle and provides status information.
"""

import logging
import subprocess
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timezone

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Lab Container Registry ─────────────────────────────────────────────────────

LAB_TARGETS = [
    {
        "container": "lab_webserver",
        "name": "E-Commerce Web Server",
        "hostname": "lab_webserver",
        "zone": "dmz",
        "port": 3000,
        "protocol": "http",
        "url": "http://lab_webserver:3000",
        "vulns": ["sqli", "xss", "bola", "idor", "broken-auth", "ssrf"],
        "cvss": 9.5,
        "os": "Ubuntu 22.04 LTS (Node.js 18)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:0a",
        "mac_vendor": "Docker Inc.",
        "uptime": "4d 7h",
        "description": "OWASP Juice Shop — intentionally vulnerable web application",
    },
    {
        "container": "lab_api_gateway",
        "name": "Corporate API Gateway",
        "hostname": "lab_api_gateway",
        "zone": "dmz",
        "port": 8081,
        "protocol": "http",
        "url": "http://lab_api_gateway:8081",
        "vulns": ["info-disclosure", "header-leak", "directory-listing", "swagger-exposure"],
        "cvss": 6.0,
        "os": "Ubuntu 20.04 LTS (Spring Boot)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:0b",
        "mac_vendor": "Docker Inc.",
        "uptime": "4d 7h",
        "description": "API gateway with information disclosure vulnerabilities",
    },
    {
        "container": "lab_dns_server",
        "name": "Corporate DNS Server",
        "hostname": "lab_dns_server",
        "zone": "dmz",
        "port": 53,
        "protocol": "dns",
        "url": "dns://lab_dns_server:53",
        "vulns": ["zone-transfer", "recursion-enabled"],
        "cvss": 5.0,
        "os": "Alpine Linux 3.18 (CoreDNS 1.11)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:0c",
        "mac_vendor": "Docker Inc.",
        "uptime": "4d 6h",
        "description": "CoreDNS server with zone transfer enabled",
    },
    {
        "container": "lab_fileserver",
        "name": "Corporate File Server",
        "hostname": "lab_fileserver",
        "zone": "corp",
        "port": 445,
        "protocol": "smb",
        "url": "smb://lab_fileserver:445",
        "vulns": ["weak-credentials", "smb-enum", "sensitive-data-exposure"],
        "cvss": 8.0,
        "os": "Ubuntu 22.04 LTS (Samba 4.17)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:14",
        "mac_vendor": "Docker Inc.",
        "uptime": "3d 22h",
        "description": "Samba file server with weak credentials and exposed shares",
    },
    {
        "container": "lab_mailserver",
        "name": "Corporate Mail Server",
        "hostname": "lab_mailserver",
        "zone": "corp",
        "port": 3025,
        "protocol": "smtp",
        "url": "smtp://lab_mailserver:3025",
        "vulns": ["weak-credentials", "plaintext-protocols"],
        "cvss": 7.0,
        "os": "Alpine Linux 3.17 (Greenmail 2.0)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:15",
        "mac_vendor": "Docker Inc.",
        "uptime": "3d 22h",
        "description": "Greenmail server with plaintext SMTP/POP3/IMAP",
    },
    {
        "container": "lab_database",
        "name": "Production Database",
        "hostname": "lab_database",
        "zone": "data",
        "port": 5432,
        "protocol": "postgresql",
        "url": "postgresql://lab_database:5432",
        "vulns": ["weak-credentials", "pii-plaintext", "no-encryption"],
        "cvss": 9.0,
        "os": "Debian 11 (PostgreSQL 15.3)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:1e",
        "mac_vendor": "Docker Inc.",
        "uptime": "5d 1h",
        "description": "PostgreSQL with weak password and sensitive data in plaintext",
    },
    {
        "container": "lab_redis_cache",
        "name": "Redis Cache",
        "hostname": "lab_redis_cache",
        "zone": "data",
        "port": 6380,
        "protocol": "redis",
        "url": "redis://lab_redis_cache:6380",
        "vulns": ["no-auth", "unauthenticated-access", "data-exfiltration"],
        "cvss": 8.5,
        "os": "Alpine Linux 3.18 (Redis 7.2)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:1f",
        "mac_vendor": "Docker Inc.",
        "uptime": "5d 1h",
        "description": "Redis with no authentication and protected-mode disabled",
    },
    {
        "container": "lab_bastion",
        "name": "Hardened Bastion",
        "hostname": "lab_bastion",
        "zone": "mgmt",
        "port": 2222,
        "protocol": "ssh",
        "url": "ssh://lab_bastion:2222",
        "vulns": [],
        "cvss": 0,
        "os": "Ubuntu 22.04 LTS (OpenSSH 9.0, MFA enforced)",
        "os_family": "Linux",
        "mac_address": "02:42:ac:11:00:28",
        "mac_vendor": "Docker Inc.",
        "uptime": "12d 4h",
        "description": "Hardened bastion host — patched, MFA-enforced, no exposed vulnerabilities",
    },
]


class LabManager:
    """Manages the Living Lab environment lifecycle."""

    async def get_status(self) -> Dict:
        """Get the current status of all lab containers."""
        containers = []
        for target in LAB_TARGETS:
            status = await self._check_container(target)
            containers.append({
                **target,
                "status": status,
            })

        running = sum(1 for c in containers if c["status"] == "running")
        total = len(containers)

        return {
            "lab_enabled": settings.LAB_ENABLED,
            "overall_status": "healthy" if running == total else ("degraded" if running > 0 else "offline"),
            "running": running,
            "total": total,
            "containers": containers,
            "network": settings.LAB_NETWORK_NAME,
            "traffic_intensity": settings.LAB_TRAFFIC_INTENSITY,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    async def _check_container(self, target: Dict) -> str:
        """Check if a container is running by TCP (or UDP ping for DNS)."""
        hostname = target["hostname"]
        port = target["port"]
        protocol = target.get("protocol", "tcp")

        try:
            if protocol == "dns":
                # DNS runs on UDP — send a minimal query and wait for any reply
                loop = asyncio.get_event_loop()
                transport, _ = await asyncio.wait_for(
                    loop.create_datagram_endpoint(
                        asyncio.DatagramProtocol,
                        remote_addr=(hostname, port),
                    ),
                    timeout=3.0,
                )
                transport.close()
                return "running"
            else:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(hostname, port), timeout=3.0
                )
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception:
                    pass
                return "running"
        except Exception:
            return "offline"

    async def get_telemetry_stats(self) -> Dict:
        """Fetch telemetry stats from Elasticsearch for the lab indices."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            stats = {"events": 0, "alerts": 0, "indices": []}
            try:
                # Lab events count
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_ELASTICSEARCH_INDEX}/_count",
                    json={"query": {"match_all": {}}},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    stats["events"] = resp.json().get("count", 0)
            except Exception:
                pass

            try:
                # Wazuh alerts count
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_WAZUH_ALERT_INDEX}/_count",
                    json={"query": {"match_all": {}}},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    stats["alerts"] = resp.json().get("count", 0)
            except Exception:
                pass

            return stats

    async def seed_targets(self, db_session) -> List[Dict]:
        """Register all lab targets and assets in the dashboard database."""
        from app.models.scan import Target, NetworkAsset
        from sqlalchemy import select

        seeded = []
        for lab_target in LAB_TARGETS:
            # 1. Register as NetworkAsset for inventory counting
            ip = lab_target["hostname"]
            res_asset = await db_session.execute(
                select(NetworkAsset).filter(NetworkAsset.ip_address == ip)
            )
            existing_asset = res_asset.scalars().first()
            if not existing_asset:
                asset = NetworkAsset(
                    ip_address=ip,
                    hostname=lab_target["name"],
                    device_type="server",
                    os_name=lab_target.get("os"),
                    mac_address=lab_target.get("mac_address"),
                    open_ports=str(lab_target.get("port")) if lab_target.get("port") else None,
                    last_seen=datetime.utcnow()
                )
                db_session.add(asset)
            else:
                # Backfill OS/MAC on existing rows if missing — keeps re-seeds idempotent
                if not existing_asset.os_name and lab_target.get("os"):
                    existing_asset.os_name = lab_target["os"]
                if not existing_asset.mac_address and lab_target.get("mac_address"):
                    existing_asset.mac_address = lab_target["mac_address"]
                if not existing_asset.open_ports and lab_target.get("port"):
                    existing_asset.open_ports = str(lab_target["port"])

            # 2. Register as Target if scannable by Nuclei (HTTP/HTTPS)
            if lab_target["protocol"] in ("http", "https"):
                result = await db_session.execute(
                    select(Target).filter(Target.base_url == lab_target["url"])
                )
                existing = result.scalars().first()
                if existing:
                    seeded.append({"name": lab_target["name"], "status": "exists", "id": existing.id})
                else:
                    target = Target(
                        name=f"[Lab] {lab_target['name']}",
                        base_url=lab_target["url"],
                        source="lab",
                        auth_method="none",
                    )
                    db_session.add(target)
                    await db_session.flush()
                    seeded.append({"name": lab_target["name"], "status": "created", "id": target.id})

        await db_session.commit()
        return seeded

    async def get_event_feed(self, limit: int = 50) -> List[Dict]:
        """Fetch recent lab events from Elasticsearch."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_ELASTICSEARCH_INDEX}/_search",
                    json={
                        "size": limit,
                        "sort": [{"@timestamp": {"order": "desc"}}],
                        "query": {"match_all": {}}
                    },
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    hits = resp.json().get("hits", {}).get("hits", [])
                    return [hit.get("_source", {}) for hit in hits]
            except Exception as e:
                logger.error(f"Failed to fetch lab events: {e}")
            return []


lab_manager = LabManager()
