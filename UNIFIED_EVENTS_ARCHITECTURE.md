# Unified Events Table Architecture

## Overview

All scrapers in the platform write to a **single unified `events` table** instead of creating separate tables per scraper. This architectural decision provides significant benefits for querying, deduplication, and maintenance.

## Why Unified Table?

### ❌ Problems with Per-Scraper Tables

**Before (table-per-scraper):**
```
court_calendars
├─ case_number VARCHAR(100)
├─ hearing_date DATE
├─ judge_name VARCHAR(255)
└─ ...

business_permits
├─ permit_number VARCHAR(100)
├─ review_date DATE
├─ applicant VARCHAR(255)
└─ ...

legislative_meetings
├─ bill_number VARCHAR(100)
├─ meeting_date DATE
├─ committee VARCHAR(255)
└─ ...
```

**Problems:**
1. ❌ **Schema Duplication** - Every table has `date`, `location`, `name`, etc.
2. ❌ **No Cross-Scraper Queries** - Can't easily say "Show all California events this week"
3. ❌ **No Unified Deduplication** - Same event from two scrapers = duplicate entries
4. ❌ **Maintenance Nightmare** - Adding `virtual_meeting_url` requires altering N tables
5. ❌ **Inconsistent Data Types** - One scraper uses `VARCHAR(100)` for dates, another uses `DATE`

### ✅ Benefits of Unified Table

**After (unified events table):**
```sql
events
├─ Common columns (name, date, location, etc.)
├─ type VARCHAR(50) → 'legislative_calendar', 'court_calendar', etc.
├─ scraper_source VARCHAR(50) → 'honolulu_courts', 'ca_legislative', etc.
└─ metadata JSONB → {"case_number": "CV-123", "judge": "Smith"}
```

**Benefits:**
1. ✅ **Single Source of Truth** - One schema to maintain
2. ✅ **Cross-Scraper Queries** - `SELECT * FROM events WHERE state_code = 'CA' AND date > NOW()`
3. ✅ **Unified Deduplication** - `fingerprint` column prevents duplicates across all scrapers
4. ✅ **Easy Schema Updates** - Add column once, all scrapers benefit
5. ✅ **Consistent Data Types** - Enforced by database schema
6. ✅ **Flexible Metadata** - JSONB for scraper-specific fields
7. ✅ **Efficient Indexing** - Single set of indexes for all event data

## Database Schema

### Events Table (Core)

```sql
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  level VARCHAR(20) NOT NULL CHECK (level IN ('federal', 'state', 'local')),
  type VARCHAR(50),  -- Event classification (see Event Types below)
  state_code VARCHAR(2) REFERENCES states(code),
  
  -- Core fields (REQUIRED - common to all scrapers)
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  
  -- Location (REQUIRED for geo-queries)
  location_name TEXT,
  location_address TEXT,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  
  -- Content (OPTIONAL but recommended)
  description TEXT,
  committee_name TEXT,  -- Legacy field, prefer metadata
  details_url TEXT,
  docket_url TEXT,
  virtual_meeting_url TEXT,
  source_url TEXT,
  
  -- Metadata
  allows_public_participation BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  scraper_source VARCHAR(50),  -- Unique identifier for the scraper
  
  -- Flexible storage for scraper-specific fields
  metadata JSONB DEFAULT '{}',
  
  -- Deduplication
  external_id VARCHAR(200),
  fingerprint VARCHAR(64),  -- Hash of name+date+location for dedup
  
  UNIQUE(scraper_source, external_id)
);

-- Indexes for performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_location ON events(lat, lng);
CREATE INDEX idx_events_state ON events(state_code);
CREATE INDEX idx_events_level ON events(level);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_fingerprint ON events(fingerprint);
CREATE INDEX idx_events_metadata ON events USING gin(metadata);  -- For JSONB queries
```

### Event Types

Standard classifications for the `type` column:

