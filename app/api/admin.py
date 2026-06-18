from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles
from app.cache.redis import get_redis
from app.core.config import Settings, get_settings
from app.db.enums import UserRole
from app.db.models import SubmissionJob, User
from app.db.session import get_db_session
from app.submissions.queue import SubmissionQueue

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/queue-status")
async def queue_status(
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    del current_user
    queue_depths = await SubmissionQueue(redis, settings).depths()
    result = await db.execute(
        select(SubmissionJob.status, func.count(SubmissionJob.id)).group_by(SubmissionJob.status)
    )
    db_counts = {status.value: count for status, count in result.all()}
    return {"redis": queue_depths, "database": db_counts}


@router.get("/workers")
async def worker_status(
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    del current_user
    workers = []
    async for key in redis.scan_iter(match="algorank:workers:*"):
        workers.append(await redis.hgetall(key))
    return {"workers": workers}
