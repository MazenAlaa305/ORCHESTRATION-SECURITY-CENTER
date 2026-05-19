"""Tests for public registration, self-service profile edit, and avatar upload."""
import io
import struct
import zlib
from pathlib import Path

import allure
import pytest

from app.models.user import User, UserRole


# ── Small image fixtures ─────────────────────────────────────────────────────

def _png_bytes(width: int = 1, height: int = 1) -> bytes:
    """Build a minimal valid 1×1 PNG so the magic-byte sniff passes."""
    signature = b"\x89PNG\r\n\x1a\n"

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"\x00" + b"\x00\x00\x00"  # 1 filter byte + 1 RGB pixel
    idat = zlib.compress(raw)
    return signature + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(autouse=True)
def _isolate_avatar_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("AVATAR_UPLOAD_DIR", str(tmp_path))
    # Re-point the module-level constant since it was captured at import time.
    from app.api.v1.endpoints import auth as auth_mod
    monkeypatch.setattr(auth_mod, "AVATAR_DIR", Path(tmp_path))
    yield


@pytest.fixture()
def fresh_viewer(client, db_session):
    """A clean VIEWER user + headers, independent of any other test's mutations
    of the shared viewer_user fixture (test_rbac disables/deletes it)."""
    from app.core.security import hash_password, create_access_token
    email = "fresh-viewer@test"
    user = db_session.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email, password_hash=hash_password("TestPass123!"), role=UserRole.VIEWER)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    else:
        user.disabled = False
        user.full_name = None
        user.bio = None
        user.phone = None
        user.avatar_url = None
        db_session.commit()
        db_session.refresh(user)
    token = create_access_token(subject=user.email, role=user.role.value)
    return user, {"Authorization": f"Bearer {token}"}


