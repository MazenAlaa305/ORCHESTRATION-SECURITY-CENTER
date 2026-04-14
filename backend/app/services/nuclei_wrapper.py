"""
NucleiWrapper — thin wrapper around the Nuclei CLI scanner.

Phase 1.2 hardening: _transform_finding() now extracts and returns
raw_request, raw_response, and evidence_hash so every Vulnerability
row produced by this scanner is auditable and deduplicable.

Phase 2.4 hardening: scan_target() accepts max_rps to inject the
-rate-limit flag into the Nuclei command so the scanner cannot DoS
the target's own production infrastructure.
"""
import hashlib
import json
import logging
import os
import subprocess
import tempfile
from typing import Dict, List

logger = logging.getLogger(__name__)


class NucleiWrapper:
    """Wrapper for ProjectDiscovery Nuclei Vulnerability Scanner."""

    def __init__(self):
        self.binary_path = os.environ.get("NUCLEI_PATH", "nuclei")

    def scan_target(self, target: str, scan_type: str = "quick", max_rps: int = 10) -> List[Dict]:
        """
        Run a Nuclei scan against *target* and return parsed findings.

        Args:
            target:    URL or IP to scan (e.g. "http://example.com").
            scan_type: "quick" (critical/high only) | "full" (critical/high/medium).
            max_rps:   Maximum HTTP requests per second sent to the target.
                       Injected as ``-rate-limit <N>`` into the Nuclei command.
                       Default 10 — safe for most production targets.

        Returns:
            List of normalised finding dicts — each includes raw_request,
            raw_response, evidence_hash, detected_by, and template_id.
        """
        # Use a proper temp file so /tmp is not assumed (works on Windows too)
        with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False, mode="w"
        ) as tmp:
            output_file = tmp.name

        # -j           → JSONL output per finding
        # -ir          → include raw request/response in each finding
        # -rate-limit  → max RPS to the target (Phase 2.4 safety)
        cmd = [
            self.binary_path,
            "-u", target,
            "-j",
            "-ir",
            "-rate-limit", str(max(1, max_rps)),
            "-o", output_file,
            "-silent",
        ]

        if scan_type == "quick":
            cmd.extend(["-s", "critical,high", "-as"])
        else:
            # Full scan: crit + high + medium, plus auto-detected services
            cmd.extend(["-s", "critical,high,medium", "-as"])

        try:
            logger.info(f"[NucleiWrapper] Starting scan on {target}: {' '.join(cmd)}")
            subprocess.run(cmd, check=True, timeout=600)  # 10-minute hard cap

            results: List[Dict] = []
            if os.path.exists(output_file):
                with open(output_file, "r", encoding="utf-8", errors="replace") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            finding = json.loads(line)
                            results.append(self._transform_finding(finding))
                        except json.JSONDecodeError:
                            logger.debug(f"[NucleiWrapper] Could not parse line: {line[:80]}")
                os.remove(output_file)

            logger.info(f"[NucleiWrapper] Scan complete — {len(results)} findings for {target}")
            return results

        except FileNotFoundError:
            logger.error(
                f"[NucleiWrapper] nuclei binary not found at '{self.binary_path}'. "
                "Install Nuclei or set the NUCLEI_PATH environment variable."
            )
            return []
        except subprocess.TimeoutExpired:
            logger.error(f"[NucleiWrapper] Scan timed out for {target}")
            return []
        except subprocess.CalledProcessError as exc:
            # Nuclei exits non-zero when it finds vulns — that is expected.
            # Only log as warning, not error, and still try to parse output.
            logger.warning(f"[NucleiWrapper] nuclei exited {exc.returncode} — parsing output anyway")
            results: List[Dict] = []  # type: ignore[no-redef]
            if os.path.exists(output_file):
                with open(output_file, "r", encoding="utf-8", errors="replace") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            results.append(self._transform_finding(json.loads(line)))
                        except json.JSONDecodeError:
                            pass
                os.remove(output_file)
            return results
        except Exception as exc:
            logger.error(f"[NucleiWrapper] Unexpected error: {exc}")
            return []

    # ── Private helpers ──────────────────────────────────────────────────────

    def _transform_finding(self, finding: Dict) -> Dict:
        """
        Normalise one Nuclei JSONL entry into the internal finding schema.

        Key additions vs. the previous version:
          - raw_request / raw_response  — stored verbatim from Nuclei's -ir output
          - evidence_hash               — sha256 digest for deduplication
          - detected_by                 — always "nuclei" for findings from this wrapper
          - template_id                 — used by ValidationAgent reprobe logic
        """
        info = finding.get("info", {})
        raw_request: str = finding.get("request", "") or ""
        raw_response: str = finding.get("response", "") or ""

        # Stable deduplication hash — same request+response = same finding
        evidence_hash: str | None = None
        if raw_request or raw_response:
            evidence_hash = hashlib.sha256(
                (raw_request + raw_response).encode("utf-8", errors="replace")
            ).hexdigest()

        return {
            # Core identity
            "type": info.get("name", "Unknown Vulnerability"),
            "severity": info.get("severity", "info"),
            "description": info.get("description", ""),
            "cve_id": info.get("classification", {}).get("cve-id"),
            "url": finding.get("matched-at", ""),
            "service": finding.get("type", "http"),
            # Nuclei provenance (Phase 1.2)
            "template_id": finding.get("template-id"),
            "detected_by": "nuclei",
            "raw_request": raw_request,
            "raw_response": raw_response,
            "evidence_hash": evidence_hash,
            # Structured evidence for UI display
            "evidence": {
                "matcher_status": finding.get("matcher-status"),
                "curl_command": finding.get("curl-command", ""),
                "matched_at": finding.get("matched-at", ""),
            },
        }
