"""
Unit tests for app.services.asset_dedup and the reconciliation path in
app.services.asset_monitor.

Covers:
  • layered identity match (IP → MAC → hostname)
  • freshest-state merge (no downgrade to blanks, DHCP IP move)
  • collapse of pre-existing duplicate rows
  • end-to-end: a returning device does not create a duplicate node
"""
from datetime import datetime, timedelta

from app.models.scan import NetworkAsset
from app.services.asset_dedup import (
    normalize_mac,
    is_meaningful_hostname,
    find_existing_asset,
    apply_freshest_state,
    collapse_duplicate_assets,
)
from app.services.asset_monitor import AssetMonitor


def _add_asset(db, **kw):
    kw.setdefault("first_seen", datetime.utcnow())
    kw.setdefault("last_seen", datetime.utcnow())
    a = NetworkAsset(**kw)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _cleanup(db):
    db.query(NetworkAsset).delete()
    db.commit()


# ── normalisation helpers ─────────────────────────────────────────────────────

def test_normalize_mac_formats_equal():
    assert normalize_mac("AA-BB-CC-DD-EE-FF") == normalize_mac("aa:bb:cc:dd:ee:ff")
    assert normalize_mac("00:00:00:00:00:00") == ""
    assert normalize_mac(None) == ""


def test_meaningful_hostname_rejects_generic_and_container_ids():
    assert is_meaningful_hostname("lab_webserver") is True
    assert is_meaningful_hostname("unknown") is False
    assert is_meaningful_hostname("") is False
    assert is_meaningful_hostname("3f9a1c2b4d5e") is False  # docker container id


# ── find_existing_asset ───────────────────────────────────────────────────────

def test_find_by_ip_first(db_session):
    _cleanup(db_session)
    a = _add_asset(db_session, ip_address="10.10.20.5", mac_address="aa:bb:cc:dd:ee:01")
    assert find_existing_asset(db_session, "10.10.20.5").id == a.id
    _cleanup(db_session)


def test_find_by_mac_when_ip_changed(db_session):
    _cleanup(db_session)
    a = _add_asset(db_session, ip_address="10.10.20.5", mac_address="AA:BB:CC:DD:EE:02")
    # same device, new IP, MAC written in a different format
    found = find_existing_asset(db_session, "10.10.20.99", mac="aa-bb-cc-dd-ee-02")
    assert found is not None and found.id == a.id
    _cleanup(db_session)


def test_find_by_hostname_when_no_mac(db_session):
    _cleanup(db_session)
    a = _add_asset(db_session, ip_address="10.10.20.5", hostname="lab_database")
    found = find_existing_asset(db_session, "10.10.20.77", mac=None, hostname="lab_database")
    assert found is not None and found.id == a.id
    _cleanup(db_session)


def test_generic_hostname_does_not_match(db_session):
    _cleanup(db_session)
    _add_asset(db_session, ip_address="10.10.20.5", hostname="unknown")
    assert find_existing_asset(db_session, "10.10.20.88", hostname="unknown") is None
    _cleanup(db_session)


# ── apply_freshest_state ──────────────────────────────────────────────────────

def test_apply_freshest_state_updates_and_flags_ip_move(db_session):
    _cleanup(db_session)
    a = _add_asset(db_session, ip_address="10.10.20.5", os_name="Ubuntu 20.04",
                   open_ports="22", device_type="server")
    changed = apply_freshest_state(
        a, ip="10.10.20.9", os_name="Ubuntu 22.04",
        open_ports="22,443", device_type="server",
    )
    assert changed is True
    assert a.ip_address == "10.10.20.9"
    assert a.os_name == "Ubuntu 22.04"
    assert a.open_ports == "22,443"
    _cleanup(db_session)


def test_apply_freshest_state_never_downgrades_to_blank(db_session):
    _cleanup(db_session)
    a = _add_asset(db_session, ip_address="10.10.20.5", os_name="Ubuntu 22.04",
                   hostname="lab_webserver", device_type="server")
    # A later scan with missing OS/hostname must not wipe known values.
    apply_freshest_state(a, ip="10.10.20.5", os_name=None, hostname="unknown",
                         device_type="unknown")
    assert a.os_name == "Ubuntu 22.04"
    assert a.hostname == "lab_webserver"
    assert a.device_type == "server"
    _cleanup(db_session)


# ── collapse_duplicate_assets ─────────────────────────────────────────────────

def test_collapse_merges_same_mac(db_session):
    _cleanup(db_session)
    now = datetime.utcnow()
    old = _add_asset(db_session, ip_address="10.10.20.5", mac_address="aa:bb:cc:dd:ee:03",
                     open_ports="22", os_name="Ubuntu", last_seen=now - timedelta(days=2),
                     first_seen=now - timedelta(days=10))
    new = _add_asset(db_session, ip_address="10.10.20.9", mac_address="AA:BB:CC:DD:EE:03",
                     open_ports="443", last_seen=now)

    removed = collapse_duplicate_assets(db_session)
    db_session.commit()

    assert removed == 1
    survivors = db_session.query(NetworkAsset).all()
    assert len(survivors) == 1
    s = survivors[0]
    assert s.ip_address == "10.10.20.9"          # newest IP wins
    assert set(s.open_ports.split(",")) == {"22", "443"}  # ports unioned
    assert s.os_name == "Ubuntu"                 # filled from older row
    assert s.first_seen == now - timedelta(days=10)  # earliest sighting kept
    _cleanup(db_session)


def test_collapse_leaves_distinct_devices_untouched(db_session):
    _cleanup(db_session)
    _add_asset(db_session, ip_address="10.10.20.5", mac_address="aa:bb:cc:dd:ee:04")
    _add_asset(db_session, ip_address="10.10.20.6", mac_address="aa:bb:cc:dd:ee:05")
    assert collapse_duplicate_assets(db_session) == 0
    assert db_session.query(NetworkAsset).count() == 2
    _cleanup(db_session)


# ── end-to-end via AssetMonitor ───────────────────────────────────────────────

def test_returning_device_does_not_duplicate(db_session):
    _cleanup(db_session)
    scan_results_v1 = [{
        "ip": "10.10.20.50",
        "mac": "aa:bb:cc:dd:ee:10",
        "hostnames": "lab_workstation",
        "os_name": "Windows 10",
        "ports": [{"port": 3389, "state": "open"}],
    }]
    AssetMonitor.process_scan_results(db_session, scan_id="s1", scan_results=scan_results_v1)
    assert db_session.query(NetworkAsset).count() == 1

    # Same device comes back on a new IP (DHCP) — must reconcile, not duplicate.
    scan_results_v2 = [{
        "ip": "10.10.20.77",
        "mac": "AA-BB-CC-DD-EE-10",
        "hostnames": "lab_workstation",
        "os_name": "Windows 10",
        "ports": [{"port": 3389, "state": "open"}, {"port": 445, "state": "open"}],
    }]
    AssetMonitor.process_scan_results(db_session, scan_id="s2", scan_results=scan_results_v2)

    assets = db_session.query(NetworkAsset).all()
    assert len(assets) == 1
    assert assets[0].ip_address == "10.10.20.77"
    assert set(assets[0].open_ports.split(",")) == {"445", "3389"}
    _cleanup(db_session)
