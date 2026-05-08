"""
Unit + integration tests for app.services.finding_dedup.

Unit tests: fingerprint() pure function — stable, deterministic, collision-resistant.
Integration tests: deduplicate_scan() — uses the shared in-memory SQLite from conftest.
"""
import hashlib
import pytest

from app.services.finding_dedup import fingerprint, _normalise_url


# ── _normalise_url ────────────────────────────────────────────────────────────

class TestNormaliseUrl:
    def test_strips_query_string(self):
        assert _normalise_url("http://example.com/path?foo=bar") == "http://example.com/path"

    def test_strips_fragment(self):
        assert _normalise_url("http://example.com/page#section") == "http://example.com/page"

    def test_strips_both_query_and_fragment(self):
        assert _normalise_url("http://example.com/x?a=1#b") == "http://example.com/x"

    def test_preserves_scheme_host_path(self):
        assert _normalise_url("https://api.example.com/v1/resource") == "https://api.example.com/v1/resource"

    def test_empty_string_returns_empty(self):
        assert _normalise_url("") == ""

    def test_none_handled_via_caller(self):
        # _normalise_url is called with `url or ""`
        assert _normalise_url("") == ""


# ── fingerprint() ─────────────────────────────────────────────────────────────

class TestFingerprint:
    def test_returns_hex_sha256(self):
        fp = fingerprint("t1", "sqli", "http://x.com/path", "id", "sqli-generic", None)
        assert len(fp) == 64
        assert all(c in "0123456789abcdef" for c in fp)

    def test_deterministic(self):
        args = ("t1", "sqli", "http://x.com/path", "id", "sqli-generic", None)
        assert fingerprint(*args) == fingerprint(*args)

    def test_different_target_ids_produce_different_fingerprints(self):
        fp1 = fingerprint("target-A", "sqli", "http://x.com/", None, None, "desc")
        fp2 = fingerprint("target-B", "sqli", "http://x.com/", None, None, "desc")
        assert fp1 != fp2

    def test_different_vuln_types_produce_different_fingerprints(self):
        fp1 = fingerprint("t1", "sqli", "http://x.com/", None, None, None)
        fp2 = fingerprint("t1", "xss",  "http://x.com/", None, None, None)
        assert fp1 != fp2

    def test_url_query_string_ignored_in_fingerprint(self):
        fp1 = fingerprint("t1", "sqli", "http://x.com/path?a=1", "id", None, None)
        fp2 = fingerprint("t1", "sqli", "http://x.com/path?b=2", "id", None, None)
        assert fp1 == fp2

    def test_url_fragment_ignored(self):
        fp1 = fingerprint("t1", "sqli", "http://x.com/path#sec1", "id", None, None)
        fp2 = fingerprint("t1", "sqli", "http://x.com/path#sec2", "id", None, None)
        assert fp1 == fp2

    def test_template_id_takes_precedence_over_description(self):
        # When template_id is provided, description is NOT used
        fp1 = fingerprint("t1", "sqli", "http://x.com/", None, "tpl-123", "description A")
        fp2 = fingerprint("t1", "sqli", "http://x.com/", None, "tpl-123", "description B")
        assert fp1 == fp2

    def test_description_used_when_no_template_id(self):
        fp1 = fingerprint("t1", "sqli", "http://x.com/", None, None, "description A")
        fp2 = fingerprint("t1", "sqli", "http://x.com/", None, None, "description B")
        assert fp1 != fp2

    def test_description_truncated_to_64_chars(self):
        long_desc = "x" * 128
        short_desc = "x" * 64
        fp1 = fingerprint("t1", "sqli", "http://x.com/", None, None, long_desc)
        fp2 = fingerprint("t1", "sqli", "http://x.com/", None, None, short_desc)
        assert fp1 == fp2

    def test_none_inputs_handled(self):
        fp = fingerprint(None, None, None, None, None, None)
        assert len(fp) == 64

    def test_vuln_type_case_normalised(self):
        fp1 = fingerprint("t1", "SQLI", "http://x.com/", None, None, None)
        fp2 = fingerprint("t1", "sqli", "http://x.com/", None, None, None)
        assert fp1 == fp2

    def test_fingerprint_matches_expected_sha256(self):
        # Manually compute expected hash for a known input
        raw = "|".join(["t1", "sqli", "http://x.com/path", "id", "tpl"])
        expected = hashlib.sha256(raw.encode()).hexdigest()
        result = fingerprint("t1", "sqli", "http://x.com/path", "id", "tpl", "ignored desc")
        assert result == expected


