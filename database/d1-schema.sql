-- Cloudflare D1 Schema (SQLite)
-- Converted from PostgreSQL schema

-- Events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  type TEXT,
  state_code TEXT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location_name TEXT,
  location_address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  committee_name TEXT,
  details_url TEXT,
  docket_url TEXT,
  virtual_meeting_url TEXT,
  source_url TEXT,
  allows_public_participation INTEGER,
  scraped_at TEXT,
  last_updated TEXT,
  scraper_source TEXT,
  external_id TEXT,
  fingerprint TEXT
);

-- Bills table
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  state_code TEXT,
  bill_number TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  url TEXT,
  status TEXT,
  introduced_date TEXT,
  last_action_date TEXT,
  last_action_description TEXT,
  content_hash TEXT,
  last_summarized_at TEXT,
  description TEXT
);

-- Event-Bills junction table
CREATE TABLE event_bills (
  event_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  PRIMARY KEY (event_id, bill_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Event tags table
CREATE TABLE event_tags (
  event_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (event_id, tag),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Committees table
CREATE TABLE committees (
  id TEXT PRIMARY KEY,
  state_code TEXT,
  name TEXT NOT NULL,
  chamber TEXT,
  external_id TEXT,
  url TEXT
);

-- States reference table
CREATE TABLE states (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capitol_lat REAL,
  capitol_lng REAL,
  capitol_city TEXT,
  jurisdiction_id TEXT,
  legislature_url TEXT
);

-- Scraper health tracking
CREATE TABLE scraper_health (
  id TEXT PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  state_code TEXT,
  status TEXT,
  events_scraped INTEGER,
  error_message TEXT,
  scraped_at TEXT,
  duration_ms INTEGER
);

-- Data sources table (stores scraper metadata)
CREATE TABLE data_sources (
  id TEXT PRIMARY KEY,
  state_code TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'primary', 'secondary', 'supplementary'
  description TEXT,
  last_checked TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'unreliable'
  notes TEXT,
  update_frequency_hours INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Agenda summaries table
CREATE TABLE agenda_summaries (
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

-- Indexes for performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_state ON events(state_code);
CREATE INDEX idx_bills_state ON bills(state_code);
CREATE INDEX idx_bills_number ON bills(bill_number);
CREATE INDEX idx_event_bills_event ON event_bills(event_id);
CREATE INDEX idx_event_bills_bill ON event_bills(bill_id);
CREATE INDEX idx_event_tags_event ON event_tags(event_id);
CREATE INDEX idx_agenda_summaries_event ON agenda_summaries(event_id);
CREATE INDEX idx_agenda_summaries_hash ON agenda_summaries(content_hash);
CREATE INDEX idx_data_sources_state ON data_sources(state_code);
CREATE INDEX idx_data_sources_status ON data_sources(status);
