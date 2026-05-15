"""
Application configuration using Pydantic Settings.
All settings are loaded from environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Any
from pydantic import field_validator
import json


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Retinopathy AI Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./retinopathy.db"

    # ── Firebase ─────────────────────────────────────────
    FIREBASE_CREDENTIALS: str = "firebase-service-account.json"

    # ── JWT Auth ─────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-strong-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── File Upload ──────────────────────────────────────
    UPLOAD_DIR: str = "uploads/retinal_images"
    MAX_IMAGE_SIZE_MB: int = 10

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Allow CORS_ORIGINS to be set as a JSON array string in .env."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # Comma-separated fallback
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # ── OpenAI ───────────────────────────────────────────
    OPENAI_API_KEY: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
