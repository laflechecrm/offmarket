export interface Company {
  id: number;
  siren: string;
  name: string | null;
  naf_code: string | null;
  naf_label: string | null;
  employee_min: number | null;
  employee_max: number | null;
  creation_date: string | null;
  company_age_years: number | null;
  city: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
  legal_form: string | null;
  director_name: string | null;
  director_age: number | null;
  director_birth_year: number | null;
  director_count: number | null;
  has_holding: boolean;
  website: string | null;
  activity_summary: string | null;
  real_sector: string | null;
  cession_score: number | null;
  digital_score: number | null;
  business_score: number | null;
  transmission_score: number | null;
  complexity_score: number | null;
  pipeline_stage: string | null;
  created_at: string;
  director_enriched_at: string | null;
  summarized_at: string | null;
  scored_at: string | null;
}

export interface CompanyList {
  items: Company[];
  total: number;
  page: number;
  page_size: number;
}

export interface SimilarResult {
  company: Company;
  similarity: number;
}

export interface PipelineStatus {
  total: number;
  director_enriched: number;
  website_found: number;
  scraped: number;
  summarized: number;
  embedded: number;
  scored: number;
}

export const PIPELINE_STAGES = [
  "Prospects",
  "Pré-qualification",
  "Contact établi",
  "Intérêt mutuel",
  "NDA",
  "Analyse",
  "LOI",
  "Due diligence",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const FRENCH_REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Guadeloupe",
  "Guyane",
  "Hauts-de-France",
  "Île-de-France",
  "La Réunion",
  "Martinique",
  "Mayotte",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
] as const;

export interface Filters {
  region: string;
  director_age_min: string;
  director_age_max: string;
  employee_min: string;
  employee_max: string;
  cession_score_min: string;
  keyword: string;
  has_website: boolean;
  has_summary: boolean;
  // Critères métier (investisseur-opérateur)
  crit_digital_gap: boolean;   // Pas de site web (potentiel de digitalisation)
  crit_physical_b2b: boolean;  // Secteur produit physique B2B
  crit_retiring: boolean;      // Dirigeant ≥55 ans
  crit_small: boolean;         // 0–5 salariés
  crit_no_holding: boolean;    // Pas de holding
  pipeline_stage: string;      // Filtre par étape CRM
}
