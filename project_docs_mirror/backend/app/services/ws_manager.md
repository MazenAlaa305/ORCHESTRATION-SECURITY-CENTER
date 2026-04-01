# ws_manager.py — Documentation

## File Purpose

Implements a **WebSocket connection manager** that maintains a registry of all active WebSocket clients and provides a method to broadcast messages to all of them simultaneously. This enables real-time streaming of AI agent logs and scan progress updates to the React dashboard without polling.

## Key Classes

### `ConnectionManager`

**`__init__()`**
Initializes an empty list `self.active_connections: List[WebSocket]` to track all live WebSocket connections.

**`connect(websocket: WebSocket)` — async**
Accepts and registers a new WebSocket connection. Calls `await websocket.accept()` to complete the WebSocket handshake, then appends the WebSocket object to `active_connections`.

**`disconnect(websocket: WebSocket)`**
Removes a WebSocket object from the `active_connections` list when a client disconnects or an exception is thrown. Called from the `except` block in `main.py`'s `websocket_endpoint`.

**`broadcast(message: str)` — async**
Iterates through all `active_connections` and sends the given text message to each via `await websocket.send_text(message)`. This is called by `BaseAgent.log_action()` every time any agent performs an action, streaming live updates to all connected dashboard tabs.

### Module-Level Instance

`manager = ConnectionManager()` — A singleton instance created at module import. Imported directly by `main.py` for the WebSocket endpoint and by `agent_orchestrator.py` for broadcasting.

## Interaction Flow

```
Agent action occurs
    ↓
BaseAgent.log_action() calls manager.broadcast("[RECON_AGENT] start_recon")
    ↓
ConnectionManager.broadcast() iterates active_connections
    ↓
Each connected React dashboard tab receives the message via WebSocket
    ↓
LiveConsole.jsx displays the message in the real-time log panel
```

## Dependencies

### External
- `fastapi.WebSocket` — WebSocket type from FastAPI
- `typing.List` — Type hint
