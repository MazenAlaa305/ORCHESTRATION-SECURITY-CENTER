"""
Tests for app/core/crypto.py — Fernet credential encryption/decryption.
"""
import os
import json
import pytest
from cryptography.fernet import Fernet


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fresh_fernet_key() -> str:
    return Fernet.generate_key().decode()


# ── encrypt_json / decrypt_json with a real key ───────────────────────────────

class TestCryptoWithKey:
    @pytest.fixture(autouse=True)
    def patch_key(self, monkeypatch):
        """Give every test in this class a fresh valid key."""
        import app.core.crypto as crypto_mod
        monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", _fresh_fernet_key())
        # Reset cached _fernet so it picks up the new key
        crypto_mod._fernet = None
        yield
        crypto_mod._fernet = None

    def test_encrypt_returns_string(self):
        from app.core.crypto import encrypt_json
        result = encrypt_json({"password": "secret"})
        assert isinstance(result, str)
        assert result != json.dumps({"password": "secret"})

    def test_round_trip_simple_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        data = {"username": "admin", "password": "s3cr3t"}
        assert decrypt_json(encrypt_json(data)) == data

    def test_round_trip_nested_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        data = {"token": "abc", "meta": {"env": "prod", "version": 2}}
        assert decrypt_json(encrypt_json(data)) == data

    def test_encrypt_none_returns_none(self):
        from app.core.crypto import encrypt_json
        assert encrypt_json(None) is None

    def test_decrypt_none_returns_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json(None) is None

    def test_ciphertext_differs_each_call(self):
        from app.core.crypto import encrypt_json
        # Fernet adds random IV — same plaintext → different ciphertext
        c1 = encrypt_json({"key": "val"})
        c2 = encrypt_json({"key": "val"})
        assert c1 != c2

    def test_empty_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        assert decrypt_json(encrypt_json({})) == {}

    def test_decrypt_garbage_returns_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json("not-valid-fernet-token") is None


# ── No-key (SKIP_SECRET_VALIDATION) plaintext fallback ───────────────────────

class TestCryptoPlaintextFallback:
    @pytest.fixture(autouse=True)
    def plaintext_mode(self, monkeypatch):
        import app.core.crypto as crypto_mod
        monkeypatch.delenv("CREDENTIAL_ENCRYPTION_KEY", raising=False)
        monkeypatch.setenv("SKIP_SECRET_VALIDATION", "1")
        # Patch settings directly
        from app.core.config import settings
        monkeypatch.setattr(settings, "CREDENTIAL_ENCRYPTION_KEY", None)
        crypto_mod._fernet = None
        yield
        crypto_mod._fernet = None

    def test_encrypt_returns_plain_json(self):
        from app.core.crypto import encrypt_json
        result = encrypt_json({"user": "x"})
        # Should be parseable JSON (plaintext fallback)
        parsed = json.loads(result)
        assert parsed == {"user": "x"}

    def test_decrypt_plain_json_string(self):
        from app.core.crypto import decrypt_json
        raw = json.dumps({"user": "x"})
        assert decrypt_json(raw) == {"user": "x"}

    def test_decrypt_none_is_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json(None) is None
