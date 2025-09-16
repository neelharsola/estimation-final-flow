from __future__ import annotations

import logging
from functools import lru_cache
from typing import List

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Estimation Pro Max API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    MONGO_URL: str = Field(default="mongodb://localhost:27017")
    MONGO_DB: str = Field(default="estimation_db")
    
    # Security
    JWT_SECRET: str = Field(default="change-me-in-production")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ])
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # File Storage
    UPLOAD_DIR: str = "C:/temp/uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB


class JWTConfig(BaseModel):
    secret: str
    algorithm: str
    access_minutes: int
    refresh_days: int


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def get_jwt_config() -> JWTConfig:
    s = get_settings()
    return JWTConfig(
        secret=s.JWT_SECRET,
        algorithm=s.JWT_ALGORITHM,
        access_minutes=s.ACCESS_TOKEN_EXPIRE_MINUTES,
        refresh_days=s.REFRESH_TOKEN_EXPIRE_DAYS,
    )


def setup_logging() -> None:
    """Configure logging for the application."""
    settings = get_settings()
    
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Configure uvicorn logging
    logging.getLogger("uvicorn.access").handlers = []


