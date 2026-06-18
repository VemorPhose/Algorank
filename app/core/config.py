from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Algorank v2"
    app_env: str = "development"
    debug: bool = Field(default=False, validation_alias="APP_DEBUG")

    database_url: str = "postgresql+asyncpg://algorank:algorank@localhost:5432/algorank"
    redis_url: str = "redis://localhost:6379/0"
    judge0_base_url: AnyHttpUrl = "http://localhost:2358"

    jwt_secret: str = Field(default="change-me", min_length=8)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 20
    refresh_token_expire_days: int = 30

    bootstrap_admin_email: Optional[str] = None
    bootstrap_admin_password: Optional[str] = None
    bootstrap_token: Optional[str] = None

    cors_origins: List[str] = ["*"]

    cache_default_ttl_seconds: int = 60
    contest_cache_ttl_seconds: int = 60
    problem_cache_ttl_seconds: int = 300
    leaderboard_cache_ttl_seconds: int = 5

    login_rate_limit: int = 10
    login_rate_window_seconds: int = 300
    submission_rate_limit: int = 5
    submission_rate_window_seconds: int = 60
    registration_rate_limit: int = 10
    registration_rate_window_seconds: int = 60
    leaderboard_rate_limit: int = 120
    leaderboard_rate_window_seconds: int = 60
    rate_limit_fail_open: bool = True

    queue_pending_key: str = "algorank:queue:submissions:pending"
    queue_processing_key: str = "algorank:queue:submissions:processing"
    queue_dead_letter_key: str = "algorank:queue:submissions:dead"
    worker_id: str = "worker-local"
    worker_poll_timeout_seconds: int = 5
    worker_max_attempts: int = 3
    worker_heartbeat_ttl_seconds: int = 30

    judge0_poll_interval_seconds: float = 0.75
    judge0_poll_attempts: int = 40

    allowed_languages: List[str] = ["cpp", "python", "java"]

    @field_validator("cors_origins", "allowed_languages", mode="before")
    @classmethod
    def parse_csv(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def sync_database_url(self) -> str:
        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        if self.database_url.startswith("sqlite+aiosqlite://"):
            return self.database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        return self.database_url

    @property
    def is_test(self) -> bool:
        return self.app_env == "test"


@lru_cache
def get_settings() -> Settings:
    return Settings()
