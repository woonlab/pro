from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://fms:fms@localhost:5432/fms"
    cors_origins: list[str] = ["http://localhost:5173"]
    secret_key: str = "dev-secret-key-change-me"
    access_token_expire_minutes: int = 60 * 12

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
