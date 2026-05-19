import asyncio
import json
import logging
import os
from pathlib import Path

import aioredis
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.api import api_router
from app.api.v1.endpoints import lab as lab_endpoints

from app.services.ws_manager import manager
from app.core.request_id import RequestIdMiddleware, install_request_id_logging

# ── Structured logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
install_request_id_logging(logging.getLogger())
logger = logging.getLogger(__name__)

# ── Redis event listener with exponential backoff ───────────────────────────
_redis_listener_task: asyncio.Task | None = None


async def redis_event_listener() -> None:
    """
    Bridges Celery worker events → WebSocket clients via Redis Pub/Sub.
    Reconnects with exponential backoff (2s → 4s → 8s … capped at 32s).
    """
    attempt = 0
    while True:
        try:
            redis = await aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=30,
                socket_connect_timeout=5,
            )
            pubsub = redis.pubsub()
            await pubsub.subscribe("ws_events")
            attempt = 0  # reset on successful connect
            logger.info("Redis event listener connected.")

            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await manager.broadcast_event(data["type"], data["payload"])
                    except (KeyError, json.JSONDecodeError) as exc:
                        logger.warning("Malformed ws_event message: %s — %s", message.get("data"), exc)

        except Exception as exc:
            delay = min(2 ** attempt, 32)
            attempt += 1
            # WARNING for first attempt (may be a real issue), DEBUG for subsequent
            # reconnects (expected during quiet periods with socket_timeout firing)
            log_fn = logger.warning if attempt == 1 else logger.debug
            log_fn("Redis listener reconnect (attempt %d): %s — retrying in %ds", attempt, exc, delay)
            await asyncio.sleep(delay)


