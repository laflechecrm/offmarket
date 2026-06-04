export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { searchSirene } from "@/lib/datasource";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SearchFilters, SireneCompany } from "@/types/company";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const filters: SearchFilters = {
    naf: p.get("naf") ?? undefined,
    department: p.get("department") ?? undefined,
    region_code: p.get("region_code") ?? undefined,
    keyword: p.get("keyword") ?? undefined,
    employee_tranches: p.get("employee_tranches")?.split(",").filter(Boolean) ?? undefined,
    crit_no_website: p.get("crit_no_website") === "true" || undefined,
    crit_b2b_physical: p.get("crit_b2b_physical") === "true" || undefined,
    crit_retiring: p.get("crit_retiring") === "true" || undefined,
    crit_small: p.get("crit_small") === "true" || undefined,
  };

  // If region selected, use its departments unless a specific dept is set
  if (filters.region_code && !filters.department) {
    const { FRENCH_REGIONS } = await import("@/types/company");
    const region = FRENCH_REGIONS.find((r) => r.code === filters.region_code);
    if (region) {
      // Use the first dept of the region as a proxy — for production, build multi-dept OR query
      filters.department = region.departments[0];
    }
  }

  const page = Math.max(1, parseInt(p.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(p.get("page_size") ?? "50")));

  try {
    const result = await searchSirene({ filters, page, pageSize });

    // Hydrate with Supabase data (favorites, enrichments, crm_stages)
    if (result.items.length > 0) {
      const sirens = result.items.map((c) => c.siren);
      const db = getSupabaseAdmin();

      const [favRes, enrichRes, crmRes] = await Promise.all([
        db.from("favorites").select("siren").in("siren", sirens),
        db.from("enrichments").select("siren, enrichment_data").in("siren", sirens),
        db.from("crm_cards").select("siren, stage").in("siren", sirens),
      ]);

      const favSet = new Set((favRes.data ?? []).map((f) => f.siren));
      const enrichMap = Object.fromEntries(
        (enrichRes.data ?? []).map((e) => [e.siren, e.enrichment_data as SireneCompany["enrichment"]])
      );
      const stageMap = Object.fromEntries(
        (crmRes.data ?? []).map((c) => [c.siren, c.stage as SireneCompany["crm_stage"]])
      );

      result.items = result.items.map((c) => ({
        ...c,
        is_favorite: favSet.has(c.siren),
        enrichment: enrichMap[c.siren] ?? undefined,
        crm_stage: stageMap[c.siren] ?? undefined,
      }));
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[search] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
