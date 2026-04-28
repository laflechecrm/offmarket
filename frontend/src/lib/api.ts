import type { Company, CompanyList, Filters, PipelineStatus, SimilarResult } from "@/types/company";

// On Netlify the API routes live in the same Next.js app — use relative paths.
// In local Docker dev, NEXT_PUBLIC_API_URL points to the FastAPI container.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function buildQuery(filters: Partial<Filters>, page: number, pageSize = 50): string {
  const p = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.region) p.set("region", filters.region);
  if (filters.director_age_min) p.set("director_age_min", filters.director_age_min);
  if (filters.director_age_max) p.set("director_age_max", filters.director_age_max);
  if (filters.employee_min) p.set("employee_min", filters.employee_min);
  if (filters.employee_max) p.set("employee_max", filters.employee_max);
  if (filters.cession_score_min) p.set("cession_score_min", filters.cession_score_min);
  if (filters.keyword) p.set("keyword", filters.keyword);
  if (filters.has_website) p.set("has_website", "true");
  if (filters.has_summary) p.set("has_summary", "true");
  return p.toString();
}

export const api = {
  companies: {
    list: (filters: Partial<Filters>, page: number) =>
      apiFetch<CompanyList>(`/api/companies?${buildQuery(filters, page)}`),
    get: (siren: string) => apiFetch<Company>(`/api/companies/${siren}`),
    regions: () => apiFetch<string[]>("/api/companies/regions"),
    similar: (body: { text?: string; siren?: string; limit?: number }) =>
      apiFetch<SimilarResult[]>("/api/companies/similar", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  pipeline: {
    status: () => apiFetch<PipelineStatus>("/api/pipeline/status"),
    runDirectors: () => apiFetch("/api/pipeline/run/directors", { method: "POST" }),
    runWebsites: () => apiFetch("/api/pipeline/run/websites", { method: "POST" }),
    runScrape: () => apiFetch("/api/pipeline/run/scrape", { method: "POST" }),
    runSummarize: () => apiFetch("/api/pipeline/run/summarize", { method: "POST" }),
    runEmbed: () => apiFetch("/api/pipeline/run/embed", { method: "POST" }),
    runScore: () => apiFetch("/api/pipeline/run/score", { method: "POST" }),
    runAll: () => apiFetch("/api/pipeline/run/all", { method: "POST" }),
  },
};
