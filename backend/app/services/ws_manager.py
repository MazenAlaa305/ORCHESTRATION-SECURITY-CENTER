import itertools
import json
import logging
import time
from typing import Any, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections for real-time event streaming.

    Events delivered to the browser have the envelope:
        {"type": <EVENT_TYPE>, "payload": <dict>, "seq": <monotonic>, "ts": <epoch-ms>}

    `seq` lets clients detect message gaps and resume via REST if needed
    (Phase 2.3 of the stabilization plan).
    """

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._seq = itertools.count(1)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket connected — total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected — total: %d", len(self.active_connections))

    async def broadcast(self, message: str) -> None:
        """Raw string broadcast (legacy callers). Prefer broadcast_event()."""
        disconnected: List[WebSocket] = []
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_event(self, event_type: str, payload: Any) -> None:
        """
        Structured event broadcast — the function the main.py Redis bridge
        is expected to call. Wraps the payload in the standard envelope and
        forwards to every connected client.

        Fixes defect W-001 (baseline_2026-04-24.md §2.5): previously missing,
        so every RISK_UPDATE / SCAN_* event was silently dropped.
        """
        envelope = {
            "type": event_type,
            "payload": payload,
            "seq": next(self._seq),
            "ts": int(time.time() * 1000),
        }
        await self.broadcast(json.dumps(envelope))


# Global manager instance
manager = ConnectionManager()
