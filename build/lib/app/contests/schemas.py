from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.enums import ContestStatus


class ContestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    registration_deadline: Optional[datetime] = None
    allowed_languages: List[str] = Field(default_factory=lambda: ["cpp", "python", "java"])
    rules: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, value, info):
        start_time = info.data.get("start_time")
        if start_time and value <= start_time:
            raise ValueError("end_time must be after start_time")
        return value


class ContestPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    allowed_languages: Optional[List[str]] = None
    rules: Optional[Dict[str, Any]] = None
    freeze_leaderboard_at: Optional[datetime] = None


class ContestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    registration_deadline: Optional[datetime]
    status: ContestStatus
    allowed_languages: List[str]
    rules: Dict[str, Any]
    created_by_id: str
    participant_count: int = 0
    problem_count: int = 0
    created_at: datetime
    updated_at: datetime


class ContestParticipantRead(BaseModel):
    user_id: str
    username: str
    total_score: int
    solved_count: int
    penalty_seconds: int
    rank: Optional[int]
    registered_at: datetime


class ContestRegistrationResponse(BaseModel):
    contest_id: str
    user_id: str
    registered: bool
