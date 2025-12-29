# 🚀 Unified Events Table - Quick Reference

## What Changed?

### ❌ OLD (Per-Scraper Tables)
```javascript
storage: {
  tableName: "court_calendars",  // Creates separate table
  autoCreate: true
}
```
- Each scraper creates its own table
- Can't query across scrapers
- Schema duplication everywhere
- Maintenance nightmare

### ✅ NEW (Unified Events Table)
```javascript
storage: {
  table: "events",  // Always use unified table
  eventType: "court_calendar",  // Classification
  scraperSource: "honolulu_courts",  // Unique ID
  useMetadata: true  // Custom fields → JSONB
}
```
- All scrapers write to `events` table
- Cross-scraper queries work
- Single schema to maintain
- JSONB for flexibility

## Template Creator Changes

### New Fields

1. **Event Type** (dropdown - required)
   - `legislative_calendar`
   - `court_calendar`
   - `public_hearing`
   - `permit_review`
   - `zoning_meeting`
   - `commission_meeting`
   - `board_meeting`
   - `town_hall`
   - `other`

2. **Scraper Source ID** (text input - required)
   - Unique identifier: `honolulu_courts`
   - Use lowercase with underscores
   - Format: `{location}_{type}` or `{jurisdiction}_{system}`

### Removed Fields

- ❌ Database Table Name
- ❌ Auto-create table checkbox

## Database Schema

### Core Columns (Use for common fields)
```
name TEXT NOT NULL           → Event title
date DATE NOT NULL           → Event date
time TIME                    → Event time
location_name TEXT           → Venue name
location_address TEXT        → Full address
lat DECIMAL(10,7) NOT NULL   → Latitude
lng DECIMAL(10,7) NOT NULL   → Longitude
description TEXT             → Event description
details_url TEXT             → Link to details page
source_url TEXT              → Original calendar URL
```

### New Columns
```
type VARCHAR(50)             → Event classification
metadata JSONB DEFAULT '{}'  → Scraper-specific fields
```

### Example Insert
```sql
INSERT INTO events (
  level, type, state_code, 
  name, date, time,
  location_name, lat, lng,
  scraper_source, metadata
) VALUES (
  'state',
  'court_calendar',
  'HI',
  'Motion Hearing - Smith v. Jones',
  '2025-01-15',
  '09:00:00',
  'Superior Court Dept 12',
  21.3099, -157.8581,
  'honolulu_courts',
  '{"case_number":"CV-2025-12345","judge":"Hon. Jane Doe"}'
);
```

## Metadata Examples

### Legislative Calendar
```json
{
  "committee_name": "House Judiciary",
  "bill_numbers": ["HB 123", "SB 456"],
  "chair": "Rep. Smith",
  "agenda_url": "https://..."
}
```

### Court Calendar
```json
{
  "case_number": "CV-2025-12345",
  "judge_name": "Hon. Jane Doe",
  "hearing_type": "Motion Hearing",
  "case_type": "Civil"
}
```

### Permit Review
```json
{
  "permit_number": "BLD-2025-001",
  "applicant": "ABC Corp",
  "project_type": "Commercial",
  "parcel_id": "12-34-567-890"
}
```

## Querying Data

### Find All Events in State
```sql
SELECT * FROM events 
WHERE state_code = 'CA' 
AND date >= CURRENT_DATE;
```

### Find Events by Type
```sql
SELECT * FROM events 
WHERE type = 'court_calendar'
AND date BETWEEN '2025-01-01' AND '2025-01-31';
```

### Query Metadata
```sql
-- Find specific case
SELECT * FROM events 
WHERE metadata->>'case_number' = 'CV-2025-12345';

-- Find events with specific bill
SELECT * FROM events 
WHERE metadata->'bill_numbers' ? 'HB 123';
```

### Cross-Scraper Queries (NOW POSSIBLE!)
```sql
-- All California events this week
SELECT 
  name, date, type, scraper_source,
  metadata->>'committee_name' as committee,
  metadata->>'case_number' as case_num
FROM events
WHERE state_code = 'CA'
AND date >= CURRENT_DATE
AND date < CURRENT_DATE + INTERVAL '7 days'
ORDER BY date, time;
```

## Migration Steps

### 1. Run Database Migration
```bash
psql -U postgres -d civitron -f database/migrations/005_add_metadata_column.sql
```

### 2. Update Existing Templates
- Open Template Creator
- Load old template
- Set Event Type and Scraper Source ID
- Re-save

### 3. Migrate Legacy Data (if needed)
```sql
INSERT INTO events (type, scraper_source, name, date, metadata, ...)
SELECT 
  'court_calendar',
  'legacy_courts',
  title,
  hearing_date,
  jsonb_build_object(
    'case_number', case_number,
    'judge', judge_name
  ),
  ...
FROM old_court_calendars;
```

## Best Practices

### ✅ DO
- Set `type` and `scraper_source` on every insert
- Use metadata for scraper-specific fields
- Include coordinates (required for geo-queries)
- Generate fingerprints to prevent duplicates
- Use consistent field names in metadata

### ❌ DON'T
- Don't create new tables
- Don't store core fields (name, date) in metadata
- Don't use metadata for fields that need indexes
- Don't forget to set event type

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Tables per scraper** | N tables | 1 table |
| **Cross-scraper queries** | ❌ Impossible | ✅ Easy |
| **Schema updates** | Update N tables | Update 1 table |
| **Deduplication** | Per-table only | Across all scrapers |
| **Maintenance** | High complexity | Low complexity |
| **Flexibility** | Schema changes required | JSONB metadata |

## Need Help?

- 📖 **Full Guide**: `UNIFIED_EVENTS_ARCHITECTURE.md`
- 🎓 **Template Creator**: `chrome-extension/TEMPLATE_CREATOR_GUIDE.md`
- 🗄️ **Schema**: `database/schema.sql`
- 📝 **Migration**: `database/migrations/005_add_metadata_column.sql`
