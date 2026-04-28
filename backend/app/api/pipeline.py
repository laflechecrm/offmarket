from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company
from app.schemas import PipelineStatus

router = APIRouter()


def _get_status(db: Session) -> PipelineStatus:
    total = db.scalar(select(func.count(Company.id))) or 0
    director_enriched = db.scalar(
        select(func.count(Company.id)).where(Company.director_enriched_at.isnot(None))
    ) or 0
    website_found = db.scalar(
        select(func.count(Company.id)).where(Company.website_found_at.isnot(None))
    ) or 0
    scraped = db.scalar(
        select(func.count(Company.id)).where(Company.scraped_at.isnot(None))
    ) or 0
    summarized = db.scalar(
        select(func.count(Company.id)).where(Company.summarized_at.isnot(None))
    ) or 0
    embedded = db.scalar(
        select(func.count(Company.id)).where(Company.embedded_at.isnot(None))
    ) or 0
    scored = db.scalar(
        select(func.count(Company.id)).where(Company.scored_at.isnot(None))
    ) or 0
    return PipelineStatus(
        total=total,
        director_enriched=director_enriched,
        website_found=website_found,
        scraped=scraped,
        summarized=summarized,
        embedded=embedded,
        scored=scored,
    )


@router.get("/status", response_model=PipelineStatus)
def pipeline_status(db: Session = Depends(get_db)):
    return _get_status(db)


@router.post("/run/directors")
def run_directors(background_tasks: BackgroundTasks):
    from app.pipeline.directors import enrich_directors
    background_tasks.add_task(enrich_directors)
    return {"message": "Director enrichment started"}


@router.post("/run/websites")
def run_websites(background_tasks: BackgroundTasks):
    from app.pipeline.websites import find_websites
    background_tasks.add_task(find_websites)
    return {"message": "Website discovery started"}


@router.post("/run/scrape")
def run_scrape(background_tasks: BackgroundTasks):
    from app.pipeline.scraper import scrape_homepages
    background_tasks.add_task(scrape_homepages)
    return {"message": "Scraping started"}


@router.post("/run/summarize")
def run_summarize(background_tasks: BackgroundTasks):
    from app.pipeline.summarizer import summarize_companies
    background_tasks.add_task(summarize_companies)
    return {"message": "Summarization started"}


@router.post("/run/embed")
def run_embed(background_tasks: BackgroundTasks):
    from app.pipeline.embeddings import embed_companies
    background_tasks.add_task(embed_companies)
    return {"message": "Embedding started"}


@router.post("/run/score")
def run_score(background_tasks: BackgroundTasks):
    from app.pipeline.scorer import score_companies
    background_tasks.add_task(score_companies)
    return {"message": "Scoring started"}


@router.post("/run/all")
def run_all(background_tasks: BackgroundTasks, download: bool = False):
    from app.pipeline.run_all import run_all as _run_all
    background_tasks.add_task(_run_all, download=download)
    return {"message": "Full pipeline started"}
