"""re-encrypt plaintext auth_credentials rows with Fernet

IMPORTANT: Back up the database before running this migration.
Any row whose auth_credentials is valid JSON (not already a Fernet blob)
will be encrypted in-place. Rows that are already encrypted (Fernet tokens
start with 'gAAAAAB') are skipped. NULL rows are left as NULL.

Revision ID: g1h2i3j4k5l6
Revises: dd4ba7db7daa
Create Date: 2026-04-16

"""
from alembic import op
from sqlalchemy import text
import json
import logging

revision = 'g1h2i3j4k5l6'
down_revision = 'dd4ba7db7daa'
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)


def upgrade() -> None:
    # Import here so the module is not loaded at Alembic discovery time
    # (settings require env vars that may not be set during discovery).
    try:
        from app.core.crypto import encrypt_json
    except Exception as exc:
        raise RuntimeError(
            "Cannot import app.core.crypto — ensure CREDENTIAL_ENCRYPTION_KEY "
            "is set in the environment before running this migration."
        ) from exc

    conn = op.get_bind()
    rows = conn.execute(
        text("SELECT id, auth_credentials FROM targets WHERE auth_credentials IS NOT NULL")
    ).fetchall()

    re_encrypted = 0
    skipped_already_encrypted = 0
    skipped_not_json = 0

    for row in rows:
        val = row.auth_credentials
        if not val:
            continue

        # Fernet tokens always start with 'gAAAAAB' — already encrypted, skip
        if isinstance(val, str) and val.startswith("gAAAAAB"):
            skipped_already_encrypted += 1
            continue

        # Attempt to parse as JSON dict
        try:
            if isinstance(val, dict):
                parsed = val
            else:
                parsed = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                "Target %s: auth_credentials is not JSON — skipping (manual review needed)",
                row.id,
            )
            skipped_not_json += 1
            continue

        try:
            encrypted = encrypt_json(parsed)
            conn.execute(
                text("UPDATE targets SET auth_credentials = :enc WHERE id = :id"),
                {"enc": encrypted, "id": row.id},
            )
            re_encrypted += 1
        except Exception as exc:
            logger.error("Target %s: encryption failed — %s", row.id, exc)
            # Do not raise — continue with remaining rows
            skipped_not_json += 1

    logger.info(
        "auth_credentials re-encryption: %d encrypted, %d already encrypted (skipped), "
        "%d could not be processed",
        re_encrypted, skipped_already_encrypted, skipped_not_json,
    )


def downgrade() -> None:
    # Decryption-in-place is intentionally not implemented.
    # Re-encryption is a one-way security upgrade; reversing it would expose
    # credentials in plaintext again.
    logger.warning(
        "Downgrade of g1h2i3j4k5l6 is a no-op — auth_credentials remain encrypted. "
        "Restore from a pre-migration backup if plaintext is required."
    )
