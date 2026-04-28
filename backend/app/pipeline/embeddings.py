"""
Generate sentence embeddings for semantic similarity search.

Uses sentence-transformers (local model, multilingual, free).
Model: paraphrase-multilingual-mpnet-base-v2 (768 dims)

Usage:
    python -m app.pipeline.embeddings [--batch N]
"""

import argparse
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import select
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer
    print(f"Loading embedding model: {settings.embedding_model}…")
    return SentenceTransformer(settings.embedding_model)


def get_embedding(text: str) -> list[float]:
    model = _get_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def _build_text(company: Company) -> str | None:
    parts = []
    if company.activity_summary:
        parts.append(company.activity_summary)
    if company.real_sector:
        parts.append(company.real_sector)
    if company.name:
        parts.append(company.name)
    if company.naf_label:
        parts.append(company.naf_label)
    return " | ".join(parts) if parts else None


def embed_companies(batch_size: int = 500) -> None:
    init_db()
    db = SessionLocal()

    try:
        companies = db.scalars(
            select(Company)
            .where(Company.summarized_at.isnot(None))
            .where(Company.embedded_at.is_(None))
            .limit(batch_size)
        ).all()

        if not companies:
            print("No companies to embed.")
            return

        print(f"Embedding {len(companies)} companies…")
        model = _get_model()

        texts = [_build_text(c) for c in companies]
        valid = [(c, t) for c, t in zip(companies, texts) if t]
        if not valid:
            return

        valid_companies, valid_texts = zip(*valid)
        embeddings = model.encode(
            list(valid_texts),
            normalize_embeddings=True,
            batch_size=64,
            show_progress_bar=True,
        )

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for company, emb in zip(valid_companies, embeddings):
            company.embedding = emb.tolist()
            company.embedded_at = now

        db.commit()

    finally:
        db.close()

    print("Embedding complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=500)
    args = parser.parse_args()
    embed_companies(batch_size=args.batch)
