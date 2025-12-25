-- Migration 005: Add agenda_summaries table for meeting agenda summaries

-- Create agenda_summaries table
CREATE TABLE IF NOT EXISTS agenda_summaries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  agenda_url TEXT NOT NULL,
  agenda_text TEXT,
  summary TEXT,
  content_hash TEXT,
  last_summarized_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agenda_summaries_event ON agenda_summaries(event_id);
CREATE INDEX IF NOT EXISTS idx_agenda_summaries_hash ON agenda_summaries(content_hash);
