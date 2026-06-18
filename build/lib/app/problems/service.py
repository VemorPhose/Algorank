from typing import List

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.service import CacheService, contest_problem_cache_key, problem_detail_cache_key
from app.contests.service import assert_can_manage_contest, invalidate_contest_cache
from app.db.models import Contest, ContestProblem, Problem, ProblemTestCase, User
from app.problems.schemas import (
    ContestProblemAttach,
    ContestProblemRead,
    ProblemCreate,
    ProblemListItem,
    ProblemPatch,
    ProblemRead,
    ProblemTestCaseRead,
)


def problem_to_read(problem: Problem) -> ProblemRead:
    samples = [case for case in problem.test_cases if case.is_sample]
    return ProblemRead(
        id=problem.id,
        slug=problem.slug,
        title=problem.title,
        statement=problem.statement,
        difficulty=problem.difficulty,
        tags=list(problem.tags or []),
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
        hidden=problem.hidden,
        solved_count=problem.solved_count,
        sample_test_cases=[ProblemTestCaseRead.model_validate(case) for case in samples],
        test_case_count=len(problem.test_cases),
        created_at=problem.created_at,
        updated_at=problem.updated_at,
    )


async def list_problems(db: AsyncSession, include_hidden: bool = False) -> List[ProblemListItem]:
    query = select(Problem).order_by(Problem.created_at.desc())
    if not include_hidden:
        query = query.where(Problem.hidden.is_(False))
    result = await db.execute(query)
    return [ProblemListItem.model_validate(problem) for problem in result.scalars().all()]


async def get_problem(db: AsyncSession, problem_id_or_slug: str, include_hidden: bool = False) -> Problem:
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.test_cases))
        .where(or_(Problem.id == problem_id_or_slug, Problem.slug == problem_id_or_slug))
    )
    problem = result.scalar_one_or_none()
    if problem is None or (problem.hidden and not include_hidden):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


def replace_test_cases(problem: Problem, test_cases) -> None:
    problem.test_cases.clear()
    for index, case in enumerate(test_cases or [], start=1):
        problem.test_cases.append(
            ProblemTestCase(
                ordinal=index,
                stdin=case.stdin,
                expected_output=case.expected_output,
                is_sample=case.is_sample,
            )
        )


async def create_problem(db: AsyncSession, payload: ProblemCreate, user: User, redis) -> Problem:
    problem = Problem(
        slug=payload.slug,
        title=payload.title,
        statement=payload.statement,
        difficulty=payload.difficulty,
        tags=payload.tags,
        time_limit_ms=payload.time_limit_ms,
        memory_limit_kb=payload.memory_limit_kb,
        hidden=payload.hidden,
        created_by_id=user.id,
    )
    replace_test_cases(problem, payload.test_cases)
    db.add(problem)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Problem slug already exists") from exc
    await db.refresh(problem)
    await CacheService(redis).delete_pattern("algorank:cache:problems:*")
    return await get_problem(db, problem.id, include_hidden=True)


async def update_problem(
    db: AsyncSession,
    problem_id_or_slug: str,
    payload: ProblemPatch,
    user: User,
    redis,
) -> Problem:
    del user
    problem = await get_problem(db, problem_id_or_slug, include_hidden=True)
    data = payload.model_dump(exclude_unset=True)
    test_cases = data.pop("test_cases", None)
    for field, value in data.items():
        setattr(problem, field, value)
    if test_cases is not None:
        replace_test_cases(problem, payload.test_cases)
    await db.commit()
    await db.refresh(problem)
    await CacheService(redis).delete(problem_detail_cache_key(problem.id), problem_detail_cache_key(problem.slug))
    return await get_problem(db, problem.id, include_hidden=True)


async def attach_problem_to_contest(
    db: AsyncSession,
    contest_id: str,
    payload: ContestProblemAttach,
    user: User,
    redis,
) -> ContestProblem:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    assert_can_manage_contest(user, contest)

    problem = await get_problem(db, payload.problem_id, include_hidden=True)
    contest_problem = ContestProblem(
        contest_id=contest.id,
        problem_id=problem.id,
        points=payload.points,
        order_index=payload.order_index,
    )
    db.add(contest_problem)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Problem already attached or order is used") from exc
    await db.refresh(contest_problem)
    await invalidate_contest_cache(redis, contest.id)
    await CacheService(redis).delete(contest_problem_cache_key(contest.id))
    return contest_problem


async def list_contest_problems(db: AsyncSession, contest_id: str) -> List[ContestProblemRead]:
    result = await db.execute(
        select(ContestProblem, Problem)
        .join(Problem, Problem.id == ContestProblem.problem_id)
        .where(ContestProblem.contest_id == contest_id)
        .order_by(ContestProblem.order_index.asc())
    )
    return [
        ContestProblemRead(
            id=contest_problem.id,
            contest_id=contest_problem.contest_id,
            problem_id=problem.id,
            slug=problem.slug,
            title=problem.title,
            points=contest_problem.points,
            order_index=contest_problem.order_index,
        )
        for contest_problem, problem in result.all()
    ]
