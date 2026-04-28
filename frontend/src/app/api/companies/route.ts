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

  if (p.get("region")) add("region = ?", p.get("region"));
  if (p.get("department")) add("department = ?", p.get("department"));
  if (p.get("director_age_min")) add("director_age >= ?", parseInt(p.get("director_age_min")!));
  if (p.get("director_age_max")) add("director_age <= ?", parseInt(p.get("director_age_max")!));
  if (p.get("employee_min")) add("employee_max >= ?", parseInt(p.get("employee_min")!));
  if (p.get("employee_max")) add("employee_min <= ?", parseInt(p.get("employee_max")!));
  if (p.get("cession_score_min")) add("cession_score >= ?", parseFloat(p.get("cession_score_min")!));
  if (p.get("has_website") === "true") conditions.push("website IS NOT NULL");
  if (p.get("has_summary") === "true") conditions.push("activity_summary IS NOT NULL");
  if (p.get("keyword")) {
    const kw = `%${p.get("keyword")}%`;
    add("(activity_summary ILIKE ? OR real_sector ILIKE ? OR name ILIKE ?)", null);
    // Replace the last placeholder with a proper triple-binding
    conditions.pop();
    values.pop();
    conditions.push(`(activity_summary ILIKE $${idx} OR real_sector ILIKE $${idx} OR name ILIKE $${idx})`);
    values.push(kw);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  try {
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM companies
       ${where}
       ORDER BY cession_score DESC NULLS LAST
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, pageSize, offset]
    );

    const total = rows[0]?.total_count ? parseInt(rows[0].total_count) : 0;
    const items = rows.map(({ total_count: _, ...rest }) => rest);

    return NextResponse.json({ items, total, page, page_size: pageSize });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
