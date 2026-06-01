"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Company, Filters } from "@/types/company";
import CompanyTable from "@/components/CompanyTable";
import FiltersPanel, { DEFAULT_FILTERS } from "@/components/Filters";
import SimilarSearch from "@/components/SimilarSearch";
import PipelinePanel from "@/components/PipelinePanel";

const PAGE_SIZE = 50;

export default function Home() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarSiren, setSimilarSiren] = useState<string | undefined>();
  const [showSimilar, setShowSimilar] = useState(false);
  const [showFreeSearch, setShowFreeSearch] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.companies.list(filters, page);
      setCompanies(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  function handleFilterChange(f: Filters) {
    setFilters(f);
    setPage(1);
  }

  function openSimilarForSiren(siren: string) {
    setSimilarSiren(siren);
    setShowSimilar(true);
  }

  async function handleStageChange(siren: string, stage: string | null) {
    await api.companies.setStage(siren, stage);
    setCompanies((prev: Company[]) =>
      prev.map((c) => (c.siren === siren ? { ...c, pipeline_stage: stage } : c))
    );
  }

  // Detect which active filters might cause 0 results on unenriched data
  const enrichmentFilters = [
    filters.crit_retiring && "Dirigeant ≥55 ans (nécessite l'enrichissement des dirigeants)",
    filters.cession_score_min && `Score ≥${filters.cession_score_min} (nécessite le scoring)`,
    filters.director_age_min && "Age dirigeant min (nécessite l'enrichissement)",
    filters.director_age_max && "Age dirigeant max (nécessite l'enrichissement)",
    filters.has_summary && "Activité analysée (nécessite l'analyse IA)",
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-6 pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Identification d&apos;entreprises B2B à reprendre off-market en France
        </p>
        <button
          onClick={() => {
            setSimilarSiren(undefined);
            setShowFreeSearch(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Recherche par similarité
        </button>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex gap-6">
        <aside className="w-64 shrink-0">
          <FiltersPanel
            filters={filters}
            onChange={handleFilterChange}
            onReset={() => {
              setFilters(DEFAULT_FILTERS);
              setPage(1);
            }}
          />
        </aside>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Erreur API :</strong> {error}
            </div>
          )}

          {/* Enrichment warning */}
          {!loading && !error && total === 0 && enrichmentFilters.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>Aucun résultat.</strong> Les filtres suivants nécessitent que le pipeline de données ait été exécuté :
              <ul className="mt-1 ml-4 list-disc">
                {enrichmentFilters.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <p className="mt-1 text-xs text-amber-600">
                Lancez d&apos;abord le pipeline depuis le panneau d&apos;administration (en bas de page).
              </p>
            </div>
          )}

          {loading && (
            <div className="text-sm text-gray-400 animate-pulse">Chargement…</div>
          )}

          <CompanyTable
            companies={companies}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onSelectSiren={openSimilarForSiren}
            onStageChange={handleStageChange}
          />
        </div>
      </div>

      {(showSimilar || showFreeSearch) && (
        <SimilarSearch
          anchorSiren={showSimilar ? similarSiren : undefined}
          onClose={() => {
            setShowSimilar(false);
            setShowFreeSearch(false);
            setSimilarSiren(undefined);
          }}
        />
      )}

      <PipelinePanel />
    </main>
  );
}
