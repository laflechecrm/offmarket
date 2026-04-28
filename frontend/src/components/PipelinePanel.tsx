"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PipelineStatus } from "@/types/company";

// Pipeline triggers are only available when running against the local FastAPI backend.
// On Netlify (no NEXT_PUBLIC_API_URL set), only the status read-only view is shown.
const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_API_URL);

export default function PipelinePanel() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      setStatus(await api.pipeline.status());
    } catch {}
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  async function run(label: string, fn: () => Promise<unknown>) {
    setLoading(label);
    setMessage("");
    try {
      await fn();
      setMessage(`${label} lancé en arrière-plan.`);
      setTimeout(refresh, 3000);
    } catch (e) {
      setMessage(`Erreur : ${e}`);
    } finally {
      setLoading(null);
    }
  }

  const total = status?.total ?? 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-2 bg-gray-800 text-white text-sm rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      >
        Pipeline
        {total > 0 && (
          <span className="ml-2 text-gray-400">({total.toLocaleString("fr-FR")})</span>
        )}
      </button>
    );
  }

  const steps = status
    ? [
        { label: "Entreprises importées", value: status.total, max: status.total },
        { label: "Dirigeants enrichis", value: status.director_enriched, max: status.total },
        { label: "Sites trouvés", value: status.website_found, max: status.total },
        { label: "Pages scrapées", value: status.scraped, max: status.website_found },
        { label: "Activités résumées", value: status.summarized, max: status.scraped },
        { label: "Embeddings", value: status.embedded, max: status.summarized },
        { label: "Scores calculés", value: status.scored, max: status.total },
      ]
    : [];

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
        <h3 className="font-semibold text-sm">Pipeline d'enrichissement</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">
          &times;
        </button>
      </div>

      {/* Progress bars */}
      <div className="p-4 space-y-3">
        {steps.map((s) => {
          const pct = s.max > 0 ? Math.round((s.value / s.max) * 100) : 0;
          return (
            <div key={s.label}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{s.label}</span>
                <span className="font-medium">{s.value.toLocaleString("fr-FR")}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {HAS_BACKEND ? (
          <>
            {/* Run all — primary action */}
            <button
              onClick={() => run("Pipeline complet", api.pipeline.runAll)}
              disabled={loading !== null}
              className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading === "Pipeline complet" ? "En cours…" : "Lancer le pipeline complet"}
            </button>

            {/* Individual steps */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Dirigeants", fn: api.pipeline.runDirectors },
                { label: "Sites web", fn: api.pipeline.runWebsites },
                { label: "Scraping", fn: api.pipeline.runScrape },
                { label: "Résumés IA", fn: api.pipeline.runSummarize },
                { label: "Embeddings", fn: api.pipeline.runEmbed },
                { label: "Scores", fn: api.pipeline.runScore },
              ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => run(label, fn)}
              disabled={loading !== null}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700"
            >
              {loading === label ? "…" : label}
            </button>
          ))}
            </div>

            {message && (
              <p className="text-xs text-gray-500 mt-1 text-center">{message}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center">
            Pipeline géré via <code>make pipeline</code> en local.
          </p>
        )}

        <button
          onClick={refresh}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-1"
        >
          Actualiser (auto toutes les 15s)
        </button>
      </div>
    </div>
  );
}
