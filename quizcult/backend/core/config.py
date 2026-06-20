from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "sqlite+aiosqlite:///./quizcult.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Ollama
    # Ollama - use cloud for speed, local for testing
    # Options: kimi-k2.6:cloud, minimax-m3:cloud, qwen2.5:7b (local)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "kimi-k2.6:cloud"
    
    # Set to true to force local model (slower but free)
    use_local_llm: bool = False

    # Security
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # App
    debug: bool = False
    trending_refresh_interval_minutes: int = 60
    max_challenges_per_day: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