# ── deduplicate_scan() — integration ─────────────────────────────────────────
# These tests create real DB rows via the conftest session-scoped SQLite engine.

def _make_scan(db, target_id="target-dedup-1"):
    from app.models.scan import Scan, ScanStatus, Target
    import uuid

    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        target = Target(id=target_id, name="Dedup Test Target", base_url="http://dedup.test")
        db.add(target)
        db.commit()

    scan = Scan(
        id=str(uuid.uuid4()),
        target_id=target_id,
        status=ScanStatus.COMPLETED,
        target_url="http://dedup.test",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def _make_vuln(db, scan_id, vuln_type="sqli", url="http://dedup.test/page", description="test vuln"):
    from app.models.scan import Vulnerability, SeverityLevel
    import uuid

    vuln = Vulnerability(
        id=str(uuid.uuid4()),
        scan_id=scan_id,
        type=vuln_type,
        url=url,
        description=description,
        severity=SeverityLevel.HIGH,
        title="Test Vulnerability",
    )
    db.add(vuln)
    db.commit()
    db.refresh(vuln)
    return vuln


class TestDeduplicateScan:
    def test_creates_new_finding_for_new_vuln(self, db_session):
        from app.services.finding_dedup import deduplicate_scan
        from app.models.scan import Finding

        scan = _make_scan(db_session, target_id="target-dedup-new")
        _make_vuln(db_session, scan.id, vuln_type="xss-new-test")

        new_count = deduplicate_scan(scan.id, scan.target_id, db_session)
        assert new_count == 1

    def test_does_not_create_duplicate_finding_on_rescan(self, db_session):
        from app.services.finding_dedup import deduplicate_scan
        from app.models.scan import Finding

        target_id = "target-dedup-rescan"
        scan1 = _make_scan(db_session, target_id=target_id)
        scan2 = _make_scan(db_session, target_id=target_id)
        _make_vuln(db_session, scan1.id, vuln_type="sqli-dedup-test", url="http://dedup.test/form")
        _make_vuln(db_session, scan2.id, vuln_type="sqli-dedup-test", url="http://dedup.test/form")

        first_count = deduplicate_scan(scan1.id, target_id, db_session)
        second_count = deduplicate_scan(scan2.id, target_id, db_session)

        assert first_count == 1
        assert second_count == 0  # same fingerprint → existing finding reused

    def test_vuln_gets_finding_id_linked(self, db_session):
        from app.services.finding_dedup import deduplicate_scan

        target_id = "target-dedup-link"
        scan = _make_scan(db_session, target_id=target_id)
        vuln = _make_vuln(db_session, scan.id, vuln_type="rce-link-test")

        assert vuln.finding_id is None
        deduplicate_scan(scan.id, target_id, db_session)
        db_session.refresh(vuln)
        assert vuln.finding_id is not None

    def test_returns_zero_for_empty_scan(self, db_session):
        from app.services.finding_dedup import deduplicate_scan

        scan = _make_scan(db_session, target_id="target-dedup-empty")
        count = deduplicate_scan(scan.id, scan.target_id, db_session)
        assert count == 0

    def test_multiple_different_vulns_create_multiple_findings(self, db_session):
        from app.services.finding_dedup import deduplicate_scan

        target_id = "target-dedup-multi"
        scan = _make_scan(db_session, target_id=target_id)
        _make_vuln(db_session, scan.id, vuln_type="sqli-multi-1", url="http://dedup.test/a")
        _make_vuln(db_session, scan.id, vuln_type="xss-multi-2", url="http://dedup.test/b")
        _make_vuln(db_session, scan.id, vuln_type="ssrf-multi-3", url="http://dedup.test/c")

        count = deduplicate_scan(scan.id, target_id, db_session)
        assert count == 3
