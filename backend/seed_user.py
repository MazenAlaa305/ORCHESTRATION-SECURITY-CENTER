"""
Bootstrap script — seeds the admin user and demo lab vulnerabilities.
Run once after `alembic upgrade head`:
    docker compose exec backend python seed_user.py
"""
import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select as _select

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.scan import (
    Scan, ScanStatus, Target, Vulnerability, SeverityLevel, VulnStatus,
)


async def seed_admin(db):
    res = await db.execute(_select(User).where(User.email == 'admin@local'))
    if res.scalar_one_or_none() is None:
        admin = User(
            id=str(uuid.uuid4()),
            email='admin@local',
            password_hash=hash_password('Admin#159'),
            role=UserRole.ADMIN,
            force_password_change=True,
        )
        db.add(admin)
        await db.commit()
        print("Seeded admin@local / Admin#159")
    else:
        print("Admin already exists — skipped.")


async def seed_demo_vulnerabilities(db):
    """Create a completed demo scan with realistic lab findings."""
    existing = await db.execute(
        _select(Vulnerability).where(Vulnerability.host == 'lab-demo-seed').limit(1)
    )
    if existing.scalars().first():
        print("Demo vulnerabilities already exist — skipped.")
        return

    # Find or create a lab target
    target_res = await db.execute(_select(Target).where(Target.source == 'lab').limit(1))
    demo_target = target_res.scalars().first()
    if not demo_target:
        demo_target = Target(
            id=str(uuid.uuid4()),
            name='[Lab] Demo Environment',
            base_url='http://lab-demo:3000',
            source='lab',
            auth_method='none',
            environment_type='lab',
        )
        db.add(demo_target)
        await db.flush()

    demo_scan = Scan(
        id=str(uuid.uuid4()),
        target_id=demo_target.id,
        status=ScanStatus.COMPLETED,
        scan_type='full',
        risk_score=62.0,
        environment_type='lab',
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        agent_thoughts={'health_score': 38.0},
    )
    db.add(demo_scan)
    await db.flush()

    DEMO_VULNS = [
        dict(host='lab-demo-seed', port=3000, service='http',
             type='SQL Injection', title='SQL Injection in Login Endpoint',
             severity=SeverityLevel.CRITICAL,
             url='http://lab_webserver:3000/rest/user/login', parameter='email',
             description='The login endpoint concatenates user input directly into SQL queries, allowing authentication bypass.',
             remediation='Use parameterised queries or an ORM.',
             proof_of_concept="email=' OR 1=1--&password=anything",
             confidence_score=0.97, cvss_score=9.8,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'),
        dict(host='lab-demo-seed', port=3000, service='http',
             type='Cross-Site Scripting (XSS)', title='Reflected XSS in Search Parameter',
             severity=SeverityLevel.HIGH,
             url='http://lab_webserver:3000/#/search', parameter='q',
             description='The search page reflects unsanitised user input back in the DOM.',
             remediation='HTML-encode all reflected values. Implement a Content Security Policy.',
             proof_of_concept='<script>alert(document.cookie)</script>',
             confidence_score=0.91, cvss_score=7.4,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N'),
        dict(host='lab-demo-seed', port=3000, service='http',
             type='Broken Object Level Authorization', title='BOLA — Unrestricted User Data Access',
             severity=SeverityLevel.HIGH,
             url='http://lab_webserver:3000/api/Users/1', parameter='id',
             description='The endpoint returns full user records without ownership verification.',
             remediation='Enforce ownership checks on every resource endpoint.',
             proof_of_concept='GET /api/Users/2 (authenticated as user 1)',
             confidence_score=0.88, cvss_score=7.1,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N'),
        dict(host='lab-demo-seed', port=3000, service='http',
             type='Broken Authentication', title='JWT Secret Hardcoded — Token Forgeable',
             severity=SeverityLevel.CRITICAL,
             url='http://lab_webserver:3000/rest/user/whoami', parameter='Authorization',
             description="JWTs are signed with hardcoded secret 'secret', allowing full token forgery.",
             remediation='Generate a cryptographically random 256-bit secret. Rotate immediately.',
             proof_of_concept="JWT signed with HS256 secret='secret'",
             confidence_score=0.99, cvss_score=9.1,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N'),
        dict(host='lab-demo-seed', port=8081, service='http',
             type='Information Disclosure', title='Swagger UI Exposed in Production',
             severity=SeverityLevel.MEDIUM,
             url='http://lab_api_gateway:8081/swagger-ui.html',
             description='Swagger UI is publicly accessible, exposing all API routes and schemas.',
             remediation='Disable Swagger UI on production. Gate it behind auth on staging.',
             proof_of_concept='GET /swagger-ui.html → 200 OK (unauthenticated)',
             confidence_score=0.95, cvss_score=5.3,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N'),
        dict(host='lab-demo-seed', port=8081, service='http',
             type='Security Header Missing', title='Missing Security Headers',
             severity=SeverityLevel.LOW,
             url='http://lab_api_gateway:8081/',
             description='Responses lack X-Frame-Options, CSP, and X-Content-Type-Options headers.',
             remediation='Add security headers via middleware.',
             proof_of_concept="curl -I http://lab_api_gateway:8081/ | grep -i 'x-frame'",
             confidence_score=0.99, cvss_score=4.3,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N'),
        dict(host='lab-demo-seed', port=6380, service='redis',
             type='Unauthenticated Access', title='Redis Accessible Without Authentication',
             severity=SeverityLevel.CRITICAL,
             url='redis://lab_redis_cache:6380',
             description='Redis has no AUTH password and protected-mode disabled. All data is exposed.',
             remediation='Set requirepass. Bind Redis to application network only.',
             proof_of_concept='redis-cli -h lab_redis_cache -p 6380 KEYS *',
             confidence_score=0.99, cvss_score=9.8,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'),
        dict(host='lab-demo-seed', port=5432, service='postgresql',
             type='Weak Credentials', title="PostgreSQL Root Password is 'password'",
             severity=SeverityLevel.HIGH,
             url='postgresql://lab_database:5432/prod',
             description="The postgres superuser uses the trivially guessable password 'password'.",
             remediation='Enforce a minimum 20-char random password. Use a secrets manager.',
             proof_of_concept='psql -h lab_database -U postgres (password: password)',
             confidence_score=0.98, cvss_score=8.8,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H'),
        dict(host='lab-demo-seed', port=5432, service='postgresql',
             type='Sensitive Data Exposure', title='PII Stored in Plaintext',
             severity=SeverityLevel.HIGH,
             url='postgresql://lab_database:5432/prod/users', parameter='password_hash',
             description='Passwords stored as unsalted MD5 hashes; card numbers in plaintext.',
             remediation='Migrate to bcrypt/argon2. Encrypt card data with AES-256.',
             proof_of_concept='SELECT email, password_hash, card_number FROM users LIMIT 5;',
             confidence_score=0.94, cvss_score=7.5,
             cvss_vector='CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'),
        dict(host='lab-demo-seed', port=445, service='smb',
             type='SMB Enumeration', title='Anonymous SMB Enumeration Allowed',
             severity=SeverityLevel.MEDIUM,
             url='smb://lab_fileserver:445',
             description='Null session enumeration exposes shares, users, and group memberships.',
             remediation='Set restrict anonymous = 2 in smb.conf. Require signing.',
             proof_of_concept='smbclient -L //lab_fileserver -N',
             confidence_score=0.93, cvss_score=5.9,
             cvss_vector='CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N'),
    ]

    created = 0
    for v in DEMO_VULNS:
        db.add(Vulnerability(
            id=str(uuid.uuid4()),
            scan_id=demo_scan.id,
            host=v['host'],
            port=v.get('port'),
            protocol=v.get('service'),
            service=v.get('service'),
            type=v['type'],
            title=v['title'],
            severity=v['severity'],
            status=VulnStatus.OPEN,
            url=v['url'],
            parameter=v.get('parameter'),
            description=v['description'],
            remediation=v['remediation'],
            proof_of_concept=v.get('proof_of_concept'),
            confidence_score=v.get('confidence_score'),
            cvss_score=v.get('cvss_score'),
            cvss_vector=v.get('cvss_vector'),
            detected_by='lab_seeder',
        ))
        created += 1

    await db.commit()
    print(f"Seeded {created} demo vulnerabilities (scan_id={demo_scan.id})")


async def run():
    async with async_session_maker() as db:
        await seed_admin(db)
        await seed_demo_vulnerabilities(db)


asyncio.run(run())