# ── Registration ─────────────────────────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Self-Service Sign-Up")
@allure.title("New user defaults to VIEWER role")
def test_register_defaults_to_viewer(client, db_session):
    r = client.post("/api/v1/auth/register", json={
        "email": "newperson@test",
        "password": "TestPass123",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["role"] == "VIEWER"
    assert body["email"] == "newperson@test"
    assert "access_token" in body

    db_user = db_session.query(User).filter(User.email == "newperson@test").first()
    assert db_user is not None
    assert db_user.role == UserRole.VIEWER
    assert db_user.disabled is False


@allure.epic("Security")
@allure.feature("Self-Service Sign-Up")
@allure.title("Client cannot self-elevate role via /register payload")
def test_register_ignores_client_supplied_role(client, db_session):
    # Even if the client tries to pass role=ADMIN, the schema doesn't accept it
    # AND the endpoint always forces VIEWER server-side.
    r = client.post("/api/v1/auth/register", json={
        "email": "sneaky@test",
        "password": "TestPass123",
        "role": "ADMIN",
    })
    assert r.status_code == 201
    db_user = db_session.query(User).filter(User.email == "sneaky@test").first()
    assert db_user.role == UserRole.VIEWER


@allure.epic("Security")
@allure.feature("Self-Service Sign-Up")
@allure.title("Duplicate email is rejected with 409")
def test_register_rejects_duplicate(client):
    payload = {"email": "dup@test", "password": "TestPass123"}
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


@allure.epic("Security")
@allure.feature("Self-Service Sign-Up")
@allure.title("Weak passwords are rejected")
def test_register_rejects_weak_password(client):
    # Too short
    assert client.post("/api/v1/auth/register",
                       json={"email": "a@b.com", "password": "short1"}).status_code == 422
    # Letters only
    assert client.post("/api/v1/auth/register",
                       json={"email": "a@b.com", "password": "lettersonly"}).status_code == 422
    # Digits only
    assert client.post("/api/v1/auth/register",
                       json={"email": "a@b.com", "password": "12345678"}).status_code == 422


# ── Profile read/update ──────────────────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Profile")
@allure.title("GET /auth/me returns extended profile fields")
def test_me_returns_profile_fields(client, fresh_viewer):
    _, headers = fresh_viewer
    r = client.get("/api/v1/auth/me", headers=headers)
    assert r.status_code == 200
    body = r.json()
    for f in ("full_name", "bio", "phone", "avatar_url"):
        assert f in body


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("PATCH /auth/me can change the caller's own email and returns a fresh token")
def test_patch_me_changes_email(client, fresh_viewer, db_session):
    user, headers = fresh_viewer
    new_email = "fresh-viewer-renamed@test"

    r = client.patch("/api/v1/auth/me", headers=headers, json={"email": new_email})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == new_email
    # A fresh token must be returned so the client doesn't 401 on the next call.
    assert body.get("access_token"), "expected access_token in response when email changes"

    db_session.refresh(user)
    assert user.email == new_email

    # The new token must authenticate as the new email.
    new_headers = {"Authorization": f"Bearer {body['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=new_headers)
    assert me.status_code == 200
    assert me.json()["email"] == new_email


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("PATCH /auth/me rejects an email already used by another user")
def test_patch_me_rejects_duplicate_email(client, fresh_viewer, admin_user):
    _, headers = fresh_viewer
    r = client.patch("/api/v1/auth/me", headers=headers, json={"email": admin_user.email})
    assert r.status_code == 409


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("PATCH /auth/me rejects an invalid email")
def test_patch_me_rejects_invalid_email(client, fresh_viewer):
    _, headers = fresh_viewer
    r = client.patch("/api/v1/auth/me", headers=headers, json={"email": "not-an-email"})
    assert r.status_code == 422


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("PATCH /auth/me updates only the caller's profile")
def test_patch_me_updates_self(client, fresh_viewer, admin_user, db_session):
    _, headers = fresh_viewer
    admin_before = admin_user.full_name

    r = client.patch("/api/v1/auth/me", headers=headers, json={
        "full_name": "Vee Iver",
        "bio": "I look at things.",
        "phone": "+1-555-0100",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["full_name"] == "Vee Iver"
    assert body["bio"] == "I look at things."
    assert body["phone"] == "+1-555-0100"

    # Admin record untouched
    db_session.refresh(admin_user)
    assert admin_user.full_name == admin_before


# ── Avatar upload ────────────────────────────────────────────────────────────

@allure.epic("Security")
@allure.feature("Profile")
@allure.title("Valid PNG avatar uploads and updates avatar_url")
def test_avatar_upload_png(client, fresh_viewer, db_session):
    user, headers = fresh_viewer
    files = {"file": ("me.png", io.BytesIO(_png_bytes()), "image/png")}
    r = client.post("/api/v1/auth/me/avatar", headers=headers, files=files)
    assert r.status_code == 200, r.text
    assert r.json()["avatar_url"].startswith("/api/v1/avatars/")

    db_session.refresh(user)
    assert user.avatar_url is not None


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("Non-image content type is rejected with 415")
def test_avatar_rejects_wrong_mime(client, fresh_viewer):
    _, headers = fresh_viewer
    files = {"file": ("evil.txt", io.BytesIO(b"hello"), "text/plain")}
    r = client.post("/api/v1/auth/me/avatar", headers=headers, files=files)
    assert r.status_code == 415


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("MIME claiming PNG but with wrong bytes is rejected")
def test_avatar_rejects_mime_spoof(client, fresh_viewer):
    _, headers = fresh_viewer
    files = {"file": ("fake.png", io.BytesIO(b"not really a png"), "image/png")}
    r = client.post("/api/v1/auth/me/avatar", headers=headers, files=files)
    assert r.status_code == 415


@allure.epic("Security")
@allure.feature("Profile")
@allure.title("Oversize avatar is rejected with 413")
def test_avatar_rejects_oversize(client, fresh_viewer):
    _, headers = fresh_viewer
    # 3 MB of PNG-prefixed garbage — passes magic byte sniff only after size check.
    big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (3 * 1024 * 1024)
    files = {"file": ("big.png", io.BytesIO(big), "image/png")}
    r = client.post("/api/v1/auth/me/avatar", headers=headers, files=files)
    assert r.status_code == 413
