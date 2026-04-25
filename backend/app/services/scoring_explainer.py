"""
Pure-function risk-score explainer.

Translates a numeric risk score (0–100) plus the contributing factors into a
short human-readable paragraph suitable for a dashboard tooltip. No I/O, no
LLM, no database — deterministic so the explanation can be cached alongside
the score.
"""
from __future__ import annotations

from typing import TypedDict

from app.services.unified_risk_engine import UnifiedRiskEngine


class ScoreFactors(TypedDict, total=False):
    severity_counts: dict[str, int]   # e.g. {"CRITICAL": 2, "HIGH": 5}
    open_high_risk_ports: list[int]   # e.g. [445, 23]
    asset_criticality: str            # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    cvss_max: float                   # highest CVSS for this asset's findings


def explain(score: float, factors: ScoreFactors | None = None) -> str:
    """
    Returns a 1–4 sentence explanation of why the asset has the given score.
    Always includes the risk band so the caller knows the magnitude.
    """
    factors = factors or {}
    band = _band(score)
    parts: list[str] = [f"Risk band: {band} ({float(score):.0f}/100)."]

    sev = factors.get("severity_counts", {}) or {}
    notable = []
    for level in ("CRITICAL", "HIGH"):
        n = sev.get(level, 0)
        if n:
            notable.append(f"{n} {level.lower()}")
    if notable:
        parts.append("Driven by " + ", ".join(notable) + " findings.")

    ports = factors.get("open_high_risk_ports") or []
    risky = [p for p in ports if p in UnifiedRiskEngine.HIGH_RISK_PORTS]
    if risky:
        names = [UnifiedRiskEngine.HIGH_RISK_PORTS[p][0] for p in risky[:3]]
        parts.append(f"High-risk services exposed: {', '.join(names)}.")

    crit = (factors.get("asset_criticality") or "").upper()
    if crit in ("CRITICAL", "HIGH"):
        parts.append(f"Asset is {crit.lower()} business value, multiplying impact.")

    cvss = factors.get("cvss_max")
    if cvss is not None and cvss >= 9.0:
        parts.append(f"Highest CVSS observed: {cvss:.1f}.")

    return " ".join(parts)


def _band(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    if score > 0:
        return "LOW"
    return "INFO"
