-- Migration 003: Smart Scraping System
-- Adds tracking columns for incremental updates and event lifecycle management

-- Add new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW();
ALTER TABLE events ADD COLUMN IF NOT EXISTS seen_in_current_scrape BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS scrape_cycle_count INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;

-- Create index for faster queries on removed events
CREATE INDEX IF NOT EXISTS idx_events_removed_at ON events(removed_at) WHERE removed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_last_seen ON events(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_events_state_active ON events(state_code, removed_at) WHERE removed_at IS NULL;

-- Create archived events table for historical tracking
CREATE TABLE IF NOT EXISTS archived_events (
  id UUID PRIMARY KEY,
  level VARCHAR(20),
  state_code VARCHAR(2),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  location_name TEXT,
  location_address TEXT,
  description TEXT,
  committee_name TEXT,
  type VARCHAR(50),
  details_url TEXT,
  docket_url TEXT,
  virtual_meeting_url TEXT,
  source_url TEXT,
  allows_public_participation BOOLEAN DEFAULT false,
  scraper_source VARCHAR(100),
  external_id VARCHAR(255),
  fingerprint VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  scraped_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP,
  scrape_cycle_count INTEGER,
  removed_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  removal_reason TEXT
);

-- Create indexes for archived events
CREATE INDEX IF NOT EXISTS idx_archived_events_state ON archived_events(state_code);
CREATE INDEX IF NOT EXISTS idx_archived_events_removed_at ON archived_events(removed_at);
CREATE INDEX IF NOT EXISTS idx_archived_events_archived_at ON archived_events(archived_at);

COMMENT ON TABLE archived_events IS 'Historical record of events that were removed from source calendars';
COMMENT ON COLUMN events.last_seen_at IS 'Last time this event was found during a scrape';
COMMENT ON COLUMN events.seen_in_current_scrape IS 'Temporary flag used during scraping to detect removed events';
COMMENT ON COLUMN events.scrape_cycle_count IS 'Number of consecutive scrape cycles this event was not found';
COMMENT ON COLUMN events.removed_at IS 'When this event was removed from the source calendar';
