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

  try {
    await pool.query(
      "UPDATE companies SET pipeline_stage = $1, updated_at = NOW() WHERE siren = $2",
      [stage, siren]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
