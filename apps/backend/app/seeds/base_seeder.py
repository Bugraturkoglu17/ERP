from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class BaseSeeder(ABC):
    name: str

    def __init__(self, db: AsyncSession):
        self.db = db

    @abstractmethod
    async def seed(self) -> None:
        raise NotImplementedError

    async def execute(self, statement: str, params: dict[str, Any]) -> None:
        await self.db.execute(text(statement), params)
