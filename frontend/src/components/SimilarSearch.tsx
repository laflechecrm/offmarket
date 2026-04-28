"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SimilarResult } from "@/types/company";

interface Props {
  anchorSiren?: string;
  onClose: () => void;
}

export default function SimilarSearch({ anchorSiren, onClose }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<SimilarResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    setLoading(true);
    setError("");
    try {
      const res = await api.companies.similar({
        siren: anchorSiren,
        text: !anchorSiren ? text : undefined,
        limit: 10,
      });
      setResults(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {anchorSiren ? `Entreprises similaires (SIREN ${anchorSiren})` : "Recherche par similarité"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {!anchorSiren && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Décrivez l'activité cible ou entrez une URL de site web
              </label>
              <textarea
                rows={3}
                placeholder="ex: Fabricant de protections pour rayonnage logistique, B2B industriel, 10-30 salariés"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={search}
            disabled={loading || (!anchorSiren && !text.trim())}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Recherche en cours…" : "Trouver des entreprises similaires"}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {results.length > 0 && (
            <div className="space-y-3 mt-2">
              {results.map(({ company: c, similarity }) => (
                <div
                  key={c.siren}
                  className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{c.name ?? c.siren}</div>
                      <div className="text-xs text-gray-400">{c.siren} · {c.city} · {c.region}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-blue-600">
                        {(similarity * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-400">similarité</div>
                    </div>
                  </div>

                  {c.activity_summary && (
                    <p className="mt-2 text-sm text-gray-700">{c.activity_summary}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                    {c.real_sector && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                        {c.real_sector}
                      </span>
                    )}
                    {c.employee_min != null && (
                      <span>{c.employee_min}–{c.employee_max} salariés</span>
                    )}
                    {c.director_age != null && (
                      <span>Dirigeant {c.director_age} ans</span>
                    )}
                    {c.cession_score != null && (
                      <span>Score {c.cession_score.toFixed(0)}/100</span>
                    )}
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {c.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
