"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Star, Zap, MapPin, Users, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRM_STAGES, CRM_STAGE_COLORS, EMPLOYEE_TRANCHES, type SireneCompany, type Enrichment, type CrmStage } from "@/types/company";
import { cn } from "@/lib/utils";

interface Props {
  company: SireneCompany;
  onToggleFavorite: (siren: string, isFav: boolean) => void;
  onEnrich: (siren: string) => Promise<Enrichment | null>;
  onStageChange: (siren: string, stage: CrmStage | null) => void;
  onClick: (company: SireneCompany) => void;
  enriching?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-red-100 text-red-700 border-red-200"
    : score >= 50 ? "bg-orange-100 text-orange-700 border-orange-200"
    : score >= 30 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", color)}>
      {score.toFixed(0)}/100
    </span>
  );
}

export default function CompanyCard({ company: initial, onToggleFavorite, onEnrich, onStageChange, onClick, enriching }: Props) {
  const [company, setCompany] = useState<SireneCompany>(initial);
  const [dirigeantLoading, setDirigeantLoading] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Sync parent company updates (favorites, stage)
  useEffect(() => {
    setCompany((prev) => ({ ...prev, is_favorite: initial.is_favorite, crm_stage: initial.crm_stage, enrichment: initial.enrichment ?? prev.enrichment }));
  }, [initial.is_favorite, initial.crm_stage, initial.enrichment]);

  // IntersectionObserver — lazy load Pappers dirigeant
  const fetchDirigeant = useCallback(async () => {
    if (fetchedRef.current || company.dirigeant) return;
    fetchedRef.current = true;
    setDirigeantLoading(true);
    try {
      const res = await fetch(`/api/dirigeant/${company.siren}`);
      if (res.ok) {
        const data = (await res.json()) as { dirigeant?: SireneCompany["dirigeant"] };
        setCompany((prev) => ({ ...prev, dirigeant: data.dirigeant }));
      }
    } finally {
      setDirigeantLoading(false);
    }
  }, [company.siren, company.dirigeant]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { fetchDirigeant(); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchDirigeant]);

  async function handleEnrich(e: React.MouseEvent) {
    e.stopPropagation();
    setEnrichLoading(true);
    const enrichment = await onEnrich(company.siren);
    if (enrichment) setCompany((prev) => ({ ...prev, enrichment }));
    setEnrichLoading(false);
  }

  const empLabel = company.employee_tranche ? EMPLOYEE_TRANCHES[company.employee_tranche] ?? company.employee_tranche : null;
  const creationYear = company.creation_date ? new Date(company.creation_date).getFullYear() : null;
  const currentStage = company.crm_stage;

  return (
    <Card ref={cardRef} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onClick(company)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                {company.name}
              </h3>
              {company.enrichment && <ScoreBadge score={company.enrichment.cession_score} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{company.siren}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(company.siren, !company.is_favorite); }}
            className={cn("shrink-0 transition-colors", company.is_favorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400")}
            title={company.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Star className={cn("h-4 w-4", company.is_favorite && "fill-current")} />
          </button>
        </div>

        {/* NAF + badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {company.naf} {company.naf_label ? `— ${company.naf_label}` : ""}
          </Badge>
          {company.enrichment?.sector && (
            <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
              {company.enrichment.sector}
            </Badge>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(company.city || company.department) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[company.city, company.department].filter(Boolean).join(", ")}
            </span>
          )}
          {empLabel && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {empLabel}
            </span>
          )}
          {creationYear && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {creationYear}
            </span>
          )}
        </div>

        {/* Dirigeant */}
        <div className="text-xs">
          {dirigeantLoading ? (
            <div className="flex gap-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-12" /></div>
          ) : company.dirigeant ? (
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {[company.dirigeant.prenom, company.dirigeant.nom].filter(Boolean).join(" ")}
              </span>
              {company.dirigeant.age ? `, ${company.dirigeant.age} ans` : ""}
              {company.dirigeant.qualite ? ` · ${company.dirigeant.qualite}` : ""}
            </span>
          ) : null}
        </div>

        {/* AI summary */}
        {company.enrichment?.activity_summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2">
            {company.enrichment.activity_summary}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {!company.enrichment && (
            <Button size="sm" variant="outline" onClick={handleEnrich} disabled={enrichLoading || enriching} className="h-7 text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {enrichLoading ? "Analyse…" : "Enrichir IA"}
            </Button>
          )}
          <Select
            value={currentStage ?? "__none__"}
            onValueChange={(v) => onStageChange(company.siren, v === "__none__" ? null : v as CrmStage)}
          >
            <SelectTrigger className="h-7 text-xs flex-1 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Pipeline…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Aucun —</SelectItem>
              {CRM_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className={cn("px-1.5 py-0.5 rounded text-xs", CRM_STAGE_COLORS[s])}>{s}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`https://www.societe.com/societe/-${company.siren}.html`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground"
            title="Voir sur Societe.com"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
