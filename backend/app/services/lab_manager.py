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
        "description": "API gateway with information disclosure vulnerabilities",
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
        "description": "Samba file server with weak credentials and exposed shares",
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
        "description": "Redis with no authentication and protected-mode disabled",
    },
]


class LabManager:
    """Manages the Living Lab environment lifecycle."""

    async def get_status(self) -> Dict:
        """Get the current status of all lab containers."""
        containers = []
        for target in LAB_TARGETS:
            status = await self._check_container(target["container"])
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

    async def _check_container(self, container_name: str) -> str:
        """Check if a Docker container is running."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "inspect", "--format", "{{.State.Status}}", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            return stdout.decode().strip() if proc.returncode == 0 else "not_found"
        except Exception:
            return "unknown"

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
        """Register all lab targets in the dashboard database."""
        from app.models.scan import Target
        from sqlalchemy import select

        seeded = []
        for lab_target in LAB_TARGETS:
            # Only seed HTTP-based targets (scannable by the orchestrator)
            if lab_target["protocol"] not in ("http", "https"):
                continue

            # Check if already exists
            result = await db_session.execute(
                select(Target).filter(Target.base_url == lab_target["url"])
            )
            existing = result.scalars().first()
            if existing:
                seeded.append({"name": lab_target["name"], "status": "exists", "id": existing.id})
                continue

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
