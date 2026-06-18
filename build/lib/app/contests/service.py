from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.service import (
    CacheService,
    contest_detail_cache_key,
    contest_list_cache_key,
    contest_problem_cache_key,
    user_contests_cache_key,
)
from app.contests.schemas import ContestCreate, ContestPatch, ContestRead
from app.core.time import ensure_utc, utc_now
from app.db.enums import ContestStatus, UserRole
from app.db.models import Contest, ContestParticipant, ContestProblem, User


async def invalidate_contest_cache(redis, contest_id: Optional[str] = None, user_id: Optional[str] = None) -> None:
    cache = CacheService(redis)
    await cache.delete(contest_list_cache_key())
    if contest_id:
        await cache.delete(contest_detail_cache_key(contest_id), contest_problem_cache_key(contest_id))
        await cache.delete_pattern("algorank:cache:leaderboard:%s*" % contest_id)
    if user_id:
        await cache.delete(user_contests_cache_key(user_id))


def assert_can_manage_contest(user: User, contest: Contest) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.ORGANIZER and contest.created_by_id == user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage this contest")


async def create_contest(db: AsyncSession, payload: ContestCreate, user: User, redis) -> Contest:
    contest = Contest(
        title=payload.title,
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        registration_deadline=payload.registration_deadline,
        allowed_languages=payload.allowed_languages,
        rules=payload.rules,
        status=ContestStatus.DRAFT,
        created_by_id=user.id,
    )
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    await invalidate_contest_cache(redis, contest.id)
    return contest


async def update_contest(
    db: AsyncSession,
    contest_id: str,
    payload: ContestPatch,
    user: User,
    redis,
) -> Contest:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    assert_can_manage_contest(user, contest)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contest, field, value)
    contest.version += 1
    await db.commit()
    await db.refresh(contest)
    await invalidate_contest_cache(redis, contest.id)
    return contest


async def set_contest_status(
    db: AsyncSession,
    contest_id: str,
    status_value: ContestStatus,
    user: User,
    redis,
) -> Contest:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    assert_can_manage_contest(user, contest)
    contest.status = status_value
    contest.version += 1
    await db.commit()
    await db.refresh(contest)
    await invalidate_contest_cache(redis, contest.id)
    return contest


def contest_to_read(contest: Contest, participant_count: int = 0, problem_count: int = 0) -> ContestRead:
    return ContestRead(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_deadline=contest.registration_deadline,
        status=contest.status,
        allowed_languages=list(contest.allowed_languages or []),
        rules=dict(contest.rules or {}),
        created_by_id=contest.created_by_id,
        participant_count=participant_count,
        problem_count=problem_count,
        created_at=contest.created_at,
        updated_at=contest.updated_at,
    )


async def list_contests(db: AsyncSession) -> List[ContestRead]:
    result = await db.execute(
        select(
            Contest,
            func.count(distinct(ContestParticipant.id)).label("participant_count"),
            func.count(distinct(ContestProblem.id)).label("problem_count"),
        )
        .outerjoin(ContestParticipant, ContestParticipant.contest_id == Contest.id)
        .outerjoin(ContestProblem, ContestProblem.contest_id == Contest.id)
        .group_by(Contest.id)
        .order_by(Contest.start_time.desc())
    )
    return [
        contest_to_read(contest, int(participant_count or 0), int(problem_count or 0))
        for contest, participant_count, problem_count in result.all()
    ]


async def get_contest_or_404(db: AsyncSession, contest_id: str) -> Contest:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    return contest


async def get_contest_read(db: AsyncSession, contest_id: str) -> ContestRead:
    result = await db.execute(
        select(
            Contest,
            func.count(distinct(ContestParticipant.id)).label("participant_count"),
            func.count(distinct(ContestProblem.id)).label("problem_count"),
        )
        .outerjoin(ContestParticipant, ContestParticipant.contest_id == Contest.id)
        .outerjoin(ContestProblem, ContestProblem.contest_id == Contest.id)
        .where(Contest.id == contest_id)
        .group_by(Contest.id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    return contest_to_read(row[0], int(row[1] or 0), int(row[2] or 0))


async def register_for_contest(db: AsyncSession, contest_id: str, user: User, redis) -> ContestParticipant:
    result = await db.execute(select(Contest).where(Contest.id == contest_id).with_for_update())
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    now = utc_now()
    if contest.status != ContestStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contest is not open")
    if contest.registration_deadline and now > ensure_utc(contest.registration_deadline):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration deadline has passed")
    if now > ensure_utc(contest.end_time):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contest has ended")

    participant = ContestParticipant(contest_id=contest.id, user_id=user.id)
    db.add(participant)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered for this contest",
        ) from exc
    await db.refresh(participant)
    await invalidate_contest_cache(redis, contest.id, user.id)
    return participant
