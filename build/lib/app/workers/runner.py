import asyncio
import signal
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import close_redis, init_redis
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.time import utc_now
from app.db.enums import SubmissionJobStatus
from app.db.models import SubmissionJob
from app.db.session import dispose_engine, get_session_factory, init_engine
from app.submissions.judge0 import Judge0Client, Judge0Error
from app.submissions.queue import SubmissionJobEnvelope, SubmissionQueue
from app.submissions.service import persist_internal_error, process_submission_job

logger = structlog.get_logger(__name__)


class Worker:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis = init_redis(settings.redis_url)
        self.queue = SubmissionQueue(self.redis, settings)
        self.judge0 = Judge0Client(settings)
        self.stop_requested = False

    async def heartbeat(self) -> None:
        key = "algorank:workers:%s" % self.settings.worker_id
        await self.redis.hset(
            key,
            mapping={
                "worker_id": self.settings.worker_id,
                "last_seen_at": utc_now().isoformat(),
                "queue": self.settings.queue_pending_key,
            },
        )
        await self.redis.expire(key, self.settings.worker_heartbeat_ttl_seconds)

    async def mark_retryable_failure(
        self,
        db: AsyncSession,
        envelope: SubmissionJobEnvelope,
        error: str,
    ) -> bool:
        job = await db.get(SubmissionJob, envelope.job_id)
        if job is None:
            return False
        job.last_error = error[:2000]
        job.locked_by = None
        job.locked_until = None
        if job.attempts >= job.max_attempts:
            await db.commit()
            return False
        job.status = SubmissionJobStatus.QUEUED
        await db.commit()
        return True

    async def handle_raw_job(self, raw: str) -> None:
        try:
            envelope = SubmissionJobEnvelope.from_json(raw)
        except Exception as exc:
            await self.redis.lrem(self.settings.queue_processing_key, 1, raw)
            await self.redis.rpush(
                self.settings.queue_dead_letter_key,
                '{"error": "invalid job envelope", "details": "%s"}' % str(exc).replace('"', "'"),
            )
            return

        session_factory = get_session_factory()
        async with session_factory() as db:
            try:
                await process_submission_job(
                    db,
                    self.redis,
                    envelope,
                    self.judge0,
                    self.settings.worker_id,
                )
            except Judge0Error as exc:
                should_retry = await self.mark_retryable_failure(db, envelope, str(exc))
                if should_retry:
                    envelope.attempts += 1
                    await self.queue.retry(raw, envelope)
                    logger.warning("submission_job_retry", job_id=envelope.job_id, error=str(exc))
                else:
                    await persist_internal_error(
                        db,
                        self.redis,
                        envelope.submission_id,
                        envelope.job_id,
                        str(exc),
                    )
                    await self.queue.dead_letter(raw, envelope, str(exc))
                    logger.error("submission_job_dead_letter", job_id=envelope.job_id, error=str(exc))
            except Exception as exc:
                await persist_internal_error(
                    db,
                    self.redis,
                    envelope.submission_id,
                    envelope.job_id,
                    str(exc),
                )
                await self.queue.dead_letter(raw, envelope, str(exc))
                logger.exception("submission_job_unhandled", job_id=envelope.job_id)
            else:
                await self.queue.ack(raw)
                logger.info("submission_job_complete", job_id=envelope.job_id)

    async def run(self) -> None:
        while not self.stop_requested:
            await self.heartbeat()
            raw: Optional[str] = await self.queue.dequeue(self.settings.worker_poll_timeout_seconds)
            if raw is None:
                continue
            await self.handle_raw_job(raw)

    def request_stop(self) -> None:
        self.stop_requested = True


async def run_worker() -> None:
    configure_logging()
    settings = get_settings()
    init_engine(settings.database_url)
    worker = Worker(settings)

    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(signal_name, worker.request_stop)
        except NotImplementedError:
            pass

    try:
        await worker.run()
    finally:
        await close_redis()
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(run_worker())
