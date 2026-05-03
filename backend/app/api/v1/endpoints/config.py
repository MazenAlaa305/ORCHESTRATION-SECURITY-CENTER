"""
Runtime configuration endpoints.

Public:
  GET  /config/public    → feature-flag map (no auth)
  GET  /config/health    → live integration health checks

Admin only:
  GET  /config/all       → every flag with metadata
  PUT  /config/{key}     → toggle a flag and persist it

Flags are env-var-sourced defaults that can be overridden at runtime through
the runtime_config table (Phase B). Writes update both the DB row and the
in-memory settings object so the change takes effect without a restart.
"""
import asyncio
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.config import RUNTIME_FLAGS, _coerce, load_runtime_overrides, settings
from app.core.database import get_db
from app.models.config import RuntimeConfig
from app.models.user import User, UserRole

router = APIRouter()
logger = logging.getLogger(__name__)


class ConfigUpdate(BaseModel):
    value: str | bool | int


@router.get("/public")
def get_public_config():
    """Feature-flag map consumed by the frontend on app load."""
    return {
        "siem_enabled": settings.SIEM_ENABLED,
        "openvas_enabled": settings.OPENVAS_ENABLED,
        "llm_validation_enabled": settings.LLM_VALIDATION_ENABLED,
        "nmap_enabled": settings.NMAP_ENABLED,
        "nuclei_enabled": settings.NUCLEI_ENABLED,
        "lab_enabled": settings.LAB_ENABLED,
        "lab_traffic_intensity": settings.LAB_TRAFFIC_INTENSITY,
        "version": settings.APP_VERSION,
    }


@router.get("/all", dependencies=[Depends(require_role(UserRole.ADMIN))])
def get_all_config(db: Session = Depends(get_db)):
    """Admin view: current effective value + env default for every managed flag."""
    overrides = {row.key: row.value for row in db.query(RuntimeConfig).all()}
    items = []
    for key, target_type in RUNTIME_FLAGS.items():
        items.append({
            "key": key,
            "value": getattr(settings, key, None),
            "type": target_type.__name__,
            "overridden": key in overrides,
            "override_value": overrides.get(key),
        })
    return {"flags": items}


@router.put("/{key}", dependencies=[Depends(require_role(UserRole.ADMIN))])
def update_config(
    key: str,
    body: ConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Persist a runtime override and update the live settings object."""
    if key not in RUNTIME_FLAGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown config key '{key}'. Allowed: {list(RUNTIME_FLAGS)}",
        )

    target_type = RUNTIME_FLAGS[key]
    coerced = _coerce(str(body.value), target_type)

    row = db.query(RuntimeConfig).filter(RuntimeConfig.key == key).first()
    if row is None:
        row = RuntimeConfig(key=key, value=str(body.value), updated_by=current_user.id)
        db.add(row)
    else:
        row.value = str(body.value)
        row.updated_by = current_user.id
    db.commit()

    setattr(settings, key, coerced)
    load_runtime_overrides(db)

    return {"key": key, "value": getattr(settings, key)}


@router.get("/health")
async def get_integration_health():
    """
    Ping every integration and report reachable/unreachable/disabled.
    Safe for any authenticated caller — returns booleans, not secrets.
    """
    results: dict[str, dict] = {}

    async def check_http(name: str, url: str, enabled: bool):
        if not enabled:
            results[name] = {"status": "disabled", "detail": "Flag is OFF"}
            return
        try:
            async with httpx.AsyncClient(timeout=3.0, verify=False) as client:
                r = await client.get(url)
            results[name] = {"status": "connected", "detail": f"HTTP {r.status_code}"}
        except Exception as exc:
            results[name] = {"status": "unreachable", "detail": str(exc)[:120]}

    tasks = [
        check_http("elasticsearch", f"{settings.ELASTICSEARCH_URL}/", settings.SIEM_ENABLED),
        check_http("wazuh", f"{settings.WAZUH_API_URL}/", settings.SIEM_ENABLED),
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

    # If SIEM is disabled, override any lingering values to show correct status
    if not settings.SIEM_ENABLED:
        results["elasticsearch"] = {"status": "disabled", "detail": "SIEM_ENABLED=false (Lite Mode)"}
        results["wazuh"] = {"status": "disabled", "detail": "SIEM_ENABLED=false (Lite Mode)"}

    # Redis
    try:
        import aioredis
        r = await aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await asyncio.wait_for(r.ping(), timeout=2.0)
        await r.close()
        results["redis"] = {"status": "connected", "detail": "PING OK"}
    except Exception as exc:
        results["redis"] = {"status": "unreachable", "detail": str(exc)[:120]}

    # Postgres
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        results["postgres"] = {"status": "connected", "detail": "SELECT 1 OK"}
    except Exception as exc:
        results["postgres"] = {"status": "unreachable", "detail": str(exc)[:120]}

    # OpenVAS (TCP only — GMP auth is expensive)
    if not settings.OPENVAS_ENABLED:
        results["openvas"] = {"status": "disabled", "detail": "Flag is OFF"}
    else:
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(settings.OPENVAS_HOST, settings.OPENVAS_PORT),
                timeout=3.0,
            )
            writer.close()
            await writer.wait_closed()
            results["openvas"] = {"status": "connected", "detail": f"TCP {settings.OPENVAS_HOST}:{settings.OPENVAS_PORT} OK"}
        except ConnectionRefusedError:
            # Port exists but process not yet listening — container is still
            # restoring the GVM database (pg_restore). This is normal on first
            # start and resolves automatically after a few minutes.
            results["openvas"] = {"status": "starting", "detail": "GVM initialising — database restore in progress"}
        except Exception as exc:
            results["openvas"] = {"status": "unreachable", "detail": str(exc)[:120]}

    results["gemini"] = {
        "status": "configured" if settings.GEMINI_API_KEY else "not_configured",
        "detail": "API key present" if settings.GEMINI_API_KEY else "GEMINI_API_KEY not set",
    }

    return {"integrations": results}
