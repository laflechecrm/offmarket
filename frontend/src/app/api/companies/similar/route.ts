import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren?: string; text?: string; limit?: number };
  const limit = Math.min(20, body.limit ?? 10);

  try {
    if (body.siren) {
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
          { error: "Entreprise introuvable ou pas encore vectorisée. Lancez le pipeline d'embeddings depuis le panneau d'administration." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        rows.map(({ similarity, ...company }: Record<string, unknown>) => ({
          company,
          similarity: parseFloat(similarity as string),
        }))
      );
    }

    if (body.text) {
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
        rows.map(({ similarity, ...company }: Record<string, unknown>) => ({
          company,
          similarity: Math.min(1, parseFloat((similarity as string) ?? "0") + 0.5),
        }))
      );
    }

    return NextResponse.json({ error: "Fournir siren ou text" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("vector") || msg.includes("operator does not exist")) {
      return NextResponse.json(
        { error: "Extension pgvector non activée sur cette base. Allez dans /api/admin/init-db pour initialiser." },
        { status: 503 }
      );
    }
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return NextResponse.json(
        { error: "Table companies introuvable. Initialisez la base via POST /api/admin/init-db." },
        { status: 503 }
      );
    }

    console.error(err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}
