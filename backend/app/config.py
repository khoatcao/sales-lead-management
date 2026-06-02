from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    openai_api_key: str
    openai_base_url: str = "https://openai.vocareum.com/v1"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    environment: str = "development"
    port: int = 8000
    otel_endpoint: str = "http://localhost:4317"
    cors_origins: str = ""


settings = Settings()  # type: ignore[call-arg]
