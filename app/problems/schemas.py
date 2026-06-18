from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProblemTestCaseCreate(BaseModel):
    stdin: str
    expected_output: str
    is_sample: bool = False


class ProblemTestCaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ordinal: int
    stdin: str
    expected_output: str
    is_sample: bool


class ProblemCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    title: str = Field(min_length=3, max_length=200)
    statement: str = Field(min_length=1)
    difficulty: Optional[str] = Field(default=None, max_length=40)
    tags: List[str] = Field(default_factory=list)
    time_limit_ms: int = Field(default=2000, ge=100, le=30000)
    memory_limit_kb: int = Field(default=128000, ge=16000, le=1024000)
    hidden: bool = False
    test_cases: List[ProblemTestCaseCreate] = Field(min_length=1)


class ProblemPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    statement: Optional[str] = None
    difficulty: Optional[str] = Field(default=None, max_length=40)
    tags: Optional[List[str]] = None
    time_limit_ms: Optional[int] = Field(default=None, ge=100, le=30000)
    memory_limit_kb: Optional[int] = Field(default=None, ge=16000, le=1024000)
    hidden: Optional[bool] = None
    test_cases: Optional[List[ProblemTestCaseCreate]] = None


class ProblemListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    title: str
    difficulty: Optional[str]
    tags: List[str]
    solved_count: int
    hidden: bool
    created_at: datetime


class ProblemRead(ProblemListItem):
    statement: str
    time_limit_ms: int
    memory_limit_kb: int
    sample_test_cases: List[ProblemTestCaseRead] = Field(default_factory=list)
    test_case_count: int = 0
    updated_at: datetime


class ContestProblemAttach(BaseModel):
    problem_id: str
    points: int = Field(default=100, ge=1, le=10000)
    order_index: int = Field(default=1, ge=1)


class ContestProblemRead(BaseModel):
    id: str
    contest_id: str
    problem_id: str
    slug: str
    title: str
    points: int
    order_index: int
