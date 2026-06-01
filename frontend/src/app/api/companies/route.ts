import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(p.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt(p.get("page_size") ?? "50")));

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const add = (cond: string, val: unknown) => {
    conditions.push(cond.replace("?", `$${idx++}`));
    values.push(val);
  };

  // Filtres standards
  if (p.get("region"))           add("region = ?", p.get("region"));
  if (p.get("department"))       add("department = ?", p.get("department"));
  if (p.get("director_age_min")) add("director_age >= ?", parseInt(p.get("director_age_min")!));
  if (p.get("director_age_max")) add("director_age <= ?", parseInt(p.get("director_age_max")!));
  if (p.get("employee_min"))     add("(employee_max IS NULL OR employee_max >= ?)", parseInt(p.get("employee_min")!));
  if (p.get("employee_max"))     add("(employee_min IS NULL OR employee_min <= ?)", parseInt(p.get("employee_max")!));
  if (p.get("cession_score_min")) add("cession_score >= ?", parseFloat(p.get("cession_score_min")!));
  if (p.get("has_website") === "true")  conditions.push("website IS NOT NULL");
  if (p.get("has_summary") === "true")  conditions.push("activity_summary IS NOT NULL");

  // Critères métier investisseur-opérateur
  if (p.get("crit_digital_gap") === "true") {
    conditions.push("website IS NULL");
  }
  if (p.get("crit_physical_b2b") === "true") {
    conditions.push(
      "naf_code IS NOT NULL AND naf_code ~ '^(20|21|22|23|24|25|26|27|28|29|30|31|32|33|38|39|46|49|50|51|52)'"
    );
  }
  if (p.get("crit_retiring") === "true") {
    add("director_age >= ?", 55);
  }
  if (p.get("crit_small") === "true") {
    conditions.push("(employee_max IS NULL OR employee_max <= 5)");
  }
  if (p.get("crit_no_holding") === "true") {
    conditions.push("(has_holding IS NULL OR has_holding = false)");
  }
  if (p.get("pipeline_stage")) {
    add("pipeline_stage = ?", p.get("pipeline_stage"));
  }

  // Mot-clé : cherche sur nom, résumé activité, secteur réel
  if (p.get("keyword")) {
    const kw = `%${p.get("keyword")}%`;
    // Use same $N three times — valid in PostgreSQL
    conditions.push(
      `(name ILIKE $${idx} OR activity_summary ILIKE $${idx} OR real_sector ILIKE $${idx})`
    );
    values.push(kw);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  // Build final query with explicit parameter positions (avoid double-idx++ bug risk)
  const limitIdx = idx;
  const offsetIdx = idx + 1;
  const query = `
    SELECT *, COUNT(*) OVER() AS total_count
    FROM companies
    ${where}
    ORDER BY cession_score DESC NULLS LAST
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const params = [...values, pageSize, offset];

  try {
    const { rows } = await pool.query(query, params);

    const total = rows[0]?.total_count ? parseInt(rows[0].total_count as string) : 0;
    const items = rows.map(({ total_count: _tc, ...rest }: Record<string, unknown>) => rest);

    return NextResponse.json({ items, total, page, page_size: pageSize });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[companies] SQL error:", msg, "\nQuery:", query, "\nParams:", params);
    return NextResponse.json(
      { error: `Erreur base de données : ${msg}` },
      { status: 500 }
    );
  }
}
