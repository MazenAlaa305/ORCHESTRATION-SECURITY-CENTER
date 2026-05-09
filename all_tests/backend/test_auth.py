"""Unit tests for password hashing and JWT helpers in app.core.security."""
import allure
import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


@allure.epic("Security")
@allure.feature("Authentication")
@allure.story("Password Hashing")
@allure.title("Hash and verify password round-trip")
@allure.severity(allure.severity_level.CRITICAL)
def test_hash_round_trip():
    h = hash_password("SecretPass1!")
    assert verify_password("SecretPass1!", h)
    assert not verify_password("wrong-pass", h)


@allure.epic("Security")
@allure.feature("Authentication")
@allure.story("Password Hashing")
@allure.title("Same plaintext produces different hashes (bcrypt salt)")
@allure.severity(allure.severity_level.CRITICAL)
def test_hash_is_salted():
    a = hash_password("samepass")
    b = hash_password("samepass")
    assert a != b
    assert verify_password("samepass", a)
    assert verify_password("samepass", b)


@allure.epic("Security")
@allure.feature("Authentication")
@allure.story("JWT Tokens")
@allure.title("JWT creation and decoding round-trip")
@allure.severity(allure.severity_level.CRITICAL)
def test_jwt_round_trip():
    token = create_access_token(subject="user@test", role="ADMIN")
    payload = decode_token(token)
    assert payload["sub"] == "user@test"
    assert payload["role"] == "ADMIN"
    assert "exp" in payload and "iat" in payload


@allure.epic("Security")
@allure.feature("Authentication")
@allure.story("JWT Tokens")
@allure.title("Tampered JWT token is rejected")
@allure.severity(allure.severity_level.BLOCKER)
def test_jwt_rejects_tampered_token():
    token = create_access_token(subject="x@test", role="ADMIN") + "tamper"
    with pytest.raises(JWTError):
        decode_token(token)


@allure.epic("Security")
@allure.feature("Authentication")
@allure.story("JWT Tokens")
@allure.title("Expired JWT token is rejected")
@allure.severity(allure.severity_level.BLOCKER)
def test_jwt_rejects_expired_token():
    from datetime import timedelta
    token = create_access_token(subject="x@test", role="ADMIN", expires_delta=timedelta(seconds=-1))
    with pytest.raises(JWTError):
        decode_token(token)
