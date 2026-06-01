"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PIPELINE_STAGES, PIPELINE_STAGE_COLORS } from "@/types/company";
import type { Company } from "@/types/company";

type BoardData = Record<string, Partial<Company>[]>;

function ScoreDot({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 60 ? "bg-red-400" : score >= 40 ? "bg-orange-400" : "bg-gray-300";
  return <span title={`Score: ${score.toFixed(0)}`} className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${color}`} />;
}

function KanbanCard({ company, onDragStart }: { company: Partial<Company>; onDragStart: (siren: string) => void }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(company.siren!)}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors select-none"
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <Link
          href={`/companies/${company.siren}`}
          className="font-medium text-gray-900 text-xs leading-snug hover:text-blue-600 line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {company.name ?? company.siren}
        </Link>
        <ScoreDot score={company.cession_score ?? null} />
      </div>
      {company.real_sector && (
        <span className="inline-block text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mb-1">
          {company.real_sector}
        </span>
      )}
      <div className="text-xs text-gray-400 space-y-0.5">
        {company.city && <div>{company.city}{company.region ? ` · ${company.region}` : ""}</div>}
        {company.director_age && (
          <div>
            Dirig. {company.director_age} ans
            {(company.retirement_probability ?? 0) >= 60 && (
              <span className="ml-1 text-orange-500">· Retraite probable</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  cards,
  onDragOver,
  onDrop,
  onDragStart,
}: {
  stage: string;
  cards: Partial<Company>[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (stage: string) => void;
  onDragStart: (siren: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const colorClass = PIPELINE_STAGE_COLORS[stage] ?? "bg-gray-50 border-gray-200";

  return (
    <div
      className={`flex-shrink-0 w-52 rounded-xl border-2 flex flex-col transition-colors ${
        dragOver ? "border-blue-400 bg-blue-50" : colorClass
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); onDragOver(e); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(stage); }}
    >
      <div className="px-3 py-2 border-b border-inherit flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">{stage}</span>
        <span className="text-xs text-gray-400 bg-white rounded-full px-1.5 py-0.5 border border-gray-200">
          {cards.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ minHeight: 100 }}>
        {cards.map((c) => (
          <KanbanCard key={c.siren} company={c} onDragStart={onDragStart} />
        ))}
        {cards.length === 0 && (
          <div className="text-xs text-gray-300 text-center pt-6">Glissez ici</div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [board, setBoard] = useState<BoardData>({});
  const [loading, setLoading] = useState(true);
  const dragSiren = useRef<string | null>(null);
  const dragFromStage = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline");
      setBoard(await res.json() as BoardData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDragStart(siren: string) {
    dragSiren.current = siren;
    // find stage
    for (const [stage, cards] of Object.entries(board)) {
      if (cards.some((c) => c.siren === siren)) {
        dragFromStage.current = stage;
        break;
      }
    }
  }

  async function handleDrop(targetStage: string) {
    const siren = dragSiren.current;
    const fromStage = dragFromStage.current;
    dragSiren.current = null;
    dragFromStage.current = null;

    if (!siren || fromStage === targetStage) return;

    const company = board[fromStage!]?.find((c) => c.siren === siren);
    if (!company) return;

    // Optimistic update
    setBoard((prev) => {
      const next: BoardData = {};
      for (const [s, cards] of Object.entries(prev)) {
        next[s] = s === fromStage
          ? cards.filter((c) => c.siren !== siren)
          : [...cards];
      }
      next[targetStage] = [{ ...company, pipeline_stage: targetStage }, ...(next[targetStage] ?? [])];
      return next;
    });

    await fetch(`/api/companies/${siren}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage }),
    });
  }

  const allStages: string[] = [...PIPELINE_STAGES, "Sans étape"];
  const activeCount = allStages
    .filter((s) => s !== "Prospects" && s !== "Sans étape" && s !== "Perdu")
    .reduce((n, s) => n + (board[s]?.length ?? 0), 0);

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pipeline de reprise</h1>
          <p className="text-sm text-gray-400">{activeCount} opportunités actives</p>
        </div>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Chargement…</span>}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: "72vh" }}>
        {allStages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            cards={board[stage] ?? []}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
}
