"use client";

import { useState } from "react";
import type { Filters } from "@/types/company";
import { FRENCH_REGIONS, PIPELINE_STAGES } from "@/types/company";

interface Props {
  filters: Filters;
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
  crit_digital_gap: false,
  crit_physical_b2b: false,
  crit_retiring: false,
  crit_small: false,
  crit_no_holding: false,
  pipeline_stage: "",
};

export default function FiltersPanel({ filters, onChange, onReset }: Props) {
  const [showScoring, setShowScoring] = useState(false);
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

      {/* Mot-clé */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Mot-clé activité</label>
        <input
          type="text"
          placeholder="ex: rayonnage, câblage, hydro…"
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
          <option value="">Toutes les régions</option>
          {FRENCH_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Critères investisseur-opérateur */}
      <div>
        <button
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 mb-2 hover:text-blue-900"
          onClick={() => setShowScoring(!showScoring)}
        >
          <span>{showScoring ? "▼" : "▶"}</span>
          Critères d'acquisition
        </button>

        {showScoring && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-1 leading-relaxed">
            <p className="font-semibold">Modèle investisseur-opérateur (100 pts)</p>
            <p>• Potentiel digital <span className="font-medium">(40 pts)</span>: pas de site, micro-entreprise, fondée &gt;20 ans</p>
            <p>• Qualité business <span className="font-medium">(30 pts)</span>: produit physique B2B, distribution, ancienneté</p>
            <p>• Transmissibilité <span className="font-medium">(20 pts)</span>: dirigeant ≥58 ans, dirigeant unique, pas de holding</p>
            <p>• Complexité <span className="font-medium">(10 pts)</span>: ≤5 salariés, secteur non réglementé</p>
          </div>
        )}

        <div className="space-y-2">
          {[
            { key: "crit_digital_gap" as keyof Filters, label: "Pas de site web (gap digital)" },
            { key: "crit_physical_b2b" as keyof Filters, label: "Secteur produit physique B2B" },
            { key: "crit_retiring" as keyof Filters, label: "Dirigeant ≥55 ans" },
            { key: "crit_small" as keyof Filters, label: "0–5 salariés" },
            { key: "crit_no_holding" as keyof Filters, label: "Pas de holding" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key] as boolean}
                onChange={(e) => set(key, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Score minimum */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Score minimum</label>
        <input
          type="number"
          placeholder="ex: 50"
          min="0"
          max="100"
          value={filters.cession_score_min}
          onChange={(e) => set("cession_score_min", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Age dirigeant */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Age dirigeant</label>
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
        <label className="block text-xs font-medium text-gray-500 mb-1">Effectifs</label>
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

      {/* Pipeline CRM */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Étape pipeline</label>
        <select
          value={filters.pipeline_stage}
          onChange={(e) => set("pipeline_stage", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes les étapes</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_website}
            onChange={(e) => set("has_website", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Site web connu</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_summary}
            onChange={(e) => set("has_summary", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Activité analysée</span>
        </label>
      </div>
    </div>
  );
}
