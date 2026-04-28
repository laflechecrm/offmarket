from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://offmarket:offmarket@localhost:5432/offmarket"
    anthropic_api_key: str = ""
    serpapi_key: str = ""
    sirene_data_dir: str = "./data/sirene"

    # Pipeline tuning
    embedding_model: str = "paraphrase-multilingual-mpnet-base-v2"
    embedding_dim: int = 768
    llm_model: str = "claude-haiku-4-5-20251001"
    scrape_timeout: int = 15
    annuaire_rps: float = 2.0  # polite rate-limit for api.annuaire-entreprises.data.gouv.fr
    pipeline_batch_directors: int = 2000
    pipeline_batch_websites: int = 2000
    pipeline_batch_scrape: int = 2000
    pipeline_batch_summarize: int = 500
    pipeline_batch_embed: int = 2000
    pipeline_batch_score: int = 10000


settings = Settings()
