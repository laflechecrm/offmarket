"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import SearchFilters, { DEFAULT_FILTERS } from "@/components/SearchFilters";
import CompanyCard from "@/components/CompanyCard";
import SidePanel from "@/components/SidePanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SearchFilters as FilterType, SireneCompany, Enrichment, CrmStage } from "@/types/company";

const PAGE_SIZE = 50;

export default function SearchPage() {
  const [filters, setFilters] = useState<FilterType>(DEFAULT_FILTERS);
  const [companies, setCompanies] = useState<SireneCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<SireneCompany | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (f: FilterType, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.naf) params.set("naf", f.naf);
      if (f.department) params.set("department", f.department);
      if (f.region_code) params.set("region_code", f.region_code);
      if (f.keyword) params.set("keyword", f.keyword);
      if (f.employee_tranches?.length) params.set("employee_tranches", f.employee_tranches.join(","));
      if (f.crit_no_website) params.set("crit_no_website", "true");
      if (f.crit_b2b_physical) params.set("crit_b2b_physical", "true");
      if (f.crit_retiring) params.set("crit_retiring", "true");
      if (f.crit_small) params.set("crit_small", "true");
      params.set("page", String(p));
      params.set("page_size", String(PAGE_SIZE));

      const res = await fetch(`/api/search?${params}`);
      const data = (await res.json()) as { items?: SireneCompany[]; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setCompanies(data.items ?? []);
      setTotal(data.total ?? 0);
      setSearched(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearch() {
    setPage(1);
    doSearch(filters, 1);
  }

  function handlePageChange(p: number) {
    setPage(p);
    doSearch(filters, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleFavorite(siren: string, addFav: boolean) {
    const company = companies.find((c) => c.siren === siren);
    if (!company) return;

    if (addFav) {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siren, company_data: company }),
      });
      toast.success(`${company.name} ajouté aux favoris`);
    } else {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siren }),
      });
    }

    setCompanies((prev) => prev.map((c) => c.siren === siren ? { ...c, is_favorite: addFav } : c));
    if (selectedCompany?.siren === siren) {
      setSelectedCompany((prev) => prev ? { ...prev, is_favorite: addFav } : prev);
    }
  }

  async function handleEnrich(siren: string): Promise<Enrichment | null> {
    const company = companies.find((c) => c.siren === siren);
    if (!company) return null;
    try {
      const res = await fetch(`/api/enrich/${siren}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          naf: company.naf,
          city: company.city,
          employee_tranche: company.employee_tranche,
          creation_date: company.creation_date,
        }),
      });
      const data = (await res.json()) as Enrichment & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Erreur enrichissement"); return null; }
      toast.success("Enrichissement IA terminé");
      setCompanies((prev) => prev.map((c) => c.siren === siren ? { ...c, enrichment: data } : c));
      return data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur réseau");
      return null;
    }
  }

  async function handleStageChange(siren: string, stage: CrmStage | null) {
    const company = companies.find((c) => c.siren === siren);
    if (!company) return;

    if (stage) {
      await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siren, company_data: company, stage }),
      });
      toast.success(`${company.name} → ${stage}`);
    } else {
      await fetch("/api/crm", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siren }),
      });
    }

    setCompanies((prev) => prev.map((c) => c.siren === siren ? { ...c, crm_stage: stage ?? undefined } : c));
  }

  async function handleSaveSearch() {
    if (!saveName.trim()) return;
    const res = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), filters }),
    });
    if (res.ok) {
      toast.success("Recherche sauvegardée");
      setSaveDialogOpen(false);
      setSaveName("");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 flex gap-6">
      <SearchFilters
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onSave={() => setSaveDialogOpen(true)}
        loading={loading}
      />

      <div className="flex-1 min-w-0 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
            <strong>Erreur :</strong> {error}
          </div>
        )}

        {/* Results header */}
        {searched && !loading && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total.toLocaleString("fr-FR")} entreprise{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}</span>
            {totalPages > 1 && (
              <span>Page {page} / {totalPages}</span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">Interrogation SIRENE…</div>
        )}

        {/* Empty state */}
        {searched && !loading && companies.length === 0 && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Aucune entreprise trouvée</p>
            <p className="text-sm">Modifiez vos filtres et relancez la recherche.</p>
          </div>
        )}

        {/* Not yet searched */}
        {!searched && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Configurez vos filtres et lancez une recherche</p>
            <p className="text-sm">Les résultats proviennent de la base SIRENE (INSEE) en temps réel.</p>
          </div>
        )}

        {/* Grid */}
        {companies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
              <CompanyCard
                key={company.siren}
                company={company}
                onToggleFavorite={handleToggleFavorite}
                onEnrich={handleEnrich}
                onStageChange={handleStageChange}
                onClick={setSelectedCompany}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
              Suivant
            </Button>
          </div>
        )}
      </div>

      {/* Side panel */}
      <SidePanel
        company={selectedCompany}
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />

      {/* Save search dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder cette recherche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="search-name">Nom de la recherche</Label>
              <Input
                id="search-name"
                placeholder="ex. Garages 69 sans site web"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveSearch} disabled={!saveName.trim()}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
