import pytest

from tests.conftest import auth_headers, create_active_contest, create_problem, register_user


@pytest.mark.asyncio
async def test_auth_flow_with_refresh_and_logout(client):
    registered = await register_user(client, "admin@example.com", "admin")
    assert registered["user"]["role"] == "admin"

    me = await client.get("/auth/me", headers={"Authorization": "Bearer %s" % registered["access_token"]})
    assert me.status_code == 200
    assert me.json()["email"] == "admin@example.com"

    login = await client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert login.status_code == 200, login.text

    refresh = await client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert refresh.status_code == 200, refresh.text
    assert refresh.json()["refresh_token"] != login.json()["refresh_token"]

    old_refresh_reuse = await client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert old_refresh_reuse.status_code == 401

    logout = await client.post("/auth/logout", json={"refresh_token": refresh.json()["refresh_token"]})
    assert logout.status_code == 204


@pytest.mark.asyncio
async def test_role_based_access_and_contest_problem_registration(client):
    admin_headers, _ = await auth_headers(client, "owner@example.com", "owner")
    user_headers, user_token = await auth_headers(client, "coder@example.com", "coder")

    forbidden = await client.post(
        "/contests",
        headers=user_headers,
        json={
            "title": "Nope",
            "start_time": "2026-01-01T00:00:00+00:00",
            "end_time": "2026-01-01T01:00:00+00:00",
        },
    )
    assert forbidden.status_code == 403

    contest = await create_active_contest(client, admin_headers)
    problem = await create_problem(client, admin_headers)
    attached = await client.post(
        "/contests/%s/problems" % contest["id"],
        headers=admin_headers,
        json={"problem_id": problem["id"], "points": 150, "order_index": 1},
    )
    assert attached.status_code == 201, attached.text

    registration = await client.post("/contests/%s/register" % contest["id"], headers=user_headers)
    assert registration.status_code == 200, registration.text
    assert registration.json()["user_id"] == user_token["user"]["id"]

    duplicate = await client.post("/contests/%s/register" % contest["id"], headers=user_headers)
    assert duplicate.status_code == 409

    participants = await client.get("/contests/%s/participants" % contest["id"], headers=admin_headers)
    assert participants.status_code == 200
    assert participants.json()[0]["username"] == "coder"

    contest_problems = await client.get("/contests/%s/problems" % contest["id"])
    assert contest_problems.status_code == 200
    assert contest_problems.json()[0]["points"] == 150
