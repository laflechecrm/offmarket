export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SavedSearch, SearchFilters } from "@/types/company";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("saved_searches")
    .select("id, name, filters, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name: string; filters: SearchFilters };
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("saved_searches")
    .insert({ name: body.name, filters: body.filters, created_at: new Date().toISOString() })
    .select("id, name, filters, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as SavedSearch);
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  const db = getSupabaseAdmin();

  const { error } = await db.from("saved_searches").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
