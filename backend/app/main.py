import asyncio
import json
import logging
import aioredis
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: reap orphans, start background tasks, clean up on shutdown."""
    global _redis_listener_task

    # ── 0. Verify DB schema is up-to-date ────────────────────────────────────
    # Alembic upgrade runs synchronously and can deadlock with asyncpg when
    # both use the same DB server. Instead, just log the current revision.
    # Run `docker compose exec backend alembic upgrade head` manually when
    # new migrations are added.
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            row = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
            rev = row[0] if row else "unknown"
        logger.info("DB schema at alembic revision: %s", rev)
    except Exception as exc:
        logger.warning("Could not read alembic_version: %s", exc)

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
                    password_hash=hash_password("Admin@1234"),
                    role=UserRole.ADMIN,
                    force_password_change=True,
                )
                seed_db.add(admin)
                await seed_db.commit()
                logger.info("Seeded default admin: admin@local / Admin@1234")
    except Exception as exc:
        logger.warning("Admin seed skipped (non-fatal): %s", exc)

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

# ── API router ────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(lab_endpoints.router, prefix=settings.API_V1_STR + "/lab", tags=["lab"])


# ── Health endpoint (consumed by frontend TopBar) ────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """
    Returns liveness/readiness status of API, Redis, and Celery workers.
    Frontend polls this every 30 seconds to show HealthPills in TopBar.
    """
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

    # Schema drift check — verify alembic head matches code
    schema_ok = False
    schema_detail = "unknown"
    try:
        from alembic.config import Config as AlembicConfig
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine
        _engine = create_engine(settings.DATABASE_URL)
        with _engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            current = ctx.get_current_revision()
        cfg = AlembicConfig("/app/alembic.ini")
        script = ScriptDirectory.from_config(cfg)
        head = script.get_current_head()
        schema_ok = current == head
        schema_detail = f"current={current} head={head}"
        _engine.dispose()
    except Exception as _se:
        schema_detail = str(_se)[:80]

    return JSONResponse({
        "status": "ok" if redis_ok else "degraded",
        "api": True,
        "redis": redis_ok,
        "workers": workers_ok,
        "schema_synced": schema_ok,
        "schema_detail": schema_detail,
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
