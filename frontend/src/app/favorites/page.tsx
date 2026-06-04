"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import CompanyCard from "@/components/CompanyCard";
import SidePanel from "@/components/SidePanel";
import { Skeleton } from "@/components/ui/skeleton";
import type { SireneCompany, Enrichment, CrmStage } from "@/types/company";

export default function FavoritesPage() {
  const [companies, setCompanies] = useState<SireneCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<SireneCompany | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/favorites");
    if (res.ok) {
      const data = (await res.json()) as SireneCompany[];
      setCompanies(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleFavorite(siren: string, addFav: boolean) {
    if (addFav) return; // already a favorite on this page
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siren }),
    });
    setCompanies((prev) => prev.filter((c) => c.siren !== siren));
    toast.success("Retiré des favoris");
  }

  async function handleEnrich(siren: string): Promise<Enrichment | null> {
    const company = companies.find((c) => c.siren === siren);
    if (!company) return null;
    try {
      const res = await fetch(`/api/enrich/${siren}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name, naf: company.naf, city: company.city,
          employee_tranche: company.employee_tranche, creation_date: company.creation_date,
        }),
      });
      const data = (await res.json()) as Enrichment & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Erreur"); return null; }
      toast.success("Enrichissement terminé");
      setCompanies((prev) => prev.map((c) => c.siren === siren ? { ...c, enrichment: data } : c));
      return data;
    } catch { return null; }
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
      await fetch("/api/crm", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siren }) });
    }
    setCompanies((prev) => prev.map((c) => c.siren === siren ? { ...c, crm_stage: stage ?? undefined } : c));
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Favoris</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">{companies.length} entreprise{companies.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Aucun favori</p>
          <p className="text-sm">Étoilez des entreprises dans la recherche pour les retrouver ici.</p>
        </div>
      ) : (
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

      <SidePanel
        company={selectedCompany}
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  );
}
