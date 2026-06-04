export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Enrichment } from "@/types/company";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest, { params }: { params: Promise<{ siren: string }> }) {
  const { siren } = await params;
  const db = getSupabaseAdmin();

  // Check if already enriched (and not stale)
  const { data: existing } = await db
    .from("enrichments")
    .select("enrichment_data, enriched_at")
    .eq("siren", siren)
    .single();

  if (existing) {
    return NextResponse.json(existing.enrichment_data);
  }

  // Check credits
  const { data: profile } = await db.from("profiles").select("credits").single();
  const credits = (profile?.credits as number) ?? 0;
  if (credits <= 0) {
    return NextResponse.json({ error: "Crédits épuisés. Rechargez dans les paramètres." }, { status: 402 });
  }

  // Get company data from request body
  const body = (await req.json()) as { name: string; naf?: string; city?: string; employee_tranche?: string; creation_date?: string };
  const { name, naf, city, employee_tranche, creation_date } = body;

  const prompt = `Tu es un expert en acquisition et cession de TPE/PME françaises, avec une approche d'investisseur-opérateur.

Analyse cette entreprise pour un acquéreur potentiel :
- Nom : ${name}
- SIREN : ${siren}
- Code NAF : ${naf ?? "inconnu"}
- Ville : ${city ?? "inconnue"}
- Tranche effectifs : ${employee_tranche ?? "inconnue"}
- Date création : ${creation_date ?? "inconnue"}

Effectue des recherches web pour obtenir des informations récentes sur cette entreprise.
Puis retourne UNIQUEMENT un objet JSON valide avec exactement ces champs :

{
  "activity_summary": "description concrète de l'activité en 2-3 phrases",
  "sector": "secteur réel en 2-4 mots",
  "digital_score": <0-40, basé sur présence web, e-commerce, CRM, outils numériques>,
  "business_score": <0-30, basé sur qualité B2B, récurrence, marges>,
  "transmission_score": <0-20, basé sur âge dirigeant, complexité, dépendance>,
  "complexity_score": <0-10, 10 = très simple à reprendre>,
  "cession_score": <total des 4 scores>,
  "digital_opportunity": "description de l'opportunité de transformation digitale (ou null)",
  "growth_levers": "principaux leviers de croissance identifiés (ou null)",
  "risks": "principaux risques pour l'acquéreur (ou null)"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    // Extract the final text response
    let jsonText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        jsonText = block.text;
        break;
      }
    }

    // If the model used tools, we may need a second pass to get the final answer
    if (!jsonText && response.stop_reason === "tool_use") {
      const toolResults = response.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          type: "tool_result" as const,
          tool_use_id: (b as { type: "tool_use"; id: string }).id,
          content: "Search completed",
        }));

      const followUp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });

      for (const block of followUp.content) {
        if (block.type === "text") { jsonText = block.text; break; }
      }
    }

    // Parse JSON from response
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const parsed = JSON.parse(match[0]) as Partial<Enrichment>;
    const enrichment: Enrichment = {
      activity_summary: parsed.activity_summary ?? "",
      sector: parsed.sector ?? naf ?? "",
      digital_score: Number(parsed.digital_score ?? 0),
      business_score: Number(parsed.business_score ?? 0),
      transmission_score: Number(parsed.transmission_score ?? 0),
      complexity_score: Number(parsed.complexity_score ?? 0),
      cession_score: Number(parsed.cession_score ?? 0),
      digital_opportunity: parsed.digital_opportunity ?? undefined,
      risks: parsed.risks ?? undefined,
      growth_levers: parsed.growth_levers ?? undefined,
      enriched_at: new Date().toISOString(),
    };

    // Save to Supabase
    await db.from("enrichments").upsert({ siren, enrichment_data: enrichment, enriched_at: enrichment.enriched_at });

    // Deduct credit
    await db.from("profiles").update({ credits: credits - 1 }).single();

    return NextResponse.json(enrichment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[enrich] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
