-- Civitron PostgreSQL Schema
-- Run this file to set up the database structure

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tables
CREATE TABLE IF NOT EXISTS states (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  capitol_lat DECIMAL(10, 7),
  capitol_lng DECIMAL(10, 7),
  capitol_city VARCHAR(100),
  jurisdiction_id VARCHAR(100),
  legislature_url TEXT
);

-- Main events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  level VARCHAR(20) NOT NULL CHECK (level IN ('federal', 'state', 'local')),
  type VARCHAR(50),
  state_code VARCHAR(2) REFERENCES states(code),
  
  -- Core fields (REQUIRED)
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  
  -- Location
  location_name TEXT,
  location_address TEXT,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  
  -- Content
  description TEXT,
  committee_name TEXT,
  details_url TEXT,
  docket_url TEXT,
  virtual_meeting_url TEXT,
  source_url TEXT,
  
  -- Metadata
  allows_public_participation BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  scraper_source VARCHAR(50), -- 'openstates', 'custom', 'legistar', etc.
  
  -- Deduplication
  external_id VARCHAR(200),
  fingerprint VARCHAR(64), -- Hash of name+date+location for dedup
  
  UNIQUE(scraper_source, external_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(lat, lng);
CREATE INDEX IF NOT EXISTS idx_events_state ON events(state_code);
CREATE INDEX IF NOT EXISTS idx_events_level ON events(level);
CREATE INDEX IF NOT EXISTS idx_events_fingerprint ON events(fingerprint);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code VARCHAR(2) REFERENCES states(code),
  bill_number VARCHAR(50) NOT NULL,
  title TEXT,
  summary TEXT,
  url TEXT,
  status VARCHAR(50),
  introduced_date DATE,
  last_action_date DATE,
  last_action_description TEXT,
  
  UNIQUE(state_code, bill_number)
);

-- Event-Bill relationship
CREATE TABLE IF NOT EXISTS event_bills (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, bill_id)
);

-- Committees
CREATE TABLE IF NOT EXISTS committees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code VARCHAR(2) REFERENCES states(code),
  name TEXT NOT NULL,
  chamber VARCHAR(20), -- 'house', 'senate', 'joint'
  external_id VARCHAR(200),
  url TEXT,
  
  UNIQUE(state_code, name)
);

