"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Zap, Database, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditsInfo {
  credits: number;
  pappers_used: number;
  pappers_limit: number;
}

export default function SettingsPage() {
  const [info, setInfo] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditsInput, setCreditsInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        setInfo(d as CreditsInfo);
        setCreditsInput(String((d as CreditsInfo).credits));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveCredits() {
    const credits = parseInt(creditsInput);
    if (isNaN(credits) || credits < 0) { toast.error("Valeur invalide"); return; }
    setSaving(true);
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits }),
    });
    if (res.ok) {
      setInfo((prev) => prev ? { ...prev, credits } : prev);
      toast.success("Crédits mis à jour");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setSaving(false);
  }

  const pappersPercent = info ? Math.round((info.pappers_used / info.pappers_limit) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <h1 className="text-lg font-bold">Paramètres</h1>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Crédits d&apos;enrichissement IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-16 rounded" />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-foreground">{info?.credits ?? 0}</div>
                <div className="text-sm text-muted-foreground">
                  crédit{(info?.credits ?? 0) > 1 ? "s" : ""} disponible{(info?.credits ?? 0) > 1 ? "s" : ""}
                  <br />
                  <span className="text-xs">1 crédit = 1 enrichissement Claude IA</span>
                </div>
              </div>
              <Separator />
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="credits-input">Modifier les crédits</Label>
                  <Input
                    id="credits-input"
                    type="number"
                    min={0}
                    value={creditsInput}
                    onChange={(e) => setCreditsInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveCredits} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pappers quota */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            Quota Pappers (dirigeants)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-12 rounded" />
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilisé ce mois</span>
                <span className="font-semibold">{info?.pappers_used ?? 0} / {info?.pappers_limit ?? 500}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pappersPercent >= 90 ? "bg-destructive" : pappersPercent >= 70 ? "bg-orange-400" : "bg-primary"}`}
                  style={{ width: `${pappersPercent}%` }}
                />
              </div>
              {pappersPercent >= 90 && (
                <p className="text-xs text-destructive">
                  Quota presque atteint. Les données dirigeants peuvent être indisponibles.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Les données sont mises en cache pendant 30 jours pour économiser le quota.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Config guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            Variables d&apos;environnement requises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { key: "NEXT_PUBLIC_SUPABASE_URL", desc: "URL de votre projet Supabase" },
              { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Clé publique Supabase" },
              { key: "SUPABASE_SERVICE_KEY", desc: "Clé service Supabase (côté serveur)" },
              { key: "ANTHROPIC_API_KEY", desc: "Clé API Claude (Anthropic)" },
              { key: "PAPPERS_API_KEY", desc: "Clé API Pappers (dirigeants)" },
              { key: "SIRENE_TOKEN", desc: "Token Bearer INSEE SIRENE V3.11" },
              { key: "SIRENE_CONSUMER_KEY", desc: "Ou : clé consommateur INSEE (alt.)" },
              { key: "SIRENE_CONSUMER_SECRET", desc: "Ou : secret consommateur INSEE (alt.)" },
            ].map(({ key, desc }) => (
              <div key={key} className="flex gap-3">
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono shrink-0">{key}</code>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Configurez ces variables dans le tableau de bord Netlify → Site settings → Environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
