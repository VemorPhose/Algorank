from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_roles
from app.cache.redis import get_redis
from app.cache.service import (
    CacheService,
    contest_detail_cache_key,
    contest_list_cache_key,
    user_contests_cache_key,
)
from app.contests.schemas import (
    ContestCreate,
    ContestParticipantRead,
    ContestPatch,
    ContestRead,
    ContestRegistrationResponse,
)
from app.contests.service import (
    create_contest,
    get_contest_read,
    list_contests,
    register_for_contest,
    set_contest_status,
    update_contest,
)
from app.core.config import Settings, get_settings
from app.db.enums import ContestStatus, UserRole
from app.db.models import Contest, ContestParticipant, User
from app.db.session import get_db_session
from app.rate_limit.service import RateLimiter

router = APIRouter(tags=["contests"])


@router.get("/contests", response_model=List[ContestRead])
async def list_contest_endpoint(
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
):
    cache = CacheService(redis)
    cached = await cache.get_json(contest_list_cache_key())
    if cached is not None:
        return cached
    contests = await list_contests(db)
    payload = [item.model_dump(mode="json") for item in contests]
    await cache.set_json(contest_list_cache_key(), payload, settings.contest_cache_ttl_seconds)
    return payload


@router.get("/contests/{contest_id}", response_model=ContestRead)
async def get_contest_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
):
    cache = CacheService(redis)
    key = contest_detail_cache_key(contest_id)
    cached = await cache.get_json(key)
    if cached is not None:
        return cached
    contest = await get_contest_read(db, contest_id)
    payload = contest.model_dump(mode="json")
    await cache.set_json(key, payload, settings.contest_cache_ttl_seconds)
    return payload


@router.post("/contests", response_model=ContestRead, status_code=201)
async def create_contest_endpoint(
    payload: ContestCreate,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest = await create_contest(db, payload, current_user, redis)
    return await get_contest_read(db, contest.id)


@router.patch("/contests/{contest_id}", response_model=ContestRead)
async def update_contest_endpoint(
    contest_id: str,
    payload: ContestPatch,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest = await update_contest(db, contest_id, payload, current_user, redis)
    return await get_contest_read(db, contest.id)


@router.post("/contests/{contest_id}/publish", response_model=ContestRead)
async def publish_contest_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest = await set_contest_status(db, contest_id, ContestStatus.PUBLISHED, current_user, redis)
    return await get_contest_read(db, contest.id)


@router.post("/contests/{contest_id}/close", response_model=ContestRead)
async def close_contest_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest = await set_contest_status(db, contest_id, ContestStatus.CLOSED, current_user, redis)
    return await get_contest_read(db, contest.id)


@router.post("/contests/{contest_id}/register", response_model=ContestRegistrationResponse)
async def register_contest_endpoint(
    contest_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
):
    await RateLimiter(redis, settings.rate_limit_fail_open).hit(
        "contest_registration",
        current_user.id,
        settings.registration_rate_limit,
        settings.registration_rate_window_seconds,
    )
    participant = await register_for_contest(db, contest_id, current_user, redis)
    return ContestRegistrationResponse(
        contest_id=participant.contest_id, user_id=participant.user_id, registered=True
    )


@router.get("/contests/{contest_id}/participants", response_model=List[ContestParticipantRead])
async def list_participants_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    del current_user
    result = await db.execute(
        select(ContestParticipant, User.username)
        .join(User, User.id == ContestParticipant.user_id)
        .where(ContestParticipant.contest_id == contest_id)
        .order_by(ContestParticipant.created_at.asc())
    )
    return [
        ContestParticipantRead(
            user_id=participant.user_id,
            username=username,
            total_score=participant.total_score,
            solved_count=participant.solved_count,
            penalty_seconds=participant.penalty_seconds,
            rank=participant.rank,
            registered_at=participant.created_at,
        )
        for participant, username in result.all()
    ]


@router.get("/me/contests", response_model=List[ContestRead], tags=["registration"])
async def my_contests_endpoint(
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
):
    cache = CacheService(redis)
    key = user_contests_cache_key(current_user.id)
    cached = await cache.get_json(key)
    if cached is not None:
        return cached
    result = await db.execute(
        select(Contest)
        .join(ContestParticipant, ContestParticipant.contest_id == Contest.id)
        .where(ContestParticipant.user_id == current_user.id)
        .order_by(Contest.start_time.desc())
    )
    rows = [ContestRead.model_validate(contest).model_dump(mode="json") for contest in result.scalars().all()]
    await cache.set_json(key, rows, settings.cache_default_ttl_seconds)
    return rows
