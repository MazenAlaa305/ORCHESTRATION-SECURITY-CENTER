"""
Integration tests for GET /api/v1/findings/
"""
import uuid
from app.models.scan import (
    Finding, FindingStatus, SeverityLevel,
    Target, Scan, ScanStatus, Vulnerability, VulnStatus,
)


# ── Seed helpers ──────────────────────────────────────────────────────────────

def _seed_finding(db, title="Test Finding", severity=SeverityLevel.HIGH,
                  status=FindingStatus.OPEN, control_tags=None, vuln_type="sqli"):
    f = Finding(
        id=str(uuid.uuid4()),
        fingerprint=str(uuid.uuid4()),
        title=title,
        vuln_type=vuln_type,
        severity=severity,
        status=status,
        control_tags=control_tags or {},
        first_seen=None,
        last_seen=None,
    )
    db.add(f)
    db.flush()
    return f


def _seed_finding_with_scan(db, control_tags=None):
    """Create a Target → Scan → Vulnerability → Finding chain."""
    target = Target(id=str(uuid.uuid4()), name="T", base_url="http://t.local")
    scan = Scan(
        id=str(uuid.uuid4()),
        target_id=target.id,
        target_url="http://t.local",
        status=ScanStatus.COMPLETED,
    )
    db.add(target)
    db.add(scan)
    db.flush()

    finding = _seed_finding(db, control_tags=control_tags)

    vuln = Vulnerability(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        type="sqli",
        url="http://t.local/path",
        description="desc",
        severity=SeverityLevel.HIGH,
        status=VulnStatus.OPEN,
        title="Vuln",
        host="10.0.0.1",
        finding_id=finding.id,
    )
    db.add(vuln)
    db.commit()
    return scan.id, finding


# ── Auth gate ─────────────────────────────────────────────────────────────────

def test_findings_requires_auth(client):
    r = client.get("/api/v1/findings/")
    assert r.status_code in (401, 403)


# ── Basic list ────────────────────────────────────────────────────────────────

def test_findings_returns_envelope(client, admin_headers, db_session):
    _seed_finding(db_session)
    r = client.get("/api/v1/findings/", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body
    assert isinstance(body["items"], list)


def test_findings_list_analyst_can_access(client, analyst_headers):
    r = client.get("/api/v1/findings/", headers=analyst_headers)
    assert r.status_code == 200


def test_findings_list_viewer_can_access(client, viewer_headers):
    r = client.get("/api/v1/findings/", headers=viewer_headers)
    assert r.status_code == 200


# ── Filter by status ──────────────────────────────────────────────────────────

def test_filter_by_status_open(client, admin_headers, db_session):
    _seed_finding(db_session, title="Open Finding", status=FindingStatus.OPEN)
    _seed_finding(db_session, title="Fixed Finding", status=FindingStatus.FIXED)
    r = client.get("/api/v1/findings/?status=open", headers=admin_headers)
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert "open" in item["status"].lower()


def test_filter_by_status_fixed(client, admin_headers, db_session):
    _seed_finding(db_session, title="Fixed One", status=FindingStatus.FIXED)
    r = client.get("/api/v1/findings/?status=fixed", headers=admin_headers)
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert "fixed" in item["status"].lower()


def test_invalid_status_returns_422(client, admin_headers):
    r = client.get("/api/v1/findings/?status=banana", headers=admin_headers)
    assert r.status_code == 422


# ── Filter by scan_id ─────────────────────────────────────────────────────────

def test_filter_by_scan_id(client, admin_headers, db_session):
    scan_id, finding = _seed_finding_with_scan(db_session)
    r = client.get(f"/api/v1/findings/?scan_id={scan_id}", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    ids = [item["id"] for item in body["items"]]
    assert finding.id in ids


def test_filter_by_nonexistent_scan_id_returns_empty(client, admin_headers):
    fake_id = str(uuid.uuid4())
    r = client.get(f"/api/v1/findings/?scan_id={fake_id}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["items"] == []


# ── Filter by framework + control ─────────────────────────────────────────────

def test_filter_by_framework_and_control(client, admin_headers, db_session):
    tags = {"iso27001_annex_a": "A.12.6.1"}
    _seed_finding(db_session, title="ISO Finding", control_tags=tags)
    r = client.get("/api/v1/findings/?framework=iso27001&control=A.12.6.1", headers=admin_headers)
    assert r.status_code == 200


def test_framework_without_control_returns_400(client, admin_headers):
    r = client.get("/api/v1/findings/?framework=iso27001", headers=admin_headers)
    assert r.status_code == 400


def test_control_without_framework_returns_400(client, admin_headers):
    r = client.get("/api/v1/findings/?control=A.12.6.1", headers=admin_headers)
    assert r.status_code == 400


def test_unknown_framework_returns_400(client, admin_headers):
    r = client.get("/api/v1/findings/?framework=unknown_fw&control=X.1", headers=admin_headers)
    assert r.status_code == 400


def test_framework_aliases_work(client, admin_headers, db_session):
    tags = {"owasp_top10": "A03:2021"}
    _seed_finding(db_session, title="OWASP Finding", control_tags=tags)
    r = client.get("/api/v1/findings/?framework=owasp&control=A03:2021", headers=admin_headers)
    assert r.status_code == 200


# ── Pagination ────────────────────────────────────────────────────────────────

def test_limit_respected(client, admin_headers, db_session):
    for i in range(5):
        _seed_finding(db_session, title=f"F{i}")
    r = client.get("/api/v1/findings/?limit=2", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()["items"]) <= 2


def test_offset_works(client, admin_headers, db_session):
    for i in range(4):
        _seed_finding(db_session, title=f"Paged{i}")
    r0 = client.get("/api/v1/findings/?limit=2&offset=0", headers=admin_headers)
    r1 = client.get("/api/v1/findings/?limit=2&offset=2", headers=admin_headers)
    ids0 = {i["id"] for i in r0.json()["items"]}
    ids1 = {i["id"] for i in r1.json()["items"]}
    assert ids0.isdisjoint(ids1)
