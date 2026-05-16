"""
Admin-only user & role management.

Routes:
  GET    /rbac/users                          — list all users (paginated)
  POST   /rbac/users                          — create a user
  PATCH  /rbac/users/{user_id}/role           — change role
  POST   /rbac/users/{user_id}/disable        — soft-disable login
  POST   /rbac/users/{user_id}/enable         — re-enable login
  POST   /rbac/users/{user_id}/reset-password — admin force-reset password
  DELETE /rbac/users/{user_id}               — hard-delete user
  GET    /rbac/audit-logs                     — recent audit log entries
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.audit import log_action
from app.core.database import get_db
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole

router = APIRouter()
admin_only = Depends(require_role(UserRole.ADMIN))


# ── Schemas ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.VIEWER


class UserOut(BaseModel):
    id: str
    email: str
    role: UserRole
    disabled: bool
    force_password_change: bool

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


class PasswordReset(BaseModel):
    new_password: str


class AuditLogOut(BaseModel):
    id: str
    actor_email: str
    action: str
    target_id: str | None
    detail: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut], dependencies=[admin_only])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return db.query(User).offset(skip).limit(limit).all()


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[admin_only],
)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        force_password_change=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, actor=current, action="USER_CREATED", target_id=user.id, detail=user.email)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut, dependencies=[admin_only])
def change_role(
    user_id: str,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot change your own role")
    old_role = user.role.value
    user.role = body.role
    db.commit()
    db.refresh(user)
    log_action(db, actor=current, action="ROLE_CHANGED", target_id=user.id,
               detail=f"{old_role} -> {body.role.value}")
    return user


@router.post("/users/{user_id}/disable", response_model=UserOut, dependencies=[admin_only])
def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot disable yourself")
    user.disabled = True
    db.commit()
    db.refresh(user)
    log_action(db, actor=current, action="USER_DISABLED", target_id=user.id, detail=user.email)
    return user


@router.post("/users/{user_id}/enable", response_model=UserOut, dependencies=[admin_only])
def enable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.disabled = False
    db.commit()
    db.refresh(user)
    log_action(db, actor=current, action="USER_ENABLED", target_id=user.id, detail=user.email)
    return user


@router.post("/users/{user_id}/reset-password", response_model=UserOut, dependencies=[admin_only])
def admin_reset_password(
    user_id: str,
    body: PasswordReset,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Use /auth/change-password to change your own password")
    user.password_hash = hash_password(body.new_password)
    user.force_password_change = True
    db.commit()
    db.refresh(user)
    log_action(db, actor=current, action="PASSWORD_RESET", target_id=user.id, detail=user.email)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_only])
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot delete yourself")
    email = user.email
    db.delete(user)
    db.commit()
    log_action(db, actor=current, action="USER_DELETED", target_id=user_id, detail=email)


@router.get("/audit-logs", response_model=list[AuditLogOut], dependencies=[admin_only])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
