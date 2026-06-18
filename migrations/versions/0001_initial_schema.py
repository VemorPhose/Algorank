"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-16 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("admin", "organizer", "user", native_enum=False, length=30), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_by_token_id", sa.String(length=36), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)

    op.create_table(
        "contests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum("draft", "published", "closed", native_enum=False, length=30), nullable=False),
        sa.Column("allowed_languages", sa.JSON(), nullable=False),
        sa.Column("rules", sa.JSON(), nullable=False),
        sa.Column("freeze_leaderboard_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("end_time > start_time", name="ck_contest_end_after_start"),
        sa.CheckConstraint(
            "registration_deadline IS NULL OR registration_deadline <= end_time",
            name="ck_contest_registration_before_end",
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contests_status_start", "contests", ["status", "start_time"], unique=False)
    op.create_index(op.f("ix_contests_created_by_id"), "contests", ["created_by_id"], unique=False)

    op.create_table(
        "problems",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(length=40), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("time_limit_ms", sa.Integer(), nullable=False),
        sa.Column("memory_limit_kb", sa.Integer(), nullable=False),
        sa.Column("hidden", sa.Boolean(), nullable=False),
        sa.Column("solved_count", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_problems_hidden_difficulty", "problems", ["hidden", "difficulty"], unique=False)
    op.create_index(op.f("ix_problems_created_by_id"), "problems", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_problems_slug"), "problems", ["slug"], unique=True)

    op.create_table(
        "contest_problems",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contest_id", sa.String(length=36), nullable=False),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["contest_id"], ["contests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contest_id", "order_index", name="uq_contest_problem_order"),
        sa.UniqueConstraint("contest_id", "problem_id", name="uq_contest_problem"),
    )
    op.create_index(op.f("ix_contest_problems_contest_id"), "contest_problems", ["contest_id"], unique=False)
    op.create_index(op.f("ix_contest_problems_problem_id"), "contest_problems", ["problem_id"], unique=False)

    op.create_table(
        "contest_participants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contest_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False),
        sa.Column("solved_count", sa.Integer(), nullable=False),
        sa.Column("penalty_seconds", sa.Integer(), nullable=False),
        sa.Column("last_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["contest_id"], ["contests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contest_id", "user_id", name="uq_contest_participant"),
    )
    op.create_index("ix_participant_rank", "contest_participants", ["contest_id", "total_score", "penalty_seconds"], unique=False)
    op.create_index(op.f("ix_contest_participants_contest_id"), "contest_participants", ["contest_id"], unique=False)
    op.create_index(op.f("ix_contest_participants_user_id"), "contest_participants", ["user_id"], unique=False)

    op.create_table(
        "problem_test_cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("stdin", sa.Text(), nullable=False),
        sa.Column("expected_output", sa.Text(), nullable=False),
        sa.Column("is_sample", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("problem_id", "ordinal", name="uq_problem_test_ordinal"),
    )
    op.create_index(op.f("ix_problem_test_cases_problem_id"), "problem_test_cases", ["problem_id"], unique=False)

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contest_id", sa.String(length=36), nullable=False),
        sa.Column("problem_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("idempotency_key", sa.String(length=120), nullable=True),
        sa.Column("language", sa.String(length=40), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "queued",
                "processing",
                "accepted",
                "wrong_answer",
                "time_limit_exceeded",
                "compilation_error",
                "runtime_error",
                "internal_error",
                "cancelled",
                native_enum=False,
                length=40,
            ),
            nullable=False,
        ),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("max_time_ms", sa.Integer(), nullable=True),
        sa.Column("max_memory_kb", sa.Integer(), nullable=True),
        sa.Column("judge0_batch_tokens", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("points_awarded", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["contest_id"], ["contests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_submission_user_idempotency"),
    )
    op.create_index("ix_submissions_contest_user_created", "submissions", ["contest_id", "user_id", "created_at"], unique=False)
    op.create_index("ix_submissions_status_created", "submissions", ["status", "created_at"], unique=False)
    op.create_index(op.f("ix_submissions_contest_id"), "submissions", ["contest_id"], unique=False)
    op.create_index(op.f("ix_submissions_idempotency_key"), "submissions", ["idempotency_key"], unique=False)
    op.create_index(op.f("ix_submissions_problem_id"), "submissions", ["problem_id"], unique=False)
    op.create_index(op.f("ix_submissions_user_id"), "submissions", ["user_id"], unique=False)

    op.create_table(
        "submission_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.Enum("queued", "processing", "completed", "failed", "dead_letter", native_enum=False, length=40), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("enqueued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id"),
    )
    op.create_index("ix_submission_jobs_status_updated", "submission_jobs", ["status", "updated_at"], unique=False)
    op.create_index(op.f("ix_submission_jobs_submission_id"), "submission_jobs", ["submission_id"], unique=True)

    op.create_table(
        "submission_test_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("problem_test_case_id", sa.String(length=36), nullable=True),
        sa.Column("test_case_number", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=80), nullable=False),
        sa.Column("verdict", sa.String(length=160), nullable=False),
        sa.Column("time_ms", sa.Integer(), nullable=False),
        sa.Column("memory_kb", sa.Integer(), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=True),
        sa.Column("stderr", sa.Text(), nullable=True),
        sa.Column("compile_output", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("judge0_token", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["problem_test_case_id"], ["problem_test_cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "test_case_number", name="uq_submission_test_number"),
    )
    op.create_index(op.f("ix_submission_test_results_submission_id"), "submission_test_results", ["submission_id"], unique=False)

    op.create_table(
        "leaderboard_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contest_id", sa.String(length=36), nullable=False),
        sa.Column("reason", sa.String(length=80), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["contest_id"], ["contests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leaderboard_snapshots_contest_created", "leaderboard_snapshots", ["contest_id", "created_at"], unique=False)
    op.create_index(op.f("ix_leaderboard_snapshots_contest_id"), "leaderboard_snapshots", ["contest_id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_entity", "audit_logs", ["entity_type", "entity_id", "created_at"], unique=False)
    op.create_index(op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False)

    op.execute(
        """
        CREATE OR REPLACE FUNCTION compute_contest_standings(p_contest_id VARCHAR)
        RETURNS TABLE (
            user_id VARCHAR,
            username VARCHAR,
            total_score INTEGER,
            solved_count INTEGER,
            penalty_seconds INTEGER,
            last_accepted_at TIMESTAMPTZ
        )
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                cp.user_id,
                u.username,
                cp.total_score,
                cp.solved_count,
                cp.penalty_seconds,
                cp.last_accepted_at
            FROM contest_participants cp
            JOIN users u ON u.id = cp.user_id
            WHERE cp.contest_id = p_contest_id
            ORDER BY cp.total_score DESC, cp.penalty_seconds ASC, cp.last_accepted_at ASC NULLS LAST, u.username ASC
        $$;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION contest_summary_metrics(p_contest_id VARCHAR)
        RETURNS TABLE (
            participant_count BIGINT,
            submission_count BIGINT,
            accepted_count BIGINT
        )
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                (SELECT COUNT(*) FROM contest_participants WHERE contest_id = p_contest_id),
                (SELECT COUNT(*) FROM submissions WHERE contest_id = p_contest_id),
                (SELECT COUNT(*) FROM submissions WHERE contest_id = p_contest_id AND status = 'accepted')
        $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS contest_summary_metrics(VARCHAR)")
    op.execute("DROP FUNCTION IF EXISTS compute_contest_standings(VARCHAR)")
    op.drop_table("audit_logs")
    op.drop_table("leaderboard_snapshots")
    op.drop_table("submission_test_results")
    op.drop_table("submission_jobs")
    op.drop_table("submissions")
    op.drop_table("problem_test_cases")
    op.drop_table("contest_participants")
    op.drop_table("contest_problems")
    op.drop_table("problems")
    op.drop_table("contests")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
