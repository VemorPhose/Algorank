from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user, require_roles
from app.cache.redis import get_redis
from app.core.config import Settings, get_settings
from app.db.enums import UserRole
from app.db.models import Contest, Submission, User
from app.db.session import get_db_session
from app.rate_limit.service import RateLimiter
from app.submissions.schemas import SubmissionCreate, SubmissionQueuedResponse, SubmissionRead
from app.submissions.service import (
    can_view_submission,
    create_submission,
    get_submission_for_read,
    submission_to_read,
)

router = APIRouter(tags=["submissions"])


@router.post("/submissions", response_model=SubmissionQueuedResponse, status_code=202)
async def create_submission_endpoint(
    payload: SubmissionCreate,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
):
    await RateLimiter(redis, settings.rate_limit_fail_open).hit(
        "submission",
        current_user.id,
        settings.submission_rate_limit,
        settings.submission_rate_window_seconds,
    )
    submission, queued = await create_submission(
        db, redis, payload, current_user, settings, idempotency_key=idempotency_key
    )
    response = submission_to_read(submission).model_dump()
    response["queued"] = queued
    return response


@router.get("/submissions/{submission_id}", response_model=SubmissionRead)
async def get_submission_endpoint(
    submission_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    submission = await get_submission_for_read(db, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if not can_view_submission(current_user, submission):
        contest = await db.get(Contest, submission.contest_id)
        if not (
            current_user.role == UserRole.ORGANIZER
            and contest is not None
            and contest.created_by_id == current_user.id
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view this submission")
    return submission_to_read(submission)


@router.get("/me/submissions", response_model=List[SubmissionRead])
async def my_submissions_endpoint(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.test_results))
        .where(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(100)
    )
    return [submission_to_read(submission) for submission in result.scalars().all()]


@router.get("/contests/{contest_id}/submissions", response_model=List[SubmissionRead])
async def contest_submissions_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest = await db.get(Contest, contest_id)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    if current_user.role != UserRole.ADMIN and contest.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view contest submissions")
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.test_results))
        .where(Submission.contest_id == contest_id)
        .order_by(Submission.created_at.desc())
        .limit(500)
    )
    return [submission_to_read(submission) for submission in result.scalars().all()]
