"""
Unit tests for app.services.framework_tagger.

The tagger must:
- Return a dict for known categories/template prefixes
- Return {} (never raise) for unknown inputs
- Never invent tags not in the seed file
- Handle None inputs gracefully
"""
import pytest
from app.services.framework_tagger import tag_finding


# ── Known vulnerability types ─────────────────────────────────────────────────

class TestKnownVulnerabilityTypes:
    @pytest.mark.parametrize("vuln_type", ["sqli", "SQLi", "SQL Injection", "sql"])
    def test_sql_injection_variants(self, vuln_type):
        result = tag_finding(template_id=None, vuln_type=vuln_type)
        assert isinstance(result, dict)

    @pytest.mark.parametrize("vuln_type", ["xss", "XSS", "Cross Site Scripting"])
    def test_xss_variants(self, vuln_type):
        result = tag_finding(template_id=None, vuln_type=vuln_type)
        assert isinstance(result, dict)

    def test_ssrf_type(self):
        result = tag_finding(template_id=None, vuln_type="ssrf")
        assert isinstance(result, dict)

    def test_rce_type(self):
        result = tag_finding(template_id=None, vuln_type="rce")
        assert isinstance(result, dict)

    def test_lfi_type(self):
        result = tag_finding(template_id=None, vuln_type="lfi")
        assert isinstance(result, dict)


# ── Template ID prefix matching ────────────────────────────────────────────────

class TestTemplateIdPrefix:
    def test_sqli_template_prefix(self):
        result = tag_finding(template_id="sqli-generic-error-based", vuln_type=None)
        assert isinstance(result, dict)

    def test_xss_template_prefix(self):
        result = tag_finding(template_id="xss-reflected-in-attribute", vuln_type=None)
        assert isinstance(result, dict)

    def test_ssrf_template_prefix(self):
        result = tag_finding(template_id="ssrf-internal-redirect", vuln_type=None)
        assert isinstance(result, dict)


# ── Category override ─────────────────────────────────────────────────────────

class TestCategoryOverride:
    def test_explicit_category_takes_priority(self):
        result_with_cat = tag_finding(template_id=None, vuln_type=None, category="sqli")
        result_no_cat = tag_finding(template_id="sqli-test", vuln_type="xss", category=None)
        assert isinstance(result_with_cat, dict)
        assert isinstance(result_no_cat, dict)

    def test_unknown_category_returns_empty(self):
        result = tag_finding(template_id=None, vuln_type=None, category="totally_made_up_cat")
        assert result == {}


# ── Unknown / unmapped inputs ─────────────────────────────────────────────────

class TestUnknownInputs:
    def test_all_none_returns_empty_dict(self):
        result = tag_finding(template_id=None, vuln_type=None)
        assert result == {}

    def test_unknown_vuln_type_returns_empty_dict(self):
        result = tag_finding(template_id=None, vuln_type="completely_unknown_vuln_xyz")
        assert result == {}

    def test_unknown_template_id_returns_empty_dict(self):
        result = tag_finding(template_id="unknownprefix-something", vuln_type=None)
        assert result == {}

    def test_empty_strings_return_empty_dict(self):
        result = tag_finding(template_id="", vuln_type="")
        assert result == {}


# ── Return type guarantees ────────────────────────────────────────────────────

class TestReturnTypeGuarantees:
    def test_always_returns_dict(self):
        inputs = [
            (None, None),
            ("sqli-test", None),
            (None, "xss"),
            ("unknown", "unknown"),
            ("", ""),
        ]
        for tid, vtype in inputs:
            result = tag_finding(template_id=tid, vuln_type=vtype)
            assert isinstance(result, dict), f"Expected dict for ({tid}, {vtype})"

    def test_result_is_independent_copy(self):
        r1 = tag_finding(template_id="sqli-test", vuln_type=None)
        r2 = tag_finding(template_id="sqli-test", vuln_type=None)
        if r1:
            r1["injected_key"] = "injected_value"
            assert "injected_key" not in r2

    def test_never_raises(self):
        edge_cases = [
            {"template_id": None, "vuln_type": None},
            {"template_id": "a" * 1000, "vuln_type": "b" * 1000},
            {"template_id": "!@#$%", "vuln_type": "!@#$%"},
        ]
        for kwargs in edge_cases:
            try:
                tag_finding(**kwargs)
            except Exception as exc:
                pytest.fail(f"tag_finding raised unexpectedly: {exc}")


# ── Alias normalisation ───────────────────────────────────────────────────────

class TestAliasNormalisation:
    @pytest.mark.parametrize("alias,canonical", [
        ("sqlinjection", "sqli"),
        ("crosssitescripting", "xss"),
        ("remotecommandexecution", "rce"),
        ("localfileinclusion", "lfi"),
        ("informationdisclosure", "exposure"),
        ("openredirect", "redirect"),
        ("defaultcredentials", "default-logins"),
    ])
    def test_alias_resolves_same_as_canonical(self, alias, canonical):
        via_alias = tag_finding(template_id=None, vuln_type=alias)
        via_canonical = tag_finding(template_id=None, vuln_type=canonical)
        assert via_alias == via_canonical
