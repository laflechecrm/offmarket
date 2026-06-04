"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import KanbanBoard from "@/components/KanbanBoard";
import SidePanel from "@/components/SidePanel";
import { Skeleton } from "@/components/ui/skeleton";
import type { CrmCard, CrmStage, SireneCompany } from "@/types/company";

export default function PipelinePage() {
  const [cards, setCards] = useState<CrmCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<SireneCompany | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/crm");
    if (res.ok) {
      const data = (await res.json()) as CrmCard[];
      setCards(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMove(siren: string, fromStage: CrmStage, toStage: CrmStage) {
    if (fromStage === toStage) return;

    setCards((prev) => prev.map((c) => c.siren === siren ? { ...c, stage: toStage } : c));

    const res = await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siren, stage: toStage }),
    });

    if (!res.ok) {
      setCards((prev) => prev.map((c) => c.siren === siren ? { ...c, stage: fromStage } : c));
      toast.error("Erreur lors du déplacement");
    }
  }

  function handleCardClick(card: CrmCard) {
    setSelectedCompany(card.company_data);
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Pipeline CRM</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {cards.length} entreprise{cards.length > 1 ? "s" : ""} dans le pipeline
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-64 rounded-xl shrink-0" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Pipeline vide</p>
          <p className="text-sm">Ajoutez des entreprises au pipeline depuis la recherche ou les favoris.</p>
        </div>
      ) : (
        <KanbanBoard cards={cards} onMove={handleMove} onCardClick={handleCardClick} />
      )}

      <SidePanel
        company={selectedCompany}
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  );
}
