from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User

class UserService:
    @staticmethod
    async def get_tenant_admin_emails(db: AsyncSession, tenant_id: UUID) -> list[str]:
        """
        Tenant adminlerinin e-posta adreslerini getirir.
        """
        result = await db.execute(
            select(User.email).where(
                User.tenant_id == tenant_id,
                User.default_role == "admin",
                User.is_active.is_(True),
            )
        )
        return [email for email in result.scalars().all() if email]
