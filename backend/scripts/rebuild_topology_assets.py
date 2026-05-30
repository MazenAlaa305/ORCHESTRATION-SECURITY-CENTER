"""
Rebuild the network_assets inventory so the topology shows one dedicated
device per demo vulnerability plus a small main-stack tier.

After this runs:
  * 45 service nodes, each carrying exactly one finding from the 8/15/12/10
    demo distribution. Per-tier risk_score buckets push the canvas colour
    into the expected band (Critical/High/Medium/Low) without inventing
    fake severities — every red box on the topology is one real finding.
  * 12 main-stack infrastructure nodes (firewall, AD, jumphost, etc.) in
    the MGMT subnet with risk_score=5 → render as Low/Secure. They exist
    to mirror the supporting infrastructure a real SME would run.

Total: 57 devices, every one of them either has a finding or is part of
the supporting stack. Run with:
    docker exec sme_dashboard_backend python scripts/rebuild_topology_assets.py
"""
import asyncio
import random
from datetime import datetime
from sqlalchemy import select, delete
from app.core.database import async_session_maker
from app.models.scan import Vulnerability, NetworkAsset


# (service, port) → (subnet prefix, role label, OS hint)
TAG_INFO = {
    ("http", 3000):        ("10.10.10", "web",       "Linux (Node.js)"),
    ("http", 8081):        ("10.10.10", "api-gw",    "Linux (nginx)"),
    ("dns",  53):          ("10.10.10", "dns",       "Linux (CoreDNS)"),
    ("smb",  445):         ("10.10.20", "fs",        "Linux (Samba)"),
    ("smtp", 3025):        ("10.10.20", "mail",      "Linux (GreenMail)"),
    ("ssh",  22):          ("10.10.20", "ws",        "Linux (Ubuntu)"),
    ("postgresql", 5432):  ("10.10.30", "db",        "Linux (Alpine)"),
    ("redis", 6380):       ("10.10.30", "redis",     "Linux (Alpine)"),
}

SEV_RISK = {
    "CRITICAL": (88, 95),
    "HIGH":     (60, 74),
    "MEDIUM":   (30, 49),
    "LOW":      (10, 19),
}

SEV_TO_CRIT = {
    "CRITICAL": "CRITICAL",
    "HIGH":     "HIGH",
    "MEDIUM":   "MEDIUM",
    "LOW":      "LOW",
}

ZONE_SUFFIX = {
    "10.10.10": "dmz",
    "10.10.20": "corp",
    "10.10.30": "data",
    "10.10.40": "mgmt",
}

MAIN_STACK = [
    ("10.10.40.50", "firewall-01",      "Perimeter Firewall",    "firewall",   "BSD (pfSense)"),
    ("10.10.40.51", "edge-router-01",   "Edge Router",           "router",     "Cisco IOS"),
    ("10.10.40.52", "core-switch-01",   "Core L3 Switch",        "router",     "Cisco NX-OS"),
    ("10.10.40.53", "ad-dc-01",         "AD Domain Controller",  "server",     "Windows Server"),
    ("10.10.40.54", "dhcp-01",          "DHCP Server",           "server",     "Linux"),
    ("10.10.40.55", "ntp-01",           "NTP Time Source",       "server",     "Linux"),
    ("10.10.40.56", "monitoring-01",    "Monitoring Hub",        "server",     "Linux"),
    ("10.10.40.57", "jumphost-01",      "Admin Jumphost",        "server",     "Linux"),
    ("10.10.40.58", "backup-01",        "Backup Vault",          "server",     "Linux"),
    ("10.10.40.59", "proxy-01",         "Egress Proxy",          "server",     "Linux"),
    ("10.10.40.60", "lb-01",            "Load Balancer",         "router",     "Linux (HAProxy)"),
    ("10.10.40.61", "vault-01",         "Secrets Vault",         "server",     "Linux"),
]


def _sev_str(v):
    s = v.severity
    return (s.value if hasattr(s, "value") else s).upper()


async def main():
    random.seed(42)  # deterministic risk-score noise
    async with async_session_maker() as db:
        # 1. Drop the existing inventory so we can re-issue IPs cleanly.
        await db.execute(delete(NetworkAsset))

        # 2. Load every demo vuln in a stable order so the asset assignment
        #    is reproducible across runs.
        vulns = (
            await db.execute(select(Vulnerability).order_by(Vulnerability.severity, Vulnerability.id))
        ).scalars().all()

        # Per-zone IP counter and per-role name counter.
        next_ip = {"10.10.10": 10, "10.10.20": 10, "10.10.30": 10, "10.10.40": 10}
        role_no = {}
        created = 0

        for v in vulns:
            zone_pref, role, os_name = TAG_INFO.get(
                (v.service, v.port),
                ("10.10.10", "host", "Linux"),
            )
            host_octet = next_ip[zone_pref]
            next_ip[zone_pref] += 1
            ip = f"{zone_pref}.{host_octet}"

            role_no[role] = role_no.get(role, 0) + 1
            hostname = f"{role}-{role_no[role]:02d}.sme-lab.{ZONE_SUFFIX[zone_pref]}"

            sev_str = _sev_str(v)
            lo, hi = SEV_RISK[sev_str]
            risk_score = random.randint(lo, hi)

            asset = NetworkAsset(
                ip_address=ip,
                hostname=hostname,
                device_type="server",
                status="active",
                os_name=os_name,
                criticality=SEV_TO_CRIT[sev_str],
                risk_score=float(risk_score),
                open_ports=str(v.port) if v.port else None,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
            )
            db.add(asset)
            # Re-anchor the vuln to its dedicated asset's IP so
            # /network/assets/{id} returns it on click.
            v.host = ip
            created += 1

        # 3. Add the 12 main-stack infra devices (Low risk, no findings).
        for ip, hn, descr, dtype, os_name in MAIN_STACK:
            db.add(NetworkAsset(
                ip_address=ip,
                hostname=hn,
                device_type=dtype,
                status="active",
                os_name=os_name,
                criticality="LOW",
                risk_score=5.0,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
            ))

        await db.commit()
        print(f"Rebuilt inventory: {created} vuln-bearing assets + {len(MAIN_STACK)} main-stack assets.")
        # Show per-tier breakdown so the operator can sanity-check.
        from collections import Counter
        tier = Counter()
        all_assets = (await db.execute(select(NetworkAsset))).scalars().all()
        for a in all_assets:
            r = a.risk_score or 0
            if r >= 75:  t = "critical"
            elif r >= 50: t = "high"
            elif r >= 20: t = "medium"
            elif r > 0:   t = "low"
            else:         t = "secure"
            tier[t] += 1
        for k in ("critical", "high", "medium", "low", "secure"):
            print(f"  {k:8s}: {tier[k]}")


if __name__ == "__main__":
    asyncio.run(main())
