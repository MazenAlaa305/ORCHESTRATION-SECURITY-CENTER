import logging
import asyncio
import re
from typing import List, Dict, Any, Tuple
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session
from app.models.scan import Target

logger = logging.getLogger(__name__)

_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$"
)


def normalize_domain(raw: str) -> Tuple[str, str]:
    """
    Normalize user input into a registrable root domain suitable for subdomain
    enumeration. Returns (domain, error). On success error is "".
    """
    if not raw or not raw.strip():
        return "", "Domain is required."

    value = raw.strip().lower()

    if "/" in value and not value.startswith(("http://", "https://")):
        return "", (
            "CIDR ranges and IP networks are not supported. Asset Discovery "
            "enumerates DNS subdomains — enter a root domain like example.com."
        )

    if value.startswith(("http://", "https://")):
        parsed = urlparse(value)
        value = parsed.hostname or ""

    value = value.rstrip("/").split("/", 1)[0].split(":", 1)[0]

    if value.replace(".", "").isdigit():
        return "", "IP addresses are not supported. Enter a root domain like example.com."

    if value.startswith("www."):
        value = value[4:]

    if not _DOMAIN_RE.match(value):
        return "", f"'{raw}' is not a valid domain. Example: example.com"

    return value, ""


class DiscoveryAgent:
    """
    Agent responsible for Asset Discovery (EASM).
    Prefers the `subfinder` CLI when installed; otherwise falls back to
    Certificate Transparency logs (crt.sh) so discovery works out-of-the-box.
    """

    def __init__(self, db: Session):
        self.db = db

    async def _run_subfinder(self, domain: str) -> Tuple[List[str], str]:
        """Run subfinder. Returns (subdomains, error). error == '' on success."""
        try:
            process = await asyncio.create_subprocess_exec(
                "subfinder", "-d", domain, "-silent", "-all",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                return [], f"subfinder exited {process.returncode}: {stderr.decode(errors='ignore').strip()}"
            found = {s.strip() for s in stdout.decode(errors="ignore").splitlines() if s.strip()}
            return sorted(found), ""
        except FileNotFoundError:
            return [], "subfinder not installed"
        except Exception as e:
            return [], f"subfinder error: {e}"

    async def _query_crtsh(self, domain: str) -> Tuple[List[str], str]:
        """Fallback: query crt.sh Certificate Transparency logs with retries."""
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        last_err = ""
        delays = [0, 2, 5, 10]
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            for attempt, delay in enumerate(delays, start=1):
                if delay:
                    await asyncio.sleep(delay)
                try:
                    resp = await client.get(url, headers={"User-Agent": "OSC-Discovery/1.0"})
                except httpx.RequestError as e:
                    last_err = f"Could not reach crt.sh: {e}"
                    continue

                if resp.status_code in (502, 503, 504, 429):
                    last_err = f"crt.sh returned HTTP {resp.status_code} (attempt {attempt}/{len(delays)})"
                    continue
                if resp.status_code != 200:
                    return [], f"crt.sh returned HTTP {resp.status_code}"

                try:
                    entries = resp.json()
                except ValueError:
                    last_err = "crt.sh returned a non-JSON response"
                    continue

                found = set()
                for entry in entries:
                    name_value = entry.get("name_value", "")
                    for name in name_value.split("\n"):
                        name = name.strip().lower().lstrip("*.")
                        if name and name.endswith(domain) and "@" not in name:
                            found.add(name)
                return sorted(found), ""

        return [], last_err + " — crt.sh is a free public service and is frequently overloaded. Try again in a few minutes, or install subfinder locally."

    async def discover_subdomains(self, domain: str) -> Tuple[List[str], str, str]:
        """
        Returns (subdomains, source, error).
        source is one of: 'subfinder', 'crt.sh', ''.
        """
        logger.info(f"Starting subdomain discovery for: {domain}")

        subs, sf_err = await self._run_subfinder(domain)
        if subs:
            return subs, "subfinder", ""

        logger.info(f"Subfinder unavailable ({sf_err}); falling back to crt.sh")
        subs, ct_err = await self._query_crtsh(domain)
        if subs:
            return subs, "crt.sh", ""

        error = ct_err or sf_err or "No subdomains found."
        return [], "", error

    async def process_discovery(self, raw_domain: str, source_tag: str = "discovery") -> Dict[str, Any]:
        """Main entry: normalize input, discover, persist new targets."""
        domain, norm_err = normalize_domain(raw_domain)
        if norm_err:
            return {
                "domain": raw_domain,
                "total_found": 0,
                "new_targets_created": 0,
                "new_targets": [],
                "source": "",
                "error": norm_err,
            }

        subdomains, used_source, error = await self.discover_subdomains(domain)

        created_targets: List[str] = []
        for subdomain in subdomains:
            exists = self.db.query(Target).filter(Target.base_url.like(f"%{subdomain}%")).first()
            if exists:
                continue
            self.db.add(Target(
                name=subdomain,
                base_url=f"https://{subdomain}",
                source=source_tag,
                tech_stack={},
            ))
            created_targets.append(subdomain)

        if created_targets:
            self.db.commit()

        return {
            "domain": domain,
            "total_found": len(subdomains),
            "new_targets_created": len(created_targets),
            "new_targets": created_targets,
            "source": used_source,
            "error": error,
        }
