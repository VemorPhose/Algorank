import json
from typing import Any, Optional


class CacheService:
    def __init__(self, redis):
        self.redis = redis

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.redis.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        await self.redis.set(key, json.dumps(value, default=str), ex=ttl_seconds)

    async def delete(self, *keys: str) -> None:
        keys = [key for key in keys if key]
        if keys:
            await self.redis.delete(*keys)

    async def delete_pattern(self, pattern: str) -> int:
        deleted = 0
        async for key in self.redis.scan_iter(match=pattern):
            await self.redis.delete(key)
            deleted += 1
        return deleted


def contest_list_cache_key() -> str:
    return "algorank:cache:contests:list"


def contest_detail_cache_key(contest_id: str) -> str:
    return "algorank:cache:contests:detail:%s" % contest_id


def contest_problem_cache_key(contest_id: str) -> str:
    return "algorank:cache:contests:problems:%s" % contest_id


def problem_detail_cache_key(problem_id: str) -> str:
    return "algorank:cache:problems:detail:%s" % problem_id


def leaderboard_cache_key(contest_id: str) -> str:
    return "algorank:cache:leaderboard:%s" % contest_id


def user_contests_cache_key(user_id: str) -> str:
    return "algorank:cache:users:%s:contests" % user_id
