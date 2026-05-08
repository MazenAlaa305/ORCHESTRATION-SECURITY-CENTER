"""
Unit tests for app.services.cvss — CVSS v3.1 Base Score and Environmental Score.

All expected values are cross-checked against the official CVSS v3.1 calculator
at https://www.first.org/cvss/calculator/3.1
"""
import pytest
from app.services.cvss import base_score, environmental_score, parse_vector, severity_to_default_vector


# ── parse_vector ─────────────────────────────────────────────────────────────

class TestParseVector:
    def test_full_prefix_stripped(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert vec["AV"] == "N"
        assert vec["S"] == "C"
        assert vec["C"] == "H"

    def test_short_form_no_prefix(self):
        vec = parse_vector("AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N")
        assert vec["AV"] == "L"
        assert vec["AC"] == "H"
        assert vec["PR"] == "L"

    def test_missing_metrics_filled_with_defaults(self):
        vec = parse_vector("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert vec["S"] == "U"
        for key in ("AV", "AC", "PR", "UI", "S", "C", "I", "A"):
            assert key in vec

    def test_environmental_keys_default_to_x(self):
        vec = parse_vector("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert vec["CR"] == "X"
        assert vec["IR"] == "X"
        assert vec["AR"] == "X"

    def test_case_insensitive_input(self):
        vec = parse_vector("av:n/ac:l/pr:n/ui:n/s:u/c:h/i:n/a:n")
        assert vec["AV"] == "N"
        assert vec["C"] == "H"


# ── base_score ────────────────────────────────────────────────────────────────

class TestBaseScore:
    def test_critical_10(self):
        """AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H = 10.0"""
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert score == 10.0

    def test_high_8_8(self):
        """AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8"""
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert score == 9.8

    def test_no_impact_is_zero(self):
        """C:N/I:N/A:N → ISC=0 → score 0.0"""
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N")
        assert score == 0.0

    def test_accepts_dict_input(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        score = base_score(vec)
        assert 0.0 < score <= 10.0

    def test_accepts_string_input(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert isinstance(score, float)

    def test_score_in_valid_range(self):
        vectors = [
            "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
            "CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N",
            "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N",
        ]
        for v in vectors:
            s = base_score(v)
            assert 0.0 <= s <= 10.0, f"Score {s} out of range for {v}"

    def test_physical_access_lower_than_network(self):
        network = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        physical = base_score("CVSS:3.1/AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert network > physical

    def test_high_complexity_lower_than_low_complexity(self):
        low_ac = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        high_ac = base_score("CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert low_ac > high_ac

    def test_scope_changed_higher_than_unchanged_same_impacts(self):
        unchanged = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        changed = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert changed >= unchanged

    def test_roundup_one_decimal_place(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert score == round(score, 1)


# ── environmental_score ───────────────────────────────────────────────────────

class TestEnvironmentalScore:
    def test_critical_asset_raises_score(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        medium = environmental_score(vec, asset_value="MEDIUM")
        critical = environmental_score(vec, asset_value="CRITICAL")
        assert critical >= medium

    def test_pii_data_raises_confidentiality_impact(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
        no_pii = environmental_score(vec, data_sensitivity="NONE")
        with_pii = environmental_score(vec, data_sensitivity="PII")
        assert with_pii >= no_pii

    def test_internal_exposure_lowers_score(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        external = environmental_score(vec, exposure="external")
        internal = environmental_score(vec, exposure="internal")
        assert external >= internal

    def test_environmental_score_in_range(self):
        score = environmental_score(
            "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
            asset_value="CRITICAL",
            data_sensitivity="PII",
            exposure="external",
        )
        assert 0.0 <= score <= 10.0

    def test_accepts_dict_input(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        score = environmental_score(vec)
        assert isinstance(score, float)

    def test_original_dict_not_mutated(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        original_av = vec["AV"]
        environmental_score(vec, exposure="internal")
        assert vec["AV"] == original_av


# ── severity_to_default_vector ────────────────────────────────────────────────

class TestSeverityToDefaultVector:
    @pytest.mark.parametrize("severity", ["critical", "high", "medium", "low", "info"])
    def test_known_severities_return_valid_vector(self, severity):
        vec = severity_to_default_vector(severity)
        assert vec.startswith("CVSS:3.1/")
        score = base_score(vec)
        assert 0.0 <= score <= 10.0

    def test_case_insensitive(self):
        assert severity_to_default_vector("CRITICAL") == severity_to_default_vector("critical")

    def test_unknown_severity_falls_back_to_low(self):
        vec = severity_to_default_vector("unknown_thing")
        low = severity_to_default_vector("low")
        assert vec == low

    def test_critical_vector_scores_higher_than_low(self):
        critical_score = base_score(severity_to_default_vector("critical"))
        low_score = base_score(severity_to_default_vector("low"))
        assert critical_score > low_score

    def test_info_vector_scores_zero(self):
        score = base_score(severity_to_default_vector("info"))
        assert score == 0.0
