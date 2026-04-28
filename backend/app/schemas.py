from datetime import date, datetime

from pydantic import BaseModel


class CompanyBase(BaseModel):
    siren: str
    name: str | None
    naf_code: str | None
    naf_label: str | None
    employee_min: int | None
    employee_max: int | None
    creation_date: date | None
    company_age_years: int | None
    city: str | None
    postal_code: str | None
    department: str | None
    region: str | None
    legal_form: str | None
    director_name: str | None
    director_age: int | None
    director_birth_year: int | None
    director_count: int | None
    has_holding: bool
    website: str | None
    activity_summary: str | None
    real_sector: str | None
    cession_score: float | None


class CompanyRead(CompanyBase):
    id: int
    created_at: datetime
    director_enriched_at: datetime | None
    summarized_at: datetime | None
    scored_at: datetime | None

    model_config = {"from_attributes": True}


class CompanyList(BaseModel):
    items: list[CompanyRead]
    total: int
    page: int
    page_size: int


class SimilarQuery(BaseModel):
    text: str | None = None
    siren: str | None = None
    limit: int = 10


class SimilarResult(BaseModel):
    company: CompanyRead
    similarity: float


class PipelineStatus(BaseModel):
    total: int
    director_enriched: int
    website_found: int
    scraped: int
    summarized: int
    embedded: int
    scored: int
