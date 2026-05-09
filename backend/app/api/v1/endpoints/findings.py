"""
Findings API endpoint.
Phase 5.3 — Orchestration Security Center Hardening Plan.

GET /api/v1/findings
    Returns paginated Finding records with optional filtering by framework,
    control, scan_id, and status.

Query parameters:
    framework  — e.g. "iso27001", "owasp_top10", "cwe", "nist_csf_function",
                 "pci_dss_requirement"
    control    — e.g. "A.12.6.1", "A03:2021", "CWE-89"
    scan_id    — filter findings that have at least one observation in this scan
    status     — filter by FindingStatus (open, fixed, accepted, reopened, false_positive)
    limit      — max results to return (default 50, max 200)
    offset     — pagination offset (default 0)
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import Finding, FindingStatus, Vulnerability

router = APIRouter()
logger = logging.getLogger(__name__)

# Map query param 'framework' to the JSON key used in control_tags
_FRAMEWORK_KEYS = {
    "owasp_top10": "owasp_top10",
    "owasp": "owasp_top10",
    "cwe": "cwe",
    "iso27001": "iso27001_annex_a",
    "iso27001_annex_a": "iso27001_annex_a",
    "nist": "nist_csf_function",
    "nist_csf": "nist_csf_function",
    "nist_csf_function": "nist_csf_function",
    "pci": "pci_dss_requirement",
    "pci_dss": "pci_dss_requirement",
    "pci_dss_requirement": "pci_dss_requirement",
}


@router.get("")
def list_findings(
    framework: Optional[str] = Query(None, description="Framework key (iso27001, owasp_top10, cwe, nist_csf_function, pci_dss_requirement)"),
    control: Optional[str] = Query(None, description="Control value to match within the framework"),
    scan_id: Optional[str] = Query(None, description="Filter findings observed in this scan"),
    status: Optional[str] = Query(None, description="FindingStatus filter"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List findings with optional framework/control filtering.

    Framework filter example: ?framework=iso27001&control=A.12.6.1
    This returns all findings whose control_tags['iso27001_annex_a'] == 'A.12.6.1'.
    """
    query = db.query(Finding)

    # Status filter
    if status:
        try:
            status_enum = FindingStatus(status.lower())
            query = query.filter(Finding.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status '{status}'. Valid values: {[s.value for s in FindingStatus]}"
            )

    # Scan filter — join through Vulnerability observations
    if scan_id:
        query = query.join(Vulnerability, Vulnerability.finding_id == Finding.id).filter(
            Vulnerability.scan_id == scan_id
        )

    # Framework + control filter — requires JSON containment
    if framework and control:
        framework_key = _FRAMEWORK_KEYS.get(framework.lower())
        if not framework_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown framework '{framework}'. Valid: {list(_FRAMEWORK_KEYS.keys())}"
            )
        # SQLAlchemy JSON containment: does {"framework_key": "control"} exist in control_tags?
        search_doc = {framework_key: control}
        query = query.filter(Finding.control_tags.contains(search_doc))
    elif framework or control:
        raise HTTPException(
            status_code=400,
            detail="Both 'framework' and 'control' must be provided together."
        )

    # Order by severity (CRITICAL first) then first_seen desc
    findings = (
        query
        .order_by(Finding.severity.desc(), Finding.first_seen.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = query.count()

    return {
        "items": [
            {
                "id": str(f.id),
                "title": f.title,
                "vuln_type": f.vuln_type,
                "severity": str(f.severity),
                "status": str(f.status),
                "control_tags": f.control_tags or {},
                "first_seen": f.first_seen.isoformat() if f.first_seen else None,
            }
            for f in findings
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
