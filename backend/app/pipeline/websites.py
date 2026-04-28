"""
Find company websites via:
1. Pappers data (already stored from director enrichment)
2. SerpAPI Google search (if SERPAPI_KEY is set)
3. Heuristic patterns (name-based guesses)

Usage:
    python -m app.pipeline.websites [--batch N]
"""

import argparse
import re
import time
from datetime import datetime, timezone
from urllib.parse import quote_plus

import httpx
from sqlalchemy import select
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company

SERPAPI_URL = "https://serpapi.com/search"


def _search_serpapi(query: str, client: httpx.Client) -> str | None:
    if not settings.serpapi_key:
        return None
    try:
        r = client.get(
            SERPAPI_URL,
            params={"q": query, "api_key": settings.serpapi_key, "num": 3, "gl": "fr", "hl": "fr"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        for result in data.get("organic_results", []):
            url = result.get("link", "")
            # Skip directories / social networks
            if any(x in url for x in ["societe.com", "linkedin", "facebook", "pappers", "infogreffe", "verif.com"]):
                continue
            return url
    except Exception:
        pass
    return None


def _guess_domain(name: str) -> list[str]:
    """Generate candidate domains from company name."""
    slug = re.sub(r"[^a-z0-9]", "", name.lower().replace(" ", ""))
    slug = slug[:30]
    if not slug:
        return []
    return [
        f"https://www.{slug}.fr",
        f"https://{slug}.fr",
        f"https://www.{slug}.com",
    ]


def _url_reachable(url: str, client: httpx.Client) -> bool:
    try:
        r = client.head(url, timeout=8, follow_redirects=True)
        return r.status_code < 400
    except Exception:
        return False


def find_websites(batch_size: int = 500) -> None:
    init_db()
    db = SessionLocal()

    try:
        companies = db.scalars(
            select(Company)
            .where(Company.website_found_at.is_(None))
            .where(Company.website.is_(None))
            .limit(batch_size)
        ).all()

        print(f"Finding websites for {len(companies)} companies…")

        with httpx.Client(headers={"User-Agent": "Mozilla/5.0"}) as client:
            for company in tqdm(companies):
                website = None

                # Try SerpAPI search
                if settings.serpapi_key and company.name:
                    query = f"{company.name} {company.city or ''} site officiel"
                    website = _search_serpapi(query, client)
                    if website:
                        time.sleep(0.5)

                # Try heuristic domain guesses
                if not website and company.name:
                    for candidate in _guess_domain(company.name):
                        if _url_reachable(candidate, client):
                            website = candidate
                            break

                now = datetime.now(timezone.utc).replace(tzinfo=None)
                company.website = website
                company.website_found_at = now
                db.commit()

    finally:
        db.close()

    print("Website discovery complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=500)
    args = parser.parse_args()
    find_websites(batch_size=args.batch)