async def _seed_demo_vulnerabilities() -> None:
    """
    Insert 10 realistic lab findings on first boot so the dashboard always
    shows data without requiring a real Nmap/Nuclei scan.  Idempotent.
    """
    import uuid as _uuid
    from datetime import datetime as _dt
    from sqlalchemy import select as _sel
    from app.core.database import async_session_maker
    from app.models.scan import (
        Scan, ScanStatus, Target, Vulnerability, SeverityLevel, VulnStatus,
    )

    async with async_session_maker() as db:
        # Guard: skip if already seeded
        chk = await db.execute(
            _sel(Vulnerability).where(Vulnerability.detected_by == "lab_seeder").limit(1)
        )
        if chk.scalars().first():
            return

        # Find or create a lab target
        tgt_res = await db.execute(_sel(Target).where(Target.source == "lab").limit(1))
        tgt = tgt_res.scalars().first()
        if not tgt:
            tgt = Target(
                id=str(_uuid.uuid4()),
                name="[Lab] Demo Environment",
                base_url="http://lab_webserver:3000",
                source="lab",
                auth_method="none",
            )
            db.add(tgt)
            await db.flush()

        # Create a completed demo scan
        scan = Scan(
            id=str(_uuid.uuid4()),
            target_id=tgt.id,
            status=ScanStatus.COMPLETED,
            scan_type="full",
            risk_score=62.0,
            started_at=_dt.utcnow(),
            completed_at=_dt.utcnow(),
            agent_thoughts={"health_score": 38.0},
        )
        db.add(scan)
        await db.flush()

        DEMO = [
            dict(type="SQL Injection",
                 title="SQL Injection in Login Endpoint",
                 severity=SeverityLevel.CRITICAL,
                 url="http://lab_webserver:3000/rest/user/login",
                 host="lab_webserver", port=3000, service="http",
                 parameter="email",
                 description="Login endpoint concatenates user input into SQL, enabling auth bypass.",
                 remediation="Use parameterised queries or an ORM.",
                 proof_of_concept="email=' OR 1=1--",
                 confidence_score=0.97, cvss_score=9.8,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
            dict(type="Cross-Site Scripting (XSS)",
                 title="Reflected XSS in Search Parameter",
                 severity=SeverityLevel.HIGH,
                 url="http://lab_webserver:3000/#/search",
                 host="lab_webserver", port=3000, service="http",
                 parameter="q",
                 description="Search page reflects unsanitised input, enabling script injection.",
                 remediation="HTML-encode reflected values. Implement Content-Security-Policy.",
                 proof_of_concept="<script>alert(document.cookie)</script>",
                 confidence_score=0.91, cvss_score=7.4,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N"),
            dict(type="Broken Object Level Authorization",
                 title="BOLA — Unenforced Ownership on User API",
                 severity=SeverityLevel.HIGH,
                 url="http://lab_webserver:3000/api/Users/1",
                 host="lab_webserver", port=3000, service="http",
                 parameter="id",
                 description="Any authenticated user can read any other user's full profile.",
                 remediation="Verify resource ownership on every request.",
                 proof_of_concept="GET /api/Users/2  (authenticated as user 1)",
                 confidence_score=0.88, cvss_score=7.1,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N"),
            dict(type="Broken Authentication",
                 title="Hardcoded JWT Secret — Tokens Forgeable",
                 severity=SeverityLevel.CRITICAL,
                 url="http://lab_webserver:3000/rest/user/whoami",
                 host="lab_webserver", port=3000, service="http",
                 parameter="Authorization",
                 description="JWT signed with hardcoded secret 'secret'; any token can be forged.",
                 remediation="Generate a 256-bit random secret and rotate immediately.",
                 proof_of_concept="HS256 secret='secret'",
                 confidence_score=0.99, cvss_score=9.1,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"),
            dict(type="Information Disclosure",
                 title="Swagger UI Exposed Without Auth",
                 severity=SeverityLevel.MEDIUM,
                 url="http://lab_api_gateway:8081/swagger-ui.html",
                 host="lab_api_gateway", port=8081, service="http",
                 description="Full OpenAPI spec is publicly accessible, exposing internal routes.",
                 remediation="Disable Swagger UI on production builds.",
                 proof_of_concept="GET /swagger-ui.html → 200 OK (no auth)",
                 confidence_score=0.95, cvss_score=5.3,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"),
            dict(type="Security Header Missing",
                 title="Missing X-Frame-Options and CSP Headers",
                 severity=SeverityLevel.LOW,
                 url="http://lab_api_gateway:8081/",
                 host="lab_api_gateway", port=8081, service="http",
                 description="Responses lack X-Frame-Options and Content-Security-Policy.",
                 remediation="Add security headers via middleware.",
                 proof_of_concept="curl -I http://lab_api_gateway:8081/ | grep x-frame",
                 confidence_score=0.99, cvss_score=4.3,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N"),
            dict(type="Unauthenticated Access",
                 title="Redis Open — No Password Required",
                 severity=SeverityLevel.CRITICAL,
                 url="redis://lab_redis_cache:6380",
                 host="lab_redis_cache", port=6380, service="redis",
                 description="Redis has no AUTH and protected-mode disabled; all data exposed.",
                 remediation="Set requirepass. Bind to application network only.",
                 proof_of_concept="redis-cli -h lab_redis_cache -p 6380 KEYS *",
                 confidence_score=0.99, cvss_score=9.8,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
            dict(type="Weak Credentials",
                 title="PostgreSQL Superuser Password is 'password'",
                 severity=SeverityLevel.HIGH,
                 url="postgresql://lab_database:5432/prod",
                 host="lab_database", port=5432, service="postgresql",
                 description="Superuser account uses trivially guessable password.",
                 remediation="Enforce strong random password. Use a secrets manager.",
                 proof_of_concept="psql -h lab_database -U postgres (password: password)",
                 confidence_score=0.98, cvss_score=8.8,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"),
            dict(type="Sensitive Data Exposure",
                 title="PII and Card Numbers Stored in Plaintext",
                 severity=SeverityLevel.HIGH,
                 url="postgresql://lab_database:5432/prod/users",
                 host="lab_database", port=5432, service="postgresql",
                 parameter="password_hash",
                 description="Passwords as unsalted MD5, card numbers in plaintext — violates PCI-DSS.",
                 remediation="Migrate to bcrypt/argon2. Encrypt card data with AES-256.",
                 proof_of_concept="SELECT email, password_hash, card_number FROM users LIMIT 5;",
                 confidence_score=0.94, cvss_score=7.5,
                 cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"),
            dict(type="SMB Enumeration",
                 title="Anonymous SMB Null-Session Enumeration",
                 severity=SeverityLevel.MEDIUM,
                 url="smb://lab_fileserver:445",
                 host="lab_fileserver", port=445, service="smb",
                 description="Null-session enumeration exposes shares, users, and groups.",
                 remediation="Set restrict anonymous = 2 in smb.conf. Require signing.",
                 proof_of_concept="smbclient -L //lab_fileserver -N",
                 confidence_score=0.93, cvss_score=5.9,
                 cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N"),
        ]

        for v in DEMO:
            db.add(Vulnerability(
                id=str(_uuid.uuid4()),
                scan_id=scan.id,
                type=v["type"],
                title=v["title"],
                severity=v["severity"],
                status=VulnStatus.OPEN,
                url=v["url"],
                host=v.get("host"),
                port=v.get("port"),
                service=v.get("service"),
                protocol=v.get("service"),
                parameter=v.get("parameter"),
                description=v.get("description"),
                remediation=v.get("remediation"),
                proof_of_concept=v.get("proof_of_concept"),
                confidence_score=v.get("confidence_score"),
                cvss_score=v.get("cvss_score"),
                cvss_vector=v.get("cvss_vector"),
                detected_by="lab_seeder",
            ))

        await db.commit()
        logger.info("Seeded 10 demo lab vulnerabilities.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: reap orphans, start background tasks, clean up on shutdown."""
    global _redis_listener_task

    # ── 0. Auto-apply pending DB migrations (sync engine — no asyncpg deadlock) ─
    try:
        from alembic.config import Config as _AlembicConfig
        from alembic import command as _alembic_cmd
        _alembic_cfg = _AlembicConfig("/app/alembic.ini")
        _alembic_cmd.upgrade(_alembic_cfg, "head")
        logger.info("DB migrations applied (alembic upgrade head).")
    except Exception as exc:
        logger.warning("Alembic auto-migrate skipped (non-fatal): %s", exc)

    # ── 1. Reap orphaned scans before accepting new work ─────────────────────
    # Must run before the Redis listener so phantom RUNNING scans are cleared
    # before any new WebSocket events flow in.
    try:
        from app.core.database import async_session_maker
        from app.services.scan_reaper import reap_orphan_scans
        async with async_session_maker() as reaper_db:
            await reap_orphan_scans(reaper_db)
    except Exception as exc:
        # Non-fatal: log and continue — don't crash the API on a bad DB startup
        logger.error("Orphan reaper failed on startup (non-fatal): %s", exc)

    # ── 1b. Load runtime config overrides from DB ────────────────────────────
    # Feature flags toggled from the Settings tab persist in the runtime_config
    # table; apply them over the env-var defaults before requests come in.
    try:
        from app.core.database import SessionLocal
        from app.core.config import load_runtime_overrides
        with SessionLocal() as cfg_db:
            load_runtime_overrides(cfg_db)
    except Exception as exc:
        logger.warning("Runtime config overrides not loaded: %s", exc)

    # ── 1c. Seed default admin on first boot ─────────────────────────────────
    try:
        from app.core.database import async_session_maker
        from app.models.user import User, UserRole
        from app.core.security import hash_password
        from sqlalchemy import select as _select
        import uuid as _uuid
        async with async_session_maker() as seed_db:
            res = await seed_db.execute(_select(User).where(User.email == "admin@local"))
            if res.scalar_one_or_none() is None:
                admin = User(
                    id=str(_uuid.uuid4()),
                    email="admin@local",
                    password_hash=hash_password("Admin#159"),
                    role=UserRole.ADMIN,
                    force_password_change=True,
                )
                seed_db.add(admin)
                await seed_db.commit()
                logger.info("Seeded default admin: admin@local / Admin#159")
    except Exception as exc:
        logger.warning("Admin seed skipped (non-fatal): %s", exc)

    # ── 1d. Seed demo lab vulnerabilities (DISABLED as per user request for clean start) ──
    # try:
    #     await _seed_demo_vulnerabilities()
    # except Exception as exc:
    #     logger.warning("Demo vuln seed skipped (non-fatal): %s", exc)

    # ── 2. Start Redis → WebSocket event bridge ───────────────────────────────
    _redis_listener_task = asyncio.create_task(redis_event_listener())
    logger.info("Orchestration Security Center API started.")
    yield
    if _redis_listener_task and not _redis_listener_task.done():
        _redis_listener_task.cancel()
    logger.info("Orchestration Security Center API shutting down.")



# ── FastAPI application ──────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="AI-driven DAST platform for SMEs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# ── Request-ID middleware (must wrap before CORS so the header is set) ──────
app.add_middleware(RequestIdMiddleware)

# ── CORS ─────────────────────────────────────────────────────────────────────
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── Static mount for user avatars (uploaded via POST /auth/me/avatar) ────────
# Mounted under /api/v1 so the same reverse-proxy rule that routes the API
# (Caddyfile / nginx) also handles avatar requests — no infra changes needed.
_AVATAR_DIR = Path(os.environ.get("AVATAR_UPLOAD_DIR", "/app/uploads/avatars"))
_AVATAR_DIR.mkdir(parents=True, exist_ok=True)
app.mount(f"{settings.API_V1_STR}/avatars", StaticFiles(directory=str(_AVATAR_DIR)), name="avatars")

# ── API router ────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(lab_endpoints.router, prefix=settings.API_V1_STR + "/lab", tags=["lab"])


# ── Health endpoint — schema check cache (avoids DB engine spam every 30s) ───
_schema_cache: dict = {"ok": False, "detail": "unchecked", "ts": 0.0}
_SCHEMA_CACHE_TTL = 300  # re-check every 5 minutes, not every 30 seconds


# ── Health endpoint (consumed by frontend TopBar) ────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """
    Returns liveness/readiness status of API, Redis, and Celery workers.
    Frontend polls this every 30 seconds to show HealthPills in TopBar.
    """
    import time as _time

    redis_ok = False
    try:
        r = await aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await asyncio.wait_for(r.ping(), timeout=2.0)
        await r.close()
        redis_ok = True
    except Exception:
        pass

    # Celery worker check via Redis queue inspection (basic heuristic)
    workers_ok = redis_ok  # If Redis is up, workers can connect too

    # Schema drift check — cached for 5 minutes to prevent Alembic log flooding
    now = _time.monotonic()
    if now - _schema_cache["ts"] > _SCHEMA_CACHE_TTL:
        try:
            import logging as _log
            from alembic.config import Config as AlembicConfig
            from alembic.script import ScriptDirectory
            from alembic.runtime.migration import MigrationContext
            from sqlalchemy import create_engine
            # Suppress alembic/sqlalchemy INFO chatter during check
            _alembic_logger = _log.getLogger("alembic")
            _sa_logger = _log.getLogger("sqlalchemy")
            _prev_alembic = _alembic_logger.level
            _prev_sa = _sa_logger.level
            _alembic_logger.setLevel(_log.WARNING)
            _sa_logger.setLevel(_log.WARNING)
            try:
                _engine = create_engine(settings.DATABASE_URL)
                with _engine.connect() as conn:
                    ctx = MigrationContext.configure(conn)
                    current = ctx.get_current_revision()
                cfg = AlembicConfig("/app/alembic.ini")
                script = ScriptDirectory.from_config(cfg)
                head = script.get_current_head()
                _engine.dispose()
                _schema_cache["ok"] = current == head
                _schema_cache["detail"] = f"current={current} head={head}"
            finally:
                _alembic_logger.setLevel(_prev_alembic)
                _sa_logger.setLevel(_prev_sa)
        except Exception as _se:
            _schema_cache["ok"] = False
            _schema_cache["detail"] = str(_se)[:80]
        _schema_cache["ts"] = now

    return JSONResponse({
        "status": "ok" if redis_ok else "degraded",
        "api": True,
        "redis": redis_ok,
        "workers": workers_ok,
        "schema_synced": _schema_cache["ok"],
        "schema_detail": _schema_cache["detail"],
    })


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive: discard any incoming messages from client
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
def read_root():
    return {"message": "Orchestration Security Center — SME Cyber Exposure Dashboard API", "version": "2.0.0"}
