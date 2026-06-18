
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_optional_user
from app.cache.redis import get_redis
from app.cache.service import CacheService, leaderboard_cache_key
from app.core.config import Settings, get_settings
from app.db.models import LeaderboardSnapshot, User
from app.db.session import get_db_session
from app.leaderboard.schemas import LeaderboardResponse, LeaderboardSnapshotRead
from app.leaderboard.service import (
    LeaderboardService,
    get_durable_leaderboard,
    rebuild_leaderboard_from_db,
    snapshot_leaderboard,
)
from app.rate_limit.service import RateLimiter

router = APIRouter(tags=["leaderboard"])


@router.get("/contests/{contest_id}/leaderboard", response_model=LeaderboardResponse)
async def durable_leaderboard_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_optional_user),
):
    identifier = current_user.id if current_user else "anonymous"
    await RateLimiter(redis, settings.rate_limit_fail_open).hit(
        "leaderboard", identifier, settings.leaderboard_rate_limit, settings.leaderboard_rate_window_seconds
    )
    cache = CacheService(redis)
    key = leaderboard_cache_key(contest_id)
    cached = await cache.get_json(key)
    if cached is not None:
        return LeaderboardResponse(contest_id=contest_id, source="cache", entries=cached)
    rows = await get_durable_leaderboard(db, contest_id)
    payload = [row for row in rows]
    await cache.set_json(key, payload, settings.leaderboard_cache_ttl_seconds)
    return LeaderboardResponse(contest_id=contest_id, source="postgres", entries=payload)


@router.get("/contests/{contest_id}/leaderboard/live", response_model=LeaderboardResponse)
async def live_leaderboard_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_optional_user),
):
    identifier = current_user.id if current_user else "anonymous"
    await RateLimiter(redis, settings.rate_limit_fail_open).hit(
        "leaderboard_live",
        identifier,
        settings.leaderboard_rate_limit,
        settings.leaderboard_rate_window_seconds,
    )
    rows = await LeaderboardService(redis).get_live(contest_id)
    source = "redis"
    if not rows:
        rows = await rebuild_leaderboard_from_db(db, redis, contest_id)
        source = "postgres_rebuild"
    return LeaderboardResponse(contest_id=contest_id, source=source, entries=rows)


@router.get("/contests/{contest_id}/leaderboard/snapshot", response_model=LeaderboardSnapshotRead)
async def latest_snapshot_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
):
    result = await db.execute(
        select(LeaderboardSnapshot)
        .where(LeaderboardSnapshot.contest_id == contest_id)
        .order_by(LeaderboardSnapshot.created_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()
    if snapshot is None:
        snapshot = await snapshot_leaderboard(db, redis, contest_id, reason="on_demand")
    return LeaderboardSnapshotRead(
        id=snapshot.id,
        contest_id=snapshot.contest_id,
        reason=snapshot.reason,
        snapshot=snapshot.snapshot,
        created_at=snapshot.created_at,
    )
