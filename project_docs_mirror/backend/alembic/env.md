# alembic/env.py — Documentation

## File Purpose

The **Alembic migration environment configuration** file. Executed by Alembic whenever a migration command is run (`alembic upgrade`, `alembic revision`, etc.). Connects Alembic to the application's SQLAlchemy `Base` metadata and database engine so that schema migrations are generated and applied correctly.

## Key Logic

### `run_migrations_offline()`
Configures and runs Alembic migrations in "offline" mode — generates the SQL script without an active database connection. Uses the `DATABASE_URL` extracted from the Alembic configuration or the application settings. This is useful for generating migration scripts to be reviewed and applied manually in production.

### `run_migrations_online()`
Connects to the live database using the application's synchronous SQLAlchemy engine (`engine` from `app.core.database`) and runs all pending migrations. This is the standard mode used in development and CI/CD.

**Why it imports `app.core.database.Base`:**
Alembic uses the `Base.metadata` object to compare the current database schema against the ORM model definitions, enabling auto-generation of `ALTER TABLE`, `CREATE TABLE`, and `DROP TABLE` migration scripts.

### Target Metadata
`target_metadata = Base.metadata` — Sets the Alembic context's metadata to the application's declarative base, enabling automatic migration detection based on model changes.

## Dependencies

### Internal
- `app.core.database.Base` — Declarative base with all model metadata
- `app.core.database.engine` — Synchronous SQLAlchemy engine

### External
- `alembic` — The database migration framework
- `sqlalchemy` — Engine and connection management
