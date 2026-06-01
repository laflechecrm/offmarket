import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id                        SERIAL PRIMARY KEY,
        siren                     VARCHAR(9)  UNIQUE NOT NULL,
        siret_siege               VARCHAR(14),
        name                      VARCHAR(500),
        naf_code                  VARCHAR(10),
        naf_label                 VARCHAR(500),
        employee_range            VARCHAR(20),
        employee_min              INTEGER,
        employee_max              INTEGER,
        creation_date             DATE,
        company_age_years         INTEGER,
        address                   TEXT,
        city                      VARCHAR(200),
        postal_code               VARCHAR(10),
        department                VARCHAR(10),
        region                    VARCHAR(100),
        legal_form_code           VARCHAR(10),
        legal_form                VARCHAR(200),
        phone                     VARCHAR(50),
        email                     VARCHAR(200),
        linkedin_url              VARCHAR(500),
        revenue_min               INTEGER,
        revenue_max               INTEGER,
        source                    VARCHAR(50),
        source_url                VARCHAR(1000),
        director_name             VARCHAR(500),
        director_birth_year       INTEGER,
        director_age              INTEGER,
        director_appointment_date DATE,
        director_count            INTEGER,
        has_holding               BOOLEAN DEFAULT false,
        website                   VARCHAR(500),
        homepage_text             TEXT,
        activity_summary          TEXT,
        real_sector               VARCHAR(300),
        digital_opportunity_summary TEXT,
        risks_summary             TEXT,
        growth_potential_summary  TEXT,
        embedding                 vector(768),
        cession_score             FLOAT,
        digital_score             FLOAT,
        business_score            FLOAT,
        transmission_score        FLOAT,
        complexity_score          FLOAT,
        retirement_probability    FLOAT,
        pipeline_stage            VARCHAR(50),
        pipeline_moved_at         TIMESTAMP,
        director_enriched_at      TIMESTAMP,
        website_found_at          TIMESTAMP,
        scraped_at                TIMESTAMP,
        summarized_at             TIMESTAMP,
        embedded_at               TIMESTAMP,
        scored_at                 TIMESTAMP,
        created_at                TIMESTAMP DEFAULT NOW(),
        updated_at                TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add missing columns to existing table (idempotent)
    const newCols = [
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(200)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_min INTEGER",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_max INTEGER",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS source VARCHAR(50)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS digital_opportunity_summary TEXT",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS risks_summary TEXT",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS growth_potential_summary TEXT",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS retirement_probability FLOAT",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS pipeline_moved_at TIMESTAMP",
    ];
    for (const sql of newCols) {
      await pool.query(sql);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        type        VARCHAR(30) NOT NULL,
        direction   VARCHAR(10),
        date        TIMESTAMP NOT NULL DEFAULT NOW(),
        subject     VARCHAR(500),
        content     TEXT,
        outcome     VARCHAR(50),
        next_action TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        type         VARCHAR(50),
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        due_date     TIMESTAMP,
        priority     VARCHAR(10) DEFAULT 'medium',
        completed_at TIMESTAMP,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_history (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        from_stage  VARCHAR(50),
        to_stage    VARCHAR(50) NOT NULL,
        note        TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_companies_siren    ON companies(siren)",
      "CREATE INDEX IF NOT EXISTS idx_companies_region   ON companies(region)",
      "CREATE INDEX IF NOT EXISTS idx_companies_score    ON companies(cession_score DESC NULLS LAST)",
      "CREATE INDEX IF NOT EXISTS idx_companies_stage    ON companies(pipeline_stage)",
      "CREATE INDEX IF NOT EXISTS idx_companies_retire   ON companies(retirement_probability DESC NULLS LAST)",
      "CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id)",
      "CREATE INDEX IF NOT EXISTS idx_activities_date    ON activities(date DESC)",
      "CREATE INDEX IF NOT EXISTS idx_tasks_company      ON tasks(company_id)",
      "CREATE INDEX IF NOT EXISTS idx_tasks_due          ON tasks(due_date) WHERE completed_at IS NULL",
    ];
    for (const sql of indexes) {
      await pool.query(sql);
    }

    const { rows } = await pool.query("SELECT COUNT(*) AS n FROM companies");
    return NextResponse.json({ ok: true, message: "Base initialisée", companies: parseInt(rows[0].n) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
