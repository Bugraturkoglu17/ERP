from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.seeds.base_seeder import BaseSeeder
from app.seeds.module_registry_seeder import ModuleRegistrySeeder
from app.seeds.role_seeder import RoleSeeder
from app.seeds.workflow_seeder import WorkflowSeeder


SEEDER_TYPES: tuple[type[BaseSeeder], ...] = (
    RoleSeeder,
    WorkflowSeeder,
    ModuleRegistrySeeder,
)


async def run_seeders(db: AsyncSession | None = None) -> list[str]:
    if db is not None:
        return await _run_with_session(db)

    async with AsyncSessionLocal() as session:
        seeded = await _run_with_session(session)
        await session.commit()
        return seeded


async def _run_with_session(db: AsyncSession) -> list[str]:
    seeded: list[str] = []
    for seeder_type in SEEDER_TYPES:
        seeder = seeder_type(db)
        await seeder.seed()
        seeded.append(seeder.name)
    return seeded


if __name__ == "__main__":
    print(asyncio.run(run_seeders()))
