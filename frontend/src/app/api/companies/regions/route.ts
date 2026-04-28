import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`SELECT DISTINCT region FROM companies WHERE region IS NOT NULL ORDER BY region`;
    return NextResponse.json(rows.map((r) => r.region));
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}
