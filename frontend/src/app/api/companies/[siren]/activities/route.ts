import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siren: string }> }
) {
  const { siren } = await params;
  try {
    const { rows } = await pool.query(
      `SELECT a.* FROM activities a
       JOIN companies c ON c.id = a.company_id
       WHERE c.siren = $1
       ORDER BY a.date DESC
       LIMIT 100`,
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
    type: string;
    direction?: string;
    date?: string;
    subject?: string;
    content?: string;
    outcome?: string;
    next_action?: string;
  };

  try {
    const { rows: co } = await pool.query(
      "SELECT id FROM companies WHERE siren = $1 LIMIT 1",
      [siren]
    );
    if (!co.length) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const { rows } = await pool.query(
      `INSERT INTO activities (company_id, type, direction, date, subject, content, outcome, next_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        co[0].id,
        body.type,
        body.direction ?? null,
        body.date ?? new Date().toISOString(),
        body.subject ?? null,
        body.content ?? null,
        body.outcome ?? null,
        body.next_action ?? null,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
