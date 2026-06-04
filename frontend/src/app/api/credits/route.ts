export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = getSupabaseAdmin();

  // Get credits
  const { data: profile } = await db.from("profiles").select("credits").single();

  // Pappers usage this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: pappersCount } = await db
    .from("pappers_usage")
    .select("*", { count: "exact", head: true })
    .gte("fetched_at", monthStart.toISOString());

  return NextResponse.json({
    credits: (profile?.credits as number) ?? 0,
    pappers_used: pappersCount ?? 0,
    pappers_limit: 500,
  });
}

export async function POST(req: NextRequest) {
  const { credits } = (await req.json()) as { credits: number };
  const db = getSupabaseAdmin();

  // Upsert profile (single-user mode)
  const { data: existing } = await db.from("profiles").select("id").single();

  if (existing) {
    await db.from("profiles").update({ credits }).eq("id", existing.id as string);
  } else {
    await db.from("profiles").insert({ credits });
  }

  return NextResponse.json({ ok: true });
}
