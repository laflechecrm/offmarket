import type { SireneCompany, SearchFilters, Dirigeant, FRENCH_REGIONS } from "@/types/company";

// ─── SIRENE token cache ──────────────────────────────────────────────────────

let _sireneToken: string | null = null;
let _sireneTokenExpiry = 0;

async function getSireneToken(): Promise<string> {
  if (process.env.SIRENE_TOKEN) return process.env.SIRENE_TOKEN;

  if (_sireneToken && Date.now() < _sireneTokenExpiry) return _sireneToken;

  const key = process.env.SIRENE_CONSUMER_KEY;
  const secret = process.env.SIRENE_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("SIRENE credentials not configured (SIRENE_TOKEN or SIRENE_CONSUMER_KEY+SECRET)");

  const res = await fetch("https://api.insee.fr/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`SIRENE token error: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  _sireneToken = data.access_token;
  _sireneTokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
  return _sireneToken;
}

// ─── SIRENE search ───────────────────────────────────────────────────────────

interface SireneSearchParams {
  filters: SearchFilters;
  page?: number;
  pageSize?: number;
}

interface SireneSearchResult {
  items: SireneCompany[];
  total: number;
}

const NAF_LABELS: Record<string, string> = {
  "45": "Commerce auto", "46": "Commerce de gros", "47": "Commerce de détail",
  "62": "Informatique", "63": "Services info", "56": "Restauration",
  "55": "Hébergement", "43": "Travaux bâtiment", "41": "Construction",
  "28": "Fabrication machines", "25": "Fabrication métallique",
  "33": "Réparation machines", "69": "Juridique/comptable",
  "71": "Architecture/ingénierie", "73": "Publicité", "74": "Activités spécialisées",
  "49": "Transport terrestre", "52": "Entreposage", "53": "Livraison",
  "96": "Services personnels", "95": "Réparation appareils",
};

function getNafLabel(naf: string): string {
  for (const [prefix, label] of Object.entries(NAF_LABELS)) {
    if (naf.startsWith(prefix)) return label;
  }
  return naf;
}

function buildSireneQuery(filters: SearchFilters): string {
  const parts: string[] = [
    "etatAdministratifUniteLegale:A",
    "etablissementSiege:true",
    "periode(etatAdministratifEtablissement:A)",
  ];

  if (filters.naf) {
    const naf = filters.naf.toUpperCase().replace(/\s/g, "");
    if (naf.length <= 2) {
      parts.push(`activitePrincipaleUniteLegale:${naf}*`);
    } else {
      parts.push(`activitePrincipaleUniteLegale:${naf}`);
    }
  }

  if (filters.department) {
    parts.push(`codePostalEtablissement:${filters.department}*`);
  }

  if (filters.employee_tranches && filters.employee_tranches.length > 0) {
    const trancheParts = filters.employee_tranches.map((t) => `trancheEffectifsUniteLegale:${t}`).join(" OR ");
    parts.push(`(${trancheParts})`);
  }

  if (filters.keyword) {
    parts.push(`denominationUniteLegale:*${filters.keyword.toUpperCase()}*`);
  }

  // Exclude micro-entrepreneurs (1000-1099) and auto-entrepreneurs by default
  parts.push("NOT categorieJuridiqueUniteLegale:1*");

  return parts.join(" AND ");
}

export async function searchSirene({ filters, page = 1, pageSize = 50 }: SireneSearchParams): Promise<SireneSearchResult> {
  const token = await getSireneToken();
  const q = buildSireneQuery(filters);
  const debut = (page - 1) * pageSize;

  const url = `https://api.insee.fr/entreprises/sirene/V3.11/siret?q=${encodeURIComponent(q)}&nombre=${pageSize}&debut=${debut}&champs=siren,siret,denominationUniteLegale,activitePrincipaleUniteLegale,trancheEffectifsUniteLegale,categorieJuridiqueUniteLegale,dateCreationUniteLegale,libelleCommuneEtablissement,codePostalEtablissement,regionEtablissement`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (res.status === 404) return { items: [], total: 0 };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SIRENE error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    header: { total: number };
    etablissements: Array<Record<string, unknown>>;
  };

  const items: SireneCompany[] = (data.etablissements ?? []).map((e) => {
    const ul = (e.uniteLegale ?? {}) as Record<string, string>;
    const addr = (e.adresseEtablissement ?? {}) as Record<string, string>;
    const naf = (ul.activitePrincipaleUniteLegale ?? "") as string;
    const cp = (addr.codePostalEtablissement ?? "") as string;
    return {
      siren: e.siren as string,
      siret: e.siret as string,
      name: ul.denominationUniteLegale ?? (e.siren as string),
      naf,
      naf_label: getNafLabel(naf),
      city: addr.libelleCommuneEtablissement,
      postal_code: cp,
      department: cp.slice(0, 2) || undefined,
      region_code: addr.regionEtablissement,
      employee_tranche: ul.trancheEffectifsUniteLegale,
      creation_date: ul.dateCreationUniteLegale,
      legal_form_code: ul.categorieJuridiqueUniteLegale,
    };
  });

  return { items, total: data.header?.total ?? 0 };
}

// ─── Pappers API ─────────────────────────────────────────────────────────────

export interface PappersResult {
  dirigeant?: Dirigeant;
  chiffre_affaires?: number;
  effectif?: string;
  statut_rcs?: string;
}

export async function fetchPappers(siren: string): Promise<PappersResult> {
  const token = process.env.PAPPERS_API_KEY;
  if (!token) throw new Error("PAPPERS_API_KEY not configured");

  const url = `https://api.pappers.fr/v2/entreprise?api_token=${token}&siren=${siren}&_representation=light`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) throw new Error(`Pappers error ${res.status}`);

  const data = (await res.json()) as {
    representants?: Array<{ nom: string; prenom?: string; age_approximatif?: number; qualite?: string }>;
    chiffre_affaires?: number;
    effectif?: string;
    statut_rcs?: string;
  };

  const rep = data.representants?.[0];
  return {
    dirigeant: rep
      ? { nom: rep.nom, prenom: rep.prenom, age: rep.age_approximatif, qualite: rep.qualite }
      : undefined,
    chiffre_affaires: data.chiffre_affaires,
    effectif: data.effectif,
    statut_rcs: data.statut_rcs,
  };
}
