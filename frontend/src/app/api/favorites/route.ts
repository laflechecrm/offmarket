export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SireneCompany } from "@/types/company";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("favorites")
    .select("siren, company_data, saved_at")
    .order("saved_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate with enrichments and crm stages
  const sirens = (data ?? []).map((f) => f.siren as string);
  if (sirens.length === 0) return NextResponse.json([]);

  const [enrichRes, crmRes] = await Promise.all([
    db.from("enrichments").select("siren, enrichment_data").in("siren", sirens),
    db.from("crm_cards").select("siren, stage").in("siren", sirens),
  ]);

  const enrichMap = Object.fromEntries(
    (enrichRes.data ?? []).map((e) => [e.siren, e.enrichment_data as SireneCompany["enrichment"]])
  );
  const stageMap = Object.fromEntries(
    (crmRes.data ?? []).map((c) => [c.siren, c.stage as SireneCompany["crm_stage"]])
  );

  const items = (data ?? []).map((f) => ({
    ...(f.company_data as SireneCompany),
    siren: f.siren as string,
    is_favorite: true,
    enrichment: enrichMap[f.siren as string] ?? undefined,
    crm_stage: stageMap[f.siren as string] ?? undefined,
  }));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { siren: string; company_data: SireneCompany };
  const db = getSupabaseAdmin();

  const { error } = await db.from("favorites").upsert({
    siren: body.siren,
    company_data: body.company_data,
    saved_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { siren } = (await req.json()) as { siren: string };
  const db = getSupabaseAdmin();

  const { error } = await db.from("favorites").delete().eq("siren", siren);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
