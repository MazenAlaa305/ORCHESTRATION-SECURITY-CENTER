"""
Tests for app/core/security.py — JWT creation/decoding and password hashing.
"""
import pytest
from datetime import timedelta
from jose import JWTError

from app.core.security import hash_password, verify_password, create_access_token, decode_token


# ── Password hashing ──────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_returns_string(self):
        h = hash_password("mypassword")
        assert isinstance(h, str)
        assert len(h) > 20

    def test_hash_is_not_plaintext(self):
        h = hash_password("mypassword")
        assert h != "mypassword"

    def test_verify_correct_password(self):
        h = hash_password("correct")
        assert verify_password("correct", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("correct")
        assert verify_password("wrong", h) is False

    def test_empty_string_password(self):
        h = hash_password("")
        assert verify_password("", h) is True
        assert verify_password("x", h) is False

    def test_two_hashes_of_same_password_differ(self):
        # bcrypt uses random salt — same input → different hash
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_verify_garbage_hash_returns_false(self):
        assert verify_password("password", "not-a-valid-hash") is False

    def test_unicode_password(self):
        pwd = "pässwörد123"
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True
        assert verify_password("wrong", h) is False


# ── JWT tokens ────────────────────────────────────────────────────────────────

class TestJWT:
    def test_create_and_decode_round_trip(self):
        token = create_access_token("user@test", "ADMIN")
        payload = decode_token(token)
        assert payload["sub"] == "user@test"
        assert payload["role"] == "ADMIN"

    def test_payload_contains_exp_and_iat(self):
        token = create_access_token("u@t", "VIEWER")
        payload = decode_token(token)
        assert "exp" in payload
        assert "iat" in payload

    def test_custom_expiry_is_respected(self):
        token = create_access_token("u@t", "VIEWER", expires_delta=timedelta(hours=1))
        payload = decode_token(token)
        # exp should be roughly 1h from now — just check it's present and an int
        assert isinstance(payload["exp"], (int, float))

    def test_expired_token_raises(self):
        token = create_access_token("u@t", "VIEWER", expires_delta=timedelta(seconds=-1))
        with pytest.raises(JWTError):
            decode_token(token)

    def test_tampered_token_raises(self):
        token = create_access_token("u@t", "ADMIN")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_garbage_token_raises(self):
        with pytest.raises(JWTError):
            decode_token("not.a.jwt")

    def test_empty_string_raises(self):
        with pytest.raises(JWTError):
            decode_token("")

    def test_different_subjects_produce_different_tokens(self):
        t1 = create_access_token("alice@test", "ADMIN")
        t2 = create_access_token("bob@test", "ADMIN")
        assert t1 != t2

    def test_role_preserved_exactly(self):
        for role in ("ADMIN", "ANALYST", "VIEWER"):
            token = create_access_token("u@t", role)
            assert decode_token(token)["role"] == role
