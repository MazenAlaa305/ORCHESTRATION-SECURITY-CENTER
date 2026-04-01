# database.py — Documentation

## File Purpose

Establishes the **database connectivity layer** for the FastAPI application, providing both a legacy synchronous SQLAlchemy engine (for compatibility with synchronous endpoints and Celery tasks) and a modern asynchronous engine (for async FastAPI endpoints). Also defines the declarative base class from which all ORM models inherit, and provides dependency-injectable database session generators.

## Key Classes / Functions

### `Base(DeclarativeBase)`
The SQLAlchemy ORM declarative base class. All database model classes in `app/models/scan.py` inherit from this class. It maintains the metadata that maps Python classes to database tables.

### Synchronous Engine Setup

**`engine`** — Created via `create_engine(settings.DATABASE_URL, ...)`. For SQLite, the `check_same_thread: False` argument is passed to allow multi-threaded access from Uvicorn worker threads. For PostgreSQL, this argument is omitted. This engine is used by `main.py` for initial table creation and by synchronous endpoint handlers.

**`SessionLocal`** — A `sessionmaker` factory bound to the synchronous engine. Configured with `autocommit=False` and `autoflush=False` to require explicit transaction management. Each request creates its own session via this factory.

### Asynchronous Engine Setup

**`async_engine`** — Created via `create_async_engine(settings.ASYNC_DATABASE_URL, ...)`. Automatically uses the `asyncpg` driver for PostgreSQL or `aiosqlite` for SQLite (derived from `settings.ASYNC_DATABASE_URL`). For non-SQLite databases, connection pooling parameters are applied: `pool_size=10`, `max_overflow=5`. The `pool_pre_ping=True` option tests connections before use, preventing stale connection errors.

**`async_session_maker`** — An `async_sessionmaker` factory for the async engine, configured with `expire_on_commit=False` (prevents lazy-loading errors after commit), `autoflush=False`, and `autocommit=False`.

### Session Dependency Functions

**`get_db()`**
A synchronous generator used as a FastAPI dependency (`Depends(get_db)`). Creates a new `SessionLocal` session, yields it to the endpoint handler for use, and guarantees the session is closed in the `finally` block regardless of whether an exception occurred. Used by legacy synchronous endpoints.

**`get_async_db()`**
An asynchronous generator used as a FastAPI dependency (`Depends(get_async_db)`). Uses `async with async_session_maker() as session` to provide a transactional async session to async endpoint handlers. The context manager automatically handles commit/rollback and session closure.

## Dependencies

### Internal
- `app.core.config.settings` — Provides `DATABASE_URL` and `ASYNC_DATABASE_URL`

### External
- `sqlalchemy` — Synchronous ORM engine and session
- `sqlalchemy.ext.asyncio` — Async ORM engine, session, and session maker
- `sqlalchemy.orm` — `sessionmaker`, `DeclarativeBase`
