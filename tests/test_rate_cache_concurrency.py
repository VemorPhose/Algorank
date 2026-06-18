import asyncio

import pytest

from app.cache.service import contest_list_cache_key
from tests.conftest import auth_headers, create_active_contest, create_problem


@pytest.mark.asyncio
async def test_contest_list_cache_is_invalidated_on_create(test_context):
    client = test_context["client"]
    redis = test_context["redis"]
    admin_headers, _ = await auth_headers(client, "cache-admin@example.com", "cacheadmin")

    await create_active_contest(client, admin_headers, title="Cached One")
    first_list = await client.get("/contests")
    assert first_list.status_code == 200
    assert await redis.get(contest_list_cache_key()) is not None

    await create_active_contest(client, admin_headers, title="Cached Two")
    assert await redis.get(contest_list_cache_key()) is None


@pytest.mark.asyncio
async def test_submission_rate_limit(test_context):
    client = test_context["client"]
    settings = test_context["settings"]
    settings.submission_rate_limit = 1

    admin_headers, _ = await auth_headers(client, "rate-admin@example.com", "rateadmin")
    user_headers, _ = await auth_headers(client, "limited@example.com", "limited")
    contest = await create_active_contest(client, admin_headers, title="Rate Limit")
    problem = await create_problem(client, admin_headers, slug="rate-problem")
    await client.post(
        "/contests/%s/problems" % contest["id"],
        headers=admin_headers,
        json={"problem_id": problem["id"], "points": 100, "order_index": 1},
    )
    await client.post("/contests/%s/register" % contest["id"], headers=user_headers)

    payload = {
        "contest_id": contest["id"],
        "problem_id": problem["id"],
        "language": "python",
        "code": "print(3)",
    }
    first = await client.post("/submissions", headers=user_headers, json=payload)
    second = await client.post("/submissions", headers=user_headers, json=payload)
    assert first.status_code == 202, first.text
    assert second.status_code == 429


@pytest.mark.asyncio
async def test_concurrent_duplicate_registration_allows_only_one(client):
    admin_headers, _ = await auth_headers(client, "concurrency-admin@example.com", "concurrencyadmin")
    user_headers, _ = await auth_headers(client, "parallel@example.com", "parallel")
    contest = await create_active_contest(client, admin_headers, title="Parallel Register")

    async def register_once():
        return await client.post("/contests/%s/register" % contest["id"], headers=user_headers)

    responses = await asyncio.gather(register_once(), register_once())
    statuses = sorted(response.status_code for response in responses)
    assert statuses == [200, 409]
