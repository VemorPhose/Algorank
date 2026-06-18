from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import SubmissionStatus


class SubmissionCreate(BaseModel):
    contest_id: str
    problem_id: str
    language: str = Field(min_length=1, max_length=40)
    code: str = Field(min_length=1, max_length=200_000)


class SubmissionTestResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    test_case_number: int
    passed: bool
    status: str
    verdict: str
    time_ms: int
    memory_kb: int
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    message: Optional[str] = None


class SubmissionRead(BaseModel):
    id: str
    contest_id: str
    problem_id: str
    user_id: str
    language: str
    status: SubmissionStatus
    idempotency_key: Optional[str] = None
    points_awarded: int
    max_time_ms: Optional[int] = None
    max_memory_kb: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    test_results: List[SubmissionTestResultRead] = Field(default_factory=list)


class SubmissionQueuedResponse(SubmissionRead):
    queued: bool = True
