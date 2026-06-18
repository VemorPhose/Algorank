import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from app.core.config import Settings
from app.core.time import utc_now


@dataclass
class SubmissionJobEnvelope:
    submission_id: str
    job_id: str
    attempts: int = 0

    def to_json(self) -> str:
        return json.dumps(
            {
                "submission_id": self.submission_id,
                "job_id": self.job_id,
                "attempts": self.attempts,
                "enqueued_at": utc_now().isoformat(),
            }
        )

    @classmethod
    def from_json(cls, raw: str) -> "SubmissionJobEnvelope":
        data: Dict[str, Any] = json.loads(raw)
        return cls(
            submission_id=data["submission_id"],
            job_id=data["job_id"],
            attempts=int(data.get("attempts", 0)),
        )


class SubmissionQueue:
    def __init__(self, redis, settings: Settings):
        self.redis = redis
        self.settings = settings

    async def enqueue(self, envelope: SubmissionJobEnvelope) -> None:
        await self.redis.rpush(self.settings.queue_pending_key, envelope.to_json())

    async def dequeue(self, timeout_seconds: Optional[int] = None) -> Optional[str]:
        timeout = self.settings.worker_poll_timeout_seconds if timeout_seconds is None else timeout_seconds
        raw = await self.redis.brpoplpush(
            self.settings.queue_pending_key,
            self.settings.queue_processing_key,
            timeout=timeout,
        )
        return raw

    async def ack(self, raw_envelope: str) -> None:
        await self.redis.lrem(self.settings.queue_processing_key, 1, raw_envelope)

    async def retry(self, raw_envelope: str, envelope: SubmissionJobEnvelope) -> None:
        await self.redis.lrem(self.settings.queue_processing_key, 1, raw_envelope)
        await self.redis.rpush(self.settings.queue_pending_key, envelope.to_json())

    async def dead_letter(self, raw_envelope: str, envelope: SubmissionJobEnvelope, error: str) -> None:
        await self.redis.lrem(self.settings.queue_processing_key, 1, raw_envelope)
        await self.redis.rpush(
            self.settings.queue_dead_letter_key,
            json.dumps(
                {
                    "submission_id": envelope.submission_id,
                    "job_id": envelope.job_id,
                    "attempts": envelope.attempts,
                    "error": error,
                    "dead_lettered_at": utc_now().isoformat(),
                }
            ),
        )

    async def depths(self) -> Dict[str, int]:
        return {
            "pending": int(await self.redis.llen(self.settings.queue_pending_key)),
            "processing": int(await self.redis.llen(self.settings.queue_processing_key)),
            "dead_letter": int(await self.redis.llen(self.settings.queue_dead_letter_key)),
        }
