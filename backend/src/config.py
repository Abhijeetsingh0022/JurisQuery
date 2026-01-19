"""
Global configuration for JurisQuery Backend.
Uses pydantic-settings for environment variable management.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True

    # Database (Neon PostgreSQL)
    database_url: str

    # AI Services
    gemini_api_key: str
    gemini_api_key_2: str | None = None
    groq_api_key: str | None = None

    @property
    def gemini_api_keys(self) -> list[str]:
        """Return list of available Gemini API keys for rotation."""
        keys = [self.gemini_api_key]
        if self.gemini_api_key_2:
            keys.append(self.gemini_api_key_2)
        return keys

    # Vector Database (Qdrant)
    qdrant_url: str
    qdrant_api_key: str
    qdrant_collection_name: str = "jurisquery_documents"

    # File Storage (Cloudinary)
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    clerk_secret_key: str | None = None

    # CORS
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
