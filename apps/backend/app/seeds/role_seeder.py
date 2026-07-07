from __future__ import annotations

from app.seeds.base_seeder import BaseSeeder


DEFAULT_ROLES = [
    {
        "name": "platform_admin",
        "display_name": "Platform Admin",
        "description": "Full platform administration role.",
    },
    {
        "name": "admin",
        "display_name": "Admin",
        "description": "Tenant administrator role.",
    },
    {
        "name": "project_manager",
        "display_name": "Project Manager",
        "description": "Project operations and team management role.",
    },
    {
        "name": "finance_manager",
        "display_name": "Finance Manager",
        "description": "Finance records and reporting role.",
    },
    {
        "name": "document_controller",
        "display_name": "Document Controller",
        "description": "Document archive and revision control role.",
    },
]


class RoleSeeder(BaseSeeder):
    name = "roles"

    async def seed(self) -> None:
        for role in DEFAULT_ROLES:
            await self.execute(
                """
                INSERT INTO roles (id, name, display_name, description, is_active, created_at)
                VALUES (gen_random_uuid(), :name, :display_name, :description, true, now())
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    is_active = true
                """,
                role,
            )
