"""
Tests for app/core/crypto.py — Fernet credential encryption/decryption.
"""
import allure
import os
import json
import pytest
from cryptography.fernet import Fernet


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fresh_fernet_key() -> str:
    return Fernet.generate_key().decode()


# ── encrypt_json / decrypt_json with a real key ───────────────────────────────

@allure.epic("Security")
@allure.feature("Credential Encryption")
@allure.story("Fernet Encryption with Key")
class TestCryptoWithKey:
    @pytest.fixture(autouse=True)
    def patch_key(self, monkeypatch):
        """Give every test in this class a fresh valid key."""
        import app.core.crypto as crypto_mod
        monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", _fresh_fernet_key())
        crypto_mod._fernet = None
        yield
        crypto_mod._fernet = None

    @allure.title("encrypt_json returns a non-plaintext string")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_encrypt_returns_string(self):
        from app.core.crypto import encrypt_json
        result = encrypt_json({"password": "secret"})
        assert isinstance(result, str)
        assert result != json.dumps({"password": "secret"})

    @allure.title("encrypt/decrypt round-trip preserves simple dict")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_round_trip_simple_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        data = {"username": "admin", "password": "s3cr3t"}
        assert decrypt_json(encrypt_json(data)) == data

    @allure.title("encrypt/decrypt round-trip preserves nested dict")
    @allure.severity(allure.severity_level.NORMAL)
    def test_round_trip_nested_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        data = {"token": "abc", "meta": {"env": "prod", "version": 2}}
        assert decrypt_json(encrypt_json(data)) == data

    @allure.title("encrypt_json(None) returns None")
    @allure.severity(allure.severity_level.NORMAL)
    def test_encrypt_none_returns_none(self):
        from app.core.crypto import encrypt_json
        assert encrypt_json(None) is None

    @allure.title("decrypt_json(None) returns None")
    @allure.severity(allure.severity_level.NORMAL)
    def test_decrypt_none_returns_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json(None) is None

    @allure.title("Ciphertext differs on each encryption call (random IV)")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_ciphertext_differs_each_call(self):
        from app.core.crypto import encrypt_json
        c1 = encrypt_json({"key": "val"})
        c2 = encrypt_json({"key": "val"})
        assert c1 != c2

    @allure.title("Empty dict round-trips correctly")
    @allure.severity(allure.severity_level.NORMAL)
    def test_empty_dict(self):
        from app.core.crypto import encrypt_json, decrypt_json
        assert decrypt_json(encrypt_json({})) == {}

    @allure.title("Garbage ciphertext returns None instead of raising")
    @allure.severity(allure.severity_level.NORMAL)
    def test_decrypt_garbage_returns_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json("not-valid-fernet-token") is None


# ── No-key (SKIP_SECRET_VALIDATION) plaintext fallback ───────────────────────

@allure.epic("Security")
@allure.feature("Credential Encryption")
@allure.story("Plaintext Fallback Mode")
class TestCryptoPlaintextFallback:
    @pytest.fixture(autouse=True)
    def plaintext_mode(self, monkeypatch):
        import app.core.crypto as crypto_mod
        monkeypatch.delenv("CREDENTIAL_ENCRYPTION_KEY", raising=False)
        monkeypatch.setenv("SKIP_SECRET_VALIDATION", "1")
        from app.core.config import settings
        monkeypatch.setattr(settings, "CREDENTIAL_ENCRYPTION_KEY", None)
        crypto_mod._fernet = None
        yield
        crypto_mod._fernet = None

    @allure.title("Without a key, encrypt_json stores plaintext JSON")
    @allure.severity(allure.severity_level.NORMAL)
    def test_encrypt_returns_plain_json(self):
        from app.core.crypto import encrypt_json
        result = encrypt_json({"user": "x"})
        parsed = json.loads(result)
        assert parsed == {"user": "x"}

    @allure.title("Without a key, decrypt_json reads plaintext JSON")
    @allure.severity(allure.severity_level.NORMAL)
    def test_decrypt_plain_json_string(self):
        from app.core.crypto import decrypt_json
        raw = json.dumps({"user": "x"})
        assert decrypt_json(raw) == {"user": "x"}

    @allure.title("decrypt_json(None) returns None in plaintext mode")
    @allure.severity(allure.severity_level.NORMAL)
    def test_decrypt_none_is_none(self):
        from app.core.crypto import decrypt_json
        assert decrypt_json(None) is None
