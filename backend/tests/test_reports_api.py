"""
Tests for /api/v1/reports/ endpoints:
  POST /{scan_id}/generate
  GET  /{report_id}/meta
  GET  /{report_id}/pdf
  GET  /{report_id}/verify
  GET  /{scan_id}          (legacy)
"""
import uuid
import pytest
from app.models.scan import Scan, ScanStatus, Target


# ── Seed helpers ──────────────────────────────────────────────────────────────

def _seed_scan(db):
    target = Target(id=str(uuid.uuid4()), name="ReportTarget", base_url="http://report.local")
    scan = Scan(
        id=str(uuid.uuid4()),
        target_id=target.id,
        target_url="http://report.local",
        status=ScanStatus.COMPLETED,
    )
    db.add(target)
    db.add(scan)
    db.commit()
    return scan


# ── Auth gate ─────────────────────────────────────────────────────────────────

def test_generate_requires_auth(client, db_session):
    scan = _seed_scan(db_session)
    r = client.post(f"/api/v1/reports/{scan.id}/generate")
    assert r.status_code in (401, 403)


def test_meta_requires_auth(client):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/meta")
    assert r.status_code in (401, 403)


def test_pdf_requires_auth(client):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/pdf")
    assert r.status_code in (401, 403)


def test_verify_requires_auth(client):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/verify")
    assert r.status_code in (401, 403)


# ── 404 for unknown scan ──────────────────────────────────────────────────────

def test_generate_unknown_scan_404(client, admin_headers):
    r = client.post(f"/api/v1/reports/{uuid.uuid4()}/generate", headers=admin_headers)
    assert r.status_code == 404


def test_meta_unknown_report_404(client, admin_headers):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/meta", headers=admin_headers)
    assert r.status_code == 404


def test_pdf_unknown_report_404(client, admin_headers):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/pdf", headers=admin_headers)
    assert r.status_code == 404


def test_verify_unknown_report_404(client, admin_headers):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}/verify", headers=admin_headers)
    assert r.status_code == 404


# ── Generate → meta → pdf → verify full flow ─────────────────────────────────

def test_generate_report_returns_metadata(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    r = client.post(f"/api/v1/reports/{scan.id}/generate", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "report_id" in body
    assert "findings_hash" in body
    assert "generated_at" in body
    assert body["scan_id"] == scan.id


def test_get_report_meta_after_generate(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    gen = client.post(f"/api/v1/reports/{scan.id}/generate", headers=admin_headers)
    report_id = gen.json()["report_id"]

    r = client.get(f"/api/v1/reports/{report_id}/meta", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["report_id"] == report_id
    assert body["scan_id"] == scan.id
    assert "findings_hash" in body


def test_download_pdf_after_generate(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    gen = client.post(f"/api/v1/reports/{scan.id}/generate", headers=admin_headers)
    report_id = gen.json()["report_id"]

    r = client.get(f"/api/v1/reports/{report_id}/pdf", headers=admin_headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 0


def test_verify_report_returns_valid(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    gen = client.post(f"/api/v1/reports/{scan.id}/generate", headers=admin_headers)
    report_id = gen.json()["report_id"]

    r = client.get(f"/api/v1/reports/{report_id}/verify", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "valid" in body
    assert "findings_hash" in body


# ── Legacy endpoint ───────────────────────────────────────────────────────────

def test_legacy_get_report_returns_ai_analysis_field(client, admin_headers, db_session):
    scan = _seed_scan(db_session)
    r = client.get(f"/api/v1/reports/{scan.id}", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "ai_analysis" in body
    assert "scan_id" in body


def test_legacy_unknown_scan_404(client, admin_headers):
    r = client.get(f"/api/v1/reports/{uuid.uuid4()}", headers=admin_headers)
    assert r.status_code == 404


# ── Analyst can also generate ─────────────────────────────────────────────────

def test_analyst_can_generate_report(client, analyst_headers, db_session):
    scan = _seed_scan(db_session)
    r = client.post(f"/api/v1/reports/{scan.id}/generate", headers=analyst_headers)
    assert r.status_code == 200
