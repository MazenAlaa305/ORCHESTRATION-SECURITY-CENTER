# config.py — Documentation

## File Purpose

Defines the **centralized application settings** using Pydantic's `BaseSettings`. All configuration values consumed throughout the backend (database URL, Redis URL, API keys, tool hostnames, CORS origins) are declared here with sensible defaults for local development. Environment variables and `.env` files override these defaults at runtime.

## Key Classes

### `Settings(BaseSettings)`

The single configuration class for the entire application. It inherits from `pydantic_settings.BaseSettings`, which enables automatic resolution of values from:
1. Environment variables (highest priority)
2. The `.env` file (via `model_config`)
3. Default values declared in the class body (lowest priority)

**Declared Attributes:**

| Attribute | Type | Default | Purpose |
|---|---|---|---|
| `PROJECT_NAME` | `str` | `"SME Cyber Exposure Dashboard"` | FastAPI app title and banner text |
| `API_V1_STR` | `str` | `"/api/v1"` | API route prefix, used in `main.py` to mount the router |
| `DATABASE_URL` | `str` | `"sqlite:///./test.db"` | SQLAlchemy synchronous database connection string |
| `REDIS_URL` | `str` | `"redis://localhost:6379/0"` | Redis connection string for Celery broker and result backend |
| `NMAP_PATH` | `str` | `"nmap"` | Filesystem path to the Nmap binary |
| `OPENVAS_HOST` | `str` | `"localhost"` | Hostname of the OpenVAS GVM service |
| `OPENVAS_PORT` | `int` | `9390` | GMP protocol port for OpenVAS |
| `OPENVAS_USER` / `OPENVAS_PASSWORD` | `str` | `"admin"` | OpenVAS authentication credentials |
| `GEMINI_API_KEY` | `str` | `""` | Google Gemini API key — empty string disables LLM features |
| `ELASTICSEARCH_URL` | `str` | `"http://localhost:9200"` | Elasticsearch SIEM endpoint |
| `WAZUH_API_URL` | `str` | `"https://localhost:55000"` | Wazuh REST API base URL |
| `WAZUH_API_USER` / `WAZUH_API_PASSWORD` | `str` | `"wazuh"` | Wazuh API authentication credentials |
| `N8N_WEBHOOK_URL` | `str` | `"http://localhost:5678/webhook/"` | Base URL for n8n SOAR webhook triggers |
| `BACKEND_CORS_ORIGINS` | `List[str]` | `["http://localhost:5173", "http://localhost:3000"]` | Allowed CORS origins |

**Computed Property:**

`ASYNC_DATABASE_URL` — A `@property` that derives the async-compatible database URL from `DATABASE_URL`. For PostgreSQL, it replaces the `postgresql://` scheme with `postgresql+asyncpg://`. For SQLite, it replaces `sqlite://` with `sqlite+aiosqlite://`. This is used by the async SQLAlchemy engine in `database.py`.

**`model_config`**:  
Configures the settings loader to be case-sensitive, to read from a `.env` file in the working directory, and to ignore extra environment variables that don't match any declared attribute.

### Module-Level Instance

`settings = Settings()` — A single singleton instance instantiated at module import time. All other modules import this instance directly (e.g., `from app.core.config import settings`).

## Dependencies

### External
- `pydantic_settings.BaseSettings`, `SettingsConfigDict` — Settings management with environment variable support
- `typing.List` — Standard library type hint
