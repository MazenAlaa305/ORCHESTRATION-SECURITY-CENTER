try:
    from google import genai as _genai
    _HAS_GENAI = True
except ImportError:
    _HAS_GENAI = False

from app.core.config import settings
from app.models.scan import Scan
import logging

logger = logging.getLogger(__name__)


class AIAdvisor:
    def __init__(self):
        self.model = None
        if not _HAS_GENAI:
            logger.warning("google-genai SDK not available. Running in demo mode.")
            return
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. Running in demo mode.")
            return
        try:
            client = _genai.Client(api_key=settings.GEMINI_API_KEY)
            self._client = client
            self.model = "gemini-2.0-flash"
        except Exception as exc:
            logger.error("Failed to initialise Gemini client: %s", exc)

    async def generate_report(self, scan: Scan):
        if not self.model:
            return self._demo_report(scan)
        try:
            vuln_summary = "\n".join([
                f"- {getattr(v, 'service', 'unknown')} (Port {getattr(v, 'port', '?')}): "
                f"{v.severity} - {v.description or 'No description'}"
                for v in (scan.vulnerabilities or [])
            ])
            prompt = (
                f"You are a cyber security expert writing for a non-technical CEO.\n"
                f"Target: {getattr(scan, 'target_url', 'unknown')}\n"
                f"Vulnerabilities:\n{vuln_summary or 'None found'}\n\n"
                f"Provide: 1) Executive summary (2 sentences). "
                f"2) Risk score explanation. 3) Top 3 actionable fixes. "
                f"Be professional, concise, avoid jargon."
            )
            response = self._client.models.generate_content(
                model=self.model, contents=prompt
            )
            return response.text
        except Exception as exc:
            exc_str = str(exc).lower()
            if "429" in exc_str or "quota" in exc_str or "rate" in exc_str or "resource_exhausted" in exc_str:
                logger.warning("Gemini rate limit hit — using heuristic report: %s", exc)
                return self._demo_report(scan, rate_limited=True)
            logger.error("Gemini API error: %s", exc)
            return self._demo_report(scan)

    def _demo_report(self, scan: Scan, rate_limited: bool = False) -> str:
        vulns = scan.vulnerabilities or []
        high = [v for v in vulns if getattr(v, 'severity', '') in ('HIGH', 'CRITICAL')]
        footer = (
            "*AI analysis rate-limited — Gemini quota reached. Showing heuristic summary. Retry in ~1 minute.*"
            if rate_limited else
            "*Demo mode — set GEMINI_API_KEY for real AI analysis.*"
        )
        return (
            f"# Executive Security Summary\n\n"
            f"**Target:** {getattr(scan, 'target_url', 'unknown')}\n"
            f"**Risk Score:** {scan.risk_score:.1f}/100\n\n"
            f"## Summary\n"
            f"The assessment found **{len(vulns)}** issues, "
            f"of which **{len(high)}** are high/critical severity.\n\n"
            f"## Top Actions\n"
            f"1. Review firewall rules and restrict unnecessary ports.\n"
            f"2. Patch all services to their latest stable versions.\n"
            f"3. Enable network segmentation for critical assets.\n\n"
            f"{footer}"
        )
