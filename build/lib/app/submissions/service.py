from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.service import CacheService, leaderboard_cache_key
from app.core.config import Settings
from app.core.time import ensure_utc, utc_now
from app.db.enums import ContestStatus, SubmissionJobStatus, SubmissionStatus, UserRole
from app.db.models import (
    Contest,
    ContestParticipant,
    ContestProblem,
    Problem,
    ProblemTestCase,
    Submission,
    SubmissionJob,
    SubmissionTestResult,
    User,
)
from app.leaderboard.service import LeaderboardService, recompute_participant_score
from app.submissions.judge0 import Judge0Client, Judge0Error, submission_status_from_judge0
from app.submissions.queue import SubmissionJobEnvelope, SubmissionQueue
from app.submissions.schemas import SubmissionCreate, SubmissionRead, SubmissionTestResultRead

TERMINAL_STATUSES = {
    SubmissionStatus.ACCEPTED,
    SubmissionStatus.WRONG_ANSWER,
    SubmissionStatus.TIME_LIMIT_EXCEEDED,
    SubmissionStatus.COMPILATION_ERROR,
    SubmissionStatus.RUNTIME_ERROR,
    SubmissionStatus.INTERNAL_ERROR,
    SubmissionStatus.CANCELLED,
}


def submission_to_read(submission: Submission) -> SubmissionRead:
    return SubmissionRead(
        id=submission.id,
        contest_id=submission.contest_id,
        problem_id=submission.problem_id,
        user_id=submission.user_id,
        language=submission.language,
        status=submission.status,
        idempotency_key=submission.idempotency_key,
        points_awarded=submission.points_awarded,
        max_time_ms=submission.max_time_ms,
        max_memory_kb=submission.max_memory_kb,
        error_message=submission.error_message,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
        started_at=submission.started_at,
        completed_at=submission.completed_at,
        test_results=[
            SubmissionTestResultRead.model_validate(result) for result in submission.test_results
        ],
    )


async def get_submission_for_read(db: AsyncSession, submission_id: str) -> Optional[Submission]:
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.test_results))
        .where(Submission.id == submission_id)
    )
    return result.scalar_one_or_none()


