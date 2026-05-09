"""
Tests for app/core/security.py — JWT creation/decoding and password hashing.
"""
import allure
import pytest
from datetime import timedelta
from jose import JWTError

from app.core.security import hash_password, verify_password, create_access_token, decode_token


# ── Password hashing ──────────────────────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Core Security")
@allure.story("Password Hashing")
class TestPasswordHashing:
    @allure.title("hash_password returns a non-empty string")
    @allure.severity(allure.severity_level.NORMAL)
    def test_hash_returns_string(self):
        h = hash_password("mypassword")
        assert isinstance(h, str)
        assert len(h) > 20

    @allure.title("Hash is not stored as plaintext")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_hash_is_not_plaintext(self):
        h = hash_password("mypassword")
        assert h != "mypassword"

    @allure.title("Correct password verifies successfully")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_verify_correct_password(self):
        h = hash_password("correct")
        assert verify_password("correct", h) is True

    @allure.title("Wrong password fails verification")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_verify_wrong_password(self):
        h = hash_password("correct")
        assert verify_password("wrong", h) is False

    @allure.title("Empty string password can be hashed and verified")
    @allure.severity(allure.severity_level.NORMAL)
    def test_empty_string_password(self):
        h = hash_password("")
        assert verify_password("", h) is True
        assert verify_password("x", h) is False

    @allure.title("Same password produces different hashes due to bcrypt salt")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_two_hashes_of_same_password_differ(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    @allure.title("Garbage hash string returns False on verify")
    @allure.severity(allure.severity_level.NORMAL)
    def test_verify_garbage_hash_returns_false(self):
        assert verify_password("password", "not-a-valid-hash") is False

    @allure.title("Unicode password can be hashed and verified")
    @allure.severity(allure.severity_level.NORMAL)
    def test_unicode_password(self):
        pwd = "pässwörد123"
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True
        assert verify_password("wrong", h) is False


# ── JWT tokens ────────────────────────────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Core Security")
@allure.story("JWT Tokens")
class TestJWT:
    @allure.title("JWT create and decode round-trip preserves subject and role")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_create_and_decode_round_trip(self):
        token = create_access_token("user@test", "ADMIN")
        payload = decode_token(token)
        assert payload["sub"] == "user@test"
        assert payload["role"] == "ADMIN"

    @allure.title("JWT payload contains exp and iat claims")
    @allure.severity(allure.severity_level.NORMAL)
    def test_payload_contains_exp_and_iat(self):
        token = create_access_token("u@t", "VIEWER")
        payload = decode_token(token)
        assert "exp" in payload
        assert "iat" in payload

    @allure.title("Custom expiry delta is reflected in token")
    @allure.severity(allure.severity_level.NORMAL)
    def test_custom_expiry_is_respected(self):
        token = create_access_token("u@t", "VIEWER", expires_delta=timedelta(hours=1))
        payload = decode_token(token)
        assert isinstance(payload["exp"], (int, float))

    @allure.title("Expired token raises JWTError")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_expired_token_raises(self):
        token = create_access_token("u@t", "VIEWER", expires_delta=timedelta(seconds=-1))
        with pytest.raises(JWTError):
            decode_token(token)

    @allure.title("Tampered token raises JWTError")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_tampered_token_raises(self):
        token = create_access_token("u@t", "ADMIN")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)

    @allure.title("Garbage string raises JWTError")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_garbage_token_raises(self):
        with pytest.raises(JWTError):
            decode_token("not.a.jwt")

    @allure.title("Empty string raises JWTError")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_empty_string_raises(self):
        with pytest.raises(JWTError):
            decode_token("")

    @allure.title("Different subjects produce different tokens")
    @allure.severity(allure.severity_level.NORMAL)
    def test_different_subjects_produce_different_tokens(self):
        t1 = create_access_token("alice@test", "ADMIN")
        t2 = create_access_token("bob@test", "ADMIN")
        assert t1 != t2

    @allure.title("Role claim is preserved exactly for all role types")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_role_preserved_exactly(self):
        for role in ("ADMIN", "ANALYST", "VIEWER"):
            token = create_access_token("u@t", role)
            assert decode_token(token)["role"] == role
