"""
Standalone verification for Phase 2 fixes — exercises the fixed code paths
without requiring the full FastAPI dependency tree or Redis.

Run:  python evidence/phase2/verify_fixes.py
"""
import asyncio
import json
import logging
import sys
import os
from pathlib import Path

# Put backend/ on sys.path so `app.*` imports resolve
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))


# ── Test W-001: broadcast_event exists and emits correct envelope ───────────
async def test_broadcast_event():
    from app.services.ws_manager import ConnectionManager

    class FakeWS:
        def __init__(self):
            self.sent = []
        async def send_text(self, msg):
            self.sent.append(msg)

    mgr = ConnectionManager()
    ws1, ws2 = FakeWS(), FakeWS()
    mgr.active_connections.extend([ws1, ws2])  # bypass accept()

    assert hasattr(mgr, "broadcast_event"), "ConnectionManager is missing broadcast_event"

    await mgr.broadcast_event("RISK_UPDATE", {"scan_id": "abc", "overall_score": 42.0})
    await mgr.broadcast_event("SCAN_STATUS", {"status": "completed"})

    for ws in (ws1, ws2):
        assert len(ws.sent) == 2, f"expected 2 messages, got {len(ws.sent)}"
        env1 = json.loads(ws.sent[0])
        assert env1["type"] == "RISK_UPDATE"
        assert env1["payload"]["overall_score"] == 42.0
        assert env1["seq"] == 1
        assert isinstance(env1["ts"], int)
        env2 = json.loads(ws.sent[1])
        assert env2["seq"] == 2
    print("[PASS] W-001 broadcast_event delivers envelope to every client")


async def test_broadcast_event_handles_dead_client():
    from app.services.ws_manager import ConnectionManager

    class DeadWS:
        async def send_text(self, msg):
            raise ConnectionResetError("peer gone")
    class LiveWS:
        def __init__(self): self.sent = []
        async def send_text(self, msg): self.sent.append(msg)

    mgr = ConnectionManager()
    dead, live = DeadWS(), LiveWS()
    mgr.active_connections.extend([dead, live])

    await mgr.broadcast_event("LOG_STREAM", {"message": "hello"})
    assert len(live.sent) == 1, "live client should still receive"
    assert dead not in mgr.active_connections, "dead client should be pruned"
    print("[PASS] W-001 broadcast_event prunes dead clients, keeps delivering to live ones")


# ── Test M-004: request-id middleware attaches id + logs inherit it ─────────
def test_request_id_context_var():
    from app.core.request_id import _request_id_ctx, current_request_id, RequestIdFilter

    assert current_request_id() == "-", "default should be '-'"
    token = _request_id_ctx.set("abc123")
    try:
        assert current_request_id() == "abc123"

        rec = logging.LogRecord("t", logging.INFO, "x", 1, "msg", None, None)
        RequestIdFilter().filter(rec)
        assert rec.request_id == "abc123", f"expected abc123, got {rec.request_id}"
    finally:
        _request_id_ctx.reset(token)

    print("[PASS] M-004 RequestIdFilter injects request_id onto LogRecord")


async def test_request_id_middleware_sets_header():
    # Minimal ASGI harness — we avoid importing FastAPI by using Starlette directly
    try:
        from starlette.applications import Starlette
        from starlette.responses import PlainTextResponse
        from starlette.routing import Route
        from starlette.testclient import TestClient
    except ImportError:
        print("[SKIP] M-004 middleware end-to-end: starlette.testclient not available")
        return

    from app.core.request_id import RequestIdMiddleware, current_request_id

    def hello(request):
        return PlainTextResponse(f"rid={current_request_id()}")

    app = Starlette(routes=[Route("/", hello)])
    app.add_middleware(RequestIdMiddleware)

    client = TestClient(app)

    # Auto-generated id
    r1 = client.get("/")
    assert "X-Request-ID" in r1.headers, "response missing X-Request-ID"
    rid1 = r1.headers["X-Request-ID"]
    assert len(rid1) == 32, f"expected 32-char hex id, got {rid1!r}"
    assert f"rid={rid1}" == r1.text

    # Client-supplied id is preserved
    r2 = client.get("/", headers={"X-Request-ID": "client-supplied-id"})
    assert r2.headers["X-Request-ID"] == "client-supplied-id"
    assert r2.text == "rid=client-supplied-id"

    print("[PASS] M-004 middleware generates + preserves X-Request-ID and populates context")


# ── Orchestrator ────────────────────────────────────────────────────────────
async def amain():
    await test_broadcast_event()
    await test_broadcast_event_handles_dead_client()
    test_request_id_context_var()
    await test_request_id_middleware_sets_header()
    print("\nAll Phase 2 verification checks passed.")


if __name__ == "__main__":
    asyncio.run(amain())
