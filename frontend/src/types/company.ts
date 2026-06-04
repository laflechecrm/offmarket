export interface SireneCompany {
  siren: string;
  siret?: string;
  name: string;
  naf: string;
  naf_label?: string;
  city?: string;
  department?: string;
  region_code?: string;
  postal_code?: string;
  employee_tranche?: string;
  creation_date?: string;
  legal_form_code?: string;
  // Enriched from Pappers
  dirigeant?: Dirigeant;
  // Enriched from AI
  enrichment?: Enrichment;
  // CRM
  crm_stage?: CrmStage;
  // Favorites
  is_favorite?: boolean;
}

export interface Dirigeant {
  nom: string;
  prenom?: string;
  age?: number;
  qualite?: string;
}

export interface Enrichment {
  activity_summary: string;
  sector: string;
  digital_score: number;
  business_score: number;
  transmission_score: number;
  complexity_score: number;
  cession_score: number;
  digital_opportunity?: string;
  risks?: string;
  growth_levers?: string;
  enriched_at: string;
}

export const CRM_STAGES = [
  "Prospect",
  "Contacté",
  "En discussion",
  "Due diligence",
  "Offre",
  "Signé",
] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

export const CRM_STAGE_COLORS: Record<CrmStage, string> = {
  Prospect: "bg-gray-100 text-gray-700",
  Contacté: "bg-blue-100 text-blue-700",
  "En discussion": "bg-yellow-100 text-yellow-700",
  "Due diligence": "bg-orange-100 text-orange-700",
  Offre: "bg-purple-100 text-purple-700",
  Signé: "bg-green-100 text-green-700",
};

export interface CrmCard {
  id?: string;
  siren: string;
  company_data: SireneCompany;
  stage: CrmStage;
  notes?: string;
  moved_at?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

export interface SearchFilters {
  naf?: string;
  department?: string;
  region_code?: string;
  employee_tranches?: string[];
  keyword?: string;
  crit_no_website?: boolean;
  crit_b2b_physical?: boolean;
  crit_retiring?: boolean;
  crit_small?: boolean;
}

export const EMPLOYEE_TRANCHES: Record<string, string> = {
  "NN": "Non déclaré",
  "00": "0 salarié",
  "01": "1–2",
  "02": "3–5",
  "03": "6–9",
  "11": "10–19",
  "12": "20–49",
  "21": "50–99",
  "22": "100–199",
  "31": "200–249",
  "32": "250–499",
};

export const FRENCH_REGIONS: { code: string; label: string; departments: string[] }[] = [
  { code: "84", label: "Auvergne-Rhône-Alpes", departments: ["01","03","07","15","26","38","42","43","63","69","73","74"] },
  { code: "27", label: "Bourgogne-Franche-Comté", departments: ["21","25","39","58","70","71","89","90"] },
  { code: "53", label: "Bretagne", departments: ["22","29","35","56"] },
  { code: "24", label: "Centre-Val de Loire", departments: ["18","28","36","37","41","45"] },
  { code: "94", label: "Corse", departments: ["2A","2B"] },
  { code: "44", label: "Grand Est", departments: ["08","10","51","52","54","55","57","67","68","88"] },
  { code: "32", label: "Hauts-de-France", departments: ["02","59","60","62","80"] },
  { code: "11", label: "Île-de-France", departments: ["75","77","78","91","92","93","94","95"] },
  { code: "28", label: "Normandie", departments: ["14","27","50","61","76"] },
  { code: "75", label: "Nouvelle-Aquitaine", departments: ["16","17","19","23","24","33","40","47","64","79","86","87"] },
  { code: "76", label: "Occitanie", departments: ["09","11","12","30","31","32","34","46","48","65","66","81","82"] },
  { code: "52", label: "Pays de la Loire", departments: ["44","49","53","72","85"] },
  { code: "93", label: "Provence-Alpes-Côte d'Azur", departments: ["04","05","06","13","83","84"] },
];
