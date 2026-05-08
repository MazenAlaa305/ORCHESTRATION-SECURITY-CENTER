"""
Tests for app/services/report_signer.py
— canonical_findings_hash, sign_pdf, verify_signature
"""
import pytest
from app.services.report_signer import canonical_findings_hash, sign_pdf, verify_signature


SAMPLE_KEY = "test-signing-key-abc123"
SAMPLE_FINDINGS = [
    {"id": "b", "type": "sqli", "severity": "high", "url": "http://x.com/b", "template_id": "", "cvss_score": 7.5, "cvss_vector": "", "status": "open"},
    {"id": "a", "type": "xss",  "severity": "medium", "url": "http://x.com/a", "template_id": "", "cvss_score": 5.0, "cvss_vector": "", "status": "open"},
]


# ── canonical_findings_hash ───────────────────────────────────────────────────

class TestCanonicalFindingsHash:
    def test_returns_64_char_hex(self):
        h = canonical_findings_hash(SAMPLE_FINDINGS)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_findings_same_hash(self):
        h1 = canonical_findings_hash(SAMPLE_FINDINGS)
        h2 = canonical_findings_hash(SAMPLE_FINDINGS)
        assert h1 == h2

    def test_order_independent(self):
        reversed_findings = list(reversed(SAMPLE_FINDINGS))
        h1 = canonical_findings_hash(SAMPLE_FINDINGS)
        h2 = canonical_findings_hash(reversed_findings)
        assert h1 == h2

    def test_empty_list(self):
        h = canonical_findings_hash([])
        assert len(h) == 64

    def test_different_findings_different_hash(self):
        modified = [dict(SAMPLE_FINDINGS[0], severity="critical")]
        h1 = canonical_findings_hash(SAMPLE_FINDINGS)
        h2 = canonical_findings_hash(modified)
        assert h1 != h2

    def test_single_finding(self):
        h = canonical_findings_hash([SAMPLE_FINDINGS[0]])
        assert len(h) == 64


# ── sign_pdf ──────────────────────────────────────────────────────────────────

class TestSignPdf:
    def test_returns_hex_string(self):
        sig = sign_pdf(b"hello world", key=SAMPLE_KEY)
        assert isinstance(sig, str)
        assert len(sig) == 64

    def test_same_bytes_same_signature(self):
        s1 = sign_pdf(b"data", key=SAMPLE_KEY)
        s2 = sign_pdf(b"data", key=SAMPLE_KEY)
        assert s1 == s2

    def test_different_bytes_different_signature(self):
        s1 = sign_pdf(b"data1", key=SAMPLE_KEY)
        s2 = sign_pdf(b"data2", key=SAMPLE_KEY)
        assert s1 != s2

    def test_different_key_different_signature(self):
        s1 = sign_pdf(b"data", key="key1")
        s2 = sign_pdf(b"data", key="key2")
        assert s1 != s2

    def test_no_key_returns_empty(self, monkeypatch):
        from app.core.config import settings
        monkeypatch.setattr(settings, "REPORT_SIGNING_KEY", None)
        assert sign_pdf(b"data") == ""

    def test_empty_bytes(self):
        sig = sign_pdf(b"", key=SAMPLE_KEY)
        assert len(sig) == 64


# ── verify_signature ──────────────────────────────────────────────────────────

class TestVerifySignature:
    def test_valid_signature_returns_true(self):
        pdf = b"report content"
        sig = sign_pdf(pdf, key=SAMPLE_KEY)
        assert verify_signature(pdf, sig, key=SAMPLE_KEY) is True

    def test_tampered_pdf_returns_false(self):
        pdf = b"report content"
        sig = sign_pdf(pdf, key=SAMPLE_KEY)
        assert verify_signature(b"tampered content", sig, key=SAMPLE_KEY) is False

    def test_wrong_key_returns_false(self):
        pdf = b"report content"
        sig = sign_pdf(pdf, key="correct-key")
        assert verify_signature(pdf, sig, key="wrong-key") is False

    def test_empty_stored_sig_returns_false(self):
        assert verify_signature(b"data", "", key=SAMPLE_KEY) is False

    def test_garbage_sig_returns_false(self):
        assert verify_signature(b"data", "notahexdigest", key=SAMPLE_KEY) is False
