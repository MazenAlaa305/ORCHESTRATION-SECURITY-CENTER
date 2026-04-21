from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List
import os
class Settings(BaseSettings):
    PROJECT_NAME: str = "SME Cyber Exposure Dashboard"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./test.db"
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("sqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url
    
    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security Tools
    NMAP_PATH: str = "nmap"
    OPENVAS_HOST: str = "localhost"
    OPENVAS_PORT: int = 9390
    OPENVAS_USER: str = "admin"
    OPENVAS_PASSWORD: str = "admin"
    
    # AI
    GEMINI_API_KEY: str = ""
    
    # SIEM
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    WAZUH_API_URL: str = "https://localhost:55000"
    WAZUH_API_USER: str = "wazuh"
    WAZUH_API_PASSWORD: str = "wazuh"
    # Living Lab
    LAB_ENABLED: bool = True
    LAB_COMPOSE_FILE: str = "docker-compose.lab.yml"
    LAB_NETWORK_NAME: str = "the-dashboard-project-_lab_network"
    LAB_DNS_SUFFIX: str = "sme-lab.local"
    LAB_TRAFFIC_INTENSITY: str = "medium"  # low, medium, high
    LAB_ELASTICSEARCH_INDEX: str = "sme-lab-events-*"
    LAB_WAZUH_ALERT_INDEX: str = "wazuh-alerts-*"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "https://localhost"]

    # ── Phase 3.1: JWT authentication ────────────────────────────────────────
    # JWT_SECRET must be set in the environment — the app will fail to boot if
    # it is left empty. Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET: str = ""
    JWT_EXPIRE_HOURS: int = 8

    # ── Phase 3.2: Credential encryption ─────────────────────────────────────
    # CREDENTIAL_ENCRYPTION_KEY must be set in the environment.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    CREDENTIAL_ENCRYPTION_KEY: str = ""

    # ── Phase 3.3: LLM safety controls ───────────────────────────────────────
    # LLM_PROVIDER: "gemini" | "none"  (none = disable all LLM calls)
    LLM_PROVIDER: str = "gemini"
    # Daily token budget across all scans (Redis-backed counter)
    LLM_DAILY_TOKEN_BUDGET: int = 500_000
    # Per-scan token cap — circuit-breaker trips when exceeded
    LLM_PER_SCAN_TOKEN_BUDGET: int = 50_000

    # ── Feature flags ────────────────────────────────────────────────────────
    # All integrations are OFF by default. Set to true in .env only when the
    # backing service is reachable and tested. This prevents the UI from
    # silently showing fake / empty data when a service is unavailable.
    SIEM_ENABLED: bool = False
    OPENVAS_ENABLED: bool = False
    LLM_VALIDATION_ENABLED: bool = False  # LLM verdict never overrides reprobe
    NMAP_ENABLED: bool = True
    NUCLEI_ENABLED: bool = True

    # Version string exposed by GET /api/v1/config/public
    APP_VERSION: str = "0.2.0-hardening"

    # Phase 5.2: Auditability / Tamper Evidence
    REPORT_SIGNING_KEY: str = os.getenv("REPORT_SIGNING_KEY", "change-this-in-production")

    @model_validator(mode="after")
    def _require_secrets(self) -> "Settings":
        """
        Fail fast when security-critical secrets are missing.
        This prevents the app from booting in a configuration that is
        silently insecure (e.g., tokens signed with an empty key).

        To bypass in CI/unit-test environments, set the env var
        SKIP_SECRET_VALIDATION=1 before importing the settings module.
        """
        import os
        if os.getenv("SKIP_SECRET_VALIDATION") == "1":
            return self

        if not self.JWT_SECRET:
            raise ValueError(
                "\n\nJWT_SECRET is not set.\n"
                "The application cannot start without a signing key — "
                "tokens would be signed with an empty string, which is trivially forgeable.\n"
                "Generate a key with:\n"
                "  python -c \"import secrets; print(secrets.token_hex(32))\"\n"
                "Then add JWT_SECRET=<value> to your .env file."
            )

        if not self.CREDENTIAL_ENCRYPTION_KEY:
            raise ValueError(
                "\n\nCREDENTIAL_ENCRYPTION_KEY is not set.\n"
                "Target authentication credentials would be stored in plaintext.\n"
                "Generate a key with:\n"
                "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"\n"
                "Then add CREDENTIAL_ENCRYPTION_KEY=<value> to your .env file."
            )

        return self

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()


# ── Phase B: runtime config overrides ──────────────────────────────────────────
# Feature flags that can be toggled from the dashboard without a restart.
# The env-var-derived value is kept as the boot default; the DB overrides it
# at startup and after every PUT /config/{key}.

RUNTIME_FLAGS = {
    "SIEM_ENABLED": bool,
    "OPENVAS_ENABLED": bool,
    "LLM_VALIDATION_ENABLED": bool,
    "NMAP_ENABLED": bool,
    "NUCLEI_ENABLED": bool,
    "LAB_TRAFFIC_INTENSITY": str,
    "LLM_PER_SCAN_TOKEN_BUDGET": int,
    "LLM_DAILY_TOKEN_BUDGET": int,
}


def _coerce(value: str, target_type):
    if target_type is bool:
        return str(value).lower() in ("1", "true", "yes", "on")
    if target_type is int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0
    return value


def load_runtime_overrides(db_session) -> None:
    """
    Read every row of runtime_config and overwrite the matching `settings.*`
    attribute in place. Called on startup and after each PUT /config/{key}.
    Silently no-ops if the table does not exist yet (pre-migration).
    """
    try:
        from app.models.config import RuntimeConfig
        rows = db_session.query(RuntimeConfig).all()
    except Exception:
        return

    for row in rows:
        target_type = RUNTIME_FLAGS.get(row.key)
        if target_type is None:
            continue
        try:
            setattr(settings, row.key, _coerce(row.value, target_type))
        except Exception:
            continue
