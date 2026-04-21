from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# --- Legacy Sync Engine (Keep for now) ---
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from typing import Any

# --- New Async Engine ---
async_engine_args: dict[str, Any] = {"pool_pre_ping": True, "pool_recycle": 300}
if "sqlite" not in settings.ASYNC_DATABASE_URL:
    async_engine_args.update({"pool_size": 5, "max_overflow": 2})

async_engine = create_async_engine(settings.ASYNC_DATABASE_URL, **async_engine_args)

async_session_maker = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False, autocommit=False
)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    async with async_session_maker() as session:
        yield session
