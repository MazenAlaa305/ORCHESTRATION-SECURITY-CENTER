"""
Fernet symmetric encryption for Target.auth_credentials at rest.
Phase 3.2 — Orchestration Security Center Hardening Plan.

Usage:
    encrypted = encrypt_json({"password": "secret"})   # returns str
    plaintext = decrypt_json(encrypted)                 # returns dict | None

The CREDENTIAL_ENCRYPTION_KEY env var must be a valid Fernet key.
Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

When the key is absent or invalid the helpers log a warning and return
safe fallback values so the rest of the application can still boot.
"""
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_fernet = None


def _get_fernet():
    """Lazy-load Fernet using the configured key. Cached after first call."""
    global _fernet
    if _fernet is not None:
        return _fernet

    from app.core.config import settings
    key = settings.CREDENTIAL_ENCRYPTION_KEY
    if not key:
        import os
        if os.getenv("SKIP_SECRET_VALIDATION") == "1":
            # Test / CI mode: plaintext fallback is acceptable
            logger.warning(
                "CREDENTIAL_ENCRYPTION_KEY not set — "
                "using plaintext fallback (test/CI mode only)."
            )
            return None
        # Production: the model_validator in config.py should have prevented this.
        # If we reach here, something bypassed it. Raise explicitly.
        raise RuntimeError(
            "CREDENTIAL_ENCRYPTION_KEY is not set. "
            "This should have been caught at startup — check your settings."
        )

    try:
        from cryptography.fernet import Fernet
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
        return _fernet
    except Exception as exc:
        logger.error("Invalid CREDENTIAL_ENCRYPTION_KEY: %s", exc)
        return None


def encrypt_json(data: dict | None) -> str | None:
    """
    Serialize *data* to JSON and encrypt it.

    Returns:
        A URL-safe base64-encoded Fernet token (str), or None if data is None.
        If no key is configured, returns the raw JSON string as a fallback
        (with a logged warning).
    """
    if data is None:
        return None
    raw = json.dumps(data, separators=(",", ":")).encode()
    fernet = _get_fernet()
    if fernet is None:
        # Degrade gracefully — return plaintext JSON when key is absent
        return raw.decode()
    return fernet.encrypt(raw).decode()


def decrypt_json(token: str | None) -> dict | Any | None:
    """
    Decrypt a Fernet token and deserialise the JSON payload.

    Returns:
        The original dict, or None if *token* is None.
        Falls back to JSON-parsing the raw value when the key is absent
        (handles existing plaintext rows during migration).
    """
    if token is None:
        return None
    fernet = _get_fernet()
    if fernet is None:
        # No key — attempt plain JSON parse (backwards compat / dev mode)
        try:
            return json.loads(token)
        except Exception:
            return token
    try:
        raw = fernet.decrypt(token.encode() if isinstance(token, str) else token)
        return json.loads(raw)
    except Exception as exc:
        logger.error("Failed to decrypt auth_credentials: %s", exc)
        return None
