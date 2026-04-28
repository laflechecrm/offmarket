"""
Full pipeline orchestrator — runs every step in order.

Each step is idempotent: it only processes records not yet handled.
Re-running is safe and picks up where the previous run left off.

Usage:
    python -m app.pipeline.run_all [--download] [--limit N]

Options:
    --download   Download SIRENE files from data.gouv.fr before importing
    --limit N    Cap the number of companies imported from SIRENE (useful for testing)
"""

import argparse
import sys
import time
from datetime import datetime

from app.config import settings
from app.database import init_db


def _step(name: str, fn, **kwargs):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    t0 = time.monotonic()
    try:
        fn(**kwargs)
        elapsed = time.monotonic() - t0
        print(f"  Done in {elapsed:.0f}s")
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        raise


def run_all(download: bool = False, limit: int | None = None) -> None:
    started = datetime.now()
    print(f"\nOffmarket pipeline started at {started:%Y-%m-%d %H:%M:%S}")

    # 0. Init DB (create extension + tables if needed)
    _step("0/7 — Initialisation base de données", init_db)

    # 1. SIRENE import
    from app.pipeline.sirene import import_sirene, _download, SIRENE_DATA_DIR
    from app.pipeline.sirene import STOCK_UNITE_LEGALE_URL, STOCK_ETAB_URL

    if download:
        ul_zip = SIRENE_DATA_DIR / "StockUniteLegale_utf8.zip"
        etab_zip = SIRENE_DATA_DIR / "StockEtablissement_utf8.zip"
        if not ul_zip.exists():
            _step("1a/7 — Téléchargement StockUniteLegale", _download,
                  url=STOCK_UNITE_LEGALE_URL, dest=ul_zip)
        if not etab_zip.exists():
            _step("1b/7 — Téléchargement StockEtablissement", _download,
                  url=STOCK_ETAB_URL, dest=etab_zip)

    _step("1/7 — Import SIRENE", import_sirene, limit=limit)

    # 2. Enrichissement dirigeants (Annuaire des Entreprises — gratuit)
    from app.pipeline.directors import enrich_directors
    _step(
        "2/7 — Enrichissement dirigeants (annuaire-entreprises.data.gouv.fr)",
        enrich_directors,
        batch_size=settings.pipeline_batch_directors,
    )

    # 3. Découverte sites web
    from app.pipeline.websites import find_websites
    _step("3/7 — Découverte sites web", find_websites,
          batch_size=settings.pipeline_batch_websites)

    # 4. Scraping homepages
    from app.pipeline.scraper import scrape_homepages
    _step("4/7 — Scraping homepages", scrape_homepages,
          batch_size=settings.pipeline_batch_scrape)

    # 5. Résumés activité via LLM
    if settings.anthropic_api_key:
        from app.pipeline.summarizer import summarize_companies
        _step("5/7 — Résumés activité (Claude AI)", summarize_companies,
              batch_size=settings.pipeline_batch_summarize)
    else:
        print("\n5/7 — Résumés activité : ANTHROPIC_API_KEY absent, étape ignorée")

    # 6. Embeddings sémantiques
    from app.pipeline.embeddings import embed_companies
    _step("6/7 — Embeddings sémantiques", embed_companies,
          batch_size=settings.pipeline_batch_embed)

    # 7. Score cession
    from app.pipeline.scorer import score_companies
    _step("7/7 — Calcul scores cession", score_companies,
          batch_size=settings.pipeline_batch_score)

    elapsed = (datetime.now() - started).total_seconds()
    print(f"\nPipeline terminé en {elapsed/60:.1f} min")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the full offmarket pipeline")
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download SIRENE files from data.gouv.fr (several GB, first run only)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit SIRENE import to N companies (for testing)",
    )
    args = parser.parse_args()
    run_all(download=args.download, limit=args.limit)
