import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), extra="ignore"
    )

    database_url: str
    database_public_url: str = ""
    backend_api_token: str
    plaid_client_id: str = ""
    plaid_sandbox_secret: str = ""
    plaid_production_secret: str = ""
    plaid_env: str = "sandbox"
    plaid_webhook_url: str = ""
    plaid_redirect_uri: str = ""
    anthropic_api_key: str = ""

    @property
    def plaid_secret(self) -> str:
        if self.plaid_env == "production":
            return self.plaid_production_secret
        return self.plaid_sandbox_secret

    @property
    def sqlalchemy_database_url(self) -> str:
        # Railway's DATABASE_URL points at the private network, which is
        # unreachable from a local machine; RAILWAY_ENVIRONMENT is only set
        # on Railway, so fall back to the public URL when developing locally.
        url = self.database_url
        if self.database_public_url and "RAILWAY_ENVIRONMENT" not in os.environ:
            url = self.database_public_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url.removeprefix("postgres://")
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
