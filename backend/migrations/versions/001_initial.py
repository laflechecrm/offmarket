"""Initial schema with pgvector

Revision ID: 001
Revises:
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("siren", sa.String(9), nullable=False, unique=True),
        sa.Column("siret_siege", sa.String(14)),
        sa.Column("name", sa.String(500)),
        sa.Column("naf_code", sa.String(10)),
        sa.Column("naf_label", sa.String(500)),
        sa.Column("employee_range", sa.String(20)),
        sa.Column("employee_min", sa.Integer),
        sa.Column("employee_max", sa.Integer),
        sa.Column("creation_date", sa.Date),
        sa.Column("company_age_years", sa.Integer),
        sa.Column("address", sa.Text),
        sa.Column("city", sa.String(200)),
        sa.Column("postal_code", sa.String(10)),
        sa.Column("department", sa.String(10)),
        sa.Column("region", sa.String(100)),
        sa.Column("legal_form_code", sa.String(10)),
        sa.Column("legal_form", sa.String(200)),
        sa.Column("director_name", sa.String(500)),
        sa.Column("director_birth_year", sa.Integer),
        sa.Column("director_age", sa.Integer),
        sa.Column("director_appointment_date", sa.Date),
        sa.Column("director_count", sa.Integer),
        sa.Column("has_holding", sa.Boolean, default=False),
        sa.Column("website", sa.String(500)),
        sa.Column("homepage_text", sa.Text),
        sa.Column("activity_summary", sa.Text),
        sa.Column("real_sector", sa.String(300)),
        sa.Column("embedding", Vector(768)),
        sa.Column("cession_score", sa.Float),
        sa.Column("director_enriched_at", sa.DateTime),
        sa.Column("website_found_at", sa.DateTime),
        sa.Column("scraped_at", sa.DateTime),
        sa.Column("summarized_at", sa.DateTime),
        sa.Column("embedded_at", sa.DateTime),
        sa.Column("scored_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_index("ix_companies_siren", "companies", ["siren"], unique=True)
    op.create_index("ix_companies_director_age", "companies", ["director_age"])
    op.create_index("ix_companies_region", "companies", ["region"])
    op.create_index("ix_companies_cession_score", "companies", ["cession_score"])


def downgrade() -> None:
    op.drop_table("companies")
