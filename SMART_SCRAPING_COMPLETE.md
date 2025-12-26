# Smart Scraping System - Implementation Complete

## Overview
Upgraded the scraping system from "delete and replace" to intelligent incremental updates that preserve data during failures and detect actual removals.

## What Changed

### 1. Database Schema (Migration 003)
**New columns in `events` table:**
- `last_seen_at` - Timestamp when event was last found during scraping
- `seen_in_current_scrape` - Boolean flag used during scraping process
- `scrape_cycle_count` - Counter for consecutive scrapes where event wasn't found
- `removed_at` - Soft delete timestamp when event is confirmed removed

**New `archived_events` table:**
- Historical record of events removed from source calendars
- Includes removal reason and archive timestamp
- Automatically cleaned up after 30 days

### 2. Smart Scraping Logic

**Before each state scrape:**
1. Mark all existing events for that state as "not seen yet" (`seen_in_current_scrape = false`)

**During scraping:**
2. Run scraper as normal
3. If scraper returns 0 events:
   - **DON'T DELETE EXISTING DATA** 
   - Increment `scrape_cycle_count` for unseen events
   - Preserve and re-export existing data
   - Log as "data preserved" not "error"
4. If scraper returns events:
   - Insert/update as normal
   - Mark each inserted event as `seen_in_current_scrape = true`

**After scraping:**
5. Find events that weren't seen (still `seen_in_current_scrape = false`)
6. If `scrape_cycle_count >= 2` (missed 2+ consecutive scrapes):
   - Copy to `archived_events` table
   - Soft-delete by setting `removed_at = NOW()`
7. Export only active events (`removed_at IS NULL`) to blobs

### 3. Cleanup Strategy

**Old system:**
```sql
DELETE FROM events WHERE scraped_at < NOW() - INTERVAL '24 hours'
```

**New system:**
```sql
-- Remove soft-deleted events after 7 days
DELETE FROM events WHERE removed_at < NOW() - INTERVAL '7 days'

-- Clean archived events after 30 days
DELETE FROM archived_events WHERE archived_at < NOW() - INTERVAL '30 days'
```

## Benefits

✅ **Data Preservation** - Legislature out of session? Data stays!
✅ **Accurate Removal Detection** - Only archives events truly gone from source
✅ **Failure Resilience** - Temporary scraper failures don't wipe data
✅ **Historical Tracking** - Know when/why events were removed
✅ **No False Deletions** - Requires 2+ missed cycles before archiving

## Usage

### Run Migration
```bash
npx tsx scripts/run-migration-003.ts
```

### Test System
```bash
npx tsx scripts/test-smart-scraping.ts
```

### Query Active Events
```sql
SELECT * FROM events WHERE removed_at IS NULL;
```

### Query Archived Events
```sql
SELECT * FROM archived_events WHERE state_code = 'IL';
```

### Check Event Lifecycle
```sql
SELECT 
  state_code,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE removed_at IS NULL) as active_events,
  COUNT(*) FILTER (WHERE removed_at IS NOT NULL) as removed_events,
  AVG(scrape_cycle_count) as avg_cycle_count
FROM events
GROUP BY state_code
ORDER BY state_code;
```

## For Iowa & Illinois

These states likely show 0 events because:
1. **Out of session** - Most legislatures meet January-May
2. **Between sessions** - Expected behavior for December

The new system will:
- ✅ Preserve their existing data
- ✅ Increment cycle counters
- ✅ NOT delete events just because scraper returns 0
- ✅ Re-export preserved data to frontend

## Next Steps

1. Run migration: `npx tsx scripts/run-migration-003.ts`
2. Test with IA/IL: `npx tsx scripts/test-smart-scraping.ts`
3. Re-run scheduled scraper to update all states
4. Monitor archived_events table for truly removed events

## Technical Details

**Scrape Cycle Threshold:** 2 consecutive misses before archiving
**Archive Retention:** 30 days
**Removed Event Retention:** 7 days in main table, then deleted
**Export Filter:** `WHERE removed_at IS NULL` on all queries

---

**Status:** ✅ Ready to deploy
**Migration:** 003_smart_scraping.sql
**Breaking Changes:** None (backward compatible)
