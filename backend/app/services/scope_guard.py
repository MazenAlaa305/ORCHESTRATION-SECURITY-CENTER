"""
scope_guard.py — Per-target scope enforcement for all outbound scanner requests.

Phase 2.4 hardening: without a scope allowlist the scanner can follow open
redirects to third-party hosts (legally dangerous) or DoS the customer's
own infrastructure (operationally dangerous).

Usage::

    guard = ScopeGuard(scope_allowlist=["example.com", "10.0.0.0/8"])
    guard.assert_in_scope("http://example.com/admin")   # passes
    guard.assert_in_scope("http://evil.com/redirect")   # raises ScopeViolation

When ``scope_allowlist`` is None (the default), the guard derives the
allowed scope from ``base_url`` (only the hostname of that URL is
allowed).  This is the correct default for a single-URL scan.
"""
import ipaddress
import logging
from typing import List, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class ScopeViolation(Exception):
    """
    Raised when a scanner request targets a URL outside the allowed scope.

    Callers should catch this and log a ``scope_violation`` agent_log entry
    rather than propagating the exception, so a single out-of-scope redirect
    does not abort the entire scan.
    """


class ScopeGuard:
    """
    Enforces a per-target scope allowlist before any network request is made.

    Matching rules (checked in order):
    1. CIDR containment — if the host resolves to an IP inside a listed CIDR.
    2. Exact hostname match — ``example.com`` allows only ``example.com``.
    3. Subdomain match — ``example.com`` also allows ``api.example.com``.

    Args:
        scope_allowlist: List of allowed hostnames or CIDR strings.
                         ``None`` → derive from ``base_url``.
        base_url:        The target URL.  Used to derive the default allowlist
                         when ``scope_allowlist`` is ``None``.
    """

    def __init__(
        self,
        scope_allowlist: Optional[List[str]] = None,
        base_url: str = "",
    ) -> None:
        if scope_allowlist:
            self.allowlist = scope_allowlist
        else:
            default_host = urlparse(base_url).hostname or base_url.split("/")[0]
            self.allowlist = [default_host] if default_host else []

    # ── Public API ─────────────────────────────────────────────────────────────

    def is_in_scope(self, url: str) -> bool:
        """Return True if *url*'s hostname is within the allowlist."""
        try:
            host = urlparse(url).hostname or url
        except Exception:
            return False
        return any(self._matches(host, entry) for entry in self.allowlist)

    def assert_in_scope(self, url: str) -> None:
        """
        Raise :class:`ScopeViolation` if *url* is out of scope.

        Typical use::

            try:
                self.scope_guard.assert_in_scope(redirect_url)
            except ScopeViolation as exc:
                await self.log_action("scope_violation", {"url": redirect_url, "reason": str(exc)})
                return  # skip this URL
        """
        if not self.is_in_scope(url):
            raise ScopeViolation(f"Out-of-scope URL blocked: {url}")

    # ── Internals ───────────────────────────────────────────────────────────────

    @staticmethod
    def _matches(host: str, entry: str) -> bool:
        """Return True if *host* is within *entry* (CIDR or hostname)."""
        # ── CIDR check ────────────────────────────────────────────────────────
        try:
            network = ipaddress.ip_network(entry, strict=False)
            return ipaddress.ip_address(host) in network
        except ValueError:
            pass  # entry is not a CIDR — fall through to hostname check

        # ── Hostname / subdomain check ────────────────────────────────────────
        return host == entry or host.endswith("." + entry)
