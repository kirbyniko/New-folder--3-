-- Add missing UNIQUE constraint on fingerprint for deduplication
ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_fingerprint;
ALTER TABLE events ADD CONSTRAINT unique_fingerprint UNIQUE (fingerprint);

-- Verify
\d events
