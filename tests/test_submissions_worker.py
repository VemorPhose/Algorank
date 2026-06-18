import pytest

from app.db.enums import SubmissionStatus
from app.db.session import get_session_factory
from app.submissions.judge0 import normalize_judge0_result, submission_status_from_judge0
from app.submissions.queue import SubmissionJobEnvelope, SubmissionQueue
from app.submissions.service import process_submission_job
from tests.conftest import auth_headers, create_active_contest, create_problem
from tests.fakes import FakeJudge0Client


@pytest.mark.asyncio
async def test_submission_worker_updates_status_and_leaderboard(test_context):
    client = test_context["client"]
    redis = test_context["redis"]
    settings = test_context["settings"]

    admin_headers, _ = await auth_headers(client, "admin2@example.com", "admin2")
    user_headers, _ = await auth_headers(client, "runner@example.com", "runner")
    contest = await create_active_contest(client, admin_headers)
    problem = await create_problem(client, admin_headers, slug="sum-worker")
    attach = await client.post(
        "/contests/%s/problems" % contest["id"],
        headers=admin_headers,
        json={"problem_id": problem["id"], "points": 100, "order_index": 1},
    )
    assert attach.status_code == 201, attach.text
    register = await client.post("/contests/%s/register" % contest["id"], headers=user_headers)
    assert register.status_code == 200, register.text

    submit = await client.post(
        "/submissions",
        headers={**user_headers, "Idempotency-Key": "run-1"},
        json={
            "contest_id": contest["id"],
            "problem_id": problem["id"],
            "language": "python",
            "code": "print(sum(map(int, input().split())))",
        },
    )
    assert submit.status_code == 202, submit.text
    submission_id = submit.json()["id"]

    same_submit = await client.post(
        "/submissions",
        headers={**user_headers, "Idempotency-Key": "run-1"},
        json={
            "contest_id": contest["id"],
            "problem_id": problem["id"],
            "language": "python",
            "code": "print(0)",
        },
    )
    assert same_submit.status_code == 202, same_submit.text
    assert same_submit.json()["id"] == submission_id
    assert same_submit.json()["queued"] is False

    queue = SubmissionQueue(redis, settings)
    raw = await queue.dequeue(0)
    assert raw is not None
    envelope = SubmissionJobEnvelope.from_json(raw)
    session_factory = get_session_factory()
    async with session_factory() as db:
        await process_submission_job(db, redis, envelope, FakeJudge0Client(status_id=3), "test-worker")
    await queue.ack(raw)

    processed = await client.get("/submissions/%s" % submission_id, headers=user_headers)
    assert processed.status_code == 200, processed.text
    assert processed.json()["status"] == "accepted"
    assert processed.json()["points_awarded"] == 100
    assert len(processed.json()["test_results"]) == 2

    leaderboard = await client.get("/contests/%s/leaderboard/live" % contest["id"], headers=user_headers)
    assert leaderboard.status_code == 200, leaderboard.text
    assert leaderboard.json()["entries"][0]["username"] == "runner"
    assert leaderboard.json()["entries"][0]["total_score"] == 100

    async with session_factory() as db:
        await process_submission_job(db, redis, envelope, FakeJudge0Client(status_id=3), "test-worker")
    processed_again = await client.get("/submissions/%s" % submission_id, headers=user_headers)
    assert len(processed_again.json()["test_results"]) == 2


def test_judge0_normalization_and_status_mapping():
    normalized = normalize_judge0_result(
        {"token": "abc", "status": {"id": 4, "description": "Wrong Answer"}, "time": "0.012", "memory": 2048}
    )
    assert normalized["time_ms"] == 12
    assert normalized["verdict"] == "Wrong Answer"
    assert submission_status_from_judge0(3) == SubmissionStatus.ACCEPTED
    assert submission_status_from_judge0(6) == SubmissionStatus.COMPILATION_ERROR
