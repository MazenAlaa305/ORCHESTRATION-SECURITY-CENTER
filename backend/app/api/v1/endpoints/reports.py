"""
Reports API endpoints.
Phase 5.2 — Found 404 Hardening Plan.

POST /reports/{scan_id}/generate  — build PDF, sign it, store metadata
GET  /reports/{scan_id}/pdf       — download the stored PDF
GET  /reports/{report_id}/meta    — return metadata (findings_hash, signature)
GET  /reports/{report_id}/verify  — re-sign and compare stored signature
"""
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.database import get_db
from app.models.scan import Scan, Vulnerability, Finding, Report
from app.services.pdf_generator import PDFReportGenerator
from app.services.report_signer import canonical_findings_hash, sign_pdf, verify_signature

router = APIRouter()
logger = logging.getLogger(__name__)


def _findings_for_scan(scan: Scan) -> list[dict]:
    """Build the canonical findings list used for hashing and the PDF."""
    return [
        {
            "id": str(v.finding_id or v.id),
            "type": v.type,
            "severity": str(v.severity),
            "url": v.url,
            "template_id": v.template_id,
            "cvss_score": v.cvss_score,
            "status": str(v.status),
        }
        for v in scan.vulnerabilities
    ]


@router.post("/{scan_id}/generate")
def generate_report(scan_id: str, db: Session = Depends(get_db)):
    """Generate a signed PDF report for a completed scan and store the metadata."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = _findings_for_scan(scan)
    fhash = canonical_findings_hash(findings)

    # Resolve target name
    target_name = (
        scan.target.base_url if scan.target and scan.target.base_url
        else scan.target_url or "unknown_target"
    )

    scan_data = {
        "scan_id": scan_id,
        "target": target_name,
        "completed_at": scan.completed_at,
        "risk_score": scan.risk_score or 0.0,
        "assets": [
            {"ip": a.ip_address, "hostname": a.hostname, "device_type": a.device_type}
            for a in scan.assets
        ],
        "actions": [
            {"title": a.title, "description": a.description, "priority": a.priority, "type": a.type}
            for a in scan.actions
        ],
        "vulnerabilities": [
            {"host": v.host, "port": v.port, "service": v.service, "severity": str(v.severity)}
            for v in scan.vulnerabilities
        ],
    }

    report_id = str(uuid.uuid4())
    pdf_buffer = PDFReportGenerator.generate_report(scan_data, scan_id=report_id, findings_hash=fhash)
    pdf_bytes = pdf_buffer.read()
    sig = sign_pdf(pdf_bytes)

    report = Report(
        id=report_id,
        scan_id=scan_id,
        generated_at=datetime.utcnow(),
        findings_hash=fhash,
        signature=sig,
        pdf_bytes=pdf_bytes,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "report_id": report.id,
        "scan_id": scan_id,
        "generated_at": report.generated_at.isoformat(),
        "findings_hash": fhash,
        "signed": bool(sig),
    }


@router.get("/{report_id}/meta")
def get_report_meta(report_id: str, db: Session = Depends(get_db)):
    """Return report metadata without regenerating the PDF."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "report_id": report.id,
        "scan_id": report.scan_id,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "findings_hash": report.findings_hash,
        "signature": report.signature,
    }


@router.get("/{report_id}/pdf")
def download_report(report_id: str, db: Session = Depends(get_db)):
    """Download the stored PDF."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not report.pdf_bytes:
        raise HTTPException(status_code=404, detail="Report PDF not found")
    return Response(
        content=report.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id[:8]}.pdf"},
    )


@router.get("/{report_id}/verify")
def verify_report(report_id: str, db: Session = Depends(get_db)):
    """Re-sign the stored PDF bytes and compare with the stored signature."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.pdf_bytes:
        return {"valid": False, "reason": "No PDF bytes stored", "report_id": report_id}

    signature_match = verify_signature(report.pdf_bytes, report.signature or "")
    return {
        "valid": signature_match,
        "signature_match": signature_match,
        "findings_hash": report.findings_hash,
        "report_id": report_id,
    }


# ── Legacy endpoints preserved for backwards compatibility ────────────────────

@router.get("/{scan_id}")
async def get_report_legacy(scan_id: str, db: Session = Depends(get_db)):
    """Legacy: returns AI analysis text. Use /generate for signed reports."""
    from app.services.ai_advisor import AIAdvisor
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    advisor = AIAdvisor()
    analysis = await advisor.generate_report(scan)
    return {"scan_id": scan.id, "ai_analysis": analysis}
