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
}