-- Event tags
CREATE TABLE IF NOT EXISTS event_tags (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (event_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tags ON event_tags(tag);

-- Scraper health tracking
CREATE TABLE IF NOT EXISTS scraper_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scraper_name VARCHAR(50) NOT NULL,
  state_code VARCHAR(2) REFERENCES states(code),
  status VARCHAR(20), -- 'success', 'failure', 'timeout'
  events_scraped INTEGER,
  error_message TEXT,
  scraped_at TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_health_scraper ON scraper_health(scraper_name);
CREATE INDEX IF NOT EXISTS idx_health_date ON scraper_health(scraped_at);

-- Insert state data
INSERT INTO states (code, name, capitol_lat, capitol_lng, capitol_city, jurisdiction_id) VALUES
  ('AL', 'Alabama', 32.3617, -86.2792, 'Montgomery', 'ocd-jurisdiction/country:us/state:al/government'),
  ('AK', 'Alaska', 58.3019, -134.4197, 'Juneau', 'ocd-jurisdiction/country:us/state:ak/government'),
  ('AZ', 'Arizona', 33.4484, -112.0740, 'Phoenix', 'ocd-jurisdiction/country:us/state:az/government'),
  ('AR', 'Arkansas', 34.7465, -92.2896, 'Little Rock', 'ocd-jurisdiction/country:us/state:ar/government'),
  ('CA', 'California', 38.5767, -121.4934, 'Sacramento', 'ocd-jurisdiction/country:us/state:ca/government'),
  ('CO', 'Colorado', 39.7392, -104.9903, 'Denver', 'ocd-jurisdiction/country:us/state:co/government'),
  ('CT', 'Connecticut', 41.7658, -72.6734, 'Hartford', 'ocd-jurisdiction/country:us/state:ct/government'),
  ('DE', 'Delaware', 39.1582, -75.5244, 'Dover', 'ocd-jurisdiction/country:us/state:de/government'),
  ('FL', 'Florida', 30.4383, -84.2807, 'Tallahassee', 'ocd-jurisdiction/country:us/state:fl/government'),
  ('GA', 'Georgia', 33.7490, -84.3880, 'Atlanta', 'ocd-jurisdiction/country:us/state:ga/government'),
  ('HI', 'Hawaii', 21.3099, -157.8581, 'Honolulu', 'ocd-jurisdiction/country:us/state:hi/government'),
  ('ID', 'Idaho', 43.6150, -116.2023, 'Boise', 'ocd-jurisdiction/country:us/state:id/government'),
  ('IL', 'Illinois', 39.7817, -89.6501, 'Springfield', 'ocd-jurisdiction/country:us/state:il/government'),
  ('IN', 'Indiana', 39.7684, -86.1581, 'Indianapolis', 'ocd-jurisdiction/country:us/state:in/government'),
  ('IA', 'Iowa', 41.5868, -93.6250, 'Des Moines', 'ocd-jurisdiction/country:us/state:ia/government'),
  ('KS', 'Kansas', 39.0473, -95.6752, 'Topeka', 'ocd-jurisdiction/country:us/state:ks/government'),
  ('KY', 'Kentucky', 38.1867, -84.8753, 'Frankfort', 'ocd-jurisdiction/country:us/state:ky/government'),
  ('LA', 'Louisiana', 30.4515, -91.1871, 'Baton Rouge', 'ocd-jurisdiction/country:us/state:la/government'),
  ('ME', 'Maine', 44.3106, -69.7795, 'Augusta', 'ocd-jurisdiction/country:us/state:me/government'),
  ('MD', 'Maryland', 38.9784, -76.4922, 'Annapolis', 'ocd-jurisdiction/country:us/state:md/government'),
  ('MA', 'Massachusetts', 42.3601, -71.0589, 'Boston', 'ocd-jurisdiction/country:us/state:ma/government'),
  ('MI', 'Michigan', 42.7325, -84.5555, 'Lansing', 'ocd-jurisdiction/country:us/state:mi/government'),
  ('MN', 'Minnesota', 44.9537, -93.0900, 'Saint Paul', 'ocd-jurisdiction/country:us/state:mn/government'),
  ('MS', 'Mississippi', 32.2988, -90.1848, 'Jackson', 'ocd-jurisdiction/country:us/state:ms/government'),
  ('MO', 'Missouri', 38.5767, -92.1735, 'Jefferson City', 'ocd-jurisdiction/country:us/state:mo/government'),
  ('MT', 'Montana', 46.5884, -112.0245, 'Helena', 'ocd-jurisdiction/country:us/state:mt/government'),
  ('NE', 'Nebraska', 40.8136, -96.7026, 'Lincoln', 'ocd-jurisdiction/country:us/state:ne/government'),
  ('NV', 'Nevada', 39.1638, -119.7674, 'Carson City', 'ocd-jurisdiction/country:us/state:nv/government'),
  ('NH', 'New Hampshire', 43.2081, -71.5376, 'Concord', 'ocd-jurisdiction/country:us/state:nh/government'),
  ('NJ', 'New Jersey', 40.2206, -74.7597, 'Trenton', 'ocd-jurisdiction/country:us/state:nj/government'),
  ('NM', 'New Mexico', 35.6870, -105.9378, 'Santa Fe', 'ocd-jurisdiction/country:us/state:nm/government'),
  ('NY', 'New York', 42.6526, -73.7562, 'Albany', 'ocd-jurisdiction/country:us/state:ny/government'),
  ('NC', 'North Carolina', 35.7796, -78.6382, 'Raleigh', 'ocd-jurisdiction/country:us/state:nc/government'),
  ('ND', 'North Dakota', 46.8083, -100.7837, 'Bismarck', 'ocd-jurisdiction/country:us/state:nd/government'),
  ('OH', 'Ohio', 39.9612, -82.9988, 'Columbus', 'ocd-jurisdiction/country:us/state:oh/government'),
  ('OK', 'Oklahoma', 35.4676, -97.5164, 'Oklahoma City', 'ocd-jurisdiction/country:us/state:ok/government'),
  ('OR', 'Oregon', 44.9429, -123.0351, 'Salem', 'ocd-jurisdiction/country:us/state:or/government'),
  ('PA', 'Pennsylvania', 40.2732, -76.8867, 'Harrisburg', 'ocd-jurisdiction/country:us/state:pa/government'),
  ('RI', 'Rhode Island', 41.8240, -71.4128, 'Providence', 'ocd-jurisdiction/country:us/state:ri/government'),
  ('SC', 'South Carolina', 34.0007, -81.0348, 'Columbia', 'ocd-jurisdiction/country:us/state:sc/government'),
  ('SD', 'South Dakota', 44.3683, -100.3510, 'Pierre', 'ocd-jurisdiction/country:us/state:sd/government'),
  ('TN', 'Tennessee', 36.1627, -86.7816, 'Nashville', 'ocd-jurisdiction/country:us/state:tn/government'),
  ('TX', 'Texas', 30.2672, -97.7431, 'Austin', 'ocd-jurisdiction/country:us/state:tx/government'),
  ('UT', 'Utah', 40.7608, -111.8910, 'Salt Lake City', 'ocd-jurisdiction/country:us/state:ut/government'),
  ('VT', 'Vermont', 44.2601, -72.5754, 'Montpelier', 'ocd-jurisdiction/country:us/state:vt/government'),
  ('VA', 'Virginia', 37.5407, -77.4360, 'Richmond', 'ocd-jurisdiction/country:us/state:va/government'),
  ('WA', 'Washington', 47.0379, -122.9007, 'Olympia', 'ocd-jurisdiction/country:us/state:wa/government'),
  ('WV', 'West Virginia', 38.3498, -81.6326, 'Charleston', 'ocd-jurisdiction/country:us/state:wv/government'),
  ('WI', 'Wisconsin', 43.0731, -89.4012, 'Madison', 'ocd-jurisdiction/country:us/state:wi/government'),
  ('WY', 'Wyoming', 41.1400, -104.8202, 'Cheyenne', 'ocd-jurisdiction/country:us/state:wy/government')
ON CONFLICT (code) DO NOTHING;
