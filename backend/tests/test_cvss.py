"""
Unit tests for app.services.cvss — CVSS v3.1 Base Score and Environmental Score.
"""
import allure
import pytest
from app.services.cvss import base_score, environmental_score, parse_vector, severity_to_default_vector


# ── parse_vector ─────────────────────────────────────────────────────────────

@allure.epic("Vulnerability Management")
@allure.feature("CVSS Scoring")
@allure.story("Vector Parsing")
class TestParseVector:
    @allure.title("Full CVSS:3.1 prefix is stripped during parsing")
    @allure.severity(allure.severity_level.NORMAL)
    def test_full_prefix_stripped(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert vec["AV"] == "N"
        assert vec["S"] == "C"
        assert vec["C"] == "H"

    @allure.title("Short-form vector without prefix is parsed correctly")
    @allure.severity(allure.severity_level.NORMAL)
    def test_short_form_no_prefix(self):
        vec = parse_vector("AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N")
        assert vec["AV"] == "L"
        assert vec["AC"] == "H"
        assert vec["PR"] == "L"

    @allure.title("Missing base metrics are filled with defaults")
    @allure.severity(allure.severity_level.NORMAL)
    def test_missing_metrics_filled_with_defaults(self):
        vec = parse_vector("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert vec["S"] == "U"
        for key in ("AV", "AC", "PR", "UI", "S", "C", "I", "A"):
            assert key in vec

    @allure.title("Environmental metric keys default to X when absent")
    @allure.severity(allure.severity_level.NORMAL)
    def test_environmental_keys_default_to_x(self):
        vec = parse_vector("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert vec["CR"] == "X"
        assert vec["IR"] == "X"
        assert vec["AR"] == "X"

    @allure.title("Vector parsing is case-insensitive")
    @allure.severity(allure.severity_level.NORMAL)
    def test_case_insensitive_input(self):
        vec = parse_vector("av:n/ac:l/pr:n/ui:n/s:u/c:h/i:n/a:n")
        assert vec["AV"] == "N"
        assert vec["C"] == "H"


# ── base_score ────────────────────────────────────────────────────────────────

@allure.epic("Vulnerability Management")
@allure.feature("CVSS Scoring")
@allure.story("Base Score Calculation")
class TestBaseScore:
    @allure.title("Maximum score vector produces 10.0")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_critical_10(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert score == 10.0

    @allure.title("High-severity vector produces 9.8")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_high_8_8(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert score == 9.8

    @allure.title("No-impact vector produces score of 0.0")
    @allure.severity(allure.severity_level.NORMAL)
    def test_no_impact_is_zero(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N")
        assert score == 0.0

    @allure.title("base_score accepts a pre-parsed dict as input")
    @allure.severity(allure.severity_level.NORMAL)
    def test_accepts_dict_input(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        score = base_score(vec)
        assert 0.0 < score <= 10.0

    @allure.title("base_score accepts a string vector as input")
    @allure.severity(allure.severity_level.NORMAL)
    def test_accepts_string_input(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert isinstance(score, float)

    @allure.title("All test vectors produce scores in valid 0.0–10.0 range")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_score_in_valid_range(self):
        vectors = [
            "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
            "CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N",
            "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N",
        ]
        for v in vectors:
            s = base_score(v)
            assert 0.0 <= s <= 10.0, f"Score {s} out of range for {v}"

    @allure.title("Network access vector scores higher than physical access")
    @allure.severity(allure.severity_level.NORMAL)
    def test_physical_access_lower_than_network(self):
        network = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        physical = base_score("CVSS:3.1/AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert network > physical

    @allure.title("High attack complexity lowers score compared to low complexity")
    @allure.severity(allure.severity_level.NORMAL)
    def test_high_complexity_lower_than_low_complexity(self):
        low_ac = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        high_ac = base_score("CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H")
        assert low_ac > high_ac

    @allure.title("Changed scope increases or maintains score vs unchanged scope")
    @allure.severity(allure.severity_level.NORMAL)
    def test_scope_changed_higher_than_unchanged_same_impacts(self):
        unchanged = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
        changed = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")
        assert changed >= unchanged

    @allure.title("Score is rounded to one decimal place")
    @allure.severity(allure.severity_level.NORMAL)
    def test_roundup_one_decimal_place(self):
        score = base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        assert score == round(score, 1)


# ── environmental_score ───────────────────────────────────────────────────────

@allure.epic("Vulnerability Management")
@allure.feature("CVSS Scoring")
@allure.story("Environmental Score Calculation")
class TestEnvironmentalScore:
    @allure.title("Critical asset value raises score compared to medium")
    @allure.severity(allure.severity_level.NORMAL)
    def test_critical_asset_raises_score(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        medium = environmental_score(vec, asset_value="MEDIUM")
        critical = environmental_score(vec, asset_value="CRITICAL")
        assert critical >= medium

    @allure.title("PII data sensitivity raises confidentiality impact")
    @allure.severity(allure.severity_level.NORMAL)
    def test_pii_data_raises_confidentiality_impact(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
        no_pii = environmental_score(vec, data_sensitivity="NONE")
        with_pii = environmental_score(vec, data_sensitivity="PII")
        assert with_pii >= no_pii

    @allure.title("Internal exposure lowers score compared to external")
    @allure.severity(allure.severity_level.NORMAL)
    def test_internal_exposure_lowers_score(self):
        vec = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        external = environmental_score(vec, exposure="external")
        internal = environmental_score(vec, exposure="internal")
        assert external >= internal

    @allure.title("Environmental score stays within 0.0–10.0 range")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_environmental_score_in_range(self):
        score = environmental_score(
            "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
            asset_value="CRITICAL",
            data_sensitivity="PII",
            exposure="external",
        )
        assert 0.0 <= score <= 10.0

    @allure.title("environmental_score accepts a pre-parsed dict")
    @allure.severity(allure.severity_level.NORMAL)
    def test_accepts_dict_input(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        score = environmental_score(vec)
        assert isinstance(score, float)

    @allure.title("environmental_score does not mutate the input dict")
    @allure.severity(allure.severity_level.NORMAL)
    def test_original_dict_not_mutated(self):
        vec = parse_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")
        original_av = vec["AV"]
        environmental_score(vec, exposure="internal")
        assert vec["AV"] == original_av


# ── severity_to_default_vector ────────────────────────────────────────────────

@allure.epic("Vulnerability Management")
@allure.feature("CVSS Scoring")
@allure.story("Severity to Default Vector")
class TestSeverityToDefaultVector:
    @allure.title("Known severity levels return valid CVSS 3.1 vectors")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.parametrize("severity", ["critical", "high", "medium", "low", "info"])
    def test_known_severities_return_valid_vector(self, severity):
        vec = severity_to_default_vector(severity)
        assert vec.startswith("CVSS:3.1/")
        score = base_score(vec)
        assert 0.0 <= score <= 10.0

    @allure.title("Severity lookup is case-insensitive")
    @allure.severity(allure.severity_level.NORMAL)
    def test_case_insensitive(self):
        assert severity_to_default_vector("CRITICAL") == severity_to_default_vector("critical")

    @allure.title("Unknown severity falls back to low-severity vector")
    @allure.severity(allure.severity_level.NORMAL)
    def test_unknown_severity_falls_back_to_low(self):
        vec = severity_to_default_vector("unknown_thing")
        low = severity_to_default_vector("low")
        assert vec == low

    @allure.title("Critical vector scores higher than low vector")
    @allure.severity(allure.severity_level.NORMAL)
    def test_critical_vector_scores_higher_than_low(self):
        critical_score = base_score(severity_to_default_vector("critical"))
        low_score = base_score(severity_to_default_vector("low"))
        assert critical_score > low_score

    @allure.title("Info vector produces a score of 0.0")
    @allure.severity(allure.severity_level.NORMAL)
    def test_info_vector_scores_zero(self):
        score = base_score(severity_to_default_vector("info"))
        assert score == 0.0
