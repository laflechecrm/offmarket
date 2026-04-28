from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.config import settings
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # SIRENE identifiers
    siren: Mapped[str] = mapped_column(String(9), unique=True, nullable=False, index=True)
    siret_siege: Mapped[str | None] = mapped_column(String(14), index=True)
    name: Mapped[str | None] = mapped_column(String(500))

    # Activité
    naf_code: Mapped[str | None] = mapped_column(String(10), index=True)
    naf_label: Mapped[str | None] = mapped_column(String(500))

    # Effectifs
    employee_range: Mapped[str | None] = mapped_column(String(20))
    employee_min: Mapped[int | None] = mapped_column(Integer)
    employee_max: Mapped[int | None] = mapped_column(Integer)

    # Dates
    creation_date: Mapped[date | None] = mapped_column(Date)
    company_age_years: Mapped[int | None] = mapped_column(Integer)

    # Localisation
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(200))
    postal_code: Mapped[str | None] = mapped_column(String(10))
    department: Mapped[str | None] = mapped_column(String(10), index=True)
    region: Mapped[str | None] = mapped_column(String(100), index=True)

    # Forme juridique
    legal_form_code: Mapped[str | None] = mapped_column(String(10))
    legal_form: Mapped[str | None] = mapped_column(String(200))

    # Dirigeant (enrichi Pappers)
    director_name: Mapped[str | None] = mapped_column(String(500))
    director_birth_year: Mapped[int | None] = mapped_column(Integer)
    director_age: Mapped[int | None] = mapped_column(Integer, index=True)
    director_appointment_date: Mapped[date | None] = mapped_column(Date)
    director_count: Mapped[int | None] = mapped_column(Integer)
    has_holding: Mapped[bool] = mapped_column(Boolean, default=False)

    # Site web
    website: Mapped[str | None] = mapped_column(String(500))
    homepage_text: Mapped[str | None] = mapped_column(Text)

    # Activité réelle (LLM)
    activity_summary: Mapped[str | None] = mapped_column(Text)
    real_sector: Mapped[str | None] = mapped_column(String(300), index=True)

    # Similarité sémantique
    embedding: Mapped[list | None] = mapped_column(Vector(settings.embedding_dim))

    # Score cession
    cession_score: Mapped[float | None] = mapped_column(Float, index=True)

    # Pipeline state timestamps
    director_enriched_at: Mapped[datetime | None] = mapped_column(DateTime)
    website_found_at: Mapped[datetime | None] = mapped_column(DateTime)
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime)
    summarized_at: Mapped[datetime | None] = mapped_column(DateTime)
    embedded_at: Mapped[datetime | None] = mapped_column(DateTime)
    scored_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
