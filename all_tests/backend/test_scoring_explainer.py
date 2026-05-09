"""
Tests for app/services/scoring_explainer.py — explain() and _band()
"""
import allure
import pytest
from app.services.scoring_explainer import explain, _band


# ── _band ─────────────────────────────────────────────────────────────────────

@allure.epic("Risk Management")
@allure.feature("Risk Score Explainer")
@allure.story("Band Classification")
class TestBand:
    @allure.title("Band thresholds map scores to correct severity labels")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.parametrize("score,expected", [
        (100, "CRITICAL"),
        (80,  "CRITICAL"),
        (79,  "HIGH"),
        (60,  "HIGH"),
        (59,  "MEDIUM"),
        (30,  "MEDIUM"),
        (29,  "LOW"),
        (1,   "LOW"),
        (0,   "INFO"),
    ])
    def test_band_thresholds(self, score, expected):
        assert _band(score) == expected


# ── explain ───────────────────────────────────────────────────────────────────

@allure.epic("Risk Management")
@allure.feature("Risk Score Explainer")
@allure.story("Narrative Generation")
class TestExplain:
    @allure.title("explain() returns a string")
    @allure.severity(allure.severity_level.NORMAL)
    def test_returns_string(self):
        assert isinstance(explain(50), str)

    @allure.title("Narrative contains the risk band label")
    @allure.severity(allure.severity_level.NORMAL)
    def test_contains_risk_band(self):
        result = explain(75)
        assert "HIGH" in result

    @allure.title("Narrative contains the numeric score")
    @allure.severity(allure.severity_level.NORMAL)
    def test_contains_score(self):
        result = explain(42)
        assert "42" in result

    @allure.title("Zero score with no factors still produces a sentence")
    @allure.severity(allure.severity_level.NORMAL)
    def test_no_factors_still_returns_sentence(self):
        result = explain(0)
        assert "INFO" in result

    @allure.title("Critical severity count is mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_severity_counts_critical(self):
        result = explain(90, {"severity_counts": {"CRITICAL": 3, "HIGH": 0}})
        assert "3 critical" in result.lower()

    @allure.title("High severity count is mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_severity_counts_high(self):
        result = explain(70, {"severity_counts": {"CRITICAL": 0, "HIGH": 5}})
        assert "5 high" in result.lower()

    @allure.title("Zero severity counts are not mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_zero_severity_counts_not_mentioned(self):
        result = explain(50, {"severity_counts": {"CRITICAL": 0, "HIGH": 0}})
        assert "Driven by" not in result

    @allure.title("Known high-risk port (Telnet/23) is mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_high_risk_port_mentioned(self):
        result = explain(60, {"open_high_risk_ports": [23]})
        assert "Telnet" in result or "telnet" in result.lower() or "High-risk" in result

    @allure.title("Unknown port (9999) is not mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_safe_port_not_mentioned(self):
        # Port 9999 is not in HIGH_RISK_PORTS
        result = explain(60, {"open_high_risk_ports": [9999]})
        assert "High-risk" not in result

    @allure.title("Critical asset criticality is mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_critical_asset_mentioned(self):
        result = explain(50, {"asset_criticality": "CRITICAL"})
        assert "critical" in result.lower()

    @allure.title("Low asset criticality is not mentioned in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_low_asset_criticality_not_mentioned(self):
        result = explain(50, {"asset_criticality": "LOW"})
        assert "multiplying" not in result

    @allure.title("High CVSS score (>=9.0) is called out in narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_high_cvss_mentioned(self):
        result = explain(80, {"cvss_max": 9.5})
        assert "9.5" in result

    @allure.title("Moderate CVSS score (<9.0) is not highlighted")
    @allure.severity(allure.severity_level.NORMAL)
    def test_low_cvss_not_mentioned(self):
        result = explain(80, {"cvss_max": 7.5})
        assert "CVSS" not in result

    @allure.title("None factors argument is handled without error")
    @allure.severity(allure.severity_level.NORMAL)
    def test_none_factors_ok(self):
        result = explain(55, None)
        assert isinstance(result, str)

    @allure.title("All factors combined produce a valid narrative")
    @allure.severity(allure.severity_level.NORMAL)
    def test_all_factors_combined(self):
        factors = {
            "severity_counts": {"CRITICAL": 2, "HIGH": 4},
            "open_high_risk_ports": [23, 445],
            "asset_criticality": "CRITICAL",
            "cvss_max": 9.8,
        }
        result = explain(95, factors)
        assert "CRITICAL" in result
        assert "9.8" in result
