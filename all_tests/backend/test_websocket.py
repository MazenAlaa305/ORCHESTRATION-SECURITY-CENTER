"""
Verify that the ConnectionManager broadcast envelope is well-formed.

We do NOT test the live /ws/logs endpoint here because the lifespan that
wires Redis would need a real broker. Instead we test the manager directly
— that's where defect W-001 lived.
"""
import asyncio
import json
from unittest.mock import AsyncMock

from app.services.ws_manager import ConnectionManager


def test_broadcast_event_envelope_shape():
    mgr = ConnectionManager()
    fake_ws = AsyncMock()
    mgr.active_connections.append(fake_ws)

    asyncio.run(mgr.broadcast_event("RISK_UPDATE", {"asset": "host-1", "score": 87}))

    fake_ws.send_text.assert_called_once()
    sent = json.loads(fake_ws.send_text.call_args[0][0])
    assert sent["type"] == "RISK_UPDATE"
    assert sent["payload"] == {"asset": "host-1", "score": 87}
    assert isinstance(sent["seq"], int) and sent["seq"] > 0
    assert isinstance(sent["ts"], int) and sent["ts"] > 0


def test_broadcast_event_seq_is_monotonic():
    mgr = ConnectionManager()
    fake_ws = AsyncMock()
    mgr.active_connections.append(fake_ws)

    asyncio.run(mgr.broadcast_event("A", {}))
    asyncio.run(mgr.broadcast_event("B", {}))
    asyncio.run(mgr.broadcast_event("C", {}))

    seqs = [json.loads(c.args[0])["seq"] for c in fake_ws.send_text.call_args_list]
    assert seqs == sorted(seqs)
    assert len(set(seqs)) == 3


def test_broadcast_event_prunes_dead_clients():
    mgr = ConnectionManager()
    alive = AsyncMock()
    dead = AsyncMock()
    dead.send_text.side_effect = RuntimeError("client gone")
    mgr.active_connections.extend([alive, dead])

    asyncio.run(mgr.broadcast_event("PING", {"x": 1}))

    assert alive in mgr.active_connections
    assert dead not in mgr.active_connections
