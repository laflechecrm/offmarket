"use client";

import { useState } from "react";
import { Search, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { SearchFilters } from "@/types/company";
import { FRENCH_REGIONS, EMPLOYEE_TRANCHES } from "@/types/company";

export const DEFAULT_FILTERS: SearchFilters = {};

interface Props {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onSearch: () => void;
  onSave?: () => void;
  loading?: boolean;
}

const EMPLOYEE_OPTIONS = ["NN", "00", "01", "02", "03", "11", "12"] as const;

export default function SearchFilters({ filters, onChange, onSearch, onSave, loading }: Props) {
  const set = (key: keyof SearchFilters, value: unknown) =>
    onChange({ ...filters, [key]: value || undefined });

  function toggleTranche(t: string) {
    const current = filters.employee_tranches ?? [];
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    onChange({ ...filters, employee_tranches: next.length ? next : undefined });
  }

  function reset() {
    onChange(DEFAULT_FILTERS);
  }

  return (
    <aside className="w-64 shrink-0 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filtres SIRENE</h2>
        <button onClick={reset} className="text-muted-foreground hover:text-foreground" title="Réinitialiser">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Keyword */}
      <div className="space-y-1.5">
        <Label htmlFor="keyword">Nom d&apos;entreprise</Label>
        <Input
          id="keyword"
          placeholder="ex. plomberie martin"
          value={filters.keyword ?? ""}
          onChange={(e) => set("keyword", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>

      {/* NAF */}
      <div className="space-y-1.5">
        <Label htmlFor="naf">Code NAF / APE</Label>
        <Input
          id="naf"
          placeholder="ex. 4520, 46, 62"
          value={filters.naf ?? ""}
          onChange={(e) => set("naf", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <p className="text-xs text-muted-foreground">Préfixe accepté (ex : 46 = gros)</p>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="dept">Département</Label>
        <Input
          id="dept"
          placeholder="ex. 69, 75, 13"
          maxLength={3}
          value={filters.department ?? ""}
          onChange={(e) => set("department", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Région</Label>
        <Select
          value={filters.region_code ?? "__none__"}
          onValueChange={(v) => {
            const code = v === "__none__" ? undefined : v;
            const region = FRENCH_REGIONS.find((r) => r.code === code);
            onChange({
              ...filters,
              region_code: code,
              department: region ? undefined : filters.department,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les régions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Toutes les régions</SelectItem>
            {FRENCH_REGIONS.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Employee tranches */}
      <div className="space-y-2">
        <Label>Effectifs</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {EMPLOYEE_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs">
              <Checkbox
                checked={(filters.employee_tranches ?? []).includes(t)}
                onCheckedChange={() => toggleTranche(t)}
              />
              <span>{EMPLOYEE_TRANCHES[t]}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Investor criteria */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Critères investisseur</Label>
        {[
          { key: "crit_no_website" as const, label: "Sans site web (gap digital)" },
          { key: "crit_b2b_physical" as const, label: "B2B physique (NAF industrie/gros)" },
          { key: "crit_retiring" as const, label: "Dirigeant ≥55 ans (retraite)" },
          { key: "crit_small" as const, label: "TPE ≤5 salariés" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={!!filters[key]}
              onCheckedChange={(v) => set(key, v === true ? true : undefined)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onSearch} disabled={loading} className="w-full">
          <Search className="h-4 w-4 mr-1" />
          {loading ? "Recherche…" : "Rechercher"}
        </Button>
        {onSave && (
          <Button variant="outline" onClick={onSave} size="sm" className="w-full">
            <Save className="h-3.5 w-3.5 mr-1" />
            Sauvegarder cette recherche
          </Button>
        )}
      </div>
    </aside>
  );
}
