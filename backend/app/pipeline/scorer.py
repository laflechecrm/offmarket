"""
Compute cession probability score (0–100) for each company.

Scoring model:
  - Dirigeant > 58 ans      → +40 pts
  - Dirigeant 55-57 ans     → +20 pts
  - Dirigeant unique        → +15 pts
  - Entreprise > 20 ans     → +15 pts  (en plus des 10 ans requis)
  - Entreprise > 15 ans     → +10 pts
  - Pas de holding          → +15 pts
  - Dirigeant en poste > 10 ans → +10 pts
  - A un site web           → +5 pts   (meilleure visibilité = vérifiable)

Score final normalisé sur 100.

Usage:
    python -m app.pipeline.scorer [--batch N]
"""

import argparse
from datetime import date, datetime, timezone

from sqlalchemy import select
from tqdm import tqdm

from app.database import SessionLocal, init_db
from app.models import Company

MAX_SCORE = 100.0
_TODAY = date.today()


def compute_score(company: Company) -> float:
    score = 0.0

    # Age dirigeant
    age = company.director_age
    if age is not None:
        if age >= 58:
            score += 40
        elif age >= 55:
            score += 20
        elif age >= 50:
            score += 10

    # Dirigeant unique
    if company.director_count == 1:
        score += 15

    # Ancienneté entreprise
    age_co = company.company_age_years or 0
    if age_co >= 20:
        score += 15
    elif age_co >= 15:
        score += 10

    # Pas de holding
    if not company.has_holding:
        score += 15

    # Ancienneté du dirigeant au poste
    if company.director_appointment_date:
        years_in_post = (_TODAY - company.director_appointment_date).days // 365
        if years_in_post >= 10:
            score += 10
        elif years_in_post >= 5:
            score += 5

    # Site web disponible (vérifiabilité)
    if company.website:
        score += 5

    return min(score, MAX_SCORE)


def score_companies(batch_size: int = 5000) -> None:
    init_db()
    db = SessionLocal()

    try:
        companies = db.scalars(
            select(Company)
            .where(Company.director_enriched_at.isnot(None))
            .where(Company.scored_at.is_(None))
            .limit(batch_size)
        ).all()

        print(f"Scoring {len(companies)} companies…")
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        for company in tqdm(companies):
            company.cession_score = compute_score(company)
            company.scored_at = now

        db.commit()

    finally:
        db.close()

    print("Scoring complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=5000)
    args = parser.parse_args()
    score_companies(batch_size=args.batch)
