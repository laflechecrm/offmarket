export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchPappers } from "@/lib/datasource";
import { getSupabaseAdmin } from "@/lib/supabase";

const CACHE_TTL_DAYS = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ siren: string }> }) {
  const { siren } = await params;
  const db = getSupabaseAdmin();

  // Check cache
  const { data: cached } = await db
    .from("dirigeant_cache")
    .select("pappers_data, fetched_at")
    .eq("siren", siren)
    .single();

  if (cached) {
    const age = (Date.now() - new Date(cached.fetched_at as string).getTime()) / 86400000;
    if (age < CACHE_TTL_DAYS) {
      return NextResponse.json(cached.pappers_data);
    }
  }

  // Check Pappers quota (500/month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("pappers_usage")
    .select("*", { count: "exact", head: true })
    .gte("fetched_at", monthStart.toISOString());

  if ((count ?? 0) >= 490) {
    return NextResponse.json({ error: "Quota Pappers mensuel atteint (490/500)" }, { status: 429 });
  }

  try {
    const result = await fetchPappers(siren);

    // Upsert cache
    await db.from("dirigeant_cache").upsert({
      siren,
      pappers_data: result,
      fetched_at: new Date().toISOString(),
    });

    // Record usage
    await db.from("pappers_usage").insert({ siren, fetched_at: new Date().toISOString() });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
