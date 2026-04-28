"""
Scrape company homepages and extract visible text.

Usage:
    python -m app.pipeline.scraper [--batch N]
"""

import argparse
import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; OffmarketBot/1.0; +https://offmarket.io)"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# Tags whose text we keep
KEEP_TAGS = {"p", "h1", "h2", "h3", "h4", "li", "span", "div", "a", "td", "th"}
# Tags to strip entirely
SKIP_TAGS = {"script", "style", "noscript", "nav", "footer", "header", "meta", "link"}


def _extract_text(html: str, max_chars: int = 4000) -> str:
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(list(SKIP_TAGS)):
        tag.decompose()

    chunks: list[str] = []
    for tag in soup.find_all(True):
        if tag.name not in KEEP_TAGS:
            continue
        text = tag.get_text(separator=" ", strip=True)
        if len(text) > 20:
            chunks.append(text)

    combined = " ".join(chunks)
    combined = re.sub(r"\s+", " ", combined).strip()
    return combined[:max_chars]


def _scrape(url: str, client: httpx.Client) -> str | None:
    try:
        r = client.get(url, timeout=settings.scrape_timeout, follow_redirects=True)
        if r.status_code >= 400:
            return None
        content_type = r.headers.get("content-type", "")
        if "html" not in content_type:
            return None
        return _extract_text(r.text)
    except Exception:
        return None


def scrape_homepages(batch_size: int = 500) -> None:
    init_db()
    db = SessionLocal()

    try:
        companies = db.scalars(
            select(Company)
            .where(Company.website.isnot(None))
            .where(Company.scraped_at.is_(None))
            .limit(batch_size)
        ).all()

        print(f"Scraping {len(companies)} homepages…")

        with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
            for company in tqdm(companies):
                text = _scrape(company.website, client)
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                company.homepage_text = text
                company.scraped_at = now
                db.commit()

    finally:
        db.close()

    print("Scraping complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=500)
    args = parser.parse_args()
    scrape_homepages(batch_size=args.batch)
