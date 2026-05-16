from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User


def log_action(
    db: Session,
    actor: User,
    action: str,
    target_id: str = None,
    detail: str = None,
) -> None:
    entry = AuditLog(
        actor_id=actor.id,
        actor_email=actor.email,
        action=action,
        target_id=target_id,
        detail=detail,
    )
    db.add(entry)
    db.commit()
