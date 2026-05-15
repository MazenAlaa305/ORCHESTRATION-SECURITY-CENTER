try:
    from google import genai as _genai
    _HAS_GENAI = True
except ImportError:
    _HAS_GENAI = False

from app.core.config import settings
from app.models.scan import Scan
import logging
import json

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

    def generate_vuln_insight(self, vuln) -> dict:
        """
        Generate a structured deep-dive AI analysis for a single vulnerability.
        Returns dict with: attack_scenario, business_impact, remediation_steps,
        detection_advice, verify_fix.
        """
        if not self.model:
            return self._demo_vuln_insight(vuln)
        try:
            title    = getattr(vuln, 'title',    None) or getattr(vuln, 'type', None) or 'Unknown'
            desc     = getattr(vuln, 'simplified_description', None) or getattr(vuln, 'description', None) or ''
            severity = str(getattr(vuln, 'severity', 'unknown') or 'unknown')
            cvss     = getattr(vuln, 'cvss_score', None)
            url      = getattr(vuln, 'url',     None) or ''
            host     = getattr(vuln, 'host',    None) or ''
            service  = getattr(vuln, 'service', None) or ''
            port     = getattr(vuln, 'port',    None)
            cve_id   = getattr(vuln, 'cve_id',  None) or ''
            param    = getattr(vuln, 'parameter', None) or ''

            context_lines = [
                f"Vulnerability: {title}",
                f"Severity: {severity.upper()}",
                f"CVSS Score: {cvss if cvss is not None else 'N/A'}",
                f"Target: {url or host}",
            ]
            if port:
                context_lines.append(f"Port/Service: {port}/{service}")
            if param:
                context_lines.append(f"Parameter: {param}")
            if cve_id:
                context_lines.append(f"CVE: {cve_id}")
            if desc:
                context_lines.append(f"Description: {desc}")

            prompt = (
                "You are a senior penetration tester and security advisor.\n"
                "Analyze this vulnerability and respond ONLY with valid JSON "
                "(no markdown fences, no extra text).\n\n"
                + "\n".join(context_lines)
                + """

Respond with exactly this JSON structure:
{
  "attack_scenario": "2-3 sentences: how an attacker would discover and exploit this step by step",
  "business_impact": "2 sentences: real-world business consequences if exploited (data breach, downtime, compliance)",
  "remediation_steps": [
    "Step 1 with specific command or config change",
    "Step 2",
    "Step 3",
    "Step 4 (apply patches / update version)",
    "Step 5 (verify and re-scan)"
  ],
  "detection_advice": "2 sentences: how to detect active exploitation via logs, SIEM rules, or IDS signatures",
  "verify_fix": "1-2 sentences: how to confirm the vulnerability is actually remediated after applying the fix"
}

Be specific, technical, and actionable. No placeholders."""
            )
            response = self._client.models.generate_content(
                model=self.model, contents=prompt
            )
            text = response.text.strip()
            # Strip markdown fences if model wraps output anyway
            if text.startswith('```'):
                text = '\n'.join(text.split('\n')[1:])
                if text.endswith('```'):
                    text = text[:-3]
            return json.loads(text)
        except Exception as exc:
            exc_str = str(exc).lower()
            if "429" in exc_str or "quota" in exc_str or "rate" in exc_str or "resource_exhausted" in exc_str:
                logger.warning("Gemini rate limit — using demo vuln insight: %s", exc)
            else:
                logger.error("Gemini vuln insight error: %s", exc)
            return self._demo_vuln_insight(vuln)

    def _demo_vuln_insight(self, vuln) -> dict:
        title    = getattr(vuln, 'title', None) or getattr(vuln, 'type', None) or 'Unknown Vulnerability'
        severity = str(getattr(vuln, 'severity', 'unknown') or 'unknown').lower()
        target   = getattr(vuln, 'url', None) or getattr(vuln, 'host', None) or 'the target system'
        return {
            "attack_scenario": (
                f"An attacker probing {target} would identify this {title} exposure through automated scanning "
                f"or manual reconnaissance. The {severity}-severity nature makes it an attractive entry point "
                f"for gaining unauthorized access or escalating privileges within the network."
            ),
            "business_impact": (
                "Successful exploitation could lead to unauthorized data access, service disruption, or full "
                "system compromise. Depending on the asset's role, this may trigger compliance violations "
                "(PCI DSS, GDPR) and result in reputational and financial damage."
            ),
            "remediation_steps": [
                "Immediately restrict network-level access to the affected service using firewall rules",
                "Apply the latest vendor security patch or update the software to a non-vulnerable version",
                "Harden the service configuration (disable unnecessary features, enforce authentication)",
                "Rotate any credentials, tokens, or API keys that may have been exposed",
                "Re-run a targeted scan against the affected endpoint to confirm remediation"
            ],
            "detection_advice": (
                "Monitor application and system logs for anomalous access patterns or error spikes "
                "consistent with exploitation attempts. Configure SIEM rules to alert on indicators "
                "of compromise (unusual user-agents, payloads, or response codes) for this service."
            ),
            "verify_fix": (
                "Re-execute the original scanner or proof-of-concept against the patched endpoint and "
                "confirm the vulnerability no longer reproduces. Validate service functionality under "
                "normal operations to rule out regressions."
            ),
        }

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
