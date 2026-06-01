import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siren: string }> }
) {
  const { siren } = await params;
  try {
    const { rows } = await pool.query(
      `SELECT t.* FROM tasks t
       JOIN companies c ON c.id = t.company_id
       WHERE c.siren = $1
       ORDER BY t.completed_at IS NULL DESC, t.due_date ASC NULLS LAST`,
      [siren]
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siren: string }> }
) {
  const { siren } = await params;
  const body = await req.json() as {
    title: string;
    type?: string;
    description?: string;
    due_date?: string;
    priority?: string;
  };

  try {
    const { rows: co } = await pool.query(
      "SELECT id FROM companies WHERE siren = $1 LIMIT 1",
      [siren]
    );
    if (!co.length) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const { rows } = await pool.query(
      `INSERT INTO tasks (company_id, type, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [co[0].id, body.type ?? null, body.title, body.description ?? null, body.due_date ?? null, body.priority ?? "medium"]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ siren: string }> }
) {
  const { siren } = await params;
  const body = await req.json() as { task_id: string; completed: boolean };
  try {
    await pool.query(
      `UPDATE tasks SET completed_at = $1
       WHERE id = $2
         AND company_id = (SELECT id FROM companies WHERE siren = $3 LIMIT 1)`,
      [body.completed ? new Date().toISOString() : null, body.task_id, siren]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
