from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import get_redis
from app.db.session import get_db_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db_session), redis=Depends(get_redis)):
    db_ok = True
    redis_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    try:
        redis_ok = bool(await redis.ping())
    except Exception:
        redis_ok = False
    return {"status": "ok" if db_ok and redis_ok else "degraded", "database": db_ok, "redis": redis_ok}
