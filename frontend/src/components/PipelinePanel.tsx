"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PipelineStatus } from "@/types/company";

export default function PipelinePanel() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function refresh() {
    try {
      setStatus(await api.pipeline.status());
    } catch {}
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run(label: string, fn: () => Promise<unknown>) {
    setLoading(label);
    try {
      await fn();
      await refresh();
    } finally {
      setLoading(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-2 bg-gray-800 text-white text-sm rounded-full shadow-lg hover:bg-gray-700"
      >
        Pipeline {status ? `(${status.total.toLocaleString("fr-FR")} ent.)` : ""}
      </button>
    );
  }

  const steps = status
    ? [
        { label: "Importées", value: status.total },
        { label: "Dirigeants enrichis", value: status.director_enriched },
        { label: "Sites trouvés", value: status.website_found },
        { label: "Pages scrapées", value: status.scraped },
        { label: "Activités résumées", value: status.summarized },
        { label: "Embeddings générés", value: status.embedded },
        { label: "Scorées", value: status.scored },
      ]
    : [];

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Pipeline d'enrichissement</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="p-4 space-y-2">
        {steps.map((s) => (
          <div key={s.label} className="flex justify-between text-sm">
            <span className="text-gray-600">{s.label}</span>
            <span className="font-medium">{s.value.toLocaleString("fr-FR")}</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <p className="text-xs text-gray-400 mb-2">
          Lancer une étape (traitement asynchrone)
        </p>
        {[
          { label: "Enrichir dirigeants", fn: api.pipeline.runDirectors },
          { label: "Trouver sites web", fn: api.pipeline.runWebsites },
          { label: "Scraper pages", fn: api.pipeline.runScrape },
          { label: "Résumer activités (IA)", fn: api.pipeline.runSummarize },
          { label: "Générer embeddings", fn: api.pipeline.runEmbed },
          { label: "Calculer scores", fn: api.pipeline.runScore },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={() => run(label, fn)}
            disabled={loading !== null}
            className="w-full text-left text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading === label ? "En cours…" : label}
          </button>
        ))}
        <button
          onClick={refresh}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-1"
        >
          Actualiser le statut
        </button>
      </div>
    </div>
  );
}
