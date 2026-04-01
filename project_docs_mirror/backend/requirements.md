# requirements.txt — Documentation

## File Purpose

Declares all **Python package dependencies** for the backend application. Used by `pip install -r requirements.txt` during both local development setup and Docker image building. Each package listed is a direct dependency; pip resolves transitive dependencies automatically.

## Key Dependencies

### Web Framework
- **`fastapi`** — The async ASGI web framework powering all REST and WebSocket endpoints
- **`uvicorn[standard]`** — The ASGI server that runs the FastAPI application, including `websockets` for WebSocket support

### Database
- **`sqlalchemy`** — The ORM providing all database model definitions and query building
- **`alembic`** — Database migration management tool
- **`psycopg2-binary`** or **`asyncpg`** — PostgreSQL async driver for SQLAlchemy async engine
- **`aiosqlite`** — SQLite async driver for local development

### Configuration
- **`pydantic-settings`** — Pydantic-based settings management with `.env` file support

### Task Queue
- **`celery`** — Distributed task queue for async and scheduled scans
- **`redis`** — Python Redis client for Celery broker/backend connection

### AI / LLM
- **`google-generativeai`** — Google Gemini API SDK for LLM-powered validation and advisory

### HTTP Clients
- **`httpx`** — Async HTTP client used by agents for payload delivery and health checks
- **`requests`** — Synchronous HTTP client for legacy service integrations

### Security Tools
- **`python-gvm`** — Official Greenbone GVM/OpenVAS Python client library

### Browser Automation
- **`playwright`** — Headless browser automation library for JavaScript-rendered web crawling

### SIEM
- **`elasticsearch`** — Official Elasticsearch Python client

### Report Generation
- **`weasyprint`** or **`reportlab`** — PDF generation library for security reports
- **`jinja2`** — HTML templating engine for report sections

### Other Utilities
- **`python-multipart`** — Required by FastAPI for file upload support
- **`python-dotenv`** — `.env` file loading utility
