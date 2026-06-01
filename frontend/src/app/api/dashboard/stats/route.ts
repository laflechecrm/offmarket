import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [totals, stages, sectors, tasks] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                      AS total,
          COUNT(*) FILTER (WHERE cession_score IS NOT NULL)            AS scored,
          COUNT(*) FILTER (WHERE director_enriched_at IS NOT NULL)     AS enriched,
          COUNT(*) FILTER (WHERE activity_summary IS NOT NULL)         AS analyzed,
          COUNT(*) FILTER (WHERE pipeline_stage IS NOT NULL
                           AND pipeline_stage NOT IN ('Prospects','Perdu')) AS in_pipeline,
          ROUND(AVG(cession_score)::numeric, 1)                        AS avg_score,
          ROUND(AVG(retirement_probability)::numeric, 1)               AS avg_retirement
        FROM companies
      `),
      pool.query(`
        SELECT pipeline_stage, COUNT(*) AS count
        FROM companies
        WHERE pipeline_stage IS NOT NULL
        GROUP BY pipeline_stage
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT real_sector, COUNT(*) AS count
        FROM companies
        WHERE real_sector IS NOT NULL
        GROUP BY real_sector
        ORDER BY count DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT COUNT(*) AS overdue
        FROM tasks
        WHERE completed_at IS NULL
          AND due_date < NOW()
      `),
    ]);

    return NextResponse.json({
      totals: totals.rows[0],
      by_stage: stages.rows,
      by_sector: sectors.rows,
      overdue_tasks: parseInt(tasks.rows[0]?.overdue ?? "0"),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
