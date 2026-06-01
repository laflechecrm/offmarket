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
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  source: string | null;
  source_url: string | null;
  director_name: string | null;
  director_age: number | null;
  director_birth_year: number | null;
  director_count: number | null;
  has_holding: boolean;
  website: string | null;
  activity_summary: string | null;
  real_sector: string | null;
  digital_opportunity_summary: string | null;
  risks_summary: string | null;
  growth_potential_summary: string | null;
  cession_score: number | null;
  digital_score: number | null;
  business_score: number | null;
  transmission_score: number | null;
  complexity_score: number | null;
  retirement_probability: number | null;
  pipeline_stage: string | null;
  pipeline_moved_at: string | null;
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

export interface Activity {
  id: string;
  company_id: number;
  type: ActivityType;
  direction: "outbound" | "inbound" | null;
  date: string;
  subject: string | null;
  content: string | null;
  outcome: string | null;
  next_action: string | null;
  created_at: string;
}

export type ActivityType = "call" | "email" | "linkedin" | "meeting" | "note" | "whatsapp";

export interface Task {
  id: string;
  company_id: number;
  type: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  completed_at: string | null;
  created_at: string;
}

export const PIPELINE_STAGES = [
  "Prospects",
  "Pré-qualifiés",
  "À contacter",
  "Contact établi",
  "Discussion ouverte",
  "NDA signé",
  "Analyse financière",
  "LOI",
  "Due diligence",
  "Offre finale",
  "Acquis",
  "Perdu",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_COLORS: Record<string, string> = {
  "Prospects": "bg-gray-100 border-gray-200",
  "Pré-qualifiés": "bg-blue-50 border-blue-200",
  "À contacter": "bg-indigo-50 border-indigo-200",
  "Contact établi": "bg-violet-50 border-violet-200",
  "Discussion ouverte": "bg-purple-50 border-purple-200",
  "NDA signé": "bg-amber-50 border-amber-200",
  "Analyse financière": "bg-orange-50 border-orange-200",
  "LOI": "bg-red-50 border-red-200",
  "Due diligence": "bg-rose-50 border-rose-200",
  "Offre finale": "bg-pink-50 border-pink-200",
  "Acquis": "bg-green-50 border-green-200",
  "Perdu": "bg-slate-100 border-slate-200",
};

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
  crit_digital_gap: boolean;
  crit_physical_b2b: boolean;
  crit_retiring: boolean;
  crit_small: boolean;
  crit_no_holding: boolean;
  pipeline_stage: string;
}