async def create_submission(
    db: AsyncSession,
    redis,
    payload: SubmissionCreate,
    user: User,
    settings: Settings,
    idempotency_key: Optional[str] = None,
) -> Tuple[Submission, bool]:
    if payload.language not in settings.allowed_languages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported language")

    if idempotency_key:
        existing_result = await db.execute(
            select(Submission)
            .options(selectinload(Submission.test_results))
            .where(
                Submission.user_id == user.id,
                Submission.idempotency_key == idempotency_key,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing is not None:
            return existing, False

    contest_result = await db.execute(select(Contest).where(Contest.id == payload.contest_id).with_for_update())
    contest = contest_result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    now = utc_now()
    if contest.status != ContestStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contest is not accepting submissions")
    if now < ensure_utc(contest.start_time):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contest has not started")
    if now > ensure_utc(contest.end_time):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contest has ended")
    if contest.allowed_languages and payload.language not in contest.allowed_languages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not allowed in this contest")

    participant_result = await db.execute(
        select(ContestParticipant)
        .where(
            ContestParticipant.contest_id == contest.id,
            ContestParticipant.user_id == user.id,
        )
        .with_for_update()
    )
    participant = participant_result.scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Register for the contest first")

    contest_problem_result = await db.execute(
        select(ContestProblem).where(
            ContestProblem.contest_id == contest.id,
            ContestProblem.problem_id == payload.problem_id,
        )
    )
    contest_problem = contest_problem_result.scalar_one_or_none()
    if contest_problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem is not in this contest")

    submission = Submission(
        contest_id=contest.id,
        problem_id=payload.problem_id,
        user_id=user.id,
        idempotency_key=idempotency_key,
        language=payload.language,
        code=payload.code,
        status=SubmissionStatus.QUEUED,
    )
    db.add(submission)
    await db.flush()
    job = SubmissionJob(
        submission_id=submission.id,
        status=SubmissionJobStatus.QUEUED,
        max_attempts=settings.worker_max_attempts,
    )
    db.add(job)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if idempotency_key:
            existing_result = await db.execute(
                select(Submission)
                .options(selectinload(Submission.test_results))
                .where(
                    Submission.user_id == user.id,
                    Submission.idempotency_key == idempotency_key,
                )
            )
            existing = existing_result.scalar_one_or_none()
            if existing is not None:
                return existing, False
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate submission") from exc
    await db.refresh(submission)
    await db.refresh(job)
    await SubmissionQueue(redis, settings).enqueue(SubmissionJobEnvelope(submission.id, job.id))
    await CacheService(redis).delete(leaderboard_cache_key(contest.id))
    submission_with_results = await get_submission_for_read(db, submission.id)
    assert submission_with_results is not None
    return submission_with_results, True


async def load_submission_for_worker(db: AsyncSession, submission_id: str) -> Submission:
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.problem).selectinload(Problem.test_cases),
            selectinload(Submission.contest),
            selectinload(Submission.user),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise Judge0Error("Submission not found: %s" % submission_id)
    return submission


async def mark_job_processing(
    db: AsyncSession,
    submission_id: str,
    job_id: str,
    worker_id: str,
) -> bool:
    result = await db.execute(select(SubmissionJob).where(SubmissionJob.id == job_id).with_for_update())
    job = result.scalar_one_or_none()
    if job is None:
        raise Judge0Error("Submission job not found: %s" % job_id)
    submission = await db.get(Submission, submission_id)
    if submission is None:
        raise Judge0Error("Submission not found: %s" % submission_id)
    if job.status == SubmissionJobStatus.COMPLETED or submission.status in TERMINAL_STATUSES:
        return False
    job.status = SubmissionJobStatus.PROCESSING
    job.attempts += 1
    job.locked_by = worker_id
    job.locked_until = None
    submission.status = SubmissionStatus.PROCESSING
    if submission.started_at is None:
        submission.started_at = utc_now()
    await db.commit()
    return True


async def persist_internal_error(
    db: AsyncSession,
    redis,
    submission_id: str,
    job_id: str,
    error: str,
) -> None:
    result = await db.execute(select(Submission).where(Submission.id == submission_id).with_for_update())
    submission = result.scalar_one_or_none()
    if submission is None:
        return
    job = await db.get(SubmissionJob, job_id)
    submission.status = SubmissionStatus.INTERNAL_ERROR
    submission.error_message = error[:2000]
    submission.completed_at = utc_now()
    if job:
        job.status = SubmissionJobStatus.FAILED
        job.last_error = error[:2000]
        job.locked_by = None
    await db.commit()
    await CacheService(redis).delete(leaderboard_cache_key(submission.contest_id))


async def persist_judge_results(
    db: AsyncSession,
    redis,
    submission_id: str,
    job_id: str,
    judge_results: List[dict],
) -> Submission:
    submission_result = await db.execute(
        select(Submission).where(Submission.id == submission_id).with_for_update()
    )
    submission = submission_result.scalar_one_or_none()
    if submission is None:
        raise Judge0Error("Submission not found: %s" % submission_id)
    if submission.status in TERMINAL_STATUSES:
        return submission

    contest = await db.get(Contest, submission.contest_id)
    problem = await db.get(Problem, submission.problem_id)
    user = await db.get(User, submission.user_id)
    job = await db.get(SubmissionJob, job_id)
    if contest is None or problem is None or user is None or job is None:
        raise Judge0Error("Submission has missing relational state")

    test_cases_result = await db.execute(
        select(ProblemTestCase)
        .where(ProblemTestCase.problem_id == problem.id)
        .order_by(ProblemTestCase.ordinal.asc())
    )
    test_cases = test_cases_result.scalars().all()
    await db.execute(delete(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission.id))

    final_status = SubmissionStatus.ACCEPTED
    max_time_ms = 0
    max_memory_kb = 0
    judge_tokens = []
    for index, judge_result in enumerate(judge_results, start=1):
        status_value = submission_status_from_judge0(int(judge_result.get("status_id") or 0))
        if final_status == SubmissionStatus.ACCEPTED and status_value != SubmissionStatus.ACCEPTED:
            final_status = status_value
        max_time_ms = max(max_time_ms, int(judge_result.get("time_ms") or 0))
        max_memory_kb = max(max_memory_kb, int(judge_result.get("memory_kb") or 0))
        judge_tokens.append(judge_result.get("token"))
        test_case = test_cases[index - 1] if index - 1 < len(test_cases) else None
        db.add(
            SubmissionTestResult(
                submission_id=submission.id,
                problem_test_case_id=test_case.id if test_case else None,
                test_case_number=index,
                passed=status_value == SubmissionStatus.ACCEPTED,
                status=status_value.value,
                verdict=judge_result.get("verdict") or status_value.value,
                time_ms=int(judge_result.get("time_ms") or 0),
                memory_kb=int(judge_result.get("memory_kb") or 0),
                stdout=judge_result.get("stdout"),
                stderr=judge_result.get("stderr"),
                compile_output=judge_result.get("compile_output"),
                message=judge_result.get("message"),
                judge0_token=judge_result.get("token"),
            )
        )

    prior_accepted_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.problem_id == submission.problem_id,
            Submission.user_id == submission.user_id,
            Submission.id != submission.id,
            Submission.status == SubmissionStatus.ACCEPTED,
        )
    )
    had_prior_problem_accept = int(prior_accepted_result.scalar_one() or 0) > 0

    contest_problem_result = await db.execute(
        select(ContestProblem).where(
            ContestProblem.contest_id == submission.contest_id,
            ContestProblem.problem_id == submission.problem_id,
        )
    )
    contest_problem = contest_problem_result.scalar_one()
    submission.status = final_status
    submission.max_time_ms = max_time_ms
    submission.max_memory_kb = max_memory_kb
    submission.judge0_batch_tokens = [token for token in judge_tokens if token]
    submission.completed_at = utc_now()
    submission.points_awarded = contest_problem.points if final_status == SubmissionStatus.ACCEPTED else 0
    submission.error_message = None if final_status == SubmissionStatus.ACCEPTED else final_status.value

    if final_status == SubmissionStatus.ACCEPTED and not had_prior_problem_accept:
        problem.solved_count += 1

    await db.flush()

    participant_result = await db.execute(
        select(ContestParticipant)
        .where(
            ContestParticipant.contest_id == submission.contest_id,
            ContestParticipant.user_id == submission.user_id,
        )
        .with_for_update()
    )
    participant = participant_result.scalar_one()
    await recompute_participant_score(db, contest, participant)

    job.status = SubmissionJobStatus.COMPLETED
    job.locked_by = None
    job.locked_until = None
    job.last_error = None

    await db.commit()
    await db.refresh(submission)
    await LeaderboardService(redis).update_participant(participant, user.username)
    return submission


async def process_submission_job(
    db: AsyncSession,
    redis,
    envelope: SubmissionJobEnvelope,
    judge0_client: Judge0Client,
    worker_id: str,
) -> Submission:
    should_process = await mark_job_processing(db, envelope.submission_id, envelope.job_id, worker_id)
    submission = await load_submission_for_worker(db, envelope.submission_id)
    if not should_process:
        return submission
    try:
        judge_results = await judge0_client.run_submission(
            submission.problem,
            submission.code,
            submission.language,
            submission.problem.test_cases,
        )
    except Judge0Error:
        raise
    except Exception as exc:
        raise Judge0Error(str(exc)) from exc
    return await persist_judge_results(db, redis, envelope.submission_id, envelope.job_id, judge_results)


def can_view_submission(user: User, submission: Submission) -> bool:
    return user.role == UserRole.ADMIN or user.id == submission.user_id
