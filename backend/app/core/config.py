"""
Application configuration using Pydantic Settings.
All settings are loaded from environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from pathlib import Path


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
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── OpenAI ───────────────────────────────────────────
    OPENAI_API_KEY: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
