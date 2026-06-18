from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_optional_user, require_roles
from app.cache.redis import get_redis
from app.cache.service import CacheService, contest_problem_cache_key, problem_detail_cache_key
from app.core.config import Settings, get_settings
from app.db.enums import UserRole
from app.db.models import User
from app.db.session import get_db_session
from app.problems.schemas import (
    ContestProblemAttach,
    ContestProblemRead,
    ProblemCreate,
    ProblemListItem,
    ProblemPatch,
    ProblemRead,
)
from app.problems.service import (
    attach_problem_to_contest,
    create_problem,
    get_problem,
    list_contest_problems,
    list_problems,
    problem_to_read,
    update_problem,
)

router = APIRouter(tags=["problems"])


@router.get("/problems", response_model=List[ProblemListItem])
async def list_problem_endpoint(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_optional_user),
):
    include_hidden = bool(current_user and current_user.role in (UserRole.ADMIN, UserRole.ORGANIZER))
    return await list_problems(db, include_hidden=include_hidden)


@router.get("/problems/{problem_id_or_slug}", response_model=ProblemRead)
async def get_problem_endpoint(
    problem_id_or_slug: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
):
    cache = CacheService(redis)
    key = problem_detail_cache_key(problem_id_or_slug)
    cached = await cache.get_json(key)
    if cached is not None:
        return cached
    problem = await get_problem(db, problem_id_or_slug, include_hidden=False)
    payload = problem_to_read(problem).model_dump(mode="json")
    await cache.set_json(key, payload, settings.problem_cache_ttl_seconds)
    return payload


@router.post("/problems", response_model=ProblemRead, status_code=201)
async def create_problem_endpoint(
    payload: ProblemCreate,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    problem = await create_problem(db, payload, current_user, redis)
    return problem_to_read(problem)


@router.patch("/problems/{problem_id_or_slug}", response_model=ProblemRead)
async def update_problem_endpoint(
    problem_id_or_slug: str,
    payload: ProblemPatch,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    problem = await update_problem(db, problem_id_or_slug, payload, current_user, redis)
    return problem_to_read(problem)


@router.post("/contests/{contest_id}/problems", response_model=ContestProblemRead, status_code=201)
async def attach_problem_endpoint(
    contest_id: str,
    payload: ContestProblemAttach,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ORGANIZER)),
):
    contest_problem = await attach_problem_to_contest(db, contest_id, payload, current_user, redis)
    problems = await list_contest_problems(db, contest_id)
    return next(item for item in problems if item.id == contest_problem.id)


@router.get("/contests/{contest_id}/problems", response_model=List[ContestProblemRead])
async def list_contest_problem_endpoint(
    contest_id: str,
    db: AsyncSession = Depends(get_db_session),
    redis=Depends(get_redis),
    settings: Settings = Depends(get_settings),
):
    cache = CacheService(redis)
    key = contest_problem_cache_key(contest_id)
    cached = await cache.get_json(key)
    if cached is not None:
        return cached
    problems = await list_contest_problems(db, contest_id)
    payload = [problem.model_dump(mode="json") for problem in problems]
    await cache.set_json(key, payload, settings.contest_cache_ttl_seconds)
    return payload
