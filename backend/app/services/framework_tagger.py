"""
Framework tagging service.
Phase 5.3 — Orchestration Security Center Hardening Plan.

Maps Nuclei template categories (and template IDs) to control frameworks:
  OWASP Top 10 2021, CWE, ISO 27001:2013 Annex A,
  NIST CSF function, PCI DSS v4.0 requirement.

Rules:
  - ONLY return tags from the static control_mappings.json seed file.
  - NEVER invent tags.
  - Return an empty dict {} when no mapping is found.
"""
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_MAPPINGS_PATH = Path(__file__).parent.parent / "data" / "control_mappings.json"
_CATEGORY_MAP: dict = {}


def _load() -> None:
    global _CATEGORY_MAP
    if _CATEGORY_MAP:
        return
    try:
        data = json.loads(_MAPPINGS_PATH.read_text(encoding="utf-8"))
        _CATEGORY_MAP = data.get("nuclei_category", {})
        logger.info("framework_tagger: loaded %d category mappings", len(_CATEGORY_MAP))
    except Exception as exc:
        logger.error("framework_tagger: failed to load control_mappings.json — %s", exc)
        _CATEGORY_MAP = {}


def tag_finding(
    template_id: Optional[str],
    vuln_type: Optional[str],
    category: Optional[str] = None,
) -> dict:
    """
    Return a control framework mapping dict for the given template/category.

    Lookup order:
      1. Exact match on *category* (e.g. "sqli", "xss").
      2. Prefix match on *template_id* (e.g. "sqli-generic-..." → "sqli").
      3. Prefix match on *vuln_type* (e.g. "SQL Injection" → "sqli").
      4. Return {} — never invent.

    Args:
        template_id:  Nuclei template ID string (e.g. "sqli-generic-error-based")
        vuln_type:    Vulnerability.type string (e.g. "SQLi", "XSS")
        category:     Explicit category override (rarely needed)

    Returns:
        Dict with framework keys, or {} if unknown.
    """
    _load()

    candidates = [
        (category or "").lower(),
        (template_id or "").lower().split("-")[0],
        (vuln_type or "").lower().replace(" ", "").replace("_", ""),
    ]

    # Normalisation aliases so common shorthand resolves to mapping keys
    _ALIASES = {
        "sqli": "sqli",
        "sqlinjection": "sqli",
        "sql": "sqli",
        "xss": "xss",
        "crosssitescripting": "xss",
        "ssrf": "ssrf",
        "rce": "rce",
        "remotecommandexecution": "rce",
        "remotecodeexecution": "rce",
        "lfi": "lfi",
        "localfileinclusion": "lfi",
        "xxe": "xxe",
        "xmlexternalentity": "xxe",
        "misconfiguration": "misconfiguration",
        "misconfig": "misconfiguration",
        "exposure": "exposure",
        "informationdisclosure": "exposure",
        "cve": "cves",
        "cves": "cves",
        "authentication": "authentication",
        "auth": "authentication",
        "injection": "injection",
        "redirect": "redirect",
        "openredirect": "redirect",
        "defaultlogins": "default-logins",
        "defaultcredentials": "default-logins",
    }

    for raw in candidates:
        if not raw:
            continue
        normalised = _ALIASES.get(raw, raw)
        if normalised in _CATEGORY_MAP:
            return dict(_CATEGORY_MAP[normalised])

    return {}
