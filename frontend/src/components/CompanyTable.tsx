"use client";

import React from "react";
import Link from "next/link";
import type { Company } from "@/types/company";
import { PIPELINE_STAGES } from "@/types/company";

interface Props {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onSelectSiren: (siren: string) => void;
  onStageChange: (siren: string, stage: string | null) => Promise<void>;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    score >= 70
      ? "bg-red-100 text-red-700"
      : score >= 50
      ? "bg-orange-100 text-orange-700"
      : score >= 30
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}

function ScoreBreakdown({ company }: { company: Company }) {
  if (company.digital_score == null) return null;
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {[
        { label: "D", value: company.digital_score, max: 40, title: "Digital" },
        { label: "B", value: company.business_score, max: 30, title: "Business" },
        { label: "T", value: company.transmission_score, max: 20, title: "Transmissibilité" },
        { label: "C", value: company.complexity_score, max: 10, title: "Complexité" },
      ].map(({ label, value, max, title }) => (
        <span
          key={label}
          title={`${title}: ${value ?? 0}/${max}`}
          className="text-xs text-gray-400 font-mono"
        >
          {label}:{(value ?? 0).toFixed(0)}
        </span>
      ))}
    </div>
  );
}

function AgeCell({ age }: { age: number | null }) {
  if (age == null) return <span className="text-gray-300 text-xs">—</span>;
  const color = age >= 58 ? "text-red-600 font-semibold" : age >= 55 ? "text-orange-600" : "";
  return <span className={color}>{age} ans</span>;
}

function StageSelect({
  siren,
  stage,
  onChange,
}: {
  siren: string;
  stage: string | null;
  onChange: (siren: string, stage: string | null) => Promise<void>;
}) {
  return (
    <select
      value={stage ?? ""}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(siren, e.target.value || null)}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[130px]"
    >
      <option value="">— Étape —</option>
      {PIPELINE_STAGES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export default function CompanyTable({
  companies,
  total,
  page,
  pageSize,
  onPageChange,
  onSelectSiren,
  onStageChange,
}: Props) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500">
        {total.toLocaleString("fr-FR")} entreprises trouvées
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Entreprise</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Effectifs</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Age dirig.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Localisation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 max-w-xs">Activité réelle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pipeline</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  Aucune entreprise correspondante
                </td>
              </tr>
            )}
            {companies.map((c) => (
              <tr key={c.siren} className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-[200px]">
                    <Link href={`/companies/${c.siren}`} className="hover:text-blue-600 transition-colors">
                      {c.name ?? c.siren}
                    </Link>
                  </div>
                  <div className="text-xs text-gray-400">{c.siren}</div>
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block max-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {c.employee_min != null && c.employee_max != null
                    ? `${c.employee_min}–${c.employee_max}`
                    : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AgeCell age={c.director_age} />
                  {c.director_count === 1 && (
                    <span className="ml-1 text-xs text-gray-400">(unique)</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  <div>{c.city ?? "—"}</div>
                  <div className="text-xs text-gray-400">{c.region ?? ""}</div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {c.activity_summary ? (
                    <>
                      <div className="text-gray-800 line-clamp-2">{c.activity_summary}</div>
                      {c.real_sector && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                          {c.real_sector}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">Non analysé</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={c.cession_score} />
                  <ScoreBreakdown company={c} />
                </td>
                <td className="px-4 py-3">
                  <StageSelect
                    siren={c.siren}
                    stage={c.pipeline_stage}
                    onChange={onStageChange}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelectSiren(c.siren)}
                    className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                    title="Trouver des entreprises similaires"
                  >
                    Similaires
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Page {page} / {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
