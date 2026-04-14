"""
GET /api/v1/config/public

Public feature-flag map. No authentication required — this is metadata only,
not a secret. The frontend fetches this once on app load to decide which
panels to show vs. render as "not configured" empty states.

Phase 1.4 hardening: replaces dead panel rendering with honest empty states.
"""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/public")
def get_public_config():
    """
    Return the current integration feature-flag state and app version.

    This endpoint is intentionally unauthenticated — it exposes no sensitive
    data, only boolean flags and the version string.

    Response shape:
        {
            "siem_enabled": false,
            "soar_enabled": false,
            "openvas_enabled": false,
            "llm_validation_enabled": false,
            "version": "0.2.0-hardening"
        }
    """
    return {
        "siem_enabled": settings.SIEM_ENABLED,
        "soar_enabled": settings.SOAR_ENABLED,
        "openvas_enabled": settings.OPENVAS_ENABLED,
        "llm_validation_enabled": settings.LLM_VALIDATION_ENABLED,
        "version": settings.APP_VERSION,
    }
