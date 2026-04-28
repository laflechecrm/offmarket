"use client";

import type { Filters } from "@/types/company";

interface Props {
  filters: Filters;
  regions: string[];
  onChange: (f: Filters) => void;
  onReset: () => void;
}

export const DEFAULT_FILTERS: Filters = {
  region: "",
  director_age_min: "",
  director_age_max: "",
  employee_min: "",
  employee_max: "",
  cession_score_min: "",
  keyword: "",
  has_website: false,
  has_summary: false,
};

export default function FiltersPanel({ filters, regions, onChange, onReset }: Props) {
  const set = (key: keyof Filters, val: string | boolean) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Filtres</h2>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Réinitialiser
        </button>
      </div>

      {/* Mot clé activité */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Mot-clé activité
        </label>
        <input
          type="text"
          placeholder="ex: rayonnage, câblage, hydro..."
          value={filters.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Région */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Région</label>
        <select
          value={filters.region}
          onChange={(e) => set("region", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Age dirigeant */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Age dirigeant
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.director_age_min}
            onChange={(e) => set("director_age_min", e.target.value)}
            className="w-1/2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.director_age_max}
            onChange={(e) => set("director_age_max", e.target.value)}
            className="w-1/2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Effectifs */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Effectifs
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.employee_min}
            onChange={(e) => set("employee_min", e.target.value)}
            className="w-1/2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.employee_max}
            onChange={(e) => set("employee_max", e.target.value)}
            className="w-1/2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Score cession */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Score cession minimum
        </label>
        <input
          type="number"
          placeholder="ex: 60"
          min="0"
          max="100"
          value={filters.cession_score_min}
          onChange={(e) => set("cession_score_min", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_website}
            onChange={(e) => set("has_website", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Site web connu</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_summary}
            onChange={(e) => set("has_summary", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Activité analysée</span>
        </label>
      </div>
    </div>
  );
}
