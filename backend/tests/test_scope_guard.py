"""Unit tests for app.services.scope_guard — ScopeGuard and ScopeViolation."""
import pytest
from app.services.scope_guard import ScopeGuard, ScopeViolation


# ── Construction ──────────────────────────────────────────────────────────────

class TestScopeGuardConstruction:
    def test_explicit_allowlist_used(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert guard.is_in_scope("http://example.com/page")

    def test_derives_hostname_from_base_url(self):
        guard = ScopeGuard(base_url="http://target.local/app")
        assert guard.is_in_scope("http://target.local/other")

    def test_empty_allowlist_when_no_base_and_no_list(self):
        guard = ScopeGuard()
        assert not guard.is_in_scope("http://anything.com")

    def test_explicit_allowlist_overrides_base_url(self):
        guard = ScopeGuard(scope_allowlist=["allowed.com"], base_url="http://other.com")
        assert guard.is_in_scope("http://allowed.com/path")
        assert not guard.is_in_scope("http://other.com/path")


# ── is_in_scope (hostname matching) ──────────────────────────────────────────

class TestIsInScope:
    def test_exact_hostname_match(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert guard.is_in_scope("http://example.com/admin")

    def test_subdomain_of_allowed_host(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert guard.is_in_scope("https://api.example.com/v1/resource")

    def test_deep_subdomain_allowed(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert guard.is_in_scope("https://dev.api.example.com/")

    def test_different_host_blocked(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert not guard.is_in_scope("http://evil.com/redirect")

    def test_partial_hostname_not_allowed(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert not guard.is_in_scope("http://notexample.com/page")

    def test_multiple_entries_in_allowlist(self):
        guard = ScopeGuard(scope_allowlist=["example.com", "trusted.org"])
        assert guard.is_in_scope("http://example.com/")
        assert guard.is_in_scope("https://sub.trusted.org/api")
        assert not guard.is_in_scope("http://untrusted.net/")

    def test_http_and_https_same_host(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert guard.is_in_scope("http://example.com/path")
        assert guard.is_in_scope("https://example.com/path")


# ── CIDR matching ─────────────────────────────────────────────────────────────

class TestCIDRScope:
    def test_ip_inside_cidr_is_in_scope(self):
        guard = ScopeGuard(scope_allowlist=["10.0.0.0/8"])
        assert guard.is_in_scope("http://10.1.2.3/admin")

    def test_ip_outside_cidr_is_blocked(self):
        guard = ScopeGuard(scope_allowlist=["10.0.0.0/8"])
        assert not guard.is_in_scope("http://192.168.1.1/page")

    def test_exact_ip_match_via_cidr(self):
        guard = ScopeGuard(scope_allowlist=["192.168.1.100/32"])
        assert guard.is_in_scope("http://192.168.1.100/")
        assert not guard.is_in_scope("http://192.168.1.101/")

    def test_mixed_hostname_and_cidr(self):
        guard = ScopeGuard(scope_allowlist=["example.com", "10.0.0.0/24"])
        assert guard.is_in_scope("http://example.com/page")
        assert guard.is_in_scope("http://10.0.0.5/api")
        assert not guard.is_in_scope("http://10.0.1.1/api")


# ── assert_in_scope ────────────────────────────────────────────────────────────

class TestAssertInScope:
    def test_in_scope_url_passes_silently(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        guard.assert_in_scope("http://example.com/ok")  # must not raise

    def test_out_of_scope_raises_scope_violation(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        with pytest.raises(ScopeViolation) as exc_info:
            guard.assert_in_scope("http://evil.com/redirect")
        assert "evil.com" in str(exc_info.value)

    def test_scope_violation_message_contains_url(self):
        guard = ScopeGuard(scope_allowlist=["safe.com"])
        url = "http://dangerous.net/payload"
        with pytest.raises(ScopeViolation, match="dangerous.net"):
            guard.assert_in_scope(url)

    def test_scope_violation_is_exception(self):
        assert issubclass(ScopeViolation, Exception)


# ── Edge cases ────────────────────────────────────────────────────────────────

class TestScopeGuardEdgeCases:
    def test_empty_url_string(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        assert not guard.is_in_scope("")

    def test_url_without_scheme(self):
        guard = ScopeGuard(scope_allowlist=["example.com"])
        # urlparse without scheme treats the whole string as path
        result = guard.is_in_scope("example.com/path")
        # Should not raise; result may be False (hostname extraction fails)
        assert isinstance(result, bool)

    def test_base_url_with_port_derives_correct_host(self):
        guard = ScopeGuard(base_url="http://target.local:8080/app")
        assert guard.is_in_scope("http://target.local:8080/other")
        assert guard.is_in_scope("http://target.local/page")
