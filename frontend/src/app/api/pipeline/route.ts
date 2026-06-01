import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { PIPELINE_STAGES } from "@/types/company";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, siren, name, city, region, naf_code, real_sector,
        director_age, director_count, employee_min, employee_max,
        cession_score, digital_score, retirement_probability,
        website, pipeline_stage, pipeline_moved_at,
        activity_summary, digital_opportunity_summary
      FROM companies
      ORDER BY
        CASE pipeline_stage
          ${PIPELINE_STAGES.map((s, i) => `WHEN '${s}' THEN ${i}`).join("\n          ")}
          ELSE 99
        END,
        cession_score DESC NULLS LAST
    `);

    const grouped: Record<string, typeof rows> = {};
    for (const stage of PIPELINE_STAGES) {
      grouped[stage] = [];
    }
    grouped["Sans étape"] = [];

    for (const row of rows) {
      const stage = row.pipeline_stage;
      if (stage && stage in grouped) {
        grouped[stage].push(row);
      } else {
        grouped["Sans étape"].push(row);
      }
    }

    return NextResponse.json(grouped);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
