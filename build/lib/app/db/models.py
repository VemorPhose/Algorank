import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import ContestStatus, SubmissionJobStatus, SubmissionStatus, UserRole


def new_uuid() -> str:
    return str(uuid.uuid4())


def enum_values(enum_cls):
    return [item.value for item in enum_cls]


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=30, values_callable=enum_values),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(back_populates="user")
    contests_created: Mapped[List["Contest"]] = relationship(back_populates="created_by")
    submissions: Mapped[List["Submission"]] = relationship(back_populates="user")


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rotated_by_token_id: Mapped[Optional[str]] = mapped_column(String(36))
    user_agent: Mapped[Optional[str]] = mapped_column(String(255))
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class Contest(Base, TimestampMixin):
    __tablename__ = "contests"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_contest_end_after_start"),
        CheckConstraint(
            "registration_deadline IS NULL OR registration_deadline <= end_time",
            name="ck_contest_registration_before_end",
        ),
        Index("ix_contests_status_start", "status", "start_time"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[ContestStatus] = mapped_column(
        Enum(ContestStatus, native_enum=False, length=30, values_callable=enum_values),
        nullable=False,
        default=ContestStatus.DRAFT,
    )
    allowed_languages: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    rules: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    freeze_leaderboard_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_by: Mapped[User] = relationship(back_populates="contests_created")
    problems: Mapped[List["ContestProblem"]] = relationship(
        back_populates="contest", cascade="all, delete-orphan"
    )
    participants: Mapped[List["ContestParticipant"]] = relationship(
        back_populates="contest", cascade="all, delete-orphan"
    )
    submissions: Mapped[List["Submission"]] = relationship(back_populates="contest")


class Problem(Base, TimestampMixin):
    __tablename__ = "problems"
    __table_args__ = (Index("ix_problems_hidden_difficulty", "hidden", "difficulty"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[Optional[str]] = mapped_column(String(40))
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    memory_limit_kb: Mapped[int] = mapped_column(Integer, nullable=False, default=128000)
    hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    solved_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    created_by: Mapped[User] = relationship()
    test_cases: Mapped[List["ProblemTestCase"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", order_by="ProblemTestCase.ordinal"
    )
    contests: Mapped[List["ContestProblem"]] = relationship(back_populates="problem")
    submissions: Mapped[List["Submission"]] = relationship(back_populates="problem")


class ProblemTestCase(Base, TimestampMixin):
    __tablename__ = "problem_test_cases"
    __table_args__ = (UniqueConstraint("problem_id", "ordinal", name="uq_problem_test_ordinal"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    stdin: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_sample: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    problem: Mapped[Problem] = relationship(back_populates="test_cases")


class ContestProblem(Base, TimestampMixin):
    __tablename__ = "contest_problems"
    __table_args__ = (
        UniqueConstraint("contest_id", "problem_id", name="uq_contest_problem"),
        UniqueConstraint("contest_id", "order_index", name="uq_contest_problem_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    contest_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    contest: Mapped[Contest] = relationship(back_populates="problems")
    problem: Mapped[Problem] = relationship(back_populates="contests")


class ContestParticipant(Base, TimestampMixin):
    __tablename__ = "contest_participants"
    __table_args__ = (
        UniqueConstraint("contest_id", "user_id", name="uq_contest_participant"),
        Index("ix_participant_rank", "contest_id", "total_score", "penalty_seconds"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    contest_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    solved_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    penalty_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rank: Mapped[Optional[int]] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    contest: Mapped[Contest] = relationship(back_populates="participants")
    user: Mapped[User] = relationship()


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_submission_user_idempotency"),
        Index("ix_submissions_contest_user_created", "contest_id", "user_id", "created_at"),
        Index("ix_submissions_status_created", "status", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    contest_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    language: Mapped[str] = mapped_column(String(40), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, native_enum=False, length=40, values_callable=enum_values),
        nullable=False,
        default=SubmissionStatus.QUEUED,
    )
    max_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    max_memory_kb: Mapped[Optional[int]] = mapped_column(Integer)
    judge0_batch_tokens: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    contest: Mapped[Contest] = relationship(back_populates="submissions")
    problem: Mapped[Problem] = relationship(back_populates="submissions")
    user: Mapped[User] = relationship(back_populates="submissions")
    test_results: Mapped[List["SubmissionTestResult"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="SubmissionTestResult.test_case_number",
    )
    job: Mapped[Optional["SubmissionJob"]] = relationship(back_populates="submission")


class SubmissionTestResult(Base, TimestampMixin):
    __tablename__ = "submission_test_results"
    __table_args__ = (
        UniqueConstraint("submission_id", "test_case_number", name="uq_submission_test_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    submission_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_test_case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("problem_test_cases.id", ondelete="SET NULL")
    )
    test_case_number: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(80), nullable=False)
    verdict: Mapped[str] = mapped_column(String(160), nullable=False)
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    memory_kb: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stdout: Mapped[Optional[str]] = mapped_column(Text)
    stderr: Mapped[Optional[str]] = mapped_column(Text)
    compile_output: Mapped[Optional[str]] = mapped_column(Text)
    message: Mapped[Optional[str]] = mapped_column(Text)
    judge0_token: Mapped[Optional[str]] = mapped_column(String(120))

    submission: Mapped[Submission] = relationship(back_populates="test_results")
    problem_test_case: Mapped[Optional[ProblemTestCase]] = relationship()


class SubmissionJob(Base, TimestampMixin):
    __tablename__ = "submission_jobs"
    __table_args__ = (Index("ix_submission_jobs_status_updated", "status", "updated_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    submission_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[SubmissionJobStatus] = mapped_column(
        Enum(SubmissionJobStatus, native_enum=False, length=40, values_callable=enum_values),
        nullable=False,
        default=SubmissionJobStatus.QUEUED,
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    locked_by: Mapped[Optional[str]] = mapped_column(String(120))
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    enqueued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_error: Mapped[Optional[str]] = mapped_column(Text)

    submission: Mapped[Submission] = relationship(back_populates="job")


class LeaderboardSnapshot(Base, TimestampMixin):
    __tablename__ = "leaderboard_snapshots"
    __table_args__ = (Index("ix_leaderboard_snapshots_contest_created", "contest_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    contest_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(80), nullable=False, default="manual")
    snapshot: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_entity", "entity_type", "entity_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    actor_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(80))
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
