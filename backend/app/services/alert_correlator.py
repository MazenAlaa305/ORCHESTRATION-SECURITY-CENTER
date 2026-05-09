"""
Correlate Wazuh alerts with Vulnerability records.

A match requires: same target IP, the same port (when the alert exposes one),
and the alert timestamp falling within ±10 min of the vulnerability's created_at.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scan import ScanAsset, Vulnerability

logger = logging.getLogger(__name__)
WINDOW = timedelta(minutes=10)
_PORT_RE = re.compile(r"port[\s:=]+(\d{1,5})", re.IGNORECASE)


async def correlate(db: AsyncSession, alerts: Iterable[dict]) -> list[dict]:
    """
    Return the alerts list with an extra ``matched_vulnerability_ids`` field
    on each entry. Always echoes the input shape — never raises.
    """
    out: list[dict] = []
    for alert in alerts:
        ip = _extract_ip(alert)
        port = _extract_port(alert)
        ts = _parse_ts(alert.get("timestamp") or alert.get("ts"))

        matches: list[str] = []
        if ip and ts is not None:
            try:
                stmt = (
                    select(Vulnerability.id)
                    .join(ScanAsset, Vulnerability.scan_asset_id == ScanAsset.id)
                    .where(ScanAsset.ip_address == ip)
                    .where(Vulnerability.created_at.between(ts - WINDOW, ts + WINDOW))
                )
                if port is not None:
                    stmt = stmt.where(Vulnerability.port == port)
                result = await db.execute(stmt)
                matches = [str(row[0]) for row in result.all()]
            except Exception as exc:  # pragma: no cover — defensive
                logger.warning("alert_correlator query failed: %s", exc)
                matches = []

        out.append({**alert, "matched_vulnerability_ids": matches})
    return out


# ── helpers ──────────────────────────────────────────────────────────────────

def _extract_ip(alert: dict) -> str | None:
    if "source_ip" in alert and alert["source_ip"]:
        return alert["source_ip"]
    agent = alert.get("agent") or {}
    if isinstance(agent, dict) and agent.get("ip"):
        return agent["ip"]
    return None


def _extract_port(alert: dict) -> int | None:
    if isinstance(alert.get("port"), int):
        return alert["port"]
    desc = alert.get("description") or alert.get("rule", {}).get("description") or ""
    m = _PORT_RE.search(desc)
    return int(m.group(1)) if m else None


def _parse_ts(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
