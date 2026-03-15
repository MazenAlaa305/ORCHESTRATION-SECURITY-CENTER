from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from app.services.elastic_integration import elastic_service

router = APIRouter()

@router.get("/alerts")
async def get_siem_alerts(index: str = "wazuh-alerts-*", size: int = 100):
    """
    Fetch recent security alerts from Elasticsearch.
    """
    try:
        alerts = await elastic_service.fetch_recent_alerts(index=index, size=size)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")

@router.get("/health")
async def get_siem_health():
    """
    Check connectivity to the SIEM (Elasticsearch).
    """
    is_alive = await elastic_service.check_health()
    if is_alive:
        return {"status": "connected", "engine": "Elasticsearch"}
    else:
        return {"status": "disconnected", "engine": "Elasticsearch"}
