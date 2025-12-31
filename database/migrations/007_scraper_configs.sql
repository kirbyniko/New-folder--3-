-- Migration: Add scraper_configs table
-- Description: Store Chrome extension scraper configurations

CREATE TABLE IF NOT EXISTS scraper_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  start_url TEXT NOT NULL,
  fields JSONB NOT NULL,
  ai_fields JSONB,
  storage JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_scraper_configs_name ON scraper_configs(name);

-- Index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_scraper_configs_updated ON scraper_configs(updated_at DESC);

COMMENT ON TABLE scraper_configs IS 'Chrome extension scraper configurations with field mappings';
COMMENT ON COLUMN scraper_configs.fields IS 'Field selectors and extraction config (JSONB)';
COMMENT ON COLUMN scraper_configs.ai_fields IS 'AI analysis configuration for fields (JSONB)';
COMMENT ON COLUMN scraper_configs.storage IS 'Event type and scraper source metadata (JSONB)';
