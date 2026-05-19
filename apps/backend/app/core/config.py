# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Environment & Settings Yönetimi
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import os
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, AnyHttpUrl


class Settings(BaseSettings):
    """Tüm uygulama ortam değişkenlerini merkezi olarak yönetir."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Core ────────────────────────────────────────────────────────────────
    ENV:                              str          = "development"
    SECRET_KEY:                       str          = "change-me-secret-key-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES:      int          = 1440         # 24 saat
    ALGORITHM:                        str          = "HS256"

    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: PostgresDsn = "postgresql+psycopg2://sismik_admin:change_me@localhost:5432/sismik_erp"

    # ── Redis / Celery ──────────────────────────────────────────────────────
    REDIS_URL: str = "redis://:change_me_redis@localhost:6379/0"

    # ── CORS ────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://sismikmekanik.com.tr",
        "https://mekanik-erp.vercel.app",
    ]
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"

    # ── Object Storage (OCI S3-compatible) ───────────────────────────────────
    AWS_ACCESS_KEY_ID:     str          = ""
    AWS_SECRET_ACCESS_KEY: str          = ""
    OCI_BUCKET_NAME:       str          = "sismik-documents"
    OCI_NAMESPACE:         str          = ""
    OCI_REGION:            str          = "eu-frankfurt-1"
    OCI_ENDPOINT:          Optional[AnyHttpUrl] = None

    # ── Celery ──────────────────────────────────────────────────────────────
    CELERY_WORKERS: int = 4
    AUTO_CREATE_SCHEMA: bool = True

    # ── Email (Resend) ───────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_PROVIDER: str = "resend"
    EMAIL_FROM_DEFAULT: str = "noreply@golabstek.com"
    EMAIL_FROM_NAME_DEFAULT: str = "GOLABS ERP"
    EMAIL_REPLY_TO_DEFAULT: Optional[str] = None

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.ENV == "development"


settings = Settings()
