"""
Living Lab API Endpoints — Orchestration Security Center
Manage, monitor, and interact with the SME simulation lab.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid
from datetime import datetime

from app.api.deps import require_role
from app.core.database import get_async_db
from app.models.user import UserRole
from app.services.lab_manager import lab_manager

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Demo vulnerability distribution
# ─────────────────────────────────────────────────────────────────────────────
# Target distribution for the lab demo: 8 / 15 / 12 / 33 (CRITICAL / HIGH /
# MEDIUM / LOW). Each tier has a small bank of realistic templates mapped to
# actual lab containers; the generator round-robins templates until it has
# produced the requested per-tier count. Findings stay unique because each
# one is suffixed with an instance counter, and the original URLs/parameters
# from each template are preserved so the dashboard's drill-downs still work.

_TARGETS_BY_SEVERITY = {
    "CRITICAL": 8,
    "HIGH":     15,
    "MEDIUM":   12,
    "LOW":      33,
}

# Realistic vulnerability templates per severity, anchored to the lab targets.
_CRITICAL_TEMPLATES = [
    dict(host_label="lab_webserver", port=3000, service="http", type="SQL Injection",
         title="SQL Injection in Login Endpoint",
         url="http://lab_webserver:3000/rest/user/login", parameter="email",
         description="The login endpoint concatenates user input directly into SQL queries, allowing authentication bypass and data extraction.",
         remediation="Use parameterised queries or an ORM. Never interpolate user input into SQL strings.",
         proof_of_concept="email=' OR 1=1--&password=anything",
         confidence_score=0.97, cvss_score=9.8,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Broken Authentication",
         title="JWT Signed with Hardcoded Secret",
         url="http://lab_webserver:3000/rest/user/whoami", parameter="Authorization",
         description="The application signs JWTs with the hardcoded secret 'secret'. An attacker can forge tokens for any user, including admin.",
         remediation="Generate a cryptographically random 256-bit secret. Rotate it and invalidate all existing sessions.",
         proof_of_concept="JWT signed with HS256 secret='secret'",
         confidence_score=0.99, cvss_score=9.1,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"),
    dict(host_label="lab_redis_cache", port=6380, service="redis", type="Unauthenticated Access",
         title="Redis Accessible Without Authentication",
         url="redis://lab_redis_cache:6380", parameter=None,
         description="The Redis instance has no AUTH password set and protected-mode is disabled, allowing any network client to read, write, or flush all cached data including session tokens.",
         remediation="Set requirepass in redis.conf. Bind Redis to the application network only. Enable protected-mode.",
         proof_of_concept="redis-cli -h lab_redis_cache -p 6380 KEYS *",
         confidence_score=0.99, cvss_score=9.8,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_database", port=5432, service="postgresql", type="Remote Code Execution",
         title="PostgreSQL COPY PROGRAM Allows OS Command Execution",
         url="postgresql://lab_database:5432/prod", parameter=None,
         description="The PostgreSQL superuser can invoke COPY ... FROM PROGRAM to execute arbitrary shell commands on the database host.",
         remediation="Revoke superuser privileges from application accounts. Restrict pg_read_server_files / pg_execute_server_program roles.",
         proof_of_concept="COPY t FROM PROGRAM 'id';",
         confidence_score=0.96, cvss_score=9.9,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H"),
    dict(host_label="lab_api_gateway", port=8081, service="http", type="Deserialization",
         title="Insecure Java Deserialization in API Gateway",
         url="http://lab_api_gateway:8081/internal/state", parameter="payload",
         description="A management endpoint accepts serialised Java objects, enabling RCE via gadget chains (Commons-Collections in the classpath).",
         remediation="Replace native serialisation with JSON. Add a class-name allowlist or migrate to a safe serialiser.",
         proof_of_concept="ysoserial CommonsCollections5 'id' | base64",
         confidence_score=0.92, cvss_score=9.6,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_fileserver", port=445, service="smb", type="Remote Code Execution",
         title="EternalBlue-class SMBv1 RCE Surface (MS17-010)",
         url="smb://lab_fileserver:445", parameter=None,
         description="The Samba service still negotiates SMBv1 and exposes the legacy code path patched by MS17-010, allowing unauthenticated remote code execution.",
         remediation="Disable SMBv1 entirely. Enforce SMBv3 with signing. Patch Samba to the current stable release.",
         proof_of_concept="nmap --script smb-vuln-ms17-010 -p445 lab_fileserver",
         confidence_score=0.94, cvss_score=9.8,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_mailserver", port=3025, service="smtp", type="Command Injection",
         title="Mail Filter Pipes Sender Header into Shell",
         url="smtp://lab_mailserver:3025", parameter="MAIL FROM",
         description="A sieve script pipes the raw MAIL FROM value into /bin/sh without escaping, enabling shell injection from any unauthenticated SMTP peer.",
         remediation="Sanitise sender addresses before passing to shell scripts. Use exec() with an argument list, never a shell string.",
         proof_of_concept="MAIL FROM:<a@b`id`>",
         confidence_score=0.9, cvss_score=9.4,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_dns_server", port=53, service="dns", type="Cache Poisoning",
         title="DNS Recursion Open to the Internet",
         url="dns://lab_dns_server:53", parameter=None,
         description="The CoreDNS resolver answers recursive queries from any source IP, enabling cache poisoning, amplification DDoS, and downstream MITM.",
         remediation="Restrict recursion to internal subnets via the 'allow_recursion' directive. Disable the open resolver.",
         proof_of_concept="dig @lab_dns_server example.com",
         confidence_score=0.93, cvss_score=9.0,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:H/A:H"),
]

_HIGH_TEMPLATES = [
    dict(host_label="lab_webserver", port=3000, service="http", type="Cross-Site Scripting (XSS)",
         title="Reflected XSS in Search Parameter",
         url="http://lab_webserver:3000/#/search", parameter="q",
         description="The search page reflects unsanitised user input back in the DOM, enabling script injection attacks against other users.",
         remediation="HTML-encode all reflected values. Implement a Content Security Policy.",
         proof_of_concept="<script>alert(document.cookie)</script>",
         confidence_score=0.91, cvss_score=7.4,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Broken Object Level Authorization",
         title="BOLA — User Data Accessible Without Ownership Check",
         url="http://lab_webserver:3000/api/Users/1", parameter="id",
         description="The /api/Users/:id endpoint returns full user records for any authenticated user, without verifying ownership of the resource.",
         remediation="Enforce ownership checks on every resource endpoint. Compare the authenticated user ID against the resource owner.",
         proof_of_concept="GET /api/Users/2  (authenticated as user 1)",
         confidence_score=0.88, cvss_score=7.1,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N"),
    dict(host_label="lab_database", port=5432, service="postgresql", type="Weak Credentials",
         title="PostgreSQL Superuser Password is 'password'",
         url="postgresql://lab_database:5432/prod", parameter=None,
         description="The production PostgreSQL instance uses the trivially guessable password 'password' for the postgres superuser account.",
         remediation="Enforce a minimum 20-character random password. Store credentials in a secrets manager.",
         proof_of_concept="psql -h lab_database -U postgres -p 5432 (password: password)",
         confidence_score=0.98, cvss_score=8.8,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"),
    dict(host_label="lab_database", port=5432, service="postgresql", type="Sensitive Data Exposure",
         title="PII Stored in Plaintext (No Column Encryption)",
         url="postgresql://lab_database:5432/prod/users", parameter="password_hash",
         description="The users table stores passwords as unsalted MD5 hashes and credit card numbers in plaintext, violating PCI-DSS.",
         remediation="Migrate passwords to bcrypt/argon2. Encrypt card data with AES-256 at the application layer.",
         proof_of_concept="SELECT email, password_hash, card_number FROM users LIMIT 5;",
         confidence_score=0.94, cvss_score=7.5,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"),
    dict(host_label="lab_api_gateway", port=8081, service="http", type="SSRF",
         title="Server-Side Request Forgery in Webhook Proxy",
         url="http://lab_api_gateway:8081/webhooks/forward", parameter="target",
         description="The webhook forwarder fetches arbitrary user-supplied URLs server-side, including 169.254.169.254 cloud-metadata endpoints.",
         remediation="Allowlist outbound destinations. Block private RFC1918 ranges and link-local addresses at the egress proxy.",
         proof_of_concept="POST /webhooks/forward { target: http://169.254.169.254/latest/meta-data/ }",
         confidence_score=0.9, cvss_score=8.2,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N"),
    dict(host_label="lab_fileserver", port=445, service="smb", type="Sensitive Data Exposure",
         title="World-Readable Share Contains Backup Credentials",
         url="smb://lab_fileserver:445/backups", parameter=None,
         description="The 'backups' share is world-readable and contains a config file with database, SMTP, and AWS access keys.",
         remediation="Restrict share permissions to the backup service account. Move secrets into a vault.",
         proof_of_concept="smbget -R smb://lab_fileserver/backups/config.ini",
         confidence_score=0.95, cvss_score=8.4,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N"),
    dict(host_label="lab_mailserver", port=3025, service="smtp", type="Plaintext Authentication",
         title="SMTP AUTH PLAIN Without TLS",
         url="smtp://lab_mailserver:3025", parameter="AUTH",
         description="The mail server advertises AUTH PLAIN over an unencrypted channel, exposing credentials to passive network observers.",
         remediation="Require STARTTLS for every AUTH command. Disable PLAIN over cleartext sessions.",
         proof_of_concept="EHLO ; AUTH PLAIN AHVzZXIAcGFzcw== (on port 3025 without TLS)",
         confidence_score=0.93, cvss_score=7.2,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N"),
    dict(host_label="lab_workstation", port=22, service="ssh", type="Weak Authentication",
         title="SSH Password Authentication Enabled",
         url="ssh://lab_workstation:22", parameter=None,
         description="The workstation accepts SSH password authentication, exposing it to credential-stuffing and brute-force attempts.",
         remediation="Disable password authentication. Enforce key-based or hardware-token logins only.",
         proof_of_concept="hydra -L users.txt -P pass.txt ssh://lab_workstation",
         confidence_score=0.85, cvss_score=7.5,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L"),
    dict(host_label="lab_dns_server", port=53, service="dns", type="Information Disclosure",
         title="DNS Zone Transfer (AXFR) Allowed",
         url="dns://lab_dns_server:53", parameter="AXFR",
         description="Anyone can request a full zone transfer (AXFR), enumerating every internal hostname and IP defined in the corporate zone.",
         remediation="Restrict AXFR to the slave nameservers via TSIG-authenticated allowlists.",
         proof_of_concept="dig @lab_dns_server corp.example AXFR",
         confidence_score=0.97, cvss_score=7.5,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="CSRF",
         title="Missing CSRF Protection on Profile Update",
         url="http://lab_webserver:3000/api/Users/me", parameter=None,
         description="PATCH /api/Users/me has no anti-CSRF token, allowing a victim to be silently re-emailed by a crafted external page.",
         remediation="Adopt SameSite=Lax cookies and a per-session CSRF token validated server-side.",
         proof_of_concept="<form action=... method=POST> auto-submitted from evil.com",
         confidence_score=0.86, cvss_score=7.1,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:H/I:H/A:N"),
]

_MEDIUM_TEMPLATES = [
    dict(host_label="lab_api_gateway", port=8081, service="http", type="Information Disclosure",
         title="Swagger UI Exposed in Production",
         url="http://lab_api_gateway:8081/swagger-ui.html", parameter=None,
         description="The Swagger UI and OpenAPI specification are publicly accessible, exposing all internal API routes and request schemas.",
         remediation="Disable Swagger UI on production builds. Gate it behind authentication on staging.",
         proof_of_concept="GET /swagger-ui.html → 200 OK (unauthenticated)",
         confidence_score=0.95, cvss_score=5.3,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_fileserver", port=445, service="smb", type="SMB Enumeration",
         title="Anonymous SMB Enumeration Allowed",
         url="smb://lab_fileserver:445", parameter=None,
         description="The Samba share allows anonymous (null session) enumeration of share names, user accounts, and group memberships.",
         remediation="Set restrict anonymous = 2 in smb.conf. Disable null sessions. Require signing on all SMB connections.",
         proof_of_concept="smbclient -L //lab_fileserver -N",
         confidence_score=0.93, cvss_score=5.9,
         cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Open Redirect",
         title="Open Redirect on Login Callback",
         url="http://lab_webserver:3000/login?returnUrl=", parameter="returnUrl",
         description="The login flow honours arbitrary returnUrl values, enabling phishing redirects after a real login.",
         remediation="Allowlist redirect targets to the application's own hostnames.",
         proof_of_concept="/login?returnUrl=https://evil.example/phish",
         confidence_score=0.88, cvss_score=6.1,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"),
    dict(host_label="lab_api_gateway", port=8081, service="http", type="Rate Limiting",
         title="No Rate Limiting on Authentication Endpoint",
         url="http://lab_api_gateway:8081/auth/login", parameter=None,
         description="The login endpoint has no rate limit, enabling unrestricted password-guessing attacks.",
         remediation="Apply per-account and per-IP throttling. Lock accounts after repeated failures.",
         proof_of_concept="Burp Intruder → 10,000 attempts/minute observed",
         confidence_score=0.97, cvss_score=5.3,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L"),
    dict(host_label="lab_database", port=5432, service="postgresql", type="Misconfiguration",
         title="PostgreSQL Logs Statements Including Bind Values",
         url="postgresql://lab_database:5432/prod", parameter=None,
         description="log_statement = 'all' captures every query and its parameters, including hashed credentials and PII, to disk-resident logs.",
         remediation="Reduce log_statement to 'ddl' or 'mod'. Redact sensitive parameters and rotate logs to a secured collector.",
         proof_of_concept="tail /var/log/postgresql/postgresql.log → SELECT email, ssn FROM ...",
         confidence_score=0.86, cvss_score=5.5,
         cvss_vector="CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N"),
    dict(host_label="lab_mailserver", port=3025, service="smtp", type="Misconfiguration",
         title="SMTP Open Relay for Local Subnet",
         url="smtp://lab_mailserver:3025", parameter=None,
         description="The mail server relays mail for any sender domain on the local network, enabling internal phishing.",
         remediation="Lock relaying to authenticated submission users. Require SPF/DKIM on outbound mail.",
         proof_of_concept="swaks --to victim@external --from spoof@local --server lab_mailserver",
         confidence_score=0.9, cvss_score=5.4,
         cvss_vector="CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N"),
    dict(host_label="lab_redis_cache", port=6380, service="redis", type="Misconfiguration",
         title="Redis CONFIG Command Not Renamed",
         url="redis://lab_redis_cache:6380", parameter=None,
         description="The CONFIG command is left enabled, allowing any client to alter runtime parameters such as dir and dbfilename — a known RCE pivot.",
         remediation="rename-command CONFIG \"\" or to a long random string. Forbid CONFIG from application service accounts.",
         proof_of_concept="redis-cli CONFIG SET dir /var/spool/cron/",
         confidence_score=0.92, cvss_score=6.3,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L"),
    dict(host_label="lab_dns_server", port=53, service="dns", type="Information Disclosure",
         title="DNS Version Banner Disclosed (version.bind)",
         url="dns://lab_dns_server:53", parameter="CH/TXT/version.bind",
         description="The resolver answers CH/TXT queries for version.bind, revealing the exact CoreDNS build to attackers.",
         remediation="Override version.bind responses with a generic string in the corefile.",
         proof_of_concept="dig @lab_dns_server version.bind chaos txt",
         confidence_score=0.99, cvss_score=4.3,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
]

_LOW_TEMPLATES = [
    dict(host_label="lab_api_gateway", port=8081, service="http", type="Security Header Missing",
         title="Missing Security Headers (X-Frame-Options, CSP)",
         url="http://lab_api_gateway:8081/", parameter=None,
         description="HTTP responses lack X-Frame-Options, Content-Security-Policy, and X-Content-Type-Options headers.",
         remediation="Add security headers via middleware: X-Frame-Options: DENY, CSP, X-Content-Type-Options: nosniff.",
         proof_of_concept="curl -I http://lab_api_gateway:8081/ | grep -i 'x-frame'",
         confidence_score=0.99, cvss_score=3.7,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Cookie Misconfiguration",
         title="Session Cookie Missing HttpOnly / Secure",
         url="http://lab_webserver:3000/", parameter="JSESSIONID",
         description="The session cookie is set without HttpOnly or Secure, exposing it to XSS theft and accidental leakage over HTTP.",
         remediation="Set HttpOnly, Secure, and SameSite=Lax (or Strict) on the session cookie.",
         proof_of_concept="Set-Cookie: JSESSIONID=abc; Path=/  (no flags)",
         confidence_score=0.99, cvss_score=3.5,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Information Disclosure",
         title="Server Banner Leaks Express Version",
         url="http://lab_webserver:3000/", parameter="X-Powered-By",
         description="Responses include 'X-Powered-By: Express' and a precise Node.js build string, easing version-specific exploitation.",
         remediation="Set app.disable('x-powered-by') and strip framework banners at the reverse proxy.",
         proof_of_concept="curl -I http://lab_webserver:3000",
         confidence_score=0.99, cvss_score=3.1,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_api_gateway", port=8081, service="http", type="TLS Misconfiguration",
         title="TLS 1.0 Still Offered",
         url="http://lab_api_gateway:8081/", parameter=None,
         description="The API endpoint negotiates legacy TLS 1.0, vulnerable to BEAST and downgrade attacks.",
         remediation="Disable TLS 1.0/1.1 at the load balancer. Require TLS 1.2 or 1.3 with modern cipher suites.",
         proof_of_concept="openssl s_client -tls1 -connect lab_api_gateway:8081",
         confidence_score=0.95, cvss_score=3.7,
         cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_fileserver", port=445, service="smb", type="Misconfiguration",
         title="SMB Signing Not Required",
         url="smb://lab_fileserver:445", parameter=None,
         description="The SMB server allows but does not require message signing, leaving sessions vulnerable to relay attacks.",
         remediation="Set server signing = mandatory in smb.conf.",
         proof_of_concept="nmap --script smb-security-mode -p445 lab_fileserver",
         confidence_score=0.93, cvss_score=3.1,
         cvss_vector="CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N"),
    dict(host_label="lab_dns_server", port=53, service="dns", type="Misconfiguration",
         title="DNSSEC Not Configured",
         url="dns://lab_dns_server:53", parameter=None,
         description="The authoritative zones are not DNSSEC-signed, making downstream resolvers susceptible to cache poisoning.",
         remediation="Sign the corporate zones with KSK/ZSK and publish DS records at the parent.",
         proof_of_concept="dig +dnssec @lab_dns_server corp.example  → ad flag absent",
         confidence_score=0.97, cvss_score=3.0,
         cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N"),
    dict(host_label="lab_mailserver", port=3025, service="smtp", type="Misconfiguration",
         title="SMTP Banner Discloses Mail Server Software",
         url="smtp://lab_mailserver:3025", parameter="banner",
         description="The 220 greeting includes the exact mail server name and version, enabling targeted CVE matching.",
         remediation="Replace the banner with a generic string (e.g. 'mail.corp ESMTP ready').",
         proof_of_concept="nc lab_mailserver 3025",
         confidence_score=0.99, cvss_score=2.7,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_redis_cache", port=6380, service="redis", type="Information Disclosure",
         title="Redis INFO Reachable Without Auth",
         url="redis://lab_redis_cache:6380", parameter="INFO",
         description="The INFO command discloses Redis version, OS, memory layout, and connected client metadata to any caller.",
         remediation="Disable INFO via rename-command, or require AUTH before any command.",
         proof_of_concept="redis-cli -h lab_redis_cache -p 6380 INFO",
         confidence_score=0.97, cvss_score=3.7,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_webserver", port=3000, service="http", type="Information Disclosure",
         title="Source Map Exposed in Production Build",
         url="http://lab_webserver:3000/main.js.map", parameter=None,
         description="JavaScript source maps are published next to bundles, exposing the readable source tree to anyone.",
         remediation="Strip *.map files from the production build or restrict them via the reverse proxy.",
         proof_of_concept="curl http://lab_webserver:3000/main.js.map",
         confidence_score=0.99, cvss_score=2.6,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
    dict(host_label="lab_workstation", port=22, service="ssh", type="Misconfiguration",
         title="SSH Server Allows TCP Forwarding",
         url="ssh://lab_workstation:22", parameter=None,
         description="AllowTcpForwarding is enabled, letting authenticated users pivot through the workstation into other subnets.",
         remediation="Disable AllowTcpForwarding for service accounts. Limit it to admin sessions only.",
         proof_of_concept="ssh -L 9000:internal_db:5432 user@lab_workstation",
         confidence_score=0.88, cvss_score=3.0,
         cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N"),
]


def _build_demo_vuln_distribution():
    """
    Build a deterministic 8/15/12/33 finding distribution by round-robining
    over the per-severity templates above. The `host` column always stays
    "lab-demo-seed" so the idempotent guard and reset path keep working.
    """
    from app.models.scan import SeverityLevel

    tiers = [
        (SeverityLevel.CRITICAL, _TARGETS_BY_SEVERITY["CRITICAL"], _CRITICAL_TEMPLATES),
        (SeverityLevel.HIGH,     _TARGETS_BY_SEVERITY["HIGH"],     _HIGH_TEMPLATES),
        (SeverityLevel.MEDIUM,   _TARGETS_BY_SEVERITY["MEDIUM"],   _MEDIUM_TEMPLATES),
        (SeverityLevel.LOW,      _TARGETS_BY_SEVERITY["LOW"],      _LOW_TEMPLATES),
    ]

    out = []
    for severity, target_count, templates in tiers:
        for i in range(target_count):
            tpl = templates[i % len(templates)]
            instance = i + 1
            # Suffix the title with a per-tier index so duplicates don't
            # collapse in the UI (the table dedupes on title + host).
            title = f"{tpl['title']} (#{instance:02d})"
            out.append(dict(
                host="lab-demo-seed",
                port=tpl.get("port"),
                service=tpl.get("service"),
                type=tpl["type"],
                title=title,
                severity=severity,
                url=tpl.get("url"),
                parameter=tpl.get("parameter"),
                description=tpl["description"],
                remediation=tpl["remediation"],
                proof_of_concept=tpl.get("proof_of_concept"),
                confidence_score=tpl.get("confidence_score"),
                cvss_score=tpl.get("cvss_score"),
                cvss_vector=tpl.get("cvss_vector"),
            ))
    return out


@router.get("/status")
async def get_lab_status():
    """
    Get the current status of the Living Lab environment.
    Returns container states, network info, and telemetry stats.
    """
    status = await lab_manager.get_status()
    telemetry = await lab_manager.get_telemetry_stats()
    return {**status, "telemetry": telemetry}


@router.post("/seed", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def seed_lab_targets(db: AsyncSession = Depends(get_async_db)):
    """
    Register all lab targets in the dashboard database.
    Only seeds HTTP-based targets that the scanner can reach.
    Idempotent — skips targets that already exist.
    """
    result = await lab_manager.seed_targets(db)
    return {"seeded": result, "count": len(result)}


@router.get("/events")
async def get_lab_events(limit: int = 50, category: Optional[str] = None):
    """
    Fetch recent lab events from Elasticsearch.
    Optionally filter by event category (web, dns, database, suspicious, etc.).
    """
    events = await lab_manager.get_event_feed(limit=limit)
    if category:
        events = [e for e in events if e.get("event", {}).get("category") == category]
    return {"events": events, "count": len(events)}


@router.get("/targets")
async def get_lab_targets():
    """
    List all lab targets with their vulnerability profiles.
    Used by the frontend to display the lab network map.
    """
    from app.services.lab_manager import LAB_TARGETS
    return {"targets": LAB_TARGETS}


@router.get("/telemetry")
async def get_lab_telemetry():
    """
    Get aggregated telemetry statistics from the lab.
    """
    return await lab_manager.get_telemetry_stats()


@router.post("/seed-vulns", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def seed_lab_vulnerabilities(
    db: AsyncSession = Depends(get_async_db),
    reset: bool = False,
):
    """
    Seed the database with realistic demo vulnerabilities for the lab environment.

    Produces a deterministic distribution that matches the lab dashboard demo:
    8 CRITICAL, 15 HIGH, 12 MEDIUM, 33 LOW (68 total).

    Each finding is mapped to a real lab container (Juice Shop, API gateway,
    DB, Redis, file server, mail server, DNS) with realistic CVSS scores.

    Pass `?reset=true` to wipe the existing demo seed before re-creating it,
    e.g. when you want to refresh the demo to a known clean state. Without
    `reset`, the call is idempotent — it skips if demo vulns already exist.
    """
    from sqlalchemy import delete
    from app.models.scan import (
        Scan, ScanStatus, Vulnerability, SeverityLevel, VulnStatus, Target,
    )

    if reset:
        # Wipe the previously-seeded demo findings AND the demo scan so the
        # next ingest starts from a known baseline.
        await db.execute(
            delete(Vulnerability).where(Vulnerability.host == "lab-demo-seed")
        )
        await db.execute(
            delete(Scan).where(Scan.environment_type == "lab", Scan.scan_type == "full",
                              Scan.risk_score == 62.0)
        )
        await db.flush()
    else:
        # Skip if demo vulns are already present (idempotent guard)
        existing = await db.execute(
            select(Vulnerability).where(Vulnerability.host == "lab-demo-seed").limit(1)
        )
        if existing.scalars().first():
            return {"status": "already_seeded", "created": 0}

    # Find or create a demo target to attach the scan to
    target_res = await db.execute(
        select(Target).where(Target.source == "lab").limit(1)
    )
    demo_target = target_res.scalars().first()

    if not demo_target:
        demo_target = Target(
            id=str(uuid.uuid4()),
            name="[Lab] Demo Environment",
            base_url="http://lab-demo:3000",
            source="lab",
            auth_method="none",
            environment_type="lab",
        )
        db.add(demo_target)
        await db.flush()

    # Create a completed demo scan
    demo_scan = Scan(
        id=str(uuid.uuid4()),
        target_id=demo_target.id,
        status=ScanStatus.COMPLETED,
        scan_type="full",
        risk_score=62.0,
        environment_type="lab",
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        agent_thoughts={"health_score": 38.0},
    )
    db.add(demo_scan)
    await db.flush()

    DEMO_VULNS = _build_demo_vuln_distribution()

    created = 0
    for v in DEMO_VULNS:
        db.add(Vulnerability(
            id=str(uuid.uuid4()),
            scan_id=demo_scan.id,
            host=v["host"],
            port=v.get("port"),
            protocol=v.get("service"),
            service=v.get("service"),
            type=v["type"],
            title=v["title"],
            severity=v["severity"],
            status=VulnStatus.OPEN,
            url=v["url"],
            parameter=v.get("parameter"),
            description=v["description"],
            remediation=v["remediation"],
            proof_of_concept=v.get("proof_of_concept"),
            confidence_score=v.get("confidence_score"),
            cvss_score=v.get("cvss_score"),
            cvss_vector=v.get("cvss_vector"),
            detected_by="lab_seeder",
        ))
        created += 1

    await db.commit()
    return {"status": "seeded", "created": created, "scan_id": demo_scan.id}
