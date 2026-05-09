"""
Admin-only user & role management.

Routes:
  GET    /rbac/users                 — list every user (admin)
  POST   /rbac/users                 — create a user (admin)
  PATCH  /rbac/users/{user_id}/role  — change role (admin)
  POST   /rbac/users/{user_id}/disable — soft-disable login (admin)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.security import hash_password
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

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut], dependencies=[admin_only])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[admin_only],
)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
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
    user.role = body.role
    db.commit()
    db.refresh(user)
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
    return user
