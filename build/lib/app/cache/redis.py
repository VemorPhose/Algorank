from typing import AsyncIterator, Optional

from redis.asyncio import Redis

from app.core.config import get_settings

_redis_client: Optional[Redis] = None


def init_redis(redis_url: Optional[str] = None) -> Redis:
    global _redis_client
    _redis_client = Redis.from_url(
        redis_url or get_settings().redis_url,
        decode_responses=True,
        health_check_interval=30,
    )
    return _redis_client


def get_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        init_redis()
    assert _redis_client is not None
    return _redis_client


async def get_redis() -> AsyncIterator[Redis]:
    yield get_redis_client()


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
    _redis_client = None
