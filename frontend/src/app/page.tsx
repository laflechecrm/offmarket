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
  const [similarSiren, setSimilarSiren] = useState<string | undefined>();
  const [showSimilar, setShowSimilar] = useState(false);
  const [showFreeSearch, setShowFreeSearch] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.companies.list(filters, page);
      setCompanies(data.items);
      setTotal(data.total);
    } catch {
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

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Offmarket Sourcing</h1>
            <p className="text-sm text-gray-400">
              Identification d&apos;entreprises B2B à reprendre off-market en France
            </p>
          </div>
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
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 flex gap-6">
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

        <div className="flex-1 min-w-0">
          {loading && (
            <div className="text-sm text-gray-400 mb-3 animate-pulse">Chargement…</div>
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
