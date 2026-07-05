"""
Authentication endpoints.
Phase 3.1 — Orchestration Security Center Hardening Plan.

Routes:
  POST  /auth/login            → issue JWT
  POST  /auth/logout           → stateless no-op (client discards token)
  POST  /auth/register         → public self-service sign-up (forced to VIEWER)
  GET   /auth/me               → return current user info
  PATCH /auth/me               → update own profile (full_name/bio/phone)
  POST  /auth/me/avatar        → upload avatar image
  POST  /auth/change-password  → change own password
"""
import os
import re
import secrets
import string
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.api.deps import get_current_user
from app.models.user import User, UserRole

router = APIRouter()


# ── Avatar storage config ─────────────────────────────────────────────────────
AVATAR_DIR = Path(os.environ.get("AVATAR_UPLOAD_DIR", "/app/uploads/avatars"))
AVATAR_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
AVATAR_ALLOWED_MIME = {"image/png": ".png", "image/jpeg": ".jpg"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    force_password_change: bool
    user_id: str
    email: str


_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+$")


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        # Require at least one letter and one digit to deflect trivial passwords.
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain both letters and digits")
        return v


class MeResponse(BaseModel):
    id: str
    email: str
    role: str
    force_password_change: bool
    last_login_at: datetime | None
    full_name: str | None = None
    bio: str | None = None
    phone: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v


class ProfileUpdateResponse(BaseModel):
    """Same as MeResponse but optionally carries a refreshed JWT — issued when
    the email (the token's subject) was changed, so the client can stay logged
    in without re-authenticating."""
    id: str
    email: str
    role: str
    force_password_change: bool
    last_login_at: datetime | None
    full_name: str | None = None
    bio: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    access_token: str | None = None

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class AvatarResponse(BaseModel):
    avatar_url: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _ensure_seed_admin(db: Session) -> None:
    """
    Create a seeded ADMIN user on first boot if no users exist.
    The random password is printed to stdout so ops can capture it from logs.
    """
    if db.query(User).count() == 0:
        password = _generate_password()
        admin = User(
            email="admin@local",
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            force_password_change=True,
        )
        db.add(admin)
        db.commit()
        # Print to stdout so it appears in docker logs
        print(
            f"\n{'='*60}\n"
            f"  FIRST-RUN ADMIN ACCOUNT CREATED\n"
            f"  Email:    admin@local\n"
            f"  Password: {password}\n"
            f"  CHANGE THIS PASSWORD IMMEDIATELY.\n"
            f"{'='*60}\n",
            flush=True,
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Issue a JWT on successful credential verification."""
    # Seed admin on first call if DB is empty
    _ensure_seed_admin(db)

    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    user.last_login_at = datetime.utcnow()
    db.commit()

    # Record the login in the audit trail so the User Management → Audit Log
    # populates during normal use (previously only rare user-management actions
    # were logged, leaving the audit log empty).
    log_action(db, actor=user, action="USER_LOGIN", target_id=user.id, detail=user.email)

    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        force_password_change=user.force_password_change,
        user_id=user.id,
        email=user.email,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """
    Stateless logout — the client must discard its token.
    Token invalidation would require a Redis blacklist; implement when needed.
    """
    return None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Public self-service sign-up. Always creates a VIEWER — role escalation
    requires an existing admin via /rbac/users/{id}/role.
    """
    email_lower = body.email.lower().strip()
    if db.query(User).filter(User.email == email_lower).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=email_lower,
        password_hash=hash_password(body.password),
        # Role is hard-coded server-side — never trust the client to pick it.
        role=UserRole.VIEWER,
        force_password_change=False,
        disabled=False,
        full_name=body.full_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two concurrent register calls for the same email both passed the
        # existence check — the DB unique constraint caught the second one.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    db.refresh(user)

    log_action(db, actor=user, action="USER_REGISTERED", target_id=user.id, detail=user.email)

    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        force_password_change=user.force_password_change,
        user_id=user.id,
        email=user.email,
    )


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=ProfileUpdateResponse)
def update_me(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allow a user to update their own profile (name, bio, phone, email).
    Changing the email rotates the JWT subject, so a fresh access_token is
    returned in the response — the client should swap it in immediately.
    """
    data = body.model_dump(exclude_unset=True)

    # ── Email change needs duplicate-check + token refresh ──────────────────
    new_token: str | None = None
    new_email = data.pop("email", None)
    if new_email is not None:
        new_email = new_email.lower().strip()
        if new_email != current_user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing and existing.id != current_user.id:
                raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
            current_user.email = new_email
            # Defer token issuance until after a successful commit.

    for field, value in data.items():
        setattr(current_user, field, value)

    try:
        db.commit()
    except IntegrityError:
        # Race: another concurrent request grabbed the same email.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
    db.refresh(current_user)

    if new_email is not None and new_email == current_user.email:
        new_token = create_access_token(subject=current_user.email, role=current_user.role.value)

    return ProfileUpdateResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        force_password_change=current_user.force_password_change,
        last_login_at=current_user.last_login_at,
        full_name=current_user.full_name,
        bio=current_user.bio,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
        access_token=new_token,
    )


@router.post("/me/avatar", response_model=AvatarResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an avatar image (PNG or JPEG, ≤ 2 MB).
    The stored URL is served by the static /avatars mount.
    """
    if file.content_type not in AVATAR_ALLOWED_MIME:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            "Only PNG and JPEG images are allowed")

    blob = await file.read()
    if len(blob) > AVATAR_MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            "Avatar must be 2 MB or smaller")
    # Magic-byte sanity check so a renamed text file can't sneak past.
    if not (blob.startswith(b"\x89PNG\r\n\x1a\n") or blob[:3] == b"\xff\xd8\xff"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            "File contents do not match a PNG or JPEG image")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    ext = AVATAR_ALLOWED_MIME[file.content_type]
    # Use the user id, not the uploaded filename, so traversal is impossible.
    filename = f"{current_user.id}{ext}"
    dest = AVATAR_DIR / filename
    # Drop any prior avatar with a different extension
    for stale in AVATAR_DIR.glob(f"{current_user.id}.*"):
        if stale != dest:
            try:
                stale.unlink()
            except OSError:
                pass
    dest.write_bytes(blob)

    # Cache-bust so the browser fetches the new image. Served by the static
    # mount registered at /api/v1/avatars in app.main — that path is already
    # reverse-proxied to the backend by Caddy/nginx.
    avatar_url = f"/api/v1/avatars/{filename}?v={int(datetime.utcnow().timestamp())}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return AvatarResponse(avatar_url=avatar_url)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a user to change their own password (required when force_password_change=True)."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password incorrect")
    current_user.password_hash = hash_password(body.new_password)
    current_user.force_password_change = False
    db.commit()
    return None
