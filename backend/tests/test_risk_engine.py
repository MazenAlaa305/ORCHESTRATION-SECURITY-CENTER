"""Tests for UnifiedRiskEngine constants and the scoring_explainer pure-function module."""
import pytest

from app.services.unified_risk_engine import UnifiedRiskEngine
from app.models.scan import SeverityLevel


def test_severity_weight_ordering():
    """Critical must outweigh High must outweigh Medium must outweigh Low."""
    w = UnifiedRiskEngine.SEVERITY_WEIGHTS
    assert w[SeverityLevel.CRITICAL] > w[SeverityLevel.HIGH]
    assert w[SeverityLevel.HIGH] > w[SeverityLevel.MEDIUM]
    assert w[SeverityLevel.MEDIUM] > w[SeverityLevel.LOW]
    assert w[SeverityLevel.LOW] > w[SeverityLevel.INFO]


def test_high_risk_ports_includes_classics():
    for port in (21, 23, 445, 3389, 6379):
        assert port in UnifiedRiskEngine.HIGH_RISK_PORTS, f"port {port} missing"


def test_high_risk_ports_have_name_and_weight():
    for port, entry in UnifiedRiskEngine.HIGH_RISK_PORTS.items():
        assert isinstance(entry, tuple) and len(entry) == 2
        name, weight = entry
        assert isinstance(name, str) and name
        assert isinstance(weight, (int, float)) and weight > 0


def test_asset_value_multipliers_are_monotonic():
    av = UnifiedRiskEngine.ASSET_VALUE_MAP
    assert av["CRITICAL"] > av["HIGH"] > av["MEDIUM"] > av["LOW"]


# ── scoring_explainer.py ─────────────────────────────────────────────────────

def test_explain_returns_string_for_critical_score():
    from app.services.scoring_explainer import explain
    text = explain(85, {
        "severity_counts": {"CRITICAL": 2, "HIGH": 1},
        "open_high_risk_ports": [445],
        "asset_criticality": "CRITICAL",
    })
    assert isinstance(text, str) and len(text) > 0
    assert "CRITICAL" in text
    assert "SMB" in text  # 445 → SMB lookup


def test_explain_handles_zero_findings():
    from app.services.scoring_explainer import explain
    text = explain(0, {})
    assert "INFO" in text or "0" in text


@pytest.mark.parametrize("score,band", [
    (95, "CRITICAL"),
    (70, "HIGH"),
    (40, "MEDIUM"),
    (10, "LOW"),
    (0,  "INFO"),
])
def test_explain_band_thresholds(score, band):
    from app.services.scoring_explainer import explain
    assert band in explain(score, {})