| Type | Description | Example Metadata Fields |
|------|-------------|------------------------|
| `legislative_calendar` | Legislative/government meetings | `committee_name`, `bill_numbers[]`, `chair`, `agenda_url` |
| `court_calendar` | Court hearings and proceedings | `case_number`, `judge_name`, `hearing_type`, `case_type` |
| `public_hearing` | Public hearings and comment periods | `topic`, `department`, `comment_deadline`, `hearing_officer` |
| `permit_review` | Building permits, licenses | `permit_number`, `applicant`, `project_type`, `parcel_id` |
| `zoning_meeting` | Zoning board meetings | `application_number`, `applicant`, `property_address`, `variance_type` |
| `commission_meeting` | Commission meetings | `commission_name`, `agenda_items[]`, `meeting_type` |
| `board_meeting` | Board meetings | `board_name`, `agenda_url`, `meeting_type` |
| `town_hall` | Town hall meetings | `topic`, `speaker`, `registration_url` |
| `other` | Other event types | Custom fields as needed |

## Metadata Column Usage

The `metadata` JSONB column stores scraper-specific fields that don't fit in common columns.

### Legislative Calendar Example

```json
{
  "committee_name": "House Judiciary Committee",
  "bill_numbers": ["HB 123", "SB 456", "HB 789"],
  "chair": "Rep. John Smith",
  "vice_chair": "Rep. Jane Doe",
  "meeting_type": "Public Hearing",
  "agenda_url": "https://legislature.example.gov/agenda/2025-01-15.pdf",
  "livestream_url": "https://legislature.example.gov/live",
  "room_number": "Room 412",
  "expected_duration_minutes": 120
}
```

### Court Calendar Example

```json
{
  "case_number": "CV-2025-12345",
  "case_title": "Smith v. Jones",
  "judge_name": "Hon. Jane Doe",
  "hearing_type": "Preliminary Hearing",
  "case_type": "Civil",
  "department": "Department 12",
  "plaintiff_attorney": "Law Firm A",
  "defendant_attorney": "Law Firm B",
  "estimated_duration_minutes": 30,
  "notes": "Bring all discovery documents"
}
```

### Permit Review Example

```json
{
  "permit_number": "BLD-2025-001234",
  "applicant": "ABC Development Corporation",
  "project_type": "Commercial Construction",
  "project_description": "New 5-story office building",
  "parcel_id": "12-34-567-890",
  "property_address": "123 Main Street, Suite 100",
  "square_footage": 50000,
  "estimated_cost": 5000000,
  "architect": "XYZ Architects",
  "contractor": "BuildCo Inc"
}
```

### Querying Metadata

PostgreSQL JSONB operators enable efficient queries:

```sql
-- Find all events with a specific case number
SELECT * FROM events 
WHERE type = 'court_calendar' 
AND metadata->>'case_number' = 'CV-2025-12345';

-- Find legislative meetings discussing specific bill
SELECT * FROM events 
WHERE type = 'legislative_calendar' 
AND metadata->'bill_numbers' ? 'HB 123';

-- Find all permits for a specific applicant
SELECT * FROM events 
WHERE type = 'permit_review' 
AND metadata->>'applicant' ILIKE '%ABC Development%';

-- Complex query: Find expensive construction permits
SELECT * FROM events 
WHERE type = 'permit_review' 
AND (metadata->>'estimated_cost')::numeric > 1000000
AND date >= CURRENT_DATE;
```

## Scraper Implementation

### Template Creator Configuration

When creating a scraper template, specify:

```javascript
{
  "storage": {
    "table": "events",  // Always "events"
    "eventType": "court_calendar",  // Event classification
    "scraperSource": "honolulu_courts",  // Unique scraper ID
    "useMetadata": true,  // Store custom fields in metadata JSONB
    "fieldMapping": {
      "core": {  // Maps to events table columns
        "name": "events.name",
        "date": "events.date",
        "location": "events.location_name"
      },
      "metadata": {  // Maps to events.metadata JSONB
        "case_number": "text",
        "judge_name": "text",
        "hearing_type": "text"
      }
    }
  }
}
```

### Scraper Code Pattern

```javascript
// Extract data from page
const scrapedData = {
  // Core fields → table columns
  name: "Motion Hearing - Smith v. Jones",
  date: "2025-01-15",
  time: "09:00:00",
  location_name: "Superior Court, Department 12",
  lat: 21.3099,
  lng: -157.8581,
  
  // Scraper-specific fields → metadata JSONB
  metadata: {
    case_number: "CV-2025-12345",
    judge_name: "Hon. Jane Doe",
    hearing_type: "Motion Hearing",
    case_type: "Civil",
    department: "Department 12"
  }
};

// Insert into unified events table
await db.query(`
  INSERT INTO events (
    level, type, state_code, name, date, time,
    location_name, lat, lng, scraper_source, metadata
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  )
`, [
  'state',
  'court_calendar',
  'HI',
  scrapedData.name,
  scrapedData.date,
  scrapedData.time,
  scrapedData.location_name,
  scrapedData.lat,
  scrapedData.lng,
  'honolulu_courts',
  JSON.stringify(scrapedData.metadata)
]);
```

