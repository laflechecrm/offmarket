"use client";

import type { Company } from "@/types/company";

interface Props {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onSelectSiren: (siren: string) => void;
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

function AgeCell({ age }: { age: number | null }) {
  if (age == null) return <span className="text-gray-300 text-xs">—</span>;
  const color = age >= 58 ? "text-red-600 font-semibold" : age >= 55 ? "text-orange-600" : "";
  return <span className={color}>{age} ans</span>;
}

export default function CompanyTable({
  companies,
  total,
  page,
  pageSize,
  onPageChange,
  onSelectSiren,
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
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                Entreprise
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Effectifs</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Age dirig.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Localisation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 max-w-xs">
                Activité réelle
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Aucune entreprise correspondante
                </td>
              </tr>
            )}
            {companies.map((c) => (
              <tr key={c.siren} className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-[200px]">
                    {c.name ?? c.siren}
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

      {/* Pagination */}
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
