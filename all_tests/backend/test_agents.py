"""
Lightweight tests for the agent layer.

The full agent pipeline depends on Gemini and live tool execution; here we
only verify that the expected modules import, exposed classes can be
instantiated against the in-memory test session, and pure helpers behave
deterministically. No network is touched.
"""


def test_intelligence_agent_imports():
    from app.services import intelligence_agent
    assert hasattr(intelligence_agent, "IntelligenceAgent")


def test_validation_probe_imports():
    from app.services import validation_probe
    assert hasattr(validation_probe, "ValidationResult")
    assert hasattr(validation_probe, "reprobe")


def test_validation_result_dataclass_fields():
    from app.services.validation_probe import ValidationResult
    vr = ValidationResult(confirmed=True, new_response="x", diff_ratio=0.95, reason="match")
    assert vr.confirmed is True
    assert vr.diff_ratio == 0.95


def test_intelligence_agent_init_without_api_key(db_session):
    """With empty GEMINI_API_KEY, agent should fall back rather than crash."""
    from app.services.intelligence_agent import IntelligenceAgent
    agent = IntelligenceAgent(db_session)
    # Either fallback (model None) or stubbed via _mock_gemini fixture
    assert agent is not None


def test_finding_dedup_fingerprint_is_deterministic():
    """Same inputs → same fingerprint hash; different inputs → different hash."""
    from app.services.finding_dedup import fingerprint
    a = fingerprint(
        target_id="t1",
        vuln_type="sqli",
        url="http://x.test/login",
        parameter="email",
        template_id="sqli-error-based",
        description=None,
    )
    b = fingerprint(
        target_id="t1",
        vuln_type="sqli",
        url="http://x.test/login",
        parameter="email",
        template_id="sqli-error-based",
        description=None,
    )
    c = fingerprint(
        target_id="t1",
        vuln_type="xss",
        url="http://x.test/login",
        parameter="email",
        template_id="xss-reflected",
        description=None,
    )
    assert a == b
    assert a != c


def test_finding_dedup_normalises_url():
    """Query string + fragment must not affect the fingerprint."""
    from app.services.finding_dedup import fingerprint
    a = fingerprint("t", "x", "http://h/p?ignored=1", None, "sig", None)
    b = fingerprint("t", "x", "http://h/p#frag", None, "sig", None)
    assert a == b
