"""
Enrich companies with director information via the free government API:
https://api.annuaire-entreprises.data.gouv.fr

No API key required. Rate-limit: ~2 req/s (be polite).

Also retrieves website URL when available.

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

BASE_URL = "https://api.annuaire-entreprises.data.gouv.fr"
HEADERS = {"User-Agent": "offmarket-sourcing/1.0 (open-source research tool)"}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _fetch_entreprise(siren: str, client: httpx.Client) -> dict | None:
    r = client.get(f"{BASE_URL}/entreprise/{siren}", timeout=15)
    if r.status_code == 404:
        return None
    if r.status_code == 429:
        time.sleep(10)
        r.raise_for_status()
    r.raise_for_status()
    return r.json()


def _parse_date(date_str: str | None) -> date | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def _has_holding(dirigeants: list[dict]) -> bool:
    """A personne_morale acting as director usually means a holding structure."""
    return any(d.get("type_dirigeant") == "personne_morale" for d in dirigeants)


def enrich_directors(batch_size: int = 500, siren_filter: str | None = None) -> None:
    init_db()
    db = SessionLocal()
    min_delay = 1.0 / settings.annuaire_rps

    try:
        q = select(Company).where(Company.director_enriched_at.is_(None))
        if siren_filter:
            q = q.where(Company.siren == siren_filter)
        q = q.limit(batch_size)
        companies = db.scalars(q).all()

        print(f"Enriching {len(companies)} companies via Annuaire des Entreprises…")

        with httpx.Client(headers=HEADERS) as client:
            for company in tqdm(companies):
                t0 = time.monotonic()
                try:
                    data = _fetch_entreprise(company.siren, client)
                except Exception as e:
                    print(f"  Error {company.siren}: {e}")
                    data = None

                now = datetime.now(timezone.utc).replace(tzinfo=None)

                if data:
                    # Website (free from annuaire)
                    if not company.website:
                        company.website = data.get("site_internet") or None

                    dirigeants = data.get("dirigeants") or []

                    # Pick primary: Président > Gérant > DG > first
                    primary = None
                    for priority in ("président", "gérant", "directeur général", "pdg"):
                        primary = next(
                            (
                                d for d in dirigeants
                                if priority in (d.get("qualite") or "").lower()
                                and d.get("type_dirigeant") != "personne_morale"
                            ),
                            None,
                        )
                        if primary:
                            break
                    if primary is None:
                        # First physical person
                        primary = next(
                            (d for d in dirigeants if d.get("type_dirigeant") != "personne_morale"),
                            None,
                        )

                    if primary:
                        nom = primary.get("nom", "")
                        prenom = primary.get("prenoms") or primary.get("prenom", "")
                        company.director_name = f"{prenom} {nom}".strip() or None

                        birth_year_str = primary.get("annee_de_naissance", "")
                        if birth_year_str and str(birth_year_str).isdigit():
                            birth_year = int(birth_year_str)
                            company.director_birth_year = birth_year
                            company.director_age = datetime.now().year - birth_year

                        company.director_appointment_date = _parse_date(
                            primary.get("date_prise_de_poste")
                        )

                    company.director_count = len(dirigeants)
                    company.has_holding = _has_holding(dirigeants)

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
