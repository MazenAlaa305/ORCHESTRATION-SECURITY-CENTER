"""
Report signing utilities.
Phase 5.2 — Found 404 Hardening Plan.

canonical_findings_hash(findings)
    Deterministic SHA-256 of the sorted canonical JSON of all finding dicts.
    Same findings always produce the same hash regardless of insertion order.

sign_pdf(pdf_bytes) -> str
    HMAC-SHA256 of the PDF bytes using settings.REPORT_SIGNING_KEY.
    Returns hex digest.

verify_signature(pdf_bytes, stored_sig) -> bool
    Constant-time comparison of recomputed vs stored signature.
"""
import hashlib
import hmac
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def canonical_findings_hash(findings: list[dict]) -> str:
    """
    Return a stable SHA-256 of the findings list.

    Findings are sorted by 'id' before serialisation so that insertion order
    does not affect the hash.  Keys within each finding dict are also sorted.
    """
    try:
        sorted_findings = sorted(findings, key=lambda f: str(f.get("id", "")))
        canonical = json.dumps(sorted_findings, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    except Exception as exc:
        logger.error("canonical_findings_hash failed: %s", exc)
        return "0" * 64


def sign_pdf(pdf_bytes: bytes, key: Optional[str] = None) -> str:
    """
    Return the HMAC-SHA256 hex digest of *pdf_bytes* using *key*.
    Falls back to settings.REPORT_SIGNING_KEY when *key* is None.
    Returns an empty string if no key is configured (with a warning).
    """
    from app.core.config import settings
    signing_key = key or settings.REPORT_SIGNING_KEY
    if not signing_key:
        logger.warning("REPORT_SIGNING_KEY is not set — PDF will not be signed")
        return ""
    mac = hmac.new(signing_key.encode(), pdf_bytes, hashlib.sha256)
    return mac.hexdigest()


def verify_signature(pdf_bytes: bytes, stored_sig: str, key: Optional[str] = None) -> bool:
    """
    Return True iff the HMAC of *pdf_bytes* matches *stored_sig*.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not stored_sig:
        return False
    recomputed = sign_pdf(pdf_bytes, key=key)
    if not recomputed:
        return False
    return hmac.compare_digest(recomputed, stored_sig)
