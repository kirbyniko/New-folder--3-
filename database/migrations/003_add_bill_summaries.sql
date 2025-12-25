-- Migration: Add summary fields to bills table
-- This allows us to store LLM-generated summaries and track when content changes

ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP;

-- Create index for efficient querying of bills needing summarization
CREATE INDEX IF NOT EXISTS idx_bills_summary_status 
ON bills (state_code, last_summarized_at) 
WHERE summary IS NULL OR last_summarized_at IS NULL;

-- Add comment
COMMENT ON COLUMN bills.summary IS 'LLM-generated summary of the bill (max ~200 words)';
COMMENT ON COLUMN bills.content_hash IS 'SHA-256 hash of bill content to detect changes';
COMMENT ON COLUMN bills.last_summarized_at IS 'Timestamp of last LLM summarization';
