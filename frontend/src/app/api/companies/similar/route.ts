import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren?: string; text?: string; limit?: number };
  const limit = Math.min(20, body.limit ?? 10);

  try {
    if (body.siren) {
      // Vector similarity via pgvector — use pre-computed embedding
      const { rows } = await pool.query(
        `SELECT c.*,
                1 - (c.embedding <=> anchor.embedding) AS similarity
         FROM companies c,
              (SELECT embedding FROM companies WHERE siren = $1 AND embedding IS NOT NULL LIMIT 1) anchor
         WHERE c.siren != $1
           AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> anchor.embedding
         LIMIT $2`,
        [body.siren, limit]
      );

      if (!rows.length) {
        return NextResponse.json(
          { error: "Company not found or not yet embedded" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        rows.map(({ similarity, ...company }) => ({
          company,
          similarity: parseFloat(similarity),
        }))
      );
    }

    if (body.text) {
      // Text-based: full-text search fallback (no embedding API needed on Netlify)
      const { rows } = await pool.query(
        `SELECT *,
                ts_rank(
                  to_tsvector('french', COALESCE(activity_summary,'') || ' ' || COALESCE(real_sector,'')),
                  plainto_tsquery('french', $1)
                ) AS similarity
         FROM companies
         WHERE to_tsvector('french', COALESCE(activity_summary,'') || ' ' || COALESCE(real_sector,''))
               @@ plainto_tsquery('french', $1)
            OR activity_summary ILIKE $2
            OR real_sector ILIKE $2
         ORDER BY similarity DESC
         LIMIT $3`,
        [body.text, `%${body.text}%`, limit]
      );

      return NextResponse.json(
        rows.map(({ similarity, ...company }) => ({
          company,
          similarity: Math.min(1, parseFloat(similarity ?? "0") + 0.5),
        }))
      );
    }

    return NextResponse.json({ error: "Provide siren or text" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
