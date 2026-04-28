# Offmarket Sourcing

Outil d'identification d'entreprises B2B françaises à reprendre off-market : dirigeant proche de la retraite, structure saine, activité niche, non listée sur les marketplaces de cession.

## Architecture

```
offmarket/
├── backend/          # FastAPI + PostgreSQL + pgvector
│   └── app/
│       ├── api/      # Endpoints REST
│       └── pipeline/ # Modules d'ingestion et d'enrichissement
└── frontend/         # Next.js 15 + Tailwind
```

**Stack :**
- PostgreSQL 16 + pgvector (stockage + similarité sémantique)
- FastAPI (API REST)
- sentence-transformers `paraphrase-multilingual-mpnet-base-v2` (embeddings 768 dims, local, gratuit)
- Claude API `claude-haiku-4-5` (résumés d'activité)
- Pappers API (enrichissement dirigeants)
- Next.js 15 (interface)

## Démarrage rapide

### 1. Configuration

```bash
cp .env.example .env
# Renseigner ANTHROPIC_API_KEY et PAPPERS_API_KEY
```

### 2. Lancer l'infrastructure

```bash
make up
make migrate
```

### 3. Importer la base SIRENE

Télécharger les fichiers depuis [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/) :
- `StockUniteLegale_utf8.zip`
- `StockEtablissement_utf8.zip`

Placer les ZIPs dans `data/sirene/` puis :

```bash
make import-sirene
# ou avec téléchargement automatique :
docker compose exec backend python -m app.pipeline.sirene --download
```

Filtres appliqués : sociétés commerciales (SARL, SAS, SA…), 3-50 salariés, > 10 ans, France métropolitaine + DOM.

### 4. Pipeline d'enrichissement

```bash
make enrich-directors   # Pappers API : âge, nom, date nomination
make find-websites      # SerpAPI ou heuristiques
make scrape             # Scraping homepage
make summarize          # Résumé activité via Claude (haiku)
make embed              # Embeddings pour similarité sémantique
make score              # Calcul score cession
```

Chaque étape est idempotente : elle ne traite que les entreprises non encore enrichies.

### 5. Interface

Ouvrir [http://localhost:3000](http://localhost:3000)

## Modèle de score cession (0–100)

| Critère | Points |
|---|---|
| Dirigeant ≥ 58 ans | +40 |
| Dirigeant 55–57 ans | +20 |
| Dirigeant 50–54 ans | +10 |
| Dirigeant unique | +15 |
| Entreprise > 20 ans | +15 |
| Entreprise > 15 ans | +10 |
| Pas de holding | +15 |
| Dirigeant en poste > 10 ans | +10 |
| Site web disponible | +5 |

## Recherche de similarité

La page principale permet de :
1. Cliquer "Similaires" sur une entreprise → trouver les proches voisins sémantiques
2. "Recherche par similarité" → décrire librement une activité cible en texte

Les embeddings sont calculés sur `résumé activité | secteur | nom | code NAF` via sentence-transformers (cosine similarity via pgvector).

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `ANTHROPIC_API_KEY` | Claude API (résumés) |
| `PAPPERS_API_KEY` | Pappers API (dirigeants) |
| `SERPAPI_KEY` | SerpAPI (recherche site web, optionnel) |
| `SIRENE_DATA_DIR` | Répertoire des fichiers SIRENE |

## Extensibilité

- **Nouveau critère de score** : `backend/app/pipeline/scorer.py`
- **Nouvelle source d'enrichissement** : ajouter un module dans `backend/app/pipeline/`
- **Filtres UI** : `frontend/src/components/Filters.tsx` + endpoint `backend/app/api/companies.py`
- **Modèle LLM** : `LLM_MODEL` dans `config.py` (claude-haiku → claude-sonnet pour plus de qualité)
