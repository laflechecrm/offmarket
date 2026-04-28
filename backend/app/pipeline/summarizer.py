"""
Generate activity summaries and sector classification via Claude API.

Usage:
    python -m app.pipeline.summarizer [--batch N]
"""

import argparse
import json
import time
from datetime import datetime, timezone

import anthropic
from sqlalchemy import select
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company

SYSTEM_PROMPT = """Tu es un expert en analyse d'entreprises B2B françaises.
À partir du texte d'un site web d'entreprise, tu génères :
1. Un résumé en UNE phrase courte et précise de l'activité réelle (ex: "Fabricant de protections pour rayonnage logistique", "Distributeur de pièces détachées industrielles pour l'agroalimentaire")
2. Un secteur réel en 3-5 mots (ex: "Équipements industriels B2B", "Négoce technique BTP", "Automatisation process manufacturing")

Réponds UNIQUEMENT en JSON avec les clés "summary" et "sector". Pas d'explication."""

USER_TEMPLATE = """Nom entreprise: {name}
Code NAF: {naf}
Texte du site web:
{text}

Génère le JSON de résumé d'activité."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=15))
def _call_claude(client: anthropic.Anthropic, name: str, naf: str, text: str) -> dict:
    message = client.messages.create(
        model=settings.llm_model,
        max_tokens=200,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": USER_TEMPLATE.format(
                    name=name or "Inconnue",
                    naf=naf or "N/A",
                    text=text[:3000],
                ),
            }
        ],
    )
    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def summarize_companies(batch_size: int = 100) -> None:
    if not settings.anthropic_api_key:
        print("ANTHROPIC_API_KEY not set — skipping summarization")
        return

    init_db()
    db = SessionLocal()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    try:
        companies = db.scalars(
            select(Company)
            .where(Company.homepage_text.isnot(None))
            .where(Company.summarized_at.is_(None))
            .limit(batch_size)
        ).all()

        print(f"Summarizing {len(companies)} companies via Claude…")

        for company in tqdm(companies):
            try:
                result = _call_claude(
                    client,
                    company.name or "",
                    company.naf_code or "",
                    company.homepage_text or "",
                )
                company.activity_summary = result.get("summary", "")[:500]
                company.real_sector = result.get("sector", "")[:300]
            except Exception as e:
                print(f"  Error {company.siren}: {e}")

            now = datetime.now(timezone.utc).replace(tzinfo=None)
            company.summarized_at = now
            db.commit()
            time.sleep(0.1)  # gentle rate limit

    finally:
        db.close()

    print("Summarization complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=100)
    args = parser.parse_args()
    summarize_companies(batch_size=args.batch)
