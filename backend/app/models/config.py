"""
Runtime configuration overrides — Phase B.
Persists feature flags and tool toggles that can be changed at runtime
without restarting the backend.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text
from app.core.database import Base


class RuntimeConfig(Base):
    __tablename__ = "runtime_config"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(64), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    updated_by = Column(String(36), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
