"""
Celery task introspection helper.

Wraps `AsyncResult` into a JSON-friendly status payload consumed by the
frontend scan-progress UI.
"""
from __future__ import annotations

from celery.result import AsyncResult

from app.core.celery_app import celery_app


def get_task_status(task_id: str) -> dict:
    """
    Return a dict describing the current state of a Celery task.

    Shape:
        {
          "task_id": "<uuid>",
          "state":   "PENDING|STARTED|RETRY|SUCCESS|FAILURE",
          "ready":   bool,
          "successful": bool | None,
          "info":    dict | str | None,
        }
    """
    res = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "state": res.state,
        "ready": res.ready(),
        "successful": res.successful() if res.ready() else None,
        "info": _safe_info(res),
    }


def _safe_info(res: AsyncResult) -> dict | str | None:
    info = res.info
    if isinstance(info, Exception):
        return {"error": type(info).__name__, "message": str(info)}
    if info is None or isinstance(info, (dict, str, int, float, bool, list)):
        return info
    # Fall back to a string representation for unknown types so the response
    # remains JSON-serialisable.
    return str(info)
