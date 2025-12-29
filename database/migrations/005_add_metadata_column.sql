-- Migration: Add metadata JSONB column to events table
-- This enables storing scraper-specific fields without creating separate tables

-- Add metadata column for flexible scraper-specific data
ALTER TABLE events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING gin(metadata);

-- Add type column if it doesn't exist (for event classification)
ALTER TABLE events ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- Create index on type for fast filtering
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Update comments
COMMENT ON COLUMN events.metadata IS 'Scraper-specific fields stored as JSON (e.g., case_number, judge_name, committee_name)';
COMMENT ON COLUMN events.type IS 'Event classification (e.g., legislative_calendar, court_calendar, public_hearing)';

-- Example metadata usage:
-- Legislative calendar event:
-- {
--   "committee_name": "House Judiciary",
--   "bill_numbers": ["HB 123", "SB 456"],
--   "chair": "Rep. Smith"
-- }
--
-- Court calendar event:
-- {
--   "case_number": "CV-2025-12345",
--   "judge_name": "Hon. Jane Doe",
--   "hearing_type": "Preliminary Hearing",
--   "case_type": "Civil"
-- }
--
-- Permit review event:
-- {
--   "permit_number": "BLD-2025-001",
--   "applicant": "ABC Development Corp",
--   "project_type": "Commercial Construction",
--   "address": "123 Main St"
-- }
