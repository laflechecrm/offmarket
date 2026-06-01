"""
Generate activity summaries, sector classification, and digital opportunity analysis via Claude API.

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

SYSTEM_PROMPT = """Tu es un analyste M&A expert en reprise de PME françaises et en transformation digitale.
À partir du texte d'un site web d'entreprise, tu génères une analyse structurée.
Réponds UNIQUEMENT en JSON valide. Pas d'explication, pas de markdown."""

USER_TEMPLATE = """Entreprise: {name}
Code NAF: {naf}
Effectifs: {employees}
Ancienneté: {age} ans
Texte du site web:
{text}

Réponds avec ce JSON exact:
{{
  "summary": "UNE phrase décrivant l'activité réelle (ex: Fabricant de protections pour rayonnage logistique)",
  "sector": "3-5 mots (ex: Équipements industriels B2B)",
  "digital_opportunity": "2-4 phrases sur les gaps digitaux et le potentiel. Cite les signaux concrets détectés (site ancien, pas de CRM, catalogue PDF, commande par fax...). Termine par une estimation de croissance potentielle (+X% à +Y% de CA).",
  "risks": "1-3 phrases sur les risques principaux (dépendance dirigeant, secteur, réglementation, clientèle concentrée...)",
  "growth_levers": "1-3 phrases sur les 2-3 leviers de croissance prioritaires post-acquisition"
}}"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=15))
def _call_claude(client: anthropic.Anthropic, company: Company) -> dict:
    emp = f"{company.employee_min or 0}–{company.employee_max or '?'}" if company.employee_min is not None else "N/A"
    message = client.messages.create(
        model=settings.llm_model,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": USER_TEMPLATE.format(
                    name=company.name or "Inconnue",
                    naf=company.naf_code or "N/A",
                    employees=emp,
                    age=company.company_age_years or "N/A",
                    text=(company.homepage_text or "")[:4000],
                ),
            }
        ],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
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
                result = _call_claude(client, company)
                company.activity_summary = (result.get("summary") or "")[:500]
                company.real_sector = (result.get("sector") or "")[:300]
                company.digital_opportunity_summary = result.get("digital_opportunity") or None
                company.risks_summary = result.get("risks") or None
                company.growth_potential_summary = result.get("growth_levers") or None
            except Exception as e:
                print(f"  Error {company.siren}: {e}")

            company.summarized_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
            time.sleep(0.15)

    finally:
        db.close()

    print("Summarization complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=100)
    args = parser.parse_args()
    summarize_companies(batch_size=args.batch)
