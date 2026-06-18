from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    total_score: int
    solved_count: int
    penalty_seconds: int
    last_accepted_at: Optional[datetime] = None


class LeaderboardResponse(BaseModel):
    contest_id: str
    source: str
    entries: List[LeaderboardEntry]


class LeaderboardSnapshotRead(BaseModel):
    id: str
    contest_id: str
    reason: str
    snapshot: List[dict]
    created_at: datetime
