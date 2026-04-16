"""
Audit chain verification endpoint.
Phase 5.1 — Found 404 Hardening Plan.

GET /api/v1/scans/{scan_id}/audit/verify
    Walks the agent_logs hash chain for the given scan and returns whether
    the chain is intact.  A broken chain means a row was tampered with
    after insertion (which the DB trigger normally prevents, but an admin
    could bypass the trigger by disabling it).
"""
import hashlib
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import AgentLog, Scan

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/scans/{scan_id}/audit/verify")
def verify_audit_chain(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """
    Recompute the SHA-256 hash chain for all AgentLog rows belonging to
    *scan_id* and confirm each row's stored this_hash matches the recomputed
    value.

    Returns:
        {
          "valid": true | false,
          "broken_at": null | "<log_row_id>",
          "chain_length": <int>,
          "scan_id": "<scan_id>"
        }
    """
    # Confirm the scan exists
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    logs = (
        db.query(AgentLog)
        .filter(AgentLog.scan_id == scan_id)
        .order_by(AgentLog.id)
        .all()
    )

    broken_at = None
    prev_hash = "0" * 64

    for log in logs:
        payload = json.dumps(
            {
                "scan_id": log.scan_id,
                "agent_name": log.agent_name,
                "action": log.action,
                "reasoning": log.reasoning,
            },
            sort_keys=True,
            ensure_ascii=True,
        )
        expected_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()

        if log.this_hash != expected_hash:
            logger.warning(
                "Audit chain broken at log %s for scan %s — "
                "stored=%s expected=%s",
                log.id, scan_id, log.this_hash, expected_hash,
            )
            broken_at = log.id
            break

        prev_hash = log.this_hash

    return {
        "valid": broken_at is None,
        "broken_at": broken_at,
        "chain_length": len(logs),
        "scan_id": scan_id,
    }
