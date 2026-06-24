from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_deployment: str
    azure_openai_embedding_deployment: str
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_embedding_api_version: str = "2024-10-21"

    database_url: str
    embedding_dim: int = 1536
    rag_top_k: int = 5

    auto_approve_max_value: float = 500_000.0

    auth_secret: str = "nexlara-dev-secret-change-me"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
