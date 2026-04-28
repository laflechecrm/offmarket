import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE director_enriched_at IS NOT NULL)     AS director_enriched,
        COUNT(*) FILTER (WHERE website_found_at     IS NOT NULL)     AS website_found,
        COUNT(*) FILTER (WHERE scraped_at           IS NOT NULL)     AS scraped,
        COUNT(*) FILTER (WHERE summarized_at        IS NOT NULL)     AS summarized,
        COUNT(*) FILTER (WHERE embedded_at          IS NOT NULL)     AS embedded,
        COUNT(*) FILTER (WHERE scored_at            IS NOT NULL)     AS scored
      FROM companies
    `);

    const r = rows[0];
    return NextResponse.json({
      total:            parseInt(r.total),
      director_enriched: parseInt(r.director_enriched),
      website_found:    parseInt(r.website_found),
      scraped:          parseInt(r.scraped),
      summarized:       parseInt(r.summarized),
      embedded:         parseInt(r.embedded),
      scored:           parseInt(r.scored),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { total: 0, director_enriched: 0, website_found: 0, scraped: 0, summarized: 0, embedded: 0, scored: 0 },
      { status: 500 }
    );
  }
}
