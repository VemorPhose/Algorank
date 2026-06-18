from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import router as admin_router
from app.api.health import router as health_router
from app.auth.router import router as auth_router
from app.cache.redis import close_redis, init_redis
from app.contests.router import router as contests_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.core.time import utc_now
from app.db.enums import UserRole
from app.db.models import User
from app.db.session import dispose_engine, get_session_factory, init_engine
from app.leaderboard.router import router as leaderboard_router
from app.problems.router import router as problems_router
from app.submissions.router import router as submissions_router


async def bootstrap_admin(settings: Settings) -> None:
    if not settings.bootstrap_admin_email or not settings.bootstrap_admin_password:
        return
    session_factory = get_session_factory()
    async with session_factory() as db:
        assert isinstance(db, AsyncSession)
        result = await db.execute(
            select(User).where(User.email == settings.bootstrap_admin_email.lower())
        )
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=settings.bootstrap_admin_email.lower(),
                username=settings.bootstrap_admin_email.split("@", 1)[0],
                password_hash=hash_password(settings.bootstrap_admin_password),
                role=UserRole.ADMIN,
                last_seen_at=utc_now(),
            )
            db.add(user)
        else:
            user.password_hash = hash_password(settings.bootstrap_admin_password)
            user.role = UserRole.ADMIN
            user.is_active = True
        await db.commit()


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        del app
        init_engine(resolved_settings.database_url)
        init_redis(resolved_settings.redis_url)
        await bootstrap_admin(resolved_settings)
        try:
            yield
        finally:
            await close_redis()
            await dispose_engine()

    app = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="Backend-first contest hosting platform with PostgreSQL, Redis, Judge0, and Nginx.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(contests_router)
    app.include_router(problems_router)
    app.include_router(submissions_router)
    app.include_router(leaderboard_router)
    app.include_router(admin_router)
    return app


app = create_app()
