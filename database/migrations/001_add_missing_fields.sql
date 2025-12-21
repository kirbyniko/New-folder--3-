-- Add missing fields to events table for complete data capture

ALTER TABLE events ADD COLUMN IF NOT EXISTS agenda_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS chamber VARCHAR(20); -- 'house', 'senate', 'joint', 'bicameral'
ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_events_chamber ON events(chamber);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
