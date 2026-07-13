from __future__ import annotations

from app.services.entitlement_service import EntitlementService
from app.seeds.base_seeder import BaseSeeder


class ModuleRegistrySeeder(BaseSeeder):
    name = "module_registry"

    async def seed(self) -> None:
        modules = EntitlementService.modules_registry()
        if not modules:
            raise RuntimeError("Module registry is empty or unreadable.")
