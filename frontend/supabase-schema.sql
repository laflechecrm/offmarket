-- Off Market Reprise — Supabase schema
-- Run this in the Supabase SQL editor to initialize the database

-- Credits / profile (single-user mode)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credits INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Seed with default credits
INSERT INTO profiles (credits) SELECT 50 WHERE NOT EXISTS (SELECT 1 FROM profiles);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites (company data stored as JSONB — no local company table)
CREATE TABLE IF NOT EXISTS favorites (
  siren TEXT PRIMARY KEY,
  company_data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI enrichment cache
CREATE TABLE IF NOT EXISTS enrichments (
  siren TEXT PRIMARY KEY,
  enrichment_data JSONB NOT NULL,
  enriched_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM pipeline cards
CREATE TABLE IF NOT EXISTS crm_cards (
  siren TEXT PRIMARY KEY,
  company_data JSONB NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Prospect',
  notes TEXT,
  moved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pappers API cache (TTL: 30 days handled in app)
CREATE TABLE IF NOT EXISTS dirigeant_cache (
  siren TEXT PRIMARY KEY,
  pappers_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pappers usage tracking (reset monthly in app)
CREATE TABLE IF NOT EXISTS pappers_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siren TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pappers_usage_fetched_at ON pappers_usage(fetched_at);
CREATE INDEX IF NOT EXISTS idx_crm_cards_stage ON crm_cards(stage);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at);
