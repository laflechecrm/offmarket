"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, Calendar, TrendingUp, AlertTriangle, Lightbulb, ExternalLink } from "lucide-react";
import type { SireneCompany } from "@/types/company";
import { EMPLOYEE_TRANCHES } from "@/types/company";
import { cn } from "@/lib/utils";

interface Props {
  company: SireneCompany | null;
  open: boolean;
  onClose: () => void;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number | null | undefined; max: number; color: string }) {
  const pct = value != null ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-medium">{value?.toFixed(0) ?? "—"}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SidePanel({ company, open, onClose }: Props) {
  if (!company) return null;
  const e = company.enrichment;
  const empLabel = company.employee_tranche ? EMPLOYEE_TRANCHES[company.employee_tranche] : null;
  const creationYear = company.creation_date ? new Date(company.creation_date).getFullYear() : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg pr-8">{company.name}</SheetTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary">{company.naf}{company.naf_label ? ` — ${company.naf_label}` : ""}</Badge>
            {e?.sector && <Badge className="bg-blue-50 text-blue-700 border-blue-200">{e.sector}</Badge>}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">SIREN</span>
              {company.siren}
            </div>
            {company.city && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {company.city} {company.postal_code ? `(${company.postal_code})` : ""}
              </div>
            )}
            {empLabel && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {empLabel} salarié(s)
              </div>
            )}
            {creationYear && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Créée en {creationYear}
              </div>
            )}
          </div>

          {/* Dirigeant */}
          {company.dirigeant && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dirigeant</p>
                <p className="text-sm font-medium">{[company.dirigeant.prenom, company.dirigeant.nom].filter(Boolean).join(" ")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {company.dirigeant.qualite}
                  {company.dirigeant.age ? ` · ${company.dirigeant.age} ans` : ""}
                </p>
              </div>
            </>
          )}

          {/* AI enrichment */}
          {e && (
            <>
              <Separator />

              {/* Scores */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score d&apos;acquisition</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">{e.cession_score.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </div>
                <div className="space-y-2">
                  <ScoreBar label="Potentiel digital" value={e.digital_score} max={40} color="bg-blue-400" />
                  <ScoreBar label="Qualité business" value={e.business_score} max={30} color="bg-green-400" />
                  <ScoreBar label="Transmissibilité" value={e.transmission_score} max={20} color="bg-orange-400" />
                  <ScoreBar label="Complexité faible" value={e.complexity_score} max={10} color="bg-gray-400" />
                </div>
              </div>

              {/* Activity summary */}
              {e.activity_summary && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activité</p>
                  <p className="text-sm leading-relaxed">{e.activity_summary}</p>
                </div>
              )}

              {/* Digital opportunity */}
              {e.digital_opportunity && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Opportunité digitale
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed">{e.digital_opportunity}</p>
                </div>
              )}

              {/* Growth levers */}
              {e.growth_levers && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Leviers de croissance
                  </div>
                  <p className="text-sm text-green-900 leading-relaxed">{e.growth_levers}</p>
                </div>
              )}

              {/* Risks */}
              {e.risks && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Risques
                  </div>
                  <p className="text-sm text-red-900 leading-relaxed">{e.risks}</p>
                </div>
              )}
            </>
          )}

          {/* External links */}
          <Separator />
          <div className="flex gap-3 flex-wrap text-sm">
            <a
              href={`https://www.societe.com/societe/-${company.siren}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Societe.com
            </a>
            <a
              href={`https://www.infogreffe.fr/societe/${company.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Infogreffe
            </a>
            <a
              href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${company.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Annuaire Entreprises
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
