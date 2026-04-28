"""
Enrich companies with director information via the Pappers API.

Pappers API docs: https://api.pappers.fr/documentation
Free tier: 3 req/s, limited monthly quota.

Usage:
    python -m app.pipeline.directors [--batch N] [--siren SIREN]
"""

import argparse
import time
from datetime import date, datetime, timezone

import httpx
from sqlalchemy import select
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company

PAPPERS_BASE = "https://api.pappers.fr/v2"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _fetch_pappers(siren: str, client: httpx.Client) -> dict | None:
    r = client.get(
        f"{PAPPERS_BASE}/entreprise",
        params={"siren": siren, "api_token": settings.pappers_api_key},
        timeout=15,
    )
    if r.status_code == 404:
        return None
    if r.status_code == 429:
        time.sleep(5)
        r.raise_for_status()
    r.raise_for_status()
    return r.json()


def _parse_birth_year(date_str: str | None) -> int | None:
    """Parse '01/1965' or '1965-01-01' → 1965."""
    if not date_str:
        return None
    for sep in ("/", "-"):
        parts = date_str.split(sep)
        for part in reversed(parts):
            if len(part) == 4 and part.isdigit():
                return int(part)
    return None


def _parse_date(date_str: str | None) -> date | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def _has_holding(data: dict) -> bool:
    """Heuristic: check if a holding/parent company owns this entity."""
    for b in data.get("beneficiaires_effectifs", []):
        if b.get("type_de_personne") == "PERSONNE_MORALE":
            return True
    for link in data.get("entreprises_liees", []):
        if link.get("type_lien") in ("FILIALE", "PARTICIPATION"):
            return True
    return False


def enrich_directors(batch_size: int = 500, siren_filter: str | None = None) -> None:
    if not settings.pappers_api_key:
        print("PAPPERS_API_KEY not set — skipping director enrichment")
        return

    init_db()
    db = SessionLocal()
    min_delay = 1.0 / settings.pappers_rps

    try:
        q = select(Company).where(Company.director_enriched_at.is_(None))
        if siren_filter:
            q = q.where(Company.siren == siren_filter)
        q = q.limit(batch_size)
        companies = db.scalars(q).all()

        print(f"Enriching {len(companies)} companies with Pappers…")

        with httpx.Client() as client:
            for company in tqdm(companies):
                t0 = time.monotonic()
                try:
                    data = _fetch_pappers(company.siren, client)
                except Exception as e:
                    print(f"  Error {company.siren}: {e}")
                    data = None

                now = datetime.now(timezone.utc).replace(tzinfo=None)

                if data:
                    company.website = (
                        company.website or data.get("site_internet") or None
                    )

                    representants = data.get("representants", [])
                    # Find primary director: Président, Gérant, DG
                    primary = None
                    for priority in ("Président", "Gérant", "Directeur général", "PDG"):
                        primary = next(
                            (r for r in representants if priority.lower() in r.get("qualite", "").lower()),
                            None,
                        )
                        if primary:
                            break
                    if primary is None and representants:
                        primary = representants[0]

                    if primary:
                        company.director_name = " ".join(filter(None, [
                            primary.get("prenom", ""),
                            primary.get("nom", ""),
                        ])).strip() or None
                        birth_year = _parse_birth_year(primary.get("date_de_naissance"))
                        company.director_birth_year = birth_year
                        if birth_year:
                            company.director_age = datetime.now().year - birth_year
                        company.director_appointment_date = _parse_date(
                            primary.get("date_de_prise_de_poste")
                        )

                    company.director_count = len(representants)
                    company.has_holding = _has_holding(data)

                company.director_enriched_at = now
                db.commit()

                elapsed = time.monotonic() - t0
                if elapsed < min_delay:
                    time.sleep(min_delay - elapsed)

    finally:
        db.close()

    print("Director enrichment complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=500)
    parser.add_argument("--siren", default=None)
    args = parser.parse_args()
    enrich_directors(batch_size=args.batch, siren_filter=args.siren)
