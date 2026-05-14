"""
Tests for GET /api/v1/scans/{scan_id}/audit/verify (audit chain endpoint)
"""
import allure
import uuid
import hashlib
import json
from app.models.scan import AgentLog, Scan, ScanStatus, Target


# ── Seed helpers ──────────────────────────────────────────────────────────────

def _seed_scan(db):
    target = Target(id=str(uuid.uuid4()), name="AuditT", base_url="http://audit.local")
    scan = Scan(
        id=str(uuid.uuid4()),
        target_id=target.id,
        target_url="http://audit.local",
        status=ScanStatus.COMPLETED,
    )
    db.add(target)
    db.add(scan)
    db.flush()
    return scan


def _add_valid_chain(db, scan_id, entries):
    """Insert AgentLog rows with a valid hash chain.

    Pre-sorts the log UUIDs so that ORDER BY id (alphabetical) matches
    insertion order — otherwise hash chain verification is a 50/50 coin flip.
    """
    # Assign IDs in sorted order so the endpoint's ORDER BY id matches insertion order
    ids = sorted(str(uuid.uuid4()) for _ in entries)

    prev_hash = "0" * 64
    for i, entry in enumerate(entries):
        payload = json.dumps(
            {
                "scan_id": scan_id,
                "agent_name": entry["agent_name"],
                "action": entry["action"],
                "reasoning": entry.get("reasoning", ""),
            },
            sort_keys=True,
            ensure_ascii=True,
        )
        this_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()
        log = AgentLog(
            id=ids[i],
            scan_id=scan_id,
            agent_name=entry["agent_name"],
            action=entry["action"],
            reasoning=entry.get("reasoning", ""),
            this_hash=this_hash,
            prev_hash=prev_hash,
        )
        db.add(log)
        db.flush()
        prev_hash = this_hash
    db.commit()


# ── Auth gate ─────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Authentication")
@allure.title("Unauthenticated request to audit verify is rejected")
@allure.severity(allure.severity_level.BLOCKER)
def test_audit_verify_requires_auth(client, db_session):
    scan = _seed_scan(db_session)
    r = client.get(f"/api/v1/scans/{scan.id}/audit/verify")
    assert r.status_code in (401, 403)


# ── 404 for unknown scan ──────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Error Handling")
@allure.title("Unknown scan_id returns 404")
@allure.severity(allure.severity_level.NORMAL)
def test_audit_verify_unknown_scan_404(client, admin_headers):
    r = client.get(f"/api/v1/scans/{uuid.uuid4()}/audit/verify", headers=admin_headers)
    assert r.status_code == 404


# ── Valid chain ───────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Chain Verification")
@allure.title("Valid hash chain returns valid=True with correct chain_length")
@allure.severity(allure.severity_level.CRITICAL)
def test_valid_chain_returns_true(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    _add_valid_chain(db_session, scan.id, [
        {"agent_name": "discovery", "action": "scan_start", "reasoning": "init"},
        {"agent_name": "nuclei",    "action": "found_sqli",  "reasoning": "detected"},
    ])
    r = client.get(f"/api/v1/scans/{scan.id}/audit/verify", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["broken_at"] is None
    assert body["chain_length"] == 2
    assert body["scan_id"] == scan.id


@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Chain Verification")
@allure.title("Empty audit log is considered a valid chain")
@allure.severity(allure.severity_level.NORMAL)
def test_empty_chain_is_valid(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    r = client.get(f"/api/v1/scans/{scan.id}/audit/verify", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["chain_length"] == 0


# ── Broken chain ──────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Chain Verification")
@allure.title("Tampered hash chain returns valid=False with broken_at set")
@allure.severity(allure.severity_level.CRITICAL)
def test_broken_chain_returns_false(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    log = AgentLog(
        scan_id=scan.id,
        agent_name="agent",
        action="action",
        reasoning="",
        this_hash="a" * 64,   # intentionally wrong
        prev_hash="0" * 64,
    )
    db_session.add(log)
    db_session.commit()

    r = client.get(f"/api/v1/scans/{scan.id}/audit/verify", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is False
    assert body["broken_at"] is not None


# ── RBAC ──────────────────────────────────────────────────────────────────────

@allure.epic("API")
@allure.feature("Audit Chain")
@allure.story("Authorization")
@allure.title("Analyst role can access the audit verify endpoint")
@allure.severity(allure.severity_level.NORMAL)
def test_analyst_can_verify_chain(client, analyst_headers, db_session):
    scan = _seed_scan(db_session)
    r = client.get(f"/api/v1/scans/{scan.id}/audit/verify", headers=analyst_headers)
    assert r.status_code == 200
