import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id               SERIAL PRIMARY KEY,
        siren            VARCHAR(9)  UNIQUE NOT NULL,
        siret_siege      VARCHAR(14),
        name             VARCHAR(500),
        naf_code         VARCHAR(10),
        naf_label        VARCHAR(500),
        employee_range   VARCHAR(20),
        employee_min     INTEGER,
        employee_max     INTEGER,
        creation_date    DATE,
        company_age_years INTEGER,
        address          TEXT,
        city             VARCHAR(200),
        postal_code      VARCHAR(10),
        department       VARCHAR(10),
        region           VARCHAR(100),
        legal_form_code  VARCHAR(10),
        legal_form       VARCHAR(200),
        director_name    VARCHAR(500),
        director_birth_year INTEGER,
        director_age     INTEGER,
        director_appointment_date DATE,
        director_count   INTEGER,
        has_holding      BOOLEAN DEFAULT false,
        website          VARCHAR(500),
        homepage_text    TEXT,
        activity_summary TEXT,
        real_sector      VARCHAR(300),
        embedding        vector(768),
        cession_score    FLOAT,
        digital_score    FLOAT,
        business_score   FLOAT,
        transmission_score FLOAT,
        complexity_score FLOAT,
        pipeline_stage   VARCHAR(50),
        director_enriched_at TIMESTAMP,
        website_found_at TIMESTAMP,
        scraped_at       TIMESTAMP,
        summarized_at    TIMESTAMP,
        embedded_at      TIMESTAMP,
        scored_at        TIMESTAMP,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_siren   ON companies(siren);
      CREATE INDEX IF NOT EXISTS idx_companies_region  ON companies(region);
      CREATE INDEX IF NOT EXISTS idx_companies_score   ON companies(cession_score DESC NULLS LAST);
      CREATE INDEX IF NOT EXISTS idx_companies_stage   ON companies(pipeline_stage);
    `);

    const { rows } = await pool.query("SELECT COUNT(*) AS n FROM companies");
    const count = parseInt(rows[0].n);

    return NextResponse.json({ ok: true, message: "Base initialisée", companies: count });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
