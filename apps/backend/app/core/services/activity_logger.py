from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import StoreActivity, User
from app.core.utils.helpers import utc_now

class ActivityLoggerService:
    @staticmethod
    async def log_activity(
        db: AsyncSession,
        project_id: UUID,
        tenant_id: Optional[UUID],
        user: User,
        activity_type: str,
        title: str,
        description: Optional[str] = None,
        process_id: Optional[UUID] = None,
        stage_id: Optional[UUID] = None,
    ) -> StoreActivity:
        """
        Merkezi aktivite loglama servisi. StoreActivity tablosuna kayıt yazar.
        """
        activity = StoreActivity(
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=user.id,
            user_name=user.full_name or user.email,
            activity_type=activity_type,
            title=title,
            description=description,
            related_process_id=process_id,
            related_stage_id=stage_id,
            created_at=utc_now(),
        )
        db.add(activity)
        return activity
