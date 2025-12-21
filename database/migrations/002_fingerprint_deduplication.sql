-- Migration 002: Add Fingerprint-Based Deduplication
-- Description: Adds UNIQUE constraint on fingerprint to prevent duplicate events
-- Run AFTER cleaning existing duplicates with scripts/cleanup-duplicates.ts

-- Add unique constraint on fingerprint
-- This prevents the same event from being inserted multiple times
ALTER TABLE events 
ADD CONSTRAINT events_fingerprint_key 
UNIQUE (fingerprint);

-- Add NOT NULL constraint on scraper_source
-- This ensures all events have a valid source identifier
ALTER TABLE events 
ALTER COLUMN scraper_source SET NOT NULL;

-- Add NOT NULL constraint on fingerprint
-- Fingerprint is critical for deduplication
ALTER TABLE events 
ALTER COLUMN fingerprint SET NOT NULL;

-- Drop old composite unique constraint (now redundant)
-- We're using fingerprint for deduplication instead
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_scraper_source_external_id_key;

-- Create index on scraper_source for queries
-- Still useful for filtering by source
CREATE INDEX IF NOT EXISTS idx_events_scraper_source 
ON events(scraper_source);

-- Verify constraints
-- Check that all rows have required values
DO $$
DECLARE
  null_fingerprints INT;
  null_sources INT;
  duplicate_fingerprints INT;
BEGIN
  -- Check for NULL fingerprints
  SELECT COUNT(*) INTO null_fingerprints
  FROM events
  WHERE fingerprint IS NULL;
  
  IF null_fingerprints > 0 THEN
    RAISE EXCEPTION 'Migration failed: % events have NULL fingerprint', null_fingerprints;
  END IF;
  
  -- Check for NULL scraper_source
  SELECT COUNT(*) INTO null_sources
  FROM events
  WHERE scraper_source IS NULL;
  
  IF null_sources > 0 THEN
    RAISE EXCEPTION 'Migration failed: % events have NULL scraper_source', null_sources;
  END IF;
  
  -- Check for duplicate fingerprints
  SELECT COUNT(*) INTO duplicate_fingerprints
  FROM (
    SELECT fingerprint
    FROM events
    GROUP BY fingerprint
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_fingerprints > 0 THEN
    RAISE EXCEPTION 'Migration failed: % duplicate fingerprints found. Run cleanup-duplicates.ts first!', duplicate_fingerprints;
  END IF;
  
  RAISE NOTICE 'Migration verification passed: No NULLs, no duplicates';
END $$;
