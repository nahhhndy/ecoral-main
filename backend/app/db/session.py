"""Async SQLAlchemy engine, session factory, and declarative base."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from backend.app.core.config import get_settings

_settings = get_settings()


class Base(DeclarativeBase):
    pass


engine_kwargs = {
    "echo": _settings.app_env == "development",
    "pool_pre_ping": True,
}

if _settings.app_env == "test":
    engine_kwargs["poolclass"] = NullPool
elif not _settings.database_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
else:
    engine_kwargs["connect_args"] = {"timeout": 15}


engine = create_async_engine(
    _settings.database_url,
    **engine_kwargs,
)


if _settings.database_url.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=10000;")
        cursor.close()


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_tables() -> None:
    """Create all ORM tables idempotently (used in lifespan)."""
    from backend.app.models import (  # noqa: F401
        activity_log,
        location,
        prediction,
        report,
        user,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure password_changed_at column exists for existing databases
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME"))
        except Exception:
            pass