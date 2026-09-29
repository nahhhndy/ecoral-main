"""Application configuration via Pydantic Settings."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
_DEFAULT_DB_PATH = _ROOT_DIR / "ecoral.db"
_DEFAULT_DB_URL = f"sqlite+aiosqlite:///{_DEFAULT_DB_PATH.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------
    app_name: str = "EcoRal"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # ---------------------------------------------------------
    # Database
    # ---------------------------------------------------------
    database_url: str = _DEFAULT_DB_URL


    # ---------------------------------------------------------
    # Redis
    # ---------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # ---------------------------------------------------------
    # JWT
    # ---------------------------------------------------------
    jwt_secret_key: str = (
        "dev-secret-change-in-production-minimum-32-chars"
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # ---------------------------------------------------------
    # CORS
    # ---------------------------------------------------------
    # Keep the environment variable as a STRING.
    # This prevents Pydantic Settings from trying to
    # JSON-decode CORS_ORIGINS automatically.
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins as a normalized list."""
        value = self.cors_origins_raw.strip()

        if not value:
            return []

        # Support JSON format:
        # ["http://localhost:3000", "https://example.com"]
        if value.startswith("["):
            try:
                parsed = json.loads(value)

                if isinstance(parsed, list):
                    return [
                        str(origin).strip()
                        for origin in parsed
                        if str(origin).strip()
                    ]

            except json.JSONDecodeError:
                pass

        # Support comma-separated format:
        # http://localhost:3000,https://example.com
        return [
            origin.strip()
            for origin in value.split(",")
            if origin.strip()
        ]

    # ---------------------------------------------------------
    # Production validation
    # ---------------------------------------------------------
    @model_validator(mode="after")
    def validate_production_secrets(self) -> Settings:
        if self.app_env == "production":
            if (
                "dev-secret" in self.jwt_secret_key
                or len(self.jwt_secret_key) < 32
            ):
                raise ValueError(
                    "JWT_SECRET_KEY must be at least 32 characters "
                    "and must not use the development secret in production."
                )

        return self

    # ---------------------------------------------------------
    # Environment helpers
    # ---------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()