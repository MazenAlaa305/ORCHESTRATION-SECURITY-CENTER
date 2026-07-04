"""
Asset identity & de-duplication helpers.

The persistent inventory (``NetworkAsset``) historically keyed devices on
``ip_address`` alone. On a DHCP network a single physical device can appear
under several IPs over time, producing *duplicate topology nodes for one box*.

These helpers give the inventory a layered device identity — IP, then MAC,
then a meaningful hostname — so a returning device is reconciled onto its
existing node (keeping the freshest state) instead of spawning a new one, and
so pre-existing duplicate rows can be collapsed into a single node.

Used by :mod:`app.services.asset_monitor` on every scan; the topology diagram,
subnet inventory, asset detail panel and KPI counts all read the resulting
``NetworkAsset`` rows, so de-duplicating here fixes every surface at once.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.scan import NetworkAsset

logger = logging.getLogger(__name__)

# Hostnames that do not identify a device (blank, placeholders, or a raw
# 12-hex-char Docker container id). Never used as a reconciliation key.
_GENERIC_HOSTNAMES = {"", "unknown", "localhost", "n/a", "none", "-"}
_CONTAINER_ID_RE = re.compile(r"^[0-9a-f]{12}$")
_ALL_ZERO_MAC = "00:00:00:00:00:00"


def normalize_mac(mac: Optional[str]) -> str:
    """Canonicalise a MAC for comparison: lowercase, ``:``-separated, and
    the all-zero MAC treated as absent. Returns '' when there is no usable MAC."""
    if not mac:
        return ""
    m = str(mac).strip().lower().replace("-", ":")
    if not m or m == _ALL_ZERO_MAC:
        return ""
    return m


def normalize_hostname(hostname: Optional[str]) -> str:
    return (hostname or "").strip().lower()


def is_meaningful_hostname(hostname: Optional[str]) -> bool:
    """True when a hostname is stable enough to identify a device by."""
    h = normalize_hostname(hostname)
    if h in _GENERIC_HOSTNAMES:
        return False
    if _CONTAINER_ID_RE.match(h):
        return False
    return True


def find_existing_asset(
    db: Session,
    ip: str,
    mac: Optional[str] = None,
    hostname: Optional[str] = None,
) -> Optional[NetworkAsset]:
    """Return the inventory row that best matches this device, or ``None``.

    Match precedence (strongest first):
      1. exact IP address — the DB-unique key,
      2. same normalized MAC — a device that changed IP (DHCP),
      3. same *meaningful* hostname — MAC unknown but the name is stable.
    """
    # 1) exact IP — strongest signal, and the only DB-unique column.
    asset = db.query(NetworkAsset).filter(NetworkAsset.ip_address == ip).first()
    if asset:
        return asset

    # 2) same MAC under a different IP. Formats vary (colon vs dash / case),
    #    so normalise in Python rather than trusting a raw SQL equality.
    nmac = normalize_mac(mac)
    if nmac:
        for a in db.query(NetworkAsset).filter(NetworkAsset.mac_address.isnot(None)).all():
            if normalize_mac(a.mac_address) == nmac:
                return a

    # 3) same meaningful hostname (only when MAC couldn't decide it).
    if is_meaningful_hostname(hostname):
        nhost = normalize_hostname(hostname)
        for a in db.query(NetworkAsset).filter(NetworkAsset.hostname.isnot(None)).all():
            if is_meaningful_hostname(a.hostname) and normalize_hostname(a.hostname) == nhost:
                return a

    return None


def apply_freshest_state(
    asset: NetworkAsset,
    *,
    ip: Optional[str] = None,
    mac: Optional[str] = None,
    hostname: Optional[str] = None,
    os_name: Optional[str] = None,
    device_type: Optional[str] = None,
    open_ports: Optional[str] = None,
    now: Optional[datetime] = None,
) -> bool:
    """Merge a fresh observation into an existing asset, keeping the newest
    non-empty value per field. Returns ``True`` when the IP changed (DHCP move).

    Never downgrades a known attribute to a blank/placeholder — an empty scan
    field leaves the previously-known value intact.
    """
    now = now or datetime.utcnow()

    ip_changed = False
    if ip and asset.ip_address != ip:
        asset.ip_address = ip
        ip_changed = True

    nmac = normalize_mac(mac)
    if nmac and normalize_mac(asset.mac_address) != nmac:
        asset.mac_address = mac

    if is_meaningful_hostname(hostname):
        asset.hostname = hostname

    if os_name:
        asset.os_name = os_name

    if device_type and device_type != "unknown":
        asset.device_type = device_type

    if open_ports is not None:
        asset.open_ports = open_ports

    asset.last_seen = now
    asset.status = "active"
    return ip_changed


def _merge_into(survivor: NetworkAsset, dup: NetworkAsset) -> None:
    """Fold a duplicate's still-useful attributes into the survivor without
    overwriting the survivor's fresher data."""
    if not normalize_mac(survivor.mac_address) and normalize_mac(dup.mac_address):
        survivor.mac_address = dup.mac_address
    if not is_meaningful_hostname(survivor.hostname) and is_meaningful_hostname(dup.hostname):
        survivor.hostname = dup.hostname
    if not survivor.os_name and dup.os_name:
        survivor.os_name = dup.os_name
    if (not survivor.device_type or survivor.device_type == "unknown") and dup.device_type:
        survivor.device_type = dup.device_type

    # Union the open ports so a port seen only on the older row is not lost.
    ports = {
        p for p in (
            (survivor.open_ports or "").split(",") + (dup.open_ports or "").split(",")
        ) if p
    }
    if ports:
        survivor.open_ports = ",".join(sorted(ports, key=lambda x: (len(x), x)))

    # Earliest sighting wins — the device has been known since then.
    if dup.first_seen and (not survivor.first_seen or dup.first_seen < survivor.first_seen):
        survivor.first_seen = dup.first_seen

    # Never lose a higher risk signal on merge; the per-asset risk recompute
    # (keyed on the survivor's current IP) refines it afterwards.
    if (dup.risk_score or 0.0) > (survivor.risk_score or 0.0):
        survivor.risk_score = dup.risk_score
        survivor.criticality = dup.criticality


def collapse_duplicate_assets(db: Session) -> int:
    """Merge pre-existing duplicate rows that describe the same physical device
    (same MAC, or same meaningful hostname when no MAC) into the most-recently
    seen row. Returns the number of duplicate rows removed.

    Rows that can only be identified by IP are left untouched — collapsing them
    would risk merging two genuinely distinct hosts.
    """
    groups: dict[str, list[NetworkAsset]] = {}
    for a in db.query(NetworkAsset).all():
        nmac = normalize_mac(a.mac_address)
        if nmac:
            key = f"mac:{nmac}"
        elif is_meaningful_hostname(a.hostname):
            key = f"host:{normalize_hostname(a.hostname)}"
        else:
            continue
        groups.setdefault(key, []).append(a)

    removed = 0
    for key, rows in groups.items():
        if len(rows) < 2:
            continue
        # Survivor = most recently seen; id breaks ties deterministically.
        rows.sort(key=lambda r: (r.last_seen or datetime.min, r.id), reverse=True)
        survivor, dups = rows[0], rows[1:]
        for dup in dups:
            _merge_into(survivor, dup)
            db.delete(dup)
            removed += 1
        logger.info("Collapsed %d duplicate asset row(s) into %s (%s)",
                    len(dups), survivor.ip_address, key)

    return removed
