from datetime import timedelta
from typing import AsyncIterator, Dict

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import get_redis
from app.core.config import Settings, get_settings
from app.core.time import utc_now
from app.db.base import Base
from app.db.session import (
    dispose_engine,
    get_db_session,
    get_session_factory,
    init_engine,
)
from app.main import create_app
from tests.fakes import FakeRedis


@pytest.fixture
async def test_context(tmp_path) -> AsyncIterator[Dict[str, object]]:
    db_path = tmp_path / "algorank-test.db"
    settings = Settings(
        app_env="test",
        database_url="sqlite+aiosqlite:///%s" % db_path,
        redis_url="redis://fake-redis/0",
        jwt_secret="test-secret-key",
        bootstrap_admin_email=None,
        bootstrap_admin_password=None,
        submission_rate_limit=20,
        login_rate_limit=20,
        registration_rate_limit=20,
        leaderboard_rate_limit=200,
    )
    engine = init_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fake_redis = FakeRedis()
    app = create_app(settings)

    async def override_db() -> AsyncIterator[AsyncSession]:
        session_factory = get_session_factory()
        async with session_factory() as session:
            yield session

    async def override_redis():
        yield fake_redis

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_redis] = override_redis
    app.dependency_overrides[get_settings] = lambda: settings

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield {"app": app, "client": client, "redis": fake_redis, "settings": settings}

    app.dependency_overrides.clear()
    await dispose_engine()


@pytest.fixture
async def client(test_context):
    return test_context["client"]


async def register_user(client, email: str, username: str, password: str = "password123", role=None):
    payload = {"email": email, "username": username, "password": password}
    if role:
        payload["role"] = role
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def auth_headers(client, email: str, username: str, role=None):
    token = await register_user(client, email, username, role=role)
    return {"Authorization": "Bearer %s" % token["access_token"]}, token


async def create_active_contest(client, headers, title: str = "Sprint"):
    now = utc_now()
    response = await client.post(
        "/contests",
        headers=headers,
        json={
            "title": title,
            "description": "A focused contest",
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "registration_deadline": (now + timedelta(hours=1)).isoformat(),
            "allowed_languages": ["python", "cpp"],
            "rules": {"penalty_minutes": 20},
        },
    )
    assert response.status_code == 201, response.text
    contest = response.json()
    publish = await client.post("/contests/%s/publish" % contest["id"], headers=headers)
    assert publish.status_code == 200, publish.text
    return publish.json()


async def create_problem(client, headers, slug: str = "two-sum"):
    response = await client.post(
        "/problems",
        headers=headers,
        json={
            "slug": slug,
            "title": "Two Sum",
            "statement": "Read two integers and print their sum.",
            "difficulty": "easy",
            "tags": ["math"],
            "test_cases": [
                {"stdin": "1 2", "expected_output": "3", "is_sample": True},
                {"stdin": "10 20", "expected_output": "30", "is_sample": False},
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()
