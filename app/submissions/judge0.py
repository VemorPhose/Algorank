import asyncio
import base64
from typing import Any, Dict, Iterable, List

import httpx

from app.core.config import Settings
from app.db.enums import SubmissionStatus
from app.db.models import Problem, ProblemTestCase

LANGUAGE_IDS = {
    "cpp": 54,
    "python": 71,
    "java": 62,
}

PENDING_STATUS_IDS = {1, 2}


class Judge0Error(RuntimeError):
    pass


def encode_base64(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def decode_base64(value: Any) -> Any:
    if value is None or not isinstance(value, str):
        return value
    try:
        return base64.b64decode(value).decode("utf-8")
    except Exception:
        return value


class Judge0Client:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.base_url = str(settings.judge0_base_url).rstrip("/")

    async def run_submission(
        self,
        problem: Problem,
        code: str,
        language: str,
        test_cases: Iterable[ProblemTestCase],
    ) -> List[Dict[str, Any]]:
        language_id = LANGUAGE_IDS.get(language)
        if language_id is None:
            raise Judge0Error("Unsupported language: %s" % language)

        submissions = [
            {
                "language_id": language_id,
                "source_code": encode_base64(code),
                "stdin": encode_base64(test_case.stdin.strip()),
                "expected_output": encode_base64(test_case.expected_output.strip()),
                "cpu_time_limit": max(problem.time_limit_ms / 1000.0, 0.1),
                "memory_limit": problem.memory_limit_kb,
            }
            for test_case in test_cases
        ]
        if not submissions:
            raise Judge0Error("Problem has no judge test cases")

        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            create_response = await client.post(
                "/submissions/batch",
                params={"base64_encoded": "true"},
                json={"submissions": submissions},
            )
            if create_response.status_code >= 400:
                raise Judge0Error("Judge0 batch create failed: %s" % create_response.text)
            tokens = [item["token"] for item in create_response.json()]
            return await self._wait_for_batch(client, tokens)

    async def _wait_for_batch(self, client: httpx.AsyncClient, tokens: List[str]) -> List[Dict[str, Any]]:
        for _ in range(self.settings.judge0_poll_attempts):
            response = await client.get(
                "/submissions/batch",
                params={
                    "tokens": ",".join(tokens),
                    "base64_encoded": "true",
                    "fields": "token,status,time,memory,stdout,stderr,compile_output,message",
                },
            )
            if response.status_code >= 400:
                raise Judge0Error("Judge0 batch status failed: %s" % response.text)
            submissions = response.json().get("submissions", [])
            if submissions and all(item["status"]["id"] not in PENDING_STATUS_IDS for item in submissions):
                return [normalize_judge0_result(item) for item in submissions]
            await asyncio.sleep(self.settings.judge0_poll_interval_seconds)
        raise Judge0Error("Judge0 batch timed out")


def normalize_judge0_result(result: Dict[str, Any]) -> Dict[str, Any]:
    status_payload = result.get("status") or {}
    time_seconds = result.get("time") or 0
    try:
        time_ms = int(float(time_seconds) * 1000)
    except (TypeError, ValueError):
        time_ms = 0
    return {
        "token": result.get("token"),
        "status_id": int(status_payload.get("id") or 0),
        "verdict": status_payload.get("description") or "Unknown",
        "time_ms": time_ms,
        "memory_kb": int(result.get("memory") or 0),
        "stdout": decode_base64(result.get("stdout")),
        "stderr": decode_base64(result.get("stderr")),
        "compile_output": decode_base64(result.get("compile_output")),
        "message": decode_base64(result.get("message")),
    }


def submission_status_from_judge0(status_id: int) -> SubmissionStatus:
    if status_id == 3:
        return SubmissionStatus.ACCEPTED
    if status_id == 4:
        return SubmissionStatus.WRONG_ANSWER
    if status_id == 5:
        return SubmissionStatus.TIME_LIMIT_EXCEEDED
    if status_id == 6:
        return SubmissionStatus.COMPILATION_ERROR
    if status_id in (7, 8, 9, 10, 11, 12):
        return SubmissionStatus.RUNTIME_ERROR
    return SubmissionStatus.INTERNAL_ERROR
