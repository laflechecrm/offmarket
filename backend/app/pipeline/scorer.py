"""
Compute acquisition score (0–100) for each company.

Scoring model (investisseur-opérateur, 4 axes):
  Potentiel digital       (40 pts): gap numérique = levier de création de valeur
  Qualité business        (30 pts): produit physique B2B, achats récurrents
  Transmissibilité        (20 pts): dirigeant proche de la retraite, succession claire
  Complexité opérationnelle (10 pts): peu de salariés, secteur non réglementé

Usage:
    python -m app.pipeline.scorer [--batch N]
"""

import argparse
from datetime import datetime, timezone

from sqlalchemy import select
from tqdm import tqdm

from app.database import SessionLocal, init_db
from app.models import Company

# NAF prefixes for B2B physical-product businesses
_PHYSICAL_B2B_PREFIXES = (
    "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
    "30", "31", "32", "33",   # manufacturing
    "46",                      # wholesale B2B trade
    "49", "50", "51", "52",   # transport & logistics
    "38", "39",               # waste management / industrial services
)

# NAF prefixes for regulated sectors (lower complexity score)
_REGULATED_PREFIXES = ("64", "65", "66", "69", "70", "71", "75", "86", "87", "88")


def compute_retirement_probability(company: Company) -> float:
    score = 0.0
    if company.creation_date:
        from datetime import date as _date
        if company.creation_date.year < 2000:
            score += 25
    if company.director_age is not None and company.director_age >= 60:
        score += 20
    elif company.director_age is not None and company.director_age >= 55:
        score += 12
    if company.director_appointment_date:
        years = (_TODAY - company.director_appointment_date).days // 365
        if years >= 20:
            score += 20
        elif years >= 15:
            score += 12
    age = company.company_age_years or 0
    if age >= 25:
        score += 15
    elif age >= 20:
        score += 8
    if not company.website:
        score += 10  # pas de site = peu de dynamisme
    if company.director_count == 1 and not company.has_holding:
        score += 10  # structure fragile à la cession
    return min(score, 100.0)


def compute_score(company: Company) -> tuple[float, float, float, float, float, float]:
    """Return (total, digital, business, transmission, complexity, retirement_probability)."""

    # ── POTENTIEL DIGITAL (0–40 pts) ─────────────────────────────────────────
    digital = 0.0

    # No web presence → maximum digital gap opportunity
    if not company.website:
        digital += 20

    # Micro-company: likely no CRM / automation
    emp_max = company.employee_max
    emp_min = company.employee_min
    if (emp_max is not None and emp_max <= 5) or (emp_min == 0 and emp_max == 0):
        digital += 10

    # Founded pre-digital era (≥20 years) → no tech overhaul likely
    age = company.company_age_years or 0
    if age >= 20:
        digital += 10
    elif age >= 15:
        digital += 5

    digital = min(digital, 40.0)

    # ── QUALITÉ BUSINESS (0–30 pts) ──────────────────────────────────────────
    business = 0.0
    naf = company.naf_code or ""

    # Physical product or B2B distribution sector
    if any(naf.startswith(p) for p in _PHYSICAL_B2B_PREFIXES):
        business += 12

    # Wholesale trade (46xx): recurring B2B customer relationships
    if naf.startswith("46"):
        business += 10

    # Established business → loyal customer base, recurring orders
    if age >= 15:
        business += 8

    business = min(business, 30.0)

    # ── TRANSMISSIBILITÉ (0–20 pts) ───────────────────────────────────────────
    transmission = 0.0

    director_age = company.director_age
    if director_age is not None:
        if director_age >= 58:
            transmission += 10
        elif director_age >= 55:
            transmission += 7
        elif director_age >= 50:
            transmission += 3

    # Single director + no holding → clean succession
    sole = company.director_count == 1
    no_holding = not company.has_holding
    if sole and no_holding:
        transmission += 10
    elif sole or no_holding:
        transmission += 5

    transmission = min(transmission, 20.0)

    # ── COMPLEXITÉ OPÉRATIONNELLE (0–10 pts) ──────────────────────────────────
    complexity = 0.0

    if emp_max is not None and emp_max <= 5:
        complexity += 5
    elif emp_max is not None and emp_max <= 10:
        complexity += 3

    # Non-regulated sector → no special licence required
    if not any(naf.startswith(p) for p in _REGULATED_PREFIXES):
        complexity += 5

    complexity = min(complexity, 10.0)

    total = min(digital + business + transmission + complexity, 100.0)
    retirement = compute_retirement_probability(company)
    return total, digital, business, transmission, complexity, retirement


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
            total, dig, biz, trans, cpx, ret = compute_score(company)
            company.cession_score = total
            company.digital_score = dig
            company.business_score = biz
            company.transmission_score = trans
            company.complexity_score = cpx
            company.retirement_probability = ret
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
