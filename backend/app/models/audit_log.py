import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id    = Column(String(36), nullable=False, index=True)
    actor_email = Column(String(255), nullable=False)
    action      = Column(String(64), nullable=False)
    target_id   = Column(String(36), nullable=True)
    detail      = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
