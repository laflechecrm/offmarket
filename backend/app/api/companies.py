from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company
from app.schemas import CompanyList, CompanyRead, SimilarQuery, SimilarResult

router = APIRouter()


@router.get("", response_model=CompanyList)
def list_companies(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    region: str | None = None,
    department: str | None = None,
    director_age_min: int | None = None,
    director_age_max: int | None = None,
    employee_min: int | None = None,
    employee_max: int | None = None,
    cession_score_min: float | None = None,
    keyword: str | None = None,
    has_website: bool | None = None,
    has_summary: bool | None = None,
):
    q = select(Company)

    if region:
        q = q.where(Company.region == region)
    if department:
        q = q.where(Company.department == department)
    if director_age_min is not None:
        q = q.where(Company.director_age >= director_age_min)
    if director_age_max is not None:
        q = q.where(Company.director_age <= director_age_max)
    if employee_min is not None:
        q = q.where(Company.employee_max >= employee_min)
    if employee_max is not None:
        q = q.where(Company.employee_min <= employee_max)
    if cession_score_min is not None:
        q = q.where(Company.cession_score >= cession_score_min)
    if has_website is True:
        q = q.where(Company.website.isnot(None))
    if has_summary is True:
        q = q.where(Company.activity_summary.isnot(None))
    if keyword:
        pattern = f"%{keyword}%"
        q = q.where(
            or_(
                Company.activity_summary.ilike(pattern),
                Company.real_sector.ilike(pattern),
                Company.name.ilike(pattern),
            )
        )

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(
        q.order_by(Company.cession_score.desc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return CompanyList(items=list(items), total=total, page=page, page_size=page_size)


@router.get("/regions", response_model=list[str])
def list_regions(db: Annotated[Session, Depends(get_db)]):
    rows = db.scalars(
        select(Company.region).distinct().where(Company.region.isnot(None)).order_by(Company.region)
    ).all()
    return list(rows)


@router.get("/{siren}", response_model=CompanyRead)
def get_company(siren: str, db: Annotated[Session, Depends(get_db)]):
    company = db.scalar(select(Company).where(Company.siren == siren))
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("/similar", response_model=list[SimilarResult])
def find_similar(body: SimilarQuery, db: Annotated[Session, Depends(get_db)]):
    from app.pipeline.embeddings import get_embedding

    if body.siren:
        anchor = db.scalar(select(Company).where(Company.siren == body.siren))
        if not anchor or anchor.embedding is None:
            raise HTTPException(status_code=404, detail="Company not found or not embedded")
        embedding = anchor.embedding
    elif body.text:
        embedding = get_embedding(body.text)
    else:
        raise HTTPException(status_code=400, detail="Provide siren or text")

    # pgvector cosine distance (<=>)
    rows = db.execute(
        select(
            Company,
            (1 - Company.embedding.op("<=>")(embedding)).label("similarity"),
        )
        .where(Company.embedding.isnot(None))
        .where(Company.siren != (body.siren or ""))
        .order_by(Company.embedding.op("<=>")(embedding))
        .limit(body.limit)
    ).all()

    return [SimilarResult(company=row[0], similarity=float(row[1])) for row in rows]
