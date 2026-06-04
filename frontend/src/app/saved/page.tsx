"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedSearch, SearchFilters } from "@/types/company";
import { FRENCH_REGIONS } from "@/types/company";

function FiltersPreview({ filters }: { filters: SearchFilters }) {
  const tags: string[] = [];
  if (filters.naf) tags.push(`NAF: ${filters.naf}`);
  if (filters.department) tags.push(`Dept: ${filters.department}`);
  if (filters.region_code) {
    const r = FRENCH_REGIONS.find((x) => x.code === filters.region_code);
    if (r) tags.push(r.label);
  }
  if (filters.keyword) tags.push(`"${filters.keyword}"`);
  if (filters.employee_tranches?.length) tags.push(`${filters.employee_tranches.length} tranche(s) effectifs`);
  if (filters.crit_no_website) tags.push("Sans site web");
  if (filters.crit_b2b_physical) tags.push("B2B physique");
  if (filters.crit_retiring) tags.push("Dirigeant ≥55 ans");
  if (filters.crit_small) tags.push("TPE ≤5");
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.length === 0
        ? <span className="text-xs text-muted-foreground">Tous les filtres par défaut</span>
        : tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)
      }
    </div>
  );
}

export default function SavedPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/searches")
      .then((r) => r.json())
      .then((d) => setSearches(d as SavedSearch[]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch("/api/searches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success("Recherche supprimée");
    }
  }

  function handleOpen(search: SavedSearch) {
    const params = new URLSearchParams();
    const f = search.filters;
    if (f.naf) params.set("naf", f.naf);
    if (f.department) params.set("department", f.department);
    if (f.region_code) params.set("region_code", f.region_code);
    if (f.keyword) params.set("keyword", f.keyword);
    if (f.employee_tranches?.length) params.set("employee_tranches", f.employee_tranches.join(","));
    if (f.crit_no_website) params.set("crit_no_website", "true");
    if (f.crit_b2b_physical) params.set("crit_b2b_physical", "true");
    if (f.crit_retiring) params.set("crit_retiring", "true");
    if (f.crit_small) params.set("crit_small", "true");
    router.push(`/search?${params}`);
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Recherches sauvegardées</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">{searches.length} recherche{searches.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : searches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Aucune recherche sauvegardée</p>
          <p className="text-sm">Configurez une recherche et cliquez sur &ldquo;Sauvegarder&rdquo;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <Card key={search.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{search.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(search.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <FiltersPreview filters={search.filters} />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleOpen(search)}>
                      <Search className="h-3.5 w-3.5 mr-1" />
                      Lancer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(search.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
