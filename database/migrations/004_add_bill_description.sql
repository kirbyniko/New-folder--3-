-- Migration: Add bill description/content field for better LLM summaries
-- This field will store the bill text/description extracted by scrapers

ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for searching descriptions
CREATE INDEX IF NOT EXISTS idx_bills_description 
ON bills USING gin(to_tsvector('english', description))
WHERE description IS NOT NULL;

-- Update content_hash to include description
COMMENT ON COLUMN bills.content_hash IS 'SHA-256 hash of bill_number|title|url|description for change detection';
