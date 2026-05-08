"""
Integration tests for /api/v1/vulnerabilities/ — list and bulk update.

Coverage:
- GET  /vulnerabilities/         (authenticated, filter params)
- PATCH /vulnerabilities/bulk    (analyst + admin only)
- Auth gate: unauthenticated → 401/403
- RBAC gate: viewer cannot bulk-update
- Validation: empty ids, missing field → 400
"""
import uuid
from app.models.scan import Vulnerability, Scan, ScanStatus, SeverityLevel, VulnStatus, Target


def _seed_scan_with_vulns(db, count=3, environment_type="production"):
    """Create a Scan + `count` Vulnerabilities in the shared DB."""
    target_id = str(uuid.uuid4())
    scan_id = str(uuid.uuid4())

    target = Target(id=target_id, name="Vuln Test Target", base_url=f"http://vuln-test-{target_id[:6]}.local")
    scan = Scan(
        id=scan_id,
        target_id=target_id,
        status=ScanStatus.COMPLETED,
        target_url="http://vuln-test.local",
        environment_type=environment_type,
    )
    db.add(target)
    db.add(scan)
    db.flush()

    vuln_ids = []
    for i in range(count):
        v = Vulnerability(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            type=f"test-vuln-{i}",
            url=f"http://vuln-test.local/path-{i}",
            description=f"Vulnerability {i}",
            severity=SeverityLevel.HIGH,
            status=VulnStatus.OPEN,
            title=f"Test Vuln {i}",
            host="10.0.0.1",
        )
        db.add(v)
        vuln_ids.append(v.id)

    db.commit()
    return scan_id, vuln_ids


# ── Auth gate ─────────────────────────────────────────────────────────────────

def test_list_vulns_requires_auth(client):
    r = client.get("/api/v1/vulnerabilities/")
    assert r.status_code in (401, 403)


def test_bulk_update_requires_auth(client):
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        json={"ids": ["some-id"], "status": "fixed"},
    )
    assert r.status_code in (401, 403)


# ── LIST ──────────────────────────────────────────────────────────────────────

def test_list_returns_list(client, admin_headers):
    r = client.get("/api/v1/vulnerabilities/", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_authenticated_user_can_list_vulnerabilities(client, analyst_headers):
    r = client.get("/api/v1/vulnerabilities/", headers=analyst_headers)
    assert r.status_code == 200


def test_list_filter_by_scan_id(client, admin_headers, db_session):
    scan_id, _ = _seed_scan_with_vulns(db_session, count=2)
    r = client.get(f"/api/v1/vulnerabilities/?scan_id={scan_id}", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    for v in body:
        assert v["scan_id"] == scan_id


def test_list_filter_by_severity(client, admin_headers, db_session):
    scan_id, _ = _seed_scan_with_vulns(db_session, count=2)
    r = client.get("/api/v1/vulnerabilities/?severity=high", headers=admin_headers)
    assert r.status_code == 200
    for v in r.json():
        assert v["severity"] == "high"


def test_list_filter_by_environment(client, admin_headers, db_session):
    _seed_scan_with_vulns(db_session, count=1, environment_type="lab")
    r = client.get("/api/v1/vulnerabilities/?environment=lab", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_limit_respected(client, admin_headers, db_session):
    _seed_scan_with_vulns(db_session, count=5)
    r = client.get("/api/v1/vulnerabilities/?limit=2", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 2


# ── BULK UPDATE ───────────────────────────────────────────────────────────────

def test_viewer_cannot_bulk_update(client, viewer_headers, db_session):
    _, ids = _seed_scan_with_vulns(db_session, count=1)
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=viewer_headers,
        json={"ids": ids, "status": "fixed"},
    )
    assert r.status_code == 403


def test_analyst_can_bulk_update_status(client, analyst_headers, db_session):
    _, ids = _seed_scan_with_vulns(db_session, count=2)
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=analyst_headers,
        json={"ids": ids, "status": "fixed"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "updated" in body
    assert len(body["updated"]) == 2


def test_admin_can_bulk_update_remediation(client, admin_headers, db_session):
    _, ids = _seed_scan_with_vulns(db_session, count=1)
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=admin_headers,
        json={"ids": ids, "remediation": "Apply patch XYZ"},
    )
    assert r.status_code == 200
    assert len(r.json()["updated"]) == 1


def test_bulk_update_returns_not_found_for_ghost_ids(client, admin_headers):
    ghost_id = str(uuid.uuid4())
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=admin_headers,
        json={"ids": [ghost_id], "status": "fixed"},
    )
    assert r.status_code == 200
    body = r.json()
    assert ghost_id in body["not_found"]


def test_bulk_update_empty_ids_returns_400(client, admin_headers):
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=admin_headers,
        json={"ids": [], "status": "fixed"},
    )
    assert r.status_code in (400, 422)


def test_bulk_update_missing_both_fields_returns_400(client, admin_headers, db_session):
    _, ids = _seed_scan_with_vulns(db_session, count=1)
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=admin_headers,
        json={"ids": ids},
    )
    assert r.status_code == 400


def test_bulk_update_preserves_previous_status_in_response(client, analyst_headers, db_session):
    _, ids = _seed_scan_with_vulns(db_session, count=1)
    r = client.patch(
        "/api/v1/vulnerabilities/bulk",
        headers=analyst_headers,
        json={"ids": ids, "status": "fixed"},
    )
    assert r.status_code == 200
    updated = r.json()["updated"]
    assert len(updated) == 1
    assert "previous_status" in updated[0]
