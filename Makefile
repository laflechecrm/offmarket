.PHONY: up down build logs shell-backend shell-db \
        migrate import-sirene enrich-directors find-websites \
        scrape summarize embed score pipeline dev-backend dev-frontend

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec db psql -U offmarket offmarket

migrate:
	docker compose exec backend alembic upgrade head

# Pipeline steps (run inside backend container)
import-sirene:
	docker compose exec backend python -m app.pipeline.sirene

enrich-directors:
	docker compose exec backend python -m app.pipeline.directors

find-websites:
	docker compose exec backend python -m app.pipeline.websites

scrape:
	docker compose exec backend python -m app.pipeline.scraper

summarize:
	docker compose exec backend python -m app.pipeline.summarizer

embed:
	docker compose exec backend python -m app.pipeline.embeddings

score:
	docker compose exec backend python -m app.pipeline.scorer

# Run full pipeline sequentially
pipeline: enrich-directors find-websites scrape summarize embed score

# Local dev (without Docker)
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev
