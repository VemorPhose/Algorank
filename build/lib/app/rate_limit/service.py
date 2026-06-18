import time

from fastapi import HTTPException, status


class RateLimiter:
    def __init__(self, redis, fail_open: bool = True):
        self.redis = redis
        self.fail_open = fail_open

    async def hit(self, namespace: str, identifier: str, limit: int, window_seconds: int) -> None:
        if limit <= 0:
            return
        window = int(time.time() // window_seconds)
        key = "algorank:rate:%s:%s:%s" % (namespace, identifier, window)
        try:
            count = await self.redis.incr(key)
            if count == 1:
                await self.redis.expire(key, window_seconds)
        except Exception as exc:
            if self.fail_open:
                return
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Rate limiter unavailable",
            ) from exc
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )
