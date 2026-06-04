export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CrmCard, SireneCompany, CrmStage } from "@/types/company";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("crm_cards")
    .select("siren, company_data, stage, notes, moved_at")
    .order("moved_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate enrichments
  const sirens = (data ?? []).map((c) => c.siren as string);
  let enrichMap: Record<string, SireneCompany["enrichment"]> = {};
  if (sirens.length > 0) {
    const { data: enrichData } = await db.from("enrichments").select("siren, enrichment_data").in("siren", sirens);
    enrichMap = Object.fromEntries(
      (enrichData ?? []).map((e) => [e.siren, e.enrichment_data as SireneCompany["enrichment"]])
    );
  }

  const cards: CrmCard[] = (data ?? []).map((row) => ({
    siren: row.siren as string,
    company_data: {
      ...(row.company_data as SireneCompany),
      enrichment: enrichMap[row.siren as string] ?? undefined,
    },
    stage: row.stage as CrmStage,
    notes: row.notes as string | undefined,
    moved_at: row.moved_at as string,
  }));

  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { siren: string; company_data: SireneCompany; stage: CrmStage };
  const db = getSupabaseAdmin();

  const { error } = await db.from("crm_cards").upsert({
    siren: body.siren,
    company_data: body.company_data,
    stage: body.stage,
    moved_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { siren: string; stage?: CrmStage; notes?: string };
  const db = getSupabaseAdmin();

  const update: Record<string, unknown> = { moved_at: new Date().toISOString() };
  if (body.stage !== undefined) update.stage = body.stage;
  if (body.notes !== undefined) update.notes = body.notes;

  const { error } = await db.from("crm_cards").update(update).eq("siren", body.siren);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { siren } = (await req.json()) as { siren: string };
  const db = getSupabaseAdmin();

  const { error } = await db.from("crm_cards").delete().eq("siren", siren);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
