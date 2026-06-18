#!/usr/bin/env python3
"""
Seed the database with problems from the algorank-problems/ directory.

For each problem directory under algorank-problems/problems/, this script:
  - Reads metadata.json (slug, title, difficulty, tags, limits)
  - Reads description.md (problem statement)
  - Reads testcases/inputs/ and testcases/outputs/ (stdin / expected output)
  - Upserts into the problems + problem_test_cases tables
  - Marks the first test case as the public sample (is_sample = True)

Usage:
    # From the project root, after installing dependencies:
    python scripts/seed_problems.py

    # Override the database URL via environment:
    DATABASE_URL=postgresql+asyncpg://... python scripts/seed_problems.py

    # When running inside Docker (the seed runs automatically on API start):
    # It is already wired into the API container command.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure the project root is on sys.path so app.* imports work.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.enums import UserRole  # noqa: E402
from app.db.models import Problem, ProblemTestCase, User  # noqa: E402
from app.db.session import dispose_engine, get_session_factory, init_engine  # noqa: E402

PROBLEMS_DIR = _PROJECT_ROOT / "algorank-problems" / "problems"


def _read_text(path: Path) -> str:
    """Read a file, strip surrounding whitespace, return empty string on failure."""
    try:
        return path.read_text().strip()
    except (OSError, UnicodeDecodeError):
        return ""


async def _get_or_create_admin(db: AsyncSession) -> Optional[User]:
    """
    Return an existing admin user, preferring the bootstrap admin from settings.
    Returns None if no admin exists (caller should warn and exit).
    """
    settings = get_settings()

    # Try the configured bootstrap admin email first.
    if settings.bootstrap_admin_email:
        result = await db.execute(
            select(User).where(User.email == settings.bootstrap_admin_email.lower())
        )
        user = result.scalar_one_or_none()
        if user is not None:
            return user

    # Fallback: any user with admin role.
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    return result.scalar_one_or_none()


def _metadata_json(path: Path) -> dict:
    """Parse metadata.json, returning defaults for every known key."""
    defaults: dict = {
        "title": "",
        "difficulty": None,
        "tags": [],
        "timeLimit": 2000,
        "memoryLimit": 128000,
        "hidden": False,
    }
    if path.is_file():
        try:
            data = json.loads(path.read_text())
            defaults.update(data)
        except (json.JSONDecodeError, OSError):
            pass
    return defaults


async def seed_problems() -> int:
    """
    Main entry-point.  Returns 0 on success, 1 on partial failure.
    """
    settings = get_settings()

    print(f"Seeding problems from {PROBLEMS_DIR} …")
    print(f"  Database URL: {settings.database_url}")

    if not PROBLEMS_DIR.is_dir():
        print(f"ERROR: problems directory not found: {PROBLEMS_DIR}")
        return 1

    init_engine(settings.database_url)
    session_factory = get_session_factory()

    total_problems = 0
    total_test_cases = 0
    errors: list[str] = []

    async with session_factory() as db:
        admin = await _get_or_create_admin(db)
        if admin is None:
            print(
                "ERROR: No admin user found in the database.\n"
                "  Start the API first so the bootstrap admin is created, then re-run this script."
            )
            return 1
        created_by_id: str = admin.id
        print(f"  Owner (created_by): {admin.email}  id={created_by_id}")

        for problem_dir in sorted(PROBLEMS_DIR.iterdir()):
            if not problem_dir.is_dir():
                continue

            slug = problem_dir.name
            metadata_path = problem_dir / "metadata.json"
            desc_path = problem_dir / "description.md"
            inputs_dir = problem_dir / "testcases" / "inputs"
            outputs_dir = problem_dir / "testcases" / "outputs"

            if not metadata_path.is_file():
                print(f"  SKIP {slug}: metadata.json missing")
                continue

            meta = _metadata_json(metadata_path)
            statement = _read_text(desc_path)

            # ---- Upsert problem -------------------------------------------------
            result = await db.execute(select(Problem).where(Problem.slug == slug))
            problem: Optional[Problem] = result.scalar_one_or_none()

            if problem is not None:
                # Update existing problem fields.
                problem.title = meta.get("title", slug)
                problem.statement = statement
                problem.difficulty = meta.get("difficulty")
                problem.tags = meta.get("tags", [])
                problem.time_limit_ms = meta.get("timeLimit", 2000)
                problem.memory_limit_kb = meta.get("memoryLimit", 128000)
                problem.hidden = meta.get("hidden", False)
                action = "UPDATED"
            else:
                problem = Problem(
                    slug=slug,
                    title=meta.get("title", slug),
                    statement=statement,
                    difficulty=meta.get("difficulty"),
                    tags=meta.get("tags", []),
                    time_limit_ms=meta.get("timeLimit", 2000),
                    memory_limit_kb=meta.get("memoryLimit", 128000),
                    hidden=meta.get("hidden", False),
                    created_by_id=created_by_id,
                )
                db.add(problem)
                action = "CREATED"

            await db.flush()  # populate problem.id

            # ---- Replace test cases ----------------------------------------------
            # Remove old test cases for this problem.
            await db.execute(
                delete(ProblemTestCase).where(ProblemTestCase.problem_id == problem.id)
            )

            # Collect matching input / output file pairs.
            if inputs_dir.is_dir() and outputs_dir.is_dir():
                input_files = sorted(
                    f for f in inputs_dir.iterdir() if f.is_file() and f.name.startswith("input")
                )
                case_count = 0
                for idx, infile in enumerate(input_files, start=1):
                    # Determine the corresponding output filename (input1.txt → output1.txt).
                    suffix = infile.name[len("input"):]  # e.g. "1.txt"
                    outfile = outputs_dir / f"output{suffix}"

                    if not outfile.is_file():
                        print(f"    WARN: no matching output for {infile.name}")
                        continue

                    stdin = _read_text(infile)
                    expected = _read_text(outfile)

                    tc = ProblemTestCase(
                        problem_id=problem.id,
                        ordinal=idx,
                        stdin=stdin,
                        expected_output=expected,
                        is_sample=(idx == 1),
                    )
                    db.add(tc)
                    case_count += 1

                total_test_cases += case_count
                print(f"  {action} {slug} ({case_count} test cases)")
            else:
                print(f"  {action} {slug} (0 test cases — inputs/ or outputs/ missing)")

            total_problems += 1

        try:
            await db.commit()
        except Exception as exc:
            errors.append(f"Commit failed: {exc}")
            await db.rollback()

    await dispose_engine()

    print(f"\nDone.  {total_problems} problems, {total_test_cases} test cases seeded.")
    if errors:
        for err in errors:
            print(f"  ERROR: {err}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(seed_problems()))
