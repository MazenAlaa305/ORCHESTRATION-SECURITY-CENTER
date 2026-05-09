"""
Tests for the Wazuh SIEM client + alert correlator.

We mock the network-layer calls; no Wazuh instance is required.
"""
import asyncio
from unittest.mock import AsyncMock, patch


def test_wazuh_integration_imports():
    from app.services.wazuh_integration import WazuhIntegration
    assert WazuhIntegration is not None


def test_wazuh_integration_uses_settings():
    from app.core.config import settings
    from app.services.wazuh_integration import WazuhIntegration
    w = WazuhIntegration()
    assert w.api_url == settings.WAZUH_API_URL
    assert w.user == settings.WAZUH_API_USER


def test_wazuh_get_token_returns_none_on_network_error():
    """Network failure must not raise — caller depends on a None return."""
    from app.services.wazuh_integration import WazuhIntegration

    async def _run():
        w = WazuhIntegration()
        # Force httpx.AsyncClient to raise; the wrapper catches and returns None
        with patch("httpx.AsyncClient.post", side_effect=RuntimeError("boom")):
            return await w.get_token()
    assert asyncio.run(_run()) is None


# ── alert_correlator (Section C.3) ───────────────────────────────────────────

def test_alert_correlator_imports():
    from app.services import alert_correlator
    assert hasattr(alert_correlator, "correlate")


def test_alert_correlator_returns_alerts_with_match_field():
    """Correlator must always echo the input shape, adding `matched_vulnerability_ids`."""
    from app.services.alert_correlator import correlate

    fake_db = AsyncMock()
    fake_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: []))

    alerts = [{
        "source_ip": "10.0.0.50",
        "port": 445,
        "timestamp": "2026-04-25T10:00:00Z",
        "description": "SMB null session",
    }]
    enriched = asyncio.run(correlate(fake_db, alerts))
    assert len(enriched) == 1
    assert "matched_vulnerability_ids" in enriched[0]
    assert isinstance(enriched[0]["matched_vulnerability_ids"], list)


def test_alert_correlator_handles_missing_fields():
    """Alert without ip/timestamp must still yield an enriched record."""
    from app.services.alert_correlator import correlate

    fake_db = AsyncMock()
    enriched = asyncio.run(correlate(fake_db, [{"description": "weird alert"}]))
    assert enriched[0]["matched_vulnerability_ids"] == []
