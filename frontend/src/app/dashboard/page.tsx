"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PIPELINE_STAGES } from "@/types/company";

interface Stats {
  totals: {
    total: string;
    scored: string;
    enriched: string;
    analyzed: string;
    in_pipeline: string;
    avg_score: string | null;
    avg_retirement: string | null;
  };
  by_stage: { pipeline_stage: string; count: string }[];
  by_sector: { real_sector: string; count: string }[];
  overdue_tasks: number;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d as Stats))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400 text-sm animate-pulse">Chargement…</div>;
  if (!stats) return <div className="p-8 text-red-500 text-sm">Erreur de chargement</div>;

  const t = stats.totals;
  const stageMap = Object.fromEntries(stats.by_stage.map((s) => [s.pipeline_stage, parseInt(s.count)]));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Entreprises sourcées" value={parseInt(t.total).toLocaleString("fr-FR")} />
        <Stat label="Dans le pipeline" value={parseInt(t.in_pipeline).toLocaleString("fr-FR")}
          sub="hors Prospects et Perdu" />
        <Stat label="Score moyen" value={t.avg_score ? `${t.avg_score} / 100` : "—"}
          sub={`${parseInt(t.scored).toLocaleString("fr-FR")} scorées`} />
        <Stat label="Tâches en retard" value={stats.overdue_tasks}
          sub={stats.overdue_tasks > 0 ? "⚠️ Action requise" : "Tout à jour"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline funnel */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center justify-between">
            Pipeline
            <Link href="/pipeline" className="text-xs text-blue-600 hover:underline">Voir le Kanban →</Link>
          </h2>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = stageMap[stage] ?? 0;
              const max = Math.max(...PIPELINE_STAGES.map((s) => stageMap[s] ?? 0), 1);
              return (
                <div key={stage} className="flex items-center gap-3 text-sm">
                  <span className="w-36 text-xs text-gray-600 truncate">{stage}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-500 font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top secteurs */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-4">Top secteurs analysés</h2>
          {stats.by_sector.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun secteur encore analysé — lancez le pipeline IA.</p>
          ) : (
            <div className="space-y-2">
              {stats.by_sector.map((s) => {
                const max = parseInt(stats.by_sector[0].count);
                return (
                  <div key={s.real_sector} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-xs text-gray-600 truncate">{s.real_sector}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${(parseInt(s.count) / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-gray-500">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline health */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-700 text-sm mb-3">État du pipeline de données</h2>
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          {[
            { label: "Sourcées", value: t.total, color: "text-gray-600" },
            { label: "Enrichies", value: t.enriched, color: "text-blue-600" },
            { label: "Analysées IA", value: t.analyzed, color: "text-violet-600" },
            { label: "Scorées", value: t.scored, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className={`text-xl font-bold ${color}`}>{parseInt(value).toLocaleString("fr-FR")}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
        {parseInt(t.total) > 0 && (
          <div className="mt-3 h-2 bg-gray-100 rounded-full relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-blue-200" style={{ width: `${(parseInt(t.enriched) / parseInt(t.total)) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-violet-300" style={{ width: `${(parseInt(t.analyzed) / parseInt(t.total)) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-green-400" style={{ width: `${(parseInt(t.scored) / parseInt(t.total)) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
