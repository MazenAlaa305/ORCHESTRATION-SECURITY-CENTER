"""
Reports API endpoints.
Phase 5.2 — Orchestration Security Center Hardening Plan.

POST /reports/{scan_id}/generate  — build PDF, sign it, store metadata
GET  /reports/{scan_id}/pdf       — download the stored PDF
GET  /reports/{report_id}/meta    — return metadata (findings_hash, signature)
GET  /reports/{report_id}/verify  — re-sign and compare stored signature
"""
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import Scan, Report
from app.services.pdf_generator import PDFReportGenerator
from app.services.report_signer import canonical_findings_hash, sign_pdf, verify_signature

router = APIRouter()
logger = logging.getLogger(__name__)


def _severity_str(value) -> str:
    """Normalise severity enums/strings/None to a lowercase label."""
    if value is None:
        return "info"
    # SQLAlchemy enum values have a `.value` attribute; plain strings don't.
    raw = getattr(value, "value", value)
    return str(raw).lower()


def _findings_for_scan(scan: Scan) -> list[dict]:
    """Build the canonical findings list used for hashing and the PDF."""
    findings = []
    for v in scan.vulnerabilities or []:
        findings.append({
            "id": str(v.finding_id or v.id),
            "type": v.type or "unknown",
            "severity": _severity_str(v.severity),
            "url": v.url or v.host or "",
            "template_id": v.template_id or "",
            "cvss_score": v.cvss_score if v.cvss_score is not None else 0.0,
            "cvss_vector": v.cvss_vector or "",
            "status": _severity_str(v.status),
        })
    return findings


def _build_scan_data(scan: Scan) -> dict:
    """Assemble the rich data dict consumed by the PDF generator."""
    # Resolve target name safely — scan.target may be None for legacy scans.
    target_name = "unknown_target"
    if scan.target is not None and scan.target.base_url:
        target_name = scan.target.base_url
    elif scan.target_url:
        target_name = scan.target_url

    vulns = []
    for v in scan.vulnerabilities or []:
        vulns.append({
            "id": str(v.id),
            "title": v.title or v.type or v.template_id or "Vulnerability",
            "type": v.type or "unknown",
            "severity": _severity_str(v.severity),
            "cvss_score": v.cvss_score if v.cvss_score is not None else 0.0,
            "cvss_vector": v.cvss_vector or "",
            "url": v.url or "",
            "host": v.host or "",
            "port": v.port,
            "service": v.service or "",
            "parameter": v.parameter or "",
            "description": v.simplified_description or v.description or "",
            "remediation": v.remediation_steps or v.remediation or "",
            "cve_id": v.cve_id or "",
            "template_id": v.template_id or "",
            "detected_by": v.detected_by or "",
            "confidence": v.confidence_score if v.confidence_score is not None else None,
        })

    assets = []
    for a in scan.assets or []:
        assets.append({
            "ip": a.ip_address,
            "hostname": a.hostname,
            "device_type": a.device_type,
            "os": a.os_name,
        })

    actions = []
    for a in scan.actions or []:
        actions.append({
            "title": a.title or "",
            "description": a.description or "",
            "priority": (a.priority or "LOW").upper(),
            "type": a.type or "",
        })

    return {
        "scan_id": str(scan.id),
        "target": target_name,
        "scan_type": scan.scan_type or "full",
        "completed_at": scan.completed_at or scan.end_time,
        "started_at": scan.started_at or scan.start_time,
        "risk_score": float(scan.risk_score or 0.0),
        "risk_breakdown": scan.risk_breakdown or {},
        "assets": assets,
        "actions": actions,
        "vulnerabilities": vulns,
    }


@router.post("/{scan_id}/generate")
def generate_report(scan_id: str, db: Session = Depends(get_db)):
    """Generate a signed PDF report for a completed scan and store the metadata."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    try:
        findings = _findings_for_scan(scan)
        fhash = canonical_findings_hash(findings)
        scan_data = _build_scan_data(scan)

        report_id = str(uuid.uuid4())
        pdf_buffer = PDFReportGenerator.generate_report(
            scan_data, scan_id=report_id, findings_hash=fhash
        )
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
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Report generation failed for scan %s: %s", scan_id, exc)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")


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
    try:
        advisor = AIAdvisor()
        analysis = await advisor.generate_report(scan)
    except Exception as exc:
        logger.warning("Legacy AI advisor failed for scan %s: %s", scan_id, exc)
        analysis = "AI analysis unavailable. Use POST /reports/{scan_id}/generate for a signed PDF."
    return {"scan_id": scan.id, "ai_analysis": analysis}
