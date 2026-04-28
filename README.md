# Offmarket Sourcing

Outil d'identification d'entreprises B2B françaises à reprendre off-market : dirigeant proche de la retraite, structure saine, activité niche, non listée sur les marketplaces de cession.

**100% gratuit** — données SIRENE + Annuaire des Entreprises (gouvernement français). Seul Claude API est requis pour les résumés d'activité.

## Démarrage en une commande

```bash
# 1. Copier et renseigner les variables d'environnement
cp .env.example .env
# Renseigner uniquement ANTHROPIC_API_KEY dans .env

# 2. Déployer (build + start + pipeline complet)
make deploy
```

L'interface est disponible sur **http://localhost:3000** à la fin du déploiement.

> **Note :** Le pipeline télécharge les fichiers SIRENE (~500 MB + ~2 GB) depuis data.gouv.fr lors du premier lancement. Prévoir ~30-60 min selon la connexion et la machine.

## Architecture

```
offmarket/
├── backend/          # FastAPI + PostgreSQL + pgvector
│   └── app/
│       ├── api/      # Endpoints REST
│       └── pipeline/ # Modules d'ingestion et d'enrichissement
└── frontend/         # Next.js 15 + Tailwind
```

**Stack — 100% open source / gratuit (hors LLM) :**
| Composant | Technologie |
|---|---|
| Base de données | PostgreSQL 16 + pgvector |
| API | FastAPI |
| Données entreprises | SIRENE (data.gouv.fr) |
| Données dirigeants | Annuaire des Entreprises (api.annuaire-entreprises.data.gouv.fr) |
| Embeddings | sentence-transformers `paraphrase-multilingual-mpnet-base-v2` (local, gratuit) |
| Résumés activité | Claude Haiku (Anthropic API) |
| Interface | Next.js 15 + Tailwind |

## Pipeline d'enrichissement

Chaque étape est **idempotente** : relancer est safe, seules les entrées non traitées sont reprises.

| # | Étape | Source | Résultat |
|---|---|---|---|
| 1 | Import SIRENE | data.gouv.fr | Sociétés commerciales, 3-50 sal., >10 ans |
| 2 | Dirigeants | annuaire-entreprises.data.gouv.fr | Âge, nomination, structure holding |
| 3 | Sites web | Annuaire + SerpAPI + heuristiques | URL du site de l'entreprise |
| 4 | Scraping | httpx + BeautifulSoup | Texte de la homepage |
| 5 | Résumé activité | Claude Haiku | "Fabricant de protections pour rayonnage" |
| 6 | Embeddings | sentence-transformers (local) | Vecteurs 768 dims |
| 7 | Score cession | Règles métier | Score 0-100 |

## Commandes disponibles

```bash
make deploy          # Déploiement complet (première installation)
make up              # Démarrer les services (sans relancer le pipeline)
make down            # Arrêter les services
make pipeline        # Relancer le pipeline (incrémental)
make logs            # Suivre les logs

# Étapes individuelles
make import-sirene   # Importer SIRENE uniquement
make enrich-directors
make find-websites
make scrape
make summarize
make embed
make score
```

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

## Recherche de similarité sémantique

1. **Par entreprise** : cliquer "Similaires" sur n'importe quelle ligne
2. **Par texte libre** : bouton "Recherche par similarité" en haut à droite

Les embeddings sont calculés sur `résumé | secteur | nom | NAF` via sentence-transformers. La similarité est cosine distance via pgvector (`<=>`).

## Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Oui | Claude API (résumés d'activité) |
| `SERPAPI_KEY` | Non | Améliore la découverte de sites web (100 req/mois gratuits) |
| `DATABASE_URL` | Non | Connexion PostgreSQL (auto-configuré via Docker) |

## Extensibilité

- **Nouveau critère de score** → `backend/app/pipeline/scorer.py`
- **Nouveau filtre UI** → `frontend/src/components/Filters.tsx` + `backend/app/api/companies.py`
- **Qualité résumés** → changer `LLM_MODEL=claude-sonnet-4-6` dans `.env`
- **Plus de companies** → ajuster `PIPELINE_BATCH_*` dans `.env`
