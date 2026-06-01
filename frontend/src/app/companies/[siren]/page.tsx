"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Activity, Company, Task } from "@/types/company";
import { PIPELINE_STAGES } from "@/types/company";

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞", email: "✉️", linkedin: "💼", meeting: "🤝", note: "📝", whatsapp: "💬",
};
const ACTIVITY_LABELS: Record<string, string> = {
  call: "Appel", email: "Email", linkedin: "LinkedIn", meeting: "RDV", note: "Note", whatsapp: "WhatsApp",
};

function ScoreBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const pct = value != null ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value?.toFixed(0) ?? "—"} / {max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { siren } = useParams<{ siren: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Activity form
  const [actType, setActType] = useState("call");
  const [actContent, setActContent] = useState("");
  const [actNextAction, setActNextAction] = useState("");
  const [savingAct, setSavingAct] = useState(false);

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [co, acts, tks] = await Promise.all([
        fetch(`/api/companies/${siren}`).then((r) => r.json()),
        fetch(`/api/companies/${siren}/activities`).then((r) => r.json()),
        fetch(`/api/companies/${siren}/tasks`).then((r) => r.json()),
      ]);
      setCompany(co as Company);
      setActivities(Array.isArray(acts) ? acts as Activity[] : []);
      setTasks(Array.isArray(tks) ? tks as Task[] : []);
    } finally {
      setLoading(false);
    }
  }, [siren]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function addActivity() {
    if (!actContent.trim()) return;
    setSavingAct(true);
    await fetch(`/api/companies/${siren}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: actType, content: actContent, next_action: actNextAction || undefined, direction: "outbound" }),
    });
    setActContent(""); setActNextAction("");
    await loadAll();
    setSavingAct(false);
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    await fetch(`/api/companies/${siren}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, due_date: taskDue || undefined }),
    });
    setTaskTitle(""); setTaskDue("");
    await loadAll();
    setSavingTask(false);
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await fetch(`/api/companies/${siren}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, completed }),
    });
    await loadAll();
  }

  async function setStage(stage: string) {
    await fetch(`/api/companies/${siren}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setCompany((c) => c ? { ...c, pipeline_stage: stage } : c);
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm animate-pulse">Chargement…</div>;
  if (!company) return <div className="p-8 text-red-500 text-sm">Entreprise introuvable.</div>;

  const c = company;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-700">Entreprises</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{c.name ?? c.siren}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.name ?? c.siren}</h1>
            <div className="text-sm text-gray-400 mt-1 space-x-3">
              <span>SIREN {c.siren}</span>
              {c.legal_form && <span>{c.legal_form}</span>}
              {c.creation_date && <span>Créée en {new Date(c.creation_date).getFullYear()}</span>}
            </div>
            {c.real_sector && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">{c.real_sector}</span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {c.cession_score != null && (
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{c.cession_score.toFixed(0)}</div>
                <div className="text-xs text-gray-400">/ 100</div>
              </div>
            )}
            <select
              value={c.pipeline_stage ?? ""}
              onChange={(e) => setStage(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Étape pipeline —</option>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {c.city && <div><span className="text-gray-400">Ville</span><div className="font-medium">{c.city}</div></div>}
          {c.region && <div><span className="text-gray-400">Région</span><div className="font-medium">{c.region}</div></div>}
          {(c.employee_min != null || c.employee_max != null) && (
            <div><span className="text-gray-400">Effectifs</span><div className="font-medium">{c.employee_min ?? 0}–{c.employee_max ?? "?"}</div></div>
          )}
          {c.director_name && <div><span className="text-gray-400">Dirigeant</span><div className="font-medium">{c.director_name}{c.director_age ? `, ${c.director_age} ans` : ""}</div></div>}
          {c.website && (
            <div><span className="text-gray-400">Site web</span>
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="block font-medium text-blue-600 hover:underline truncate">
                {c.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </div>
          )}
          {c.phone && <div><span className="text-gray-400">Téléphone</span><div className="font-medium">{c.phone}</div></div>}
          {c.email && <div><span className="text-gray-400">Email</span><div className="font-medium">{c.email}</div></div>}
          {c.retirement_probability != null && (
            <div><span className="text-gray-400">Probabilité retraite</span>
              <div className={`font-medium ${c.retirement_probability >= 60 ? "text-orange-600" : ""}`}>
                {c.retirement_probability.toFixed(0)} %
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scores */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Scoring acquisition</h2>
          <ScoreBar label="Potentiel digital" value={c.digital_score} max={40} color="bg-blue-400" />
          <ScoreBar label="Qualité business" value={c.business_score} max={30} color="bg-green-400" />
          <ScoreBar label="Transmissibilité" value={c.transmission_score} max={20} color="bg-orange-400" />
          <ScoreBar label="Complexité" value={c.complexity_score} max={10} color="bg-gray-400" />
          {c.retirement_probability != null && (
            <div className="pt-2 border-t border-gray-100">
              <ScoreBar label="Probabilité retraite" value={c.retirement_probability} max={100} color="bg-amber-400" />
            </div>
          )}
        </div>

        {/* Analyse IA */}
        <div className="md:col-span-2 space-y-4">
          {c.digital_opportunity_summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Opportunité digitale</h3>
              <p className="text-sm text-blue-900 leading-relaxed">{c.digital_opportunity_summary}</p>
            </div>
          )}
          {c.growth_potential_summary && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-green-700 mb-1 uppercase tracking-wide">Leviers de croissance</h3>
              <p className="text-sm text-green-900 leading-relaxed">{c.growth_potential_summary}</p>
            </div>
          )}
          {c.risks_summary && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Risques</h3>
              <p className="text-sm text-red-900 leading-relaxed">{c.risks_summary}</p>
            </div>
          )}
          {c.activity_summary && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Activité</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{c.activity_summary}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Journal d'activité */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Journal d&apos;activité</h2>

          {/* Form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={actType}
                onChange={(e) => setActType(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{ACTIVITY_ICONS[k]} {v}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Détail de l'échange…"
              value={actContent}
              onChange={(e) => setActContent(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Prochaine action…"
              value={actNextAction}
              onChange={(e) => setActNextAction(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addActivity}
              disabled={savingAct || !actContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {savingAct ? "Enregistrement…" : "Ajouter"}
            </button>
          </div>

          {/* Feed */}
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activities.length === 0 && <p className="text-xs text-gray-400">Aucune activité enregistrée</p>}
            {activities.map((a) => (
              <div key={a.id} className="flex gap-2 text-sm">
                <span className="text-base">{ACTIVITY_ICONS[a.type] ?? "📌"}</span>
                <div>
                  <div className="text-xs text-gray-400">
                    {ACTIVITY_LABELS[a.type]} · {new Date(a.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="text-gray-700">{a.content}</div>
                  {a.next_action && <div className="text-xs text-blue-600 mt-0.5">→ {a.next_action}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tâches */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Tâches</h2>

          {/* Form */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nouvelle tâche…"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addTask}
                disabled={savingTask || !taskTitle.trim()}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {savingTask ? "…" : "Ajouter"}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {tasks.length === 0 && <p className="text-xs text-gray-400">Aucune tâche</p>}
            {tasks.map((t) => (
              <label key={t.id} className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!t.completed_at}
                  onChange={(e) => toggleTask(t.id, e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.completed_at ? "line-through text-gray-300" : "text-gray-700"}`}>
                    {t.title}
                  </div>
                  {t.due_date && (
                    <div className={`text-xs ${new Date(t.due_date) < new Date() && !t.completed_at ? "text-red-500" : "text-gray-400"}`}>
                      {new Date(t.due_date).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
