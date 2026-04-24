"""
Dump the OpenAPI spec for the FastAPI app without requiring DB/Redis to be reachable.

Run inside the python:3.10-slim container built from the backend Dockerfile,
or any environment with the backend's Python deps installed.

Writes: docs/contracts/openapi_2026-04-24.json
"""
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ASYNC_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "dev-openapi-dump-only")
os.environ.setdefault("BACKEND_CORS_ORIGINS", '["http://localhost:5173"]')

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.main import app

spec = app.openapi()
out = Path(__file__).resolve().parents[2] / "docs" / "contracts" / "openapi_2026-04-24.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(spec, indent=2, sort_keys=False))

print(f"Wrote {out} ({len(spec.get('paths', {}))} paths, {len(spec.get('components', {}).get('schemas', {}))} schemas)")
