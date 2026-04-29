from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg2://nutricheck:nutricheck@127.0.0.1:5433/nutricheck"
    cors_origins: str = "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006"
    usda_fooddata_api_key: str = "DEMO_KEY"
    usda_only_mode: bool = False
    openfoodfacts_user_agent: str = "NutriCheck/1.0 (course project; contact: local-dev)"

    supabase_jwks_url: str | None = None
    supabase_jwt_issuer: str | None = None
    supabase_jwt_aud: str | None = "authenticated"
    clerk_jwks_url: str | None = None
    clerk_expected_iss: str | None = None

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()