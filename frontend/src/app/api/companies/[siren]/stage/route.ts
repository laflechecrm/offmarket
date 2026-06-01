import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { PIPELINE_STAGES } from "@/types/company";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ siren: string }> }
) {
  const { siren } = await params;
  const body = await req.json() as { stage: string | null };
  const stage = body.stage ?? null;

  if (stage !== null && !(PIPELINE_STAGES as readonly string[]).includes(stage)) {
    return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT id, pipeline_stage FROM companies WHERE siren = $1 LIMIT 1",
      [siren]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { id, pipeline_stage: fromStage } = rows[0] as { id: number; pipeline_stage: string | null };

    await client.query(
      "UPDATE companies SET pipeline_stage = $1, pipeline_moved_at = NOW(), updated_at = NOW() WHERE id = $2",
      [stage, id]
    );

    if (fromStage !== stage) {
      await client.query(
        "INSERT INTO pipeline_history (company_id, from_stage, to_stage) VALUES ($1, $2, $3)",
        [id, fromStage, stage]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }
}