## Migration from Per-Scraper Tables

If you have existing per-scraper tables, migrate them:

```sql
-- Example: Migrate court_calendars table
INSERT INTO events (
  level, type, state_code, name, date, time,
  location_name, lat, lng, scraper_source, metadata,
  created_at
)
SELECT 
  'state',
  'court_calendar',
  'HI',
  hearing_title,
  hearing_date,
  hearing_time,
  courtroom,
  21.3099,  -- Default coordinates for Honolulu
  -157.8581,
  'legacy_court_calendars',
  jsonb_build_object(
    'case_number', case_number,
    'judge_name', judge_name,
    'hearing_type', hearing_type,
    'legacy_id', id
  ),
  created_at
FROM court_calendars
WHERE hearing_date >= CURRENT_DATE;

-- Drop old table after verification
-- DROP TABLE court_calendars;
```

## Best Practices

### ✅ DO

1. **Always set `type` and `scraper_source`** - Critical for filtering and debugging
2. **Use consistent field names in metadata** - `bill_number` not `billNumber` or `bill_num`
3. **Store arrays properly** - Use JSONB arrays: `{"bills": ["HB 123", "SB 456"]}`
4. **Include coordinates** - Required for geo-queries (use geocoding API if needed)
5. **Generate fingerprints** - Hash of `name + date + location` prevents duplicates
6. **Validate before insert** - Check required fields (name, date, lat, lng)

### ❌ DON'T

1. **Don't create new tables** - Everything goes in `events`
2. **Don't use metadata for core fields** - Use table columns for name, date, location
3. **Don't store HTML in metadata** - Extract text, store links separately
4. **Don't use inconsistent types** - `metadata->>'date'` should be ISO format string
5. **Don't forget indexes** - GIN index on metadata is required for performance

## Query Performance

### Optimized Queries

```sql
-- ✅ GOOD: Uses indexes
SELECT * FROM events 
WHERE state_code = 'CA' 
AND date BETWEEN '2025-01-01' AND '2025-01-31'
AND type = 'legislative_calendar';

-- ✅ GOOD: Uses GIN index on metadata
SELECT * FROM events 
WHERE metadata @> '{"committee_name": "House Judiciary"}'::jsonb;

-- ❌ BAD: Full table scan
SELECT * FROM events 
WHERE metadata::text LIKE '%House Judiciary%';
```

### Index Usage

```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM events 
WHERE state_code = 'CA' 
AND date > CURRENT_DATE
AND metadata->>'case_number' = 'CV-2025-12345';
```

## Monitoring

Track scraper performance by `scraper_source`:

```sql
-- Events by scraper
SELECT scraper_source, COUNT(*) as event_count
FROM events
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY scraper_source
ORDER BY event_count DESC;

-- Recent scraper activity
SELECT 
  scraper_source,
  type,
  COUNT(*) as count,
  MAX(scraped_at) as last_run
FROM events
WHERE scraped_at > NOW() - INTERVAL '24 hours'
GROUP BY scraper_source, type
ORDER BY last_run DESC;

-- Data quality check
SELECT 
  scraper_source,
  COUNT(*) FILTER (WHERE lat IS NULL OR lng IS NULL) as missing_coords,
  COUNT(*) FILTER (WHERE description IS NULL) as missing_description,
  COUNT(*) as total
FROM events
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY scraper_source;
```

## Summary

The unified events table architecture provides:

- 🎯 **Single source of truth** for all event data
- 🔍 **Cross-scraper queries** and analytics
- 🚫 **Unified deduplication** via fingerprints
- 🛠️ **Easy maintenance** (one schema to update)
- 📊 **Consistent data quality** (enforced by database)
- ⚡ **High performance** (proper indexing)
- 🔧 **Flexibility** (JSONB for custom fields)

All new scrapers should follow this architecture. Legacy per-scraper tables should be migrated and deprecated.
