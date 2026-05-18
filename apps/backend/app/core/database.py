# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Database Engine & Session Yönetimi
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlmodel import SQLModel

from app.core.config import settings


# ── Sync Engine  (migrations, celery, sync crud) ──────────────────────────────
engine = create_engine(
    str(settings.DATABASE_URL),
    echo=settings.is_development,
    future=True,
    pool_pre_ping=True,
)

# ── Async Engine  (FastAPI route'ları için) ──────────────────────────────────
_async_url = str(settings.DATABASE_URL).replace("+psycopg2", "+asyncpg")
async_engine = create_async_engine(
    _async_url,
    echo=settings.is_development,
    future=True,
    pool_pre_ping=True,
)

# ── Session Maker ─────────────────────────────────────────────────────────────
SessionLocal  = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False)


class Base(AsyncAttrs, DeclarativeBase):
    """Tüm ORM modelleri bu sınıftan miras alacak."""
    pass


# ── FastAPI Dependency: Sync Session ─────────────────────────────────────────
def get_session() -> Generator:
    with SessionLocal() as session:
        yield session


# ── FastAPI Dependency: Async Session ────────────────────────────────────────
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Uygulama başlarken tüm modelleri veritabanına kaydet (migration yoksa)."""
    if not settings.AUTO_CREATE_SCHEMA:
        return

    from app.db import models  # noqa: F401

    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def close_db() -> None:
    await async_engine.dispose()
