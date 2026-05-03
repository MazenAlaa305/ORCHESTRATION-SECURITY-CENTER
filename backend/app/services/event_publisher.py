import json
import asyncio
import logging
import aioredis

from app.core.config import settings  # single source of truth for REDIS_URL

logger = logging.getLogger(__name__)

WS_EVENT_CHANNEL = "ws_events"
_PUBLISH_TIMEOUT = 5.0  # seconds before we give up on a stale Redis connection


class EventPublisher:
    """
    Bridges Celery workers → WebSocket clients via Redis Pub/Sub.

    Usage (from FastAPI routes):
        await publisher.publish("RISK_UPDATE", {"scan_id": ..., "overall_score": ...})

    Usage (from Celery tasks — avoids event loop conflicts):
        publisher.publish_sync("SCAN_PROGRESS", {...})
    """

    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        """Lazy-initialise Redis connection; reconnect if the previous one closed."""
        if self._redis is None or self._redis.connection is None:
            self._redis = await aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=3,
                socket_connect_timeout=3,
            )
        return self._redis

    async def publish(self, event_type: str, payload: dict) -> None:
        """
        Async publish — safe from FastAPI / async contexts only.

        If Redis is unavailable the error is logged as a warning — it must
        never raise so callers don't need try/except boilerplate.
        """
        try:
            redis = await self._get_redis()
            message = json.dumps({"type": event_type, "payload": payload})
            await asyncio.wait_for(
                redis.publish(WS_EVENT_CHANNEL, message),
                timeout=_PUBLISH_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.warning("EventPublisher: Redis publish timed out for event '%s'", event_type)
            self._redis = None  # force reconnect on next call
        except Exception as exc:
            logger.warning("EventPublisher: Failed to publish '%s': %s", event_type, exc)
            self._redis = None  # force reconnect on next call

    def publish_sync(self, event_type: str, payload: dict) -> None:
        """
        Synchronous Redis publish — MUST be used from Celery tasks.

        Celery workers cannot use the async publisher safely because each
        _run_async() call creates a fresh event loop, which invalidates any
        cached async Redis connection from a previous call, causing silent
        publish failures (Orchestration Log shows 0 events).

        This method uses the synchronous redis-py client which has no event
        loop dependency, guaranteeing reliable delivery from workers.
        """
        try:
            import redis as _redis_sync
            r = _redis_sync.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=3,
                socket_timeout=3,
                decode_responses=True,
            )
            message = json.dumps({"type": event_type, "payload": payload})
            r.publish(WS_EVENT_CHANNEL, message)
            r.close()
            logger.debug("EventPublisher.publish_sync: sent '%s'", event_type)
        except Exception as exc:
            logger.warning("EventPublisher.publish_sync: failed for '%s': %s", event_type, exc)


# Singleton used across the entire application
publisher = EventPublisher()
