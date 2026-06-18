from typing import Any, Dict, List

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.service import CacheService, leaderboard_cache_key
from app.core.time import ensure_utc
from app.db.enums import SubmissionStatus
from app.db.models import (
    Contest,
    ContestParticipant,
    ContestProblem,
    LeaderboardSnapshot,
    Submission,
    User,
)


def leaderboard_zset_key(contest_id: str) -> str:
    return "algorank:leaderboard:%s" % contest_id


def leaderboard_hash_key(contest_id: str, user_id: str) -> str:
    return "algorank:leaderboard:%s:user:%s" % (contest_id, user_id)


def redis_score(total_score: int, penalty_seconds: int) -> float:
    return float((total_score * 1_000_000_000) - penalty_seconds)


class LeaderboardService:
    def __init__(self, redis):
        self.redis = redis

    async def update_participant(self, participant: ContestParticipant, username: str) -> None:
        zset_key = leaderboard_zset_key(participant.contest_id)
        summary = {
            "user_id": participant.user_id,
            "username": username,
            "total_score": str(participant.total_score),
            "solved_count": str(participant.solved_count),
            "penalty_seconds": str(participant.penalty_seconds),
            "last_accepted_at": participant.last_accepted_at.isoformat()
            if participant.last_accepted_at
            else "",
        }
        await self.redis.zadd(
            zset_key,
            {participant.user_id: redis_score(participant.total_score, participant.penalty_seconds)},
        )
        await self.redis.hset(leaderboard_hash_key(participant.contest_id, participant.user_id), mapping=summary)
        await self.redis.delete(leaderboard_cache_key(participant.contest_id))

    async def get_live(self, contest_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        rows = await self.redis.zrevrange(leaderboard_zset_key(contest_id), 0, limit - 1, withscores=True)
        leaderboard: List[Dict[str, Any]] = []
        for index, item in enumerate(rows, start=1):
            user_id = item[0]
            raw = await self.redis.hgetall(leaderboard_hash_key(contest_id, user_id))
            if not raw:
                continue
            leaderboard.append(
                {
                    "rank": index,
                    "user_id": raw["user_id"],
                    "username": raw["username"],
                    "total_score": int(raw["total_score"]),
                    "solved_count": int(raw["solved_count"]),
                    "penalty_seconds": int(raw["penalty_seconds"]),
                    "last_accepted_at": raw.get("last_accepted_at") or None,
                }
            )
        return leaderboard


async def durable_leaderboard_query(contest_id: str) -> Select:
    del contest_id
    return (
        select(ContestParticipant, User.username)
        .join(User, User.id == ContestParticipant.user_id)
        .order_by(
            ContestParticipant.total_score.desc(),
            ContestParticipant.penalty_seconds.asc(),
            ContestParticipant.last_accepted_at.asc().nulls_last(),
            User.username.asc(),
        )
    )


async def get_durable_leaderboard(db: AsyncSession, contest_id: str) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(ContestParticipant, User.username)
        .join(User, User.id == ContestParticipant.user_id)
        .where(ContestParticipant.contest_id == contest_id)
        .order_by(
            ContestParticipant.total_score.desc(),
            ContestParticipant.penalty_seconds.asc(),
            ContestParticipant.last_accepted_at.asc().nulls_last(),
            User.username.asc(),
        )
    )
    rows: List[Dict[str, Any]] = []
    for rank, (participant, username) in enumerate(result.all(), start=1):
        rows.append(
            {
                "rank": rank,
                "user_id": participant.user_id,
                "username": username,
                "total_score": participant.total_score,
                "solved_count": participant.solved_count,
                "penalty_seconds": participant.penalty_seconds,
                "last_accepted_at": participant.last_accepted_at,
            }
        )
    return rows


async def rebuild_leaderboard_from_db(db: AsyncSession, redis, contest_id: str) -> List[Dict[str, Any]]:
    service = LeaderboardService(redis)
    result = await db.execute(
        select(ContestParticipant, User.username)
        .join(User, User.id == ContestParticipant.user_id)
        .where(ContestParticipant.contest_id == contest_id)
        .order_by(
            ContestParticipant.total_score.desc(),
            ContestParticipant.penalty_seconds.asc(),
            ContestParticipant.last_accepted_at.asc().nulls_last(),
            User.username.asc(),
        )
    )
    await redis.delete(leaderboard_zset_key(contest_id))
    rows = []
    for rank, (participant, username) in enumerate(result.all(), start=1):
        participant.rank = rank
        await service.update_participant(participant, username)
        rows.append(
            {
                "rank": rank,
                "user_id": participant.user_id,
                "username": username,
                "total_score": participant.total_score,
                "solved_count": participant.solved_count,
                "penalty_seconds": participant.penalty_seconds,
                "last_accepted_at": participant.last_accepted_at,
            }
        )
    await db.commit()
    return rows


async def snapshot_leaderboard(
    db: AsyncSession, redis, contest_id: str, reason: str = "manual"
) -> LeaderboardSnapshot:
    rows = await get_durable_leaderboard(db, contest_id)
    snapshot = LeaderboardSnapshot(contest_id=contest_id, reason=reason, snapshot=rows)
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    await CacheService(redis).delete(leaderboard_cache_key(contest_id))
    return snapshot


async def recompute_participant_score(
    db: AsyncSession,
    contest: Contest,
    participant: ContestParticipant,
) -> ContestParticipant:
    contest_problem_result = await db.execute(
        select(ContestProblem)
        .where(ContestProblem.contest_id == contest.id)
        .options(selectinload(ContestProblem.problem))
    )
    contest_problems = contest_problem_result.scalars().all()

    total_score = 0
    solved_count = 0
    penalty_seconds = 0
    last_accepted_at = None

    for contest_problem in contest_problems:
        accepted_result = await db.execute(
            select(Submission)
            .where(
                Submission.contest_id == contest.id,
                Submission.problem_id == contest_problem.problem_id,
                Submission.user_id == participant.user_id,
                Submission.status == SubmissionStatus.ACCEPTED,
            )
            .order_by(Submission.completed_at.asc().nulls_last(), Submission.created_at.asc())
            .limit(1)
        )
        first_accepted = accepted_result.scalar_one_or_none()
        if not first_accepted:
            continue

        wrong_count_result = await db.execute(
            select(func.count(Submission.id)).where(
                Submission.contest_id == contest.id,
                Submission.problem_id == contest_problem.problem_id,
                Submission.user_id == participant.user_id,
                Submission.status != SubmissionStatus.ACCEPTED,
                Submission.created_at < first_accepted.created_at,
            )
        )
        wrong_count = int(wrong_count_result.scalar_one() or 0)
        accepted_time = first_accepted.completed_at or first_accepted.created_at
        elapsed = max(0, int((ensure_utc(accepted_time) - ensure_utc(contest.start_time)).total_seconds()))

        total_score += contest_problem.points
        solved_count += 1
        penalty_seconds += elapsed + wrong_count * 20 * 60
        if last_accepted_at is None or accepted_time > last_accepted_at:
            last_accepted_at = accepted_time

    participant.total_score = total_score
    participant.solved_count = solved_count
    participant.penalty_seconds = penalty_seconds
    participant.last_accepted_at = last_accepted_at
    participant.version += 1
    return participant
