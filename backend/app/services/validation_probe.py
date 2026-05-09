"""
validation_probe.py — Deterministic vulnerability reprobe.

Phase 1.3 hardening: replaces the non-deterministic LLM-only
REAL/FALSE_POSITIVE verdict with an HTTP reprobe + difflib comparison.

The LLM is NEVER the decision-maker here.  It may produce an optional
written justification (commentary only) when LLM_VALIDATION_ENABLED=True.
"""
import difflib
import logging
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse, urlunparse

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Outcome of a deterministic reprobe."""
    confirmed: bool          # True = vulnerability still present
    new_response: str        # Raw response body from the reprobe request
    diff_ratio: float        # 0.0–1.0 similarity to stored raw_response
    reason: str              # Machine-readable reason for logging & audit trail


async def reprobe(
    raw_request: Optional[str],
    raw_response: Optional[str],
    url: str,
    detected_by: Optional[str],
    template_id: Optional[str],
    http_client: httpx.AsyncClient,
) -> ValidationResult:
    """
    Re-send the stored HTTP request, diff the response, and decide.

    Decision rules:
      1. If raw_request is None (legacy finding pre-Phase-1.2), we cannot
         reprobe deterministically → return confirmed=True with a clear reason
         so we don't silently suppress real findings from before the upgrade.
      2. If the reprobe HTTP response diverges >50% from the stored response
         the vulnerability likely no longer exists → confirmed=False.
      3. For Nuclei injection findings (template_id contains "injection",
         "sqli", or "xss"), the original match signals must still appear in
         the new response → if they don't, confirmed=False.

    Args:
        raw_request:  Verbatim HTTP request stored from the initial scan.
        raw_response: Verbatim HTTP response stored from the initial scan.
        url:          Base URL of the target (used to reconstruct the full URL).
        detected_by:  "nuclei" | "recon" | "manual" | None
        template_id:  Nuclei template ID — used to narrow the injection check.
        http_client:  An open httpx.AsyncClient (caller manages lifecycle).

    Returns:
        ValidationResult with confirmed, diff_ratio, and an audit reason.
    """
    # ── Guard: no stored request = legacy finding, cannot reprobe ─────────────
    if not raw_request:
        return ValidationResult(
            confirmed=True,
            new_response="",
            diff_ratio=0.0,
            reason="no_raw_request_legacy_finding",
        )

    try:
        # ── Parse the stored raw request first line ────────────────────────────
        # Format: "METHOD /path HTTP/1.1"
        first_line = raw_request.splitlines()[0] if raw_request.splitlines() else ""
        parts = first_line.split()

        method = parts[0] if len(parts) >= 1 else "GET"
        path = parts[1] if len(parts) >= 2 else "/"

        # Reconstruct from the stored URL's scheme+host + path from the request
        parsed = urlparse(url)
        reprobe_url = urlunparse((
            parsed.scheme or "https",
            parsed.netloc or parsed.path,
            path,
            "",
            "",
            "",
        ))

        # ── Send the reprobe request ───────────────────────────────────────────
        resp = await http_client.request(method, reprobe_url, timeout=10)
        new_response_text = resp.text

        # ── Similarity diff ────────────────────────────────────────────────────
        ratio = difflib.SequenceMatcher(
            None,
            raw_response or "",
            new_response_text,
        ).ratio()

        # If the responses have diverged substantially, the vuln is likely gone
        if ratio < 0.5:
            return ValidationResult(
                confirmed=False,
                new_response=new_response_text,
                diff_ratio=ratio,
                reason="reprobe_response_diverged",
            )

        # ── Injection-specific pattern check ──────────────────────────────────
        # For Nuclei injection findings, verify the match signal still appears.
        if detected_by == "nuclei" and template_id:
            cat = template_id.split("/")[0].lower() if "/" in template_id else template_id.lower()
            is_injection = any(kw in cat for kw in ("injection", "sqli", "xss", "ssti", "rce"))

            if is_injection and raw_response:
                # Extract lines that look like error/exploit signals from original
                original_signals = [
                    line.strip()
                    for line in raw_response.splitlines()
                    if any(
                        kw in line.lower()
                        for kw in ("error", "alert", "syntax", "exception", "warning", "fatal")
                    )
                ]
                if original_signals:
                    still_present = any(
                        sig[:60] in new_response_text
                        for sig in original_signals
                    )
                    if not still_present:
                        return ValidationResult(
                            confirmed=False,
                            new_response=new_response_text,
                            diff_ratio=ratio,
                            reason="reprobe_injection_pattern_missing",
                        )

        # All checks passed — vulnerability is still present
        return ValidationResult(
            confirmed=True,
            new_response=new_response_text,
            diff_ratio=ratio,
            reason="reprobe_confirmed",
        )

    except httpx.TimeoutException:
        return ValidationResult(
            confirmed=False,
            new_response="",
            diff_ratio=0.0,
            reason="reprobe_timeout",
        )
    except Exception as exc:
        logger.warning(f"[validation_probe] reprobe error for {url}: {exc}")
        return ValidationResult(
            confirmed=False,
            new_response="",
            diff_ratio=0.0,
            reason=f"reprobe_error:{type(exc).__name__}",
        )
