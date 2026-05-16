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
async def seed_lab_vulnerabilities(db: AsyncSession = Depends(get_async_db)):
    """
    Seed the database with realistic demo vulnerabilities for the lab environment.
    Creates a completed demo scan and attaches representative findings from each
    lab container. Idempotent — skips seeding if demo vulns already exist.
    """
    from app.models.scan import (
        Scan, ScanStatus, Vulnerability, SeverityLevel, VulnStatus, Target,
    )

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

    DEMO_VULNS = [
        # Juice Shop — E-Commerce Web Server
        dict(
            host="lab-demo-seed", port=3000, service="http",
            type="SQL Injection",
            title="SQL Injection in Login Endpoint",
            severity=SeverityLevel.CRITICAL,
            url="http://lab_webserver:3000/rest/user/login",
            parameter="email",
            description="The login endpoint concatenates user input directly into SQL queries, allowing authentication bypass and data extraction.",
            remediation="Use parameterised queries or an ORM. Never interpolate user input into SQL strings.",
            proof_of_concept="email=' OR 1=1--&password=anything",
            confidence_score=0.97,
            cvss_score=9.8,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        ),
        dict(
            host="lab-demo-seed", port=3000, service="http",
            type="Cross-Site Scripting (XSS)",
            title="Reflected XSS in Search Parameter",
            severity=SeverityLevel.HIGH,
            url="http://lab_webserver:3000/#/search",
            parameter="q",
            description="The search page reflects unsanitised user input back in the DOM, enabling script injection attacks against other users.",
            remediation="HTML-encode all reflected values. Implement a Content Security Policy.",
            proof_of_concept="<script>alert(document.cookie)</script>",
            confidence_score=0.91,
            cvss_score=7.4,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N",
        ),
        dict(
            host="lab-demo-seed", port=3000, service="http",
            type="Broken Object Level Authorization",
            title="BOLA — User Data Accessible Without Ownership Check",
            severity=SeverityLevel.HIGH,
            url="http://lab_webserver:3000/api/Users/1",
            parameter="id",
            description="The /api/Users/:id endpoint returns full user records for any authenticated user, without verifying that the requester owns the resource.",
            remediation="Enforce ownership checks on every resource endpoint. Compare the authenticated user ID against the requested resource owner.",
            proof_of_concept="GET /api/Users/2  (authenticated as user 1)",
            confidence_score=0.88,
            cvss_score=7.1,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N",
        ),
        dict(
            host="lab-demo-seed", port=3000, service="http",
            type="Broken Authentication",
            title="JWT Secret Weak — Token Forgeable",
            severity=SeverityLevel.CRITICAL,
            url="http://lab_webserver:3000/rest/user/whoami",
            parameter="Authorization",
            description="The application signs JWTs with the hardcoded secret 'secret'. An attacker can forge tokens for any user, including admin.",
            remediation="Generate a cryptographically random 256-bit secret. Rotate it immediately and invalidate all existing sessions.",
            proof_of_concept="JWT signed with HS256 secret='secret'",
            confidence_score=0.99,
            cvss_score=9.1,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        ),
        # Corporate API Gateway
        dict(
            host="lab-demo-seed", port=8081, service="http",
            type="Information Disclosure",
            title="Swagger UI Exposed in Production",
            severity=SeverityLevel.MEDIUM,
            url="http://lab_api_gateway:8081/swagger-ui.html",
            parameter=None,
            description="The Swagger UI and OpenAPI specification are publicly accessible, exposing all internal API routes, request schemas, and authentication mechanisms.",
            remediation="Disable Swagger UI on production builds. Gate it behind authentication on staging.",
            proof_of_concept="GET /swagger-ui.html → 200 OK (unauthenticated)",
            confidence_score=0.95,
            cvss_score=5.3,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
        ),
        dict(
            host="lab-demo-seed", port=8081, service="http",
            type="Security Header Missing",
            title="Missing Security Headers (X-Frame-Options, CSP)",
            severity=SeverityLevel.LOW,
            url="http://lab_api_gateway:8081/",
            parameter=None,
            description="HTTP responses lack X-Frame-Options, Content-Security-Policy, and X-Content-Type-Options headers, increasing exposure to clickjacking and MIME-sniffing attacks.",
            remediation="Add security headers via middleware: X-Frame-Options: DENY, Content-Security-Policy, X-Content-Type-Options: nosniff.",
            proof_of_concept="curl -I http://lab_api_gateway:8081/ | grep -i 'x-frame'",
            confidence_score=0.99,
            cvss_score=4.3,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N",
        ),
        # Redis Cache
        dict(
            host="lab-demo-seed", port=6380, service="redis",
            type="Unauthenticated Access",
            title="Redis Accessible Without Authentication",
            severity=SeverityLevel.CRITICAL,
            url="redis://lab_redis_cache:6380",
            parameter=None,
            description="The Redis instance has no AUTH password set and protected-mode is disabled, allowing any network client to read, write, or flush all cached data including session tokens.",
            remediation="Set requirepass in redis.conf. Bind Redis to 127.0.0.1 or the application network only. Enable protected-mode.",
            proof_of_concept="redis-cli -h lab_redis_cache -p 6380 KEYS *",
            confidence_score=0.99,
            cvss_score=9.8,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        ),
        # Production Database
        dict(
            host="lab-demo-seed", port=5432, service="postgresql",
            type="Weak Credentials",
            title="PostgreSQL Root Password is 'password'",
            severity=SeverityLevel.HIGH,
            url="postgresql://lab_database:5432/prod",
            parameter=None,
            description="The production PostgreSQL instance uses the trivially guessable password 'password' for the postgres superuser account, enabling full database compromise.",
            remediation="Enforce a minimum 20-character random password. Use a secrets manager. Rotate credentials immediately.",
            proof_of_concept="psql -h lab_database -U postgres -p 5432 (password: password)",
            confidence_score=0.98,
            cvss_score=8.8,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
        ),
        dict(
            host="lab-demo-seed", port=5432, service="postgresql",
            type="Sensitive Data Exposure",
            title="PII Stored in Plaintext (No Column Encryption)",
            severity=SeverityLevel.HIGH,
            url="postgresql://lab_database:5432/prod/users",
            parameter="password_hash",
            description="The users table stores passwords as unsalted MD5 hashes and credit card numbers in plaintext, violating PCI-DSS requirements and exposing PII.",
            remediation="Migrate passwords to bcrypt/argon2. Encrypt card data with AES-256 at the application layer. Implement column-level encryption.",
            proof_of_concept="SELECT email, password_hash, card_number FROM users LIMIT 5;",
            confidence_score=0.94,
            cvss_score=7.5,
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
        ),
        # File Server
        dict(
            host="lab-demo-seed", port=445, service="smb",
            type="SMB Enumeration",
            title="Anonymous SMB Enumeration Allowed",
            severity=SeverityLevel.MEDIUM,
            url="smb://lab_fileserver:445",
            parameter=None,
            description="The Samba share allows anonymous (null session) enumeration of share names, user accounts, and group memberships without authentication.",
            remediation="Set restrict anonymous = 2 in smb.conf. Disable null sessions. Require signing on all SMB connections.",
            proof_of_concept="smbclient -L //lab_fileserver -N",
            confidence_score=0.93,
            cvss_score=5.9,
            cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N",
        ),
    ]

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
