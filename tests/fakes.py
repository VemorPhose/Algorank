import fnmatch
from collections import defaultdict
from typing import Any, AsyncIterator, Dict, Iterable, List, Optional


class FakeRedis:
    def __init__(self):
        self.values: Dict[str, str] = {}
        self.lists: Dict[str, List[str]] = defaultdict(list)
        self.hashes: Dict[str, Dict[str, str]] = defaultdict(dict)
        self.zsets: Dict[str, Dict[str, float]] = defaultdict(dict)
        self.expirations: Dict[str, int] = {}

    async def ping(self) -> bool:
        return True

    async def get(self, key: str) -> Optional[str]:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        self.values[key] = value
        if ex is not None:
            self.expirations[key] = ex

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            for store in (self.values, self.lists, self.hashes, self.zsets):
                if key in store:
                    del store[key]
                    deleted += 1
        return deleted

    async def scan_iter(self, match: str) -> AsyncIterator[str]:
        keys = set(self.values) | set(self.lists) | set(self.hashes) | set(self.zsets)
        for key in list(keys):
            if fnmatch.fnmatch(key, match):
                yield key

    async def incr(self, key: str) -> int:
        value = int(self.values.get(key, "0")) + 1
        self.values[key] = str(value)
        return value

    async def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds

    async def rpush(self, key: str, value: str) -> int:
        self.lists[key].append(value)
        return len(self.lists[key])

    async def brpoplpush(self, source: str, destination: str, timeout: int = 0) -> Optional[str]:
        del timeout
        if not self.lists[source]:
            return None
        value = self.lists[source].pop(0)
        self.lists[destination].insert(0, value)
        return value

    async def lrem(self, key: str, count: int, value: str) -> int:
        removed = 0
        new_values = []
        limit = abs(count)
        for existing in self.lists[key]:
            if existing == value and (count == 0 or removed < limit):
                removed += 1
                continue
            new_values.append(existing)
        self.lists[key] = new_values
        return removed

    async def llen(self, key: str) -> int:
        return len(self.lists[key])

    async def zadd(self, key: str, mapping: Dict[str, float]) -> int:
        self.zsets[key].update(mapping)
        return len(mapping)

    async def zrevrange(
        self, key: str, start: int, end: int, withscores: bool = False
    ) -> List[Any]:
        items = sorted(self.zsets[key].items(), key=lambda item: item[1], reverse=True)
        if end == -1:
            sliced = items[start:]
        else:
            sliced = items[start : end + 1]
        if withscores:
            return sliced
        return [item[0] for item in sliced]

    async def hset(self, key: str, mapping: Dict[str, str]) -> int:
        self.hashes[key].update(mapping)
        return len(mapping)

    async def hgetall(self, key: str) -> Dict[str, str]:
        return dict(self.hashes[key])


class FakeJudge0Client:
    def __init__(self, status_id: int = 3):
        self.status_id = status_id
        self.calls = 0

    async def run_submission(self, problem, code: str, language: str, test_cases: Iterable[Any]):
        del problem, code, language
        self.calls += 1
        return [
            {
                "token": "fake-token-%s" % index,
                "status_id": self.status_id,
                "verdict": "Accepted" if self.status_id == 3 else "Wrong Answer",
                "time_ms": 10,
                "memory_kb": 1024,
                "stdout": "",
                "stderr": "",
                "compile_output": "",
                "message": "",
            }
            for index, _ in enumerate(test_cases, start=1)
        ]
