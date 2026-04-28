.PHONY: deploy up down build logs pipeline \
        shell-backend shell-db migrate \
        import-sirene enrich-directors find-websites \
        scrape summarize embed score \
        dev-backend dev-frontend

# ─── Auto-deploy ──────────────────────────────────────────────────────────────
# Full setup: builds, starts services, then runs the pipeline.
# Set PIPELINE_FLAGS env var to customise (e.g. make deploy PIPELINE_FLAGS=--limit 1000)
deploy: build up _wait-healthy
	@echo ""
	@echo "Lancement du pipeline complet (téléchargement SIRENE + enrichissement)..."
	@echo "Cela peut prendre 30-60 min selon la connexion."
	@echo ""
	docker compose run --rm pipeline
	@echo ""
	@echo "Déploiement terminé. Interface : http://localhost:3000"

# ─── Infrastructure ───────────────────────────────────────────────────────────
build:
	docker compose build

up:
	docker compose up -d db backend frontend

down:
	docker compose down

logs:
	docker compose logs -f

_wait-healthy:
	@echo "En attente du backend..."
	@until docker compose exec -T backend curl -sf http://localhost:8000/health > /dev/null 2>&1; do \
		printf '.'; sleep 3; \
	done
	@echo " OK"

# ─── Shell access ─────────────────────────────────────────────────────────────
shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec db psql -U offmarket offmarket

# ─── Pipeline steps (individual) ──────────────────────────────────────────────
# Run the full pipeline in one shot
pipeline: _wait-healthy
	docker compose run --rm pipeline

# Run only SIRENE import (add --download to fetch the files first)
import-sirene:
	docker compose exec backend python -m app.pipeline.sirene $(ARGS)

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

# ─── Local dev (without Docker) ───────────────────────────────────────────────
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev
