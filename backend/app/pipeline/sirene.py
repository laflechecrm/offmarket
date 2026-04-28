"""
Import SIRENE base into the database.

Usage:
    python -m app.pipeline.sirene [--download] [--limit N]

Files (télécharger depuis https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/):
  - StockUniteLegale_utf8.zip  → informations légales par SIREN
  - StockEtablissement_utf8.zip → adresses par SIRET

Place the extracted CSVs in $SIRENE_DATA_DIR (default: ./data/sirene/).
"""

import argparse
import csv
import io
import os
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from tqdm import tqdm

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Company

SIRENE_DATA_DIR = Path(settings.sirene_data_dir)

STOCK_UNITE_LEGALE_URL = (
    "https://files.data.gouv.fr/insee-sirene/StockUniteLegale_utf8.zip"
)
STOCK_ETAB_URL = (
    "https://files.data.gouv.fr/insee-sirene/StockEtablissement_utf8.zip"
)

# Tranches d'effectifs SIRENE → (min, max)
EMPLOYEE_RANGES = {
    "00": (0, 0),
    "01": (1, 2),
    "02": (3, 5),
    "03": (6, 9),
    "11": (10, 19),
    "12": (20, 49),
    "21": (50, 99),
    "22": (100, 199),
    "31": (200, 249),
    "32": (250, 499),
    "41": (500, 999),
    "42": (1000, 1999),
    "51": (2000, 4999),
    "52": (5000, 9999),
    "53": (10000, 99999),
}

# Codes forme juridique → sociétés commerciales (54xx, 55xx, 57xx, 58xx)
COMMERCIAL_PREFIXES = ("54", "55", "57", "58")

LEGAL_FORM_LABELS = {
    "5410": "SARL",
    "5498": "EURL",
    "5499": "SARL",
    "5505": "SAS",
    "5510": "SASU",
    "5585": "SA",
    "5599": "SA",
    "5710": "SA",
    "5720": "SA",
    "5800": "SCA",
    "5485": "SNC",
    "5402": "SNC",
}

DEPT_TO_REGION = {
    "01": "Auvergne-Rhône-Alpes", "02": "Hauts-de-France",
    "03": "Auvergne-Rhône-Alpes", "04": "Provence-Alpes-Côte d'Azur",
    "05": "Provence-Alpes-Côte d'Azur", "06": "Provence-Alpes-Côte d'Azur",
    "07": "Auvergne-Rhône-Alpes", "08": "Grand Est",
    "09": "Occitanie", "10": "Grand Est",
    "11": "Occitanie", "12": "Occitanie",
    "13": "Provence-Alpes-Côte d'Azur", "14": "Normandie",
    "15": "Auvergne-Rhône-Alpes", "16": "Nouvelle-Aquitaine",
    "17": "Nouvelle-Aquitaine", "18": "Centre-Val de Loire",
    "19": "Nouvelle-Aquitaine", "2A": "Corse", "2B": "Corse",
    "21": "Bourgogne-Franche-Comté", "22": "Bretagne",
    "23": "Nouvelle-Aquitaine", "24": "Nouvelle-Aquitaine",
    "25": "Bourgogne-Franche-Comté", "26": "Auvergne-Rhône-Alpes",
    "27": "Normandie", "28": "Centre-Val de Loire",
    "29": "Bretagne", "30": "Occitanie",
    "31": "Occitanie", "32": "Occitanie",
    "33": "Nouvelle-Aquitaine", "34": "Occitanie",
    "35": "Bretagne", "36": "Centre-Val de Loire",
    "37": "Centre-Val de Loire", "38": "Auvergne-Rhône-Alpes",
    "39": "Bourgogne-Franche-Comté", "40": "Nouvelle-Aquitaine",
    "41": "Centre-Val de Loire", "42": "Auvergne-Rhône-Alpes",
    "43": "Auvergne-Rhône-Alpes", "44": "Pays de la Loire",
    "45": "Centre-Val de Loire", "46": "Occitanie",
    "47": "Nouvelle-Aquitaine", "48": "Occitanie",
    "49": "Pays de la Loire", "50": "Normandie",
    "51": "Grand Est", "52": "Grand Est",
    "53": "Pays de la Loire", "54": "Grand Est",
    "55": "Grand Est", "56": "Bretagne",
    "57": "Grand Est", "58": "Bourgogne-Franche-Comté",
    "59": "Hauts-de-France", "60": "Hauts-de-France",
    "61": "Normandie", "62": "Hauts-de-France",
    "63": "Auvergne-Rhône-Alpes", "64": "Nouvelle-Aquitaine",
    "65": "Occitanie", "66": "Occitanie",
    "67": "Grand Est", "68": "Grand Est",
    "69": "Auvergne-Rhône-Alpes", "70": "Bourgogne-Franche-Comté",
    "71": "Bourgogne-Franche-Comté", "72": "Pays de la Loire",
    "73": "Auvergne-Rhône-Alpes", "74": "Auvergne-Rhône-Alpes",
    "75": "Île-de-France", "76": "Normandie",
    "77": "Île-de-France", "78": "Île-de-France",
    "79": "Nouvelle-Aquitaine", "80": "Hauts-de-France",
    "81": "Occitanie", "82": "Occitanie",
    "83": "Provence-Alpes-Côte d'Azur", "84": "Provence-Alpes-Côte d'Azur",
    "85": "Pays de la Loire", "86": "Nouvelle-Aquitaine",
    "87": "Nouvelle-Aquitaine", "88": "Grand Est",
    "89": "Bourgogne-Franche-Comté", "90": "Bourgogne-Franche-Comté",
    "91": "Île-de-France", "92": "Île-de-France",
    "93": "Île-de-France", "94": "Île-de-France",
    "95": "Île-de-France", "971": "Guadeloupe",
    "972": "Martinique", "973": "Guyane",
    "974": "La Réunion", "976": "Mayotte",
}


def _dept_from_postal(postal: str) -> str | None:
    if not postal:
        return None
    if postal.startswith("97"):
        return postal[:3]
    return postal[:2]


def _download(url: str, dest: Path) -> None:
    print(f"Downloading {url} → {dest} …")
    with httpx.stream("GET", url, follow_redirects=True, timeout=600) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
            for chunk in r.iter_bytes(chunk_size=1 << 20):
                f.write(chunk)
                bar.update(len(chunk))


def _iter_csv_in_zip(zip_path: Path):
    with zipfile.ZipFile(zip_path) as zf:
        csv_name = next(n for n in zf.namelist() if n.endswith(".csv"))
        with zf.open(csv_name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            yield from reader


def _today_year() -> int:
    return datetime.now(timezone.utc).year


def build_siret_index(zip_path: Path) -> dict[str, dict]:
    """Build siren → siege establishment dict for address lookup."""
    print("Indexing SIRET (siege) data…")
    index: dict[str, dict] = {}
    for row in tqdm(_iter_csv_in_zip(zip_path)):
        if row.get("etablissementSiege", "").lower() != "true":
            continue
        if row.get("etatAdministratifEtablissement") != "A":
            continue
        siren = row["siren"]
        index[siren] = row
    print(f"  {len(index):,} siege establishments indexed")
    return index


def import_sirene(limit: int | None = None) -> int:
    SIRENE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    ul_zip = SIRENE_DATA_DIR / "StockUniteLegale_utf8.zip"
    etab_zip = SIRENE_DATA_DIR / "StockEtablissement_utf8.zip"

    if not ul_zip.exists():
        raise FileNotFoundError(
            f"{ul_zip} not found.\n"
            "Run with --download or place the SIRENE zip files in "
            f"{SIRENE_DATA_DIR}.\n"
            "Download URL: https://www.data.gouv.fr/fr/datasets/"
            "base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/"
        )

    siret_index = build_siret_index(etab_zip) if etab_zip.exists() else {}

    today = date.today()
    batch: list[dict] = []
    inserted = 0
    BATCH_SIZE = 5000

    init_db()
    db = SessionLocal()

    try:
        print("Parsing StockUniteLegale…")
        for row in tqdm(_iter_csv_in_zip(ul_zip)):
            if limit and inserted >= limit:
                break

            # Active only
            if row.get("etatAdministratifUniteLegale") != "A":
                continue

            # Société commerciale
            legal_code = row.get("categorieJuridiqueUniteLegale", "")
            if not any(legal_code.startswith(p) for p in COMMERCIAL_PREFIXES):
                continue

            # Effectifs 3-50
            tranche = row.get("trancheEffectifsUniteLegale", "")
            emp_range = EMPLOYEE_RANGES.get(tranche)
            if not emp_range or emp_range[0] < 3 or emp_range[0] > 50:
                continue

            # Age > 10 ans
            creation_str = row.get("dateCreationUniteLegale", "")
            try:
                creation = date.fromisoformat(creation_str)
            except (ValueError, TypeError):
                continue
            age_years = (today - creation).days // 365
            if age_years < 10:
                continue

            siren = row["siren"]
            name = (
                row.get("denominationUniteLegale")
                or f"{row.get('nomUniteLegale', '')} {row.get('prenom1UniteLegale', '')}".strip()
            )

            # Address from SIRET index
            siret_row = siret_index.get(siren, {})
            postal = siret_row.get("codePostalEtablissement", "")
            city = siret_row.get("libelleCommuneEtablissement", "")
            street = " ".join(filter(None, [
                siret_row.get("numeroVoieEtablissement", ""),
                siret_row.get("typeVoieEtablissement", ""),
                siret_row.get("libelleVoieEtablissement", ""),
            ]))
            dept = _dept_from_postal(postal)
            region = DEPT_TO_REGION.get(dept or "", None) if dept else None
            nic = row.get("nicSiegeUniteLegale", "")
            siret_siege = f"{siren}{nic}" if nic else None

            batch.append({
                "siren": siren,
                "siret_siege": siret_siege,
                "name": name[:500] if name else None,
                "naf_code": row.get("activitePrincipaleUniteLegale"),
                "employee_range": tranche,
                "employee_min": emp_range[0],
                "employee_max": emp_range[1],
                "creation_date": creation,
                "company_age_years": age_years,
                "address": street or None,
                "city": city[:200] if city else None,
                "postal_code": postal[:10] if postal else None,
                "department": dept,
                "region": region,
                "legal_form_code": legal_code,
                "legal_form": LEGAL_FORM_LABELS.get(legal_code, legal_code),
            })

            if len(batch) >= BATCH_SIZE:
                _upsert(db, batch)
                inserted += len(batch)
                batch = []

        if batch:
            _upsert(db, batch)
            inserted += len(batch)

    finally:
        db.close()

    print(f"Done. {inserted:,} companies imported.")
    return inserted


def _upsert(db, batch: list[dict]) -> None:
    stmt = insert(Company).values(batch)
    stmt = stmt.on_conflict_do_update(
        index_elements=["siren"],
        set_={k: stmt.excluded[k] for k in batch[0] if k != "siren"},
    )
    db.execute(stmt)
    db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="Download SIRENE files first")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    if args.download:
        SIRENE_DATA_DIR.mkdir(parents=True, exist_ok=True)
        _download(STOCK_UNITE_LEGALE_URL, SIRENE_DATA_DIR / "StockUniteLegale_utf8.zip")
        _download(STOCK_ETAB_URL, SIRENE_DATA_DIR / "StockEtablissement_utf8.zip")

    import_sirene(limit=args.limit)
