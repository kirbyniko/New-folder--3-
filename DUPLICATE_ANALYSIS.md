# 🔍 DUPLICATE EVENTS ROOT CAUSE ANALYSIS

**Date**: December 21, 2025  
**Issue**: Same event appearing 10+ times with identical data  
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## 📊 FINDINGS SUMMARY

### Critical Discovery
- **ALL 526 events in database have `scraper_source = NULL`**
- **25 duplicates of "Privacy And Consumer Protection" event**
- **10 different fingerprints with 25 duplicates EACH = 250+ total duplicates**
- **Identical fingerprints but different event IDs and external_ids**

### Database State
```
Event Count by scraper_source:
  NULL: 526 events (100%)

Example: "Privacy And Consumer Protection" Event
  - Total duplicates: 25 rows
  - Same fingerprint: 88f1ebeed269dd0c...
  - Different external_ids: c781689d..., 583f37e2..., etc.
  - Scraped between: Dec 20 22:41 → Dec 21 08:23 (10 hours)
  - Sources: ALL NULL
```

---

## 🐛 ROOT CAUSE

### 1. NULL scraper_source Breaks Deduplication

**Current Deduplication Logic** (netlify/functions/utils/db/events.ts:57):
```sql
ON CONFLICT (scraper_source, external_id) 
DO UPDATE SET ...
```

**Problem**: PostgreSQL UNIQUE constraints allow **multiple NULL values**
- NULL != NULL in SQL (NULL is not equal to anything, including itself)
- When `scraper_source` is NULL, the UNIQUE constraint never matches
- Each insert creates a NEW row instead of updating existing

### 2. How NULL scraper_source Happened

**Code Path Analysis**:

❌ **WRONG**: `test-full-pipeline.ts:28`
```typescript
const eventId = await insertEvent(event, scraper.name);
                                          ^^^^^^^^^^^^
                                          undefined!
```

✅ **CORRECT**: `scheduled-scraper.ts:129`
```typescript
const eventId = await insertEvent(event, `scraper-${state.toLowerCase()}`);
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          "scraper-ca"
```

**Root Cause**: 
- `scraper.name` property does NOT exist on BaseScraper
- BaseScraper only has `config.stateCode`, not `name`
- `scraper.name` returns `undefined`
- `undefined` is passed to `insertEvent()`
- SQL INSERT receives NULL for `scraper_source`

### 3. Why Duplicates Accumulated

**Timeline**:
1. User ran `test-full-pipeline.ts` multiple times to populate database
2. Each run: `insertEvent(event, scraper.name)` → `insertEvent(event, undefined)`
3. SQL INSERT: `scraper_source = NULL`
4. UNIQUE constraint check: `(NULL, external_id_1)` vs `(NULL, external_id_2)`
5. **Result**: Both pass (NULL != NULL) → creates 2 rows
6. After 10+ runs: 25 duplicate rows for same event

---

## 📋 DUPLICATION BREAKDOWN

### Fingerprint Analysis
- **10 fingerprints with 25 duplicates each**
- All duplicates have:
  - ✅ Same fingerprint (SHA256 hash of name|date|location|lat|lng)
  - ✅ Same event data (name, date, time, location, committee)
  - ❌ Different event IDs (UUID)
  - ❌ Different external_ids (generated per run)
  - ❌ NULL scraper_source

### Example Duplicate Group
```
Fingerprint: 88f1ebeed269dd0c...
Event: "Privacy And Consumer Protection"
Date: 2026-01-05, Time: 13:30:00
Location: State Capitol, Room 437

Duplicates: 25 rows
IDs: b5379c0a..., a310d188..., 3cc6565d..., (22 more)
Sources: NULL, NULL, NULL, (22 more)
External IDs: c781689d..., 583f37e2..., 690cda59..., (22 more)
```

---

## 🔧 WHY CURRENT DEDUPLICATION FAILS

### Schema Review
```sql
CREATE TABLE events (
  scraper_source VARCHAR(100),    -- ❌ NULLABLE
  external_id VARCHAR(255),       -- ❌ NULLABLE
  fingerprint VARCHAR(64),        -- ❌ NULLABLE, NOT IN CONSTRAINT
  
  CONSTRAINT events_scraper_source_external_id_key 
    UNIQUE (scraper_source, external_id)  -- ❌ Allows multiple NULLs
);

CREATE INDEX idx_events_fingerprint ON events(fingerprint);  
-- ℹ️ Index exists but not used for deduplication
```

### Current Flow
```
1. generateExternalId() creates hash of event data
   → Result: "c781689dba88e91c..."

2. createFingerprint() creates hash of event data
   → Result: "88f1ebeed269dd0c..."

3. insertEvent(event, undefined)
   → scraper_source = NULL

4. SQL INSERT VALUES (NULL, "c781689d...", "88f1ebee...")
   
5. UNIQUE constraint check:
   → WHERE scraper_source = NULL AND external_id = "c781689d..."
   → No match (NULL != NULL)
   → INSERT succeeds

6. Second run with same event:
   → generateExternalId() creates DIFFERENT hash (includes timestamp)
   → Result: "583f37e29cca7640..."
   
7. SQL INSERT VALUES (NULL, "583f37e2...", "88f1ebee...")
   
8. UNIQUE constraint check:
   → WHERE scraper_source = NULL AND external_id = "583f37e2..."
   → No match (NULL != NULL)
   → INSERT succeeds again!

9. Result: 2 rows with SAME fingerprint, DIFFERENT external_ids
```

---

## 🔍 OTHER DUPLICATION SOURCES

### 1. ❌ NOT a Query Issue
**Tested**: `getTop100EventsToday()` query
```sql
SELECT e.*, ...
FROM events e
LEFT JOIN event_bills eb ON e.id = eb.event_id
LEFT JOIN event_tags et ON e.id = et.event_id
GROUP BY e.id
```
- GROUP BY e.id should prevent row multiplication
- Returns 10 events, but database HAS 25 duplicate rows
- Query is correct, database has actual duplicates

### 2. ❌ NOT a Frontend Rendering Issue
- React would need same `key` prop to render duplicates
- Event IDs are unique UUIDs
- Frontend is displaying what database returns

### 3. ❌ NOT a Scraper Loop Bug
- `scheduled-scraper.ts` correctly calls `insertEvent()` once per event
- `test-full-pipeline.ts` also calls once per event
- Issue is that EACH run creates new rows

---

## 🚨 IMPACT ASSESSMENT

### Database Integrity
- **526 events total, ~250 are duplicates (47%)**
- Actual unique events: ~276
- Data quality: SEVERE

### Frontend Impact
- Top 100 query returns same event 10+ times
- Users see events #11-14 all identical
- Pagination broken (duplicate events take slots)

### Query Performance
- JOINs process 526 rows instead of 276
- Aggregations count duplicates multiple times
- Priority scoring inflated (same event counted 25x)

---

## 📖 DATA INTEGRITY PROBLEMS

### Current Deduplication Strategy
```typescript
// netlify/functions/utils/db/events.ts

export function createFingerprint(event: LegislativeEvent): string {
  const data = `${event.name}|${event.date}|${event.location}|${event.lat}|${event.lng}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function insertEvent(event, scraperSource: string) {
  const fingerprint = createFingerprint(event);  // ✅ Generated
  const externalId = generateExternalId(event);   // ✅ Generated
  
  INSERT INTO events (..., scraper_source, external_id, fingerprint)
  VALUES (..., scraperSource, externalId, fingerprint)
  ON CONFLICT (scraper_source, external_id)      // ❌ WRONG COLUMNS
  DO UPDATE SET ...
}
```

### What SHOULD Happen
```sql
-- Option 1: Fingerprint-based deduplication
ON CONFLICT (fingerprint) 
DO UPDATE SET last_updated = NOW(), ...

-- Option 2: Multi-column with scraper (if NOT NULL)
ON CONFLICT (scraper_source, external_id) 
DO UPDATE SET ...
WHERE scraper_source IS NOT NULL
```

---

## 🎯 FIX PLAN

### Phase 1: Fix Immediate Duplication (CRITICAL)

#### 1.1 Fix test-full-pipeline.ts
**File**: `test-full-pipeline.ts:28`
```typescript
// ❌ CURRENT (WRONG)
const eventId = await insertEvent(event, scraper.name);

// ✅ FIX
const eventId = await insertEvent(event, `scraper-${scraper.config.stateCode.toLowerCase()}`);
```

#### 1.2 Verify No Other Bad Calls
**Search**: All `insertEvent()` calls
- ✅ `scheduled-scraper.ts:129` - CORRECT
- ✅ `db-maintenance.ts:69` - CORRECT
- ❌ `test-full-pipeline.ts:28` - NEEDS FIX

### Phase 2: Add Fingerprint Deduplication

#### 2.1 Change ON CONFLICT Clause
**File**: `netlify/functions/utils/db/events.ts:57`
```sql
-- ❌ CURRENT
ON CONFLICT (scraper_source, external_id) 
DO UPDATE SET
  last_updated = NOW(),
  name = EXCLUDED.name,
  ...

-- ✅ FIX (Option 1: Fingerprint only)
ON CONFLICT (fingerprint) 
DO UPDATE SET
  last_updated = NOW(),
  scraper_source = COALESCE(EXCLUDED.scraper_source, events.scraper_source),
  name = EXCLUDED.name,
  ...

-- OR

-- ✅ FIX (Option 2: Both constraints)
ON CONFLICT (scraper_source, external_id) 
DO UPDATE SET ...
RETURNING id;

-- Add separate query to handle fingerprint duplicates
INSERT INTO events (...) VALUES (...)
ON CONFLICT (fingerprint) DO NOTHING
WHERE scraper_source IS NOT NULL;
```

#### 2.2 Add UNIQUE Constraint on Fingerprint
**New Migration**: `database/migrations/002_fingerprint_deduplication.sql`
```sql
-- Add unique constraint on fingerprint
ALTER TABLE events 
ADD CONSTRAINT events_fingerprint_key 
UNIQUE (fingerprint);

-- Add NOT NULL constraint on scraper_source
ALTER TABLE events 
ALTER COLUMN scraper_source SET NOT NULL;

-- Add NOT NULL constraint on external_id
ALTER TABLE events 
ALTER COLUMN external_id SET NOT NULL;
```

**⚠️ RISK**: Will fail if duplicates exist. Must clean first.

### Phase 3: Clean Existing Duplicates

#### 3.1 Backup Current Data
```sql
-- Create backup table
CREATE TABLE events_backup_20251221 AS 
SELECT * FROM events;

-- Verify backup
SELECT COUNT(*) FROM events_backup_20251221;
-- Expected: 526 rows
```

#### 3.2 Delete Duplicate Events
**Strategy**: Keep EARLIEST inserted event, delete rest
```sql
-- Delete duplicates, keeping first occurrence per fingerprint
DELETE FROM events e1
WHERE EXISTS (
  SELECT 1 FROM events e2
  WHERE e2.fingerprint = e1.fingerprint
    AND e2.id < e1.id  -- Keep earlier ID (older event)
);

-- OR keep most recently updated
DELETE FROM events e1
WHERE EXISTS (
  SELECT 1 FROM events e2
  WHERE e2.fingerprint = e1.fingerprint
    AND e2.scraped_at > e1.scraped_at  -- Keep newest scrape
);
```

#### 3.3 Update NULL scraper_source
```sql
-- Since we can't determine original source, use generic
UPDATE events 
SET scraper_source = 'migration-unknown'
WHERE scraper_source IS NULL;
```

#### 3.4 Verify Cleanup
```sql
-- Check for remaining duplicates
SELECT fingerprint, COUNT(*) as count
FROM events
GROUP BY fingerprint
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Check for NULL sources
SELECT COUNT(*) FROM events WHERE scraper_source IS NULL;
-- Expected: 0 rows

-- Final count
SELECT COUNT(*) FROM events;
-- Expected: ~276 rows (down from 526)
```

### Phase 4: Add Monitoring

#### 4.1 Create Duplicate Detection Query
**New File**: `scripts/check-duplicates.ts`
```typescript
import { getPool } from '../netlify/functions/utils/db/connection';

async function checkDuplicates() {
  const pool = getPool();
  
  const dupes = await pool.query(`
    SELECT 
      fingerprint,
      COUNT(*) as count,
      array_agg(id) as event_ids
    FROM events
    GROUP BY fingerprint
    HAVING COUNT(*) > 1
  `);
  
  if (dupes.rows.length > 0) {
    console.error(`❌ ALERT: ${dupes.rows.length} duplicate fingerprints found!`);
    process.exit(1);
  }
  
  console.log('✅ No duplicates found');
}
```

#### 4.2 Add to CI/CD Pipeline
```yaml
# netlify.toml
[[plugins]]
package = "@netlify/plugin-nextjs"

[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"

# Add duplicate check to build
[build.environment]
  CHECK_DUPLICATES = "true"
```

---

## 📏 SIZE ESTIMATE

### Code Changes
- `test-full-pipeline.ts`: 1 line change
- `events.ts` ON CONFLICT: 5-10 lines change
- New migration SQL: 20-30 lines
- Cleanup script: 50-100 lines
- Monitoring script: 30-50 lines
- **TOTAL**: ~150 lines changed/added

### Database Changes
- Add UNIQUE constraint on fingerprint
- Update 526 NULL scraper_source values
- Delete ~250 duplicate rows
- **TOTAL**: 3 ALTER TABLE + 1 UPDATE + 1 DELETE

### Testing Requirements
1. Test insertEvent() with valid scraper_source
2. Test insertEvent() duplicate detection
3. Verify cleanup script doesn't delete wrong events
4. Test migration on backup database first
5. Verify frontend shows unique events

---

## ⚡ EXECUTION ORDER

### 1. IMMEDIATE (No DB Changes)
```bash
# Fix test-full-pipeline.ts
1. Edit test-full-pipeline.ts line 28
2. Change scraper.name → scraper.config.stateCode
3. Commit: "Fix: Use stateCode instead of undefined name"
```

### 2. PREPARE FOR CLEANUP (Backup)
```bash
# Backup database
1. Run: npx tsx scripts/backup-database.ts
2. Verify: SELECT COUNT(*) FROM events_backup_20251221
3. Expected: 526 rows
```

### 3. CLEAN DUPLICATES (Risky - Test First!)
```bash
# Run cleanup script
1. Test on backup: npx tsx scripts/cleanup-duplicates.ts --dry-run
2. Review output: Shows which events will be deleted
3. Run for real: npx tsx scripts/cleanup-duplicates.ts --execute
4. Verify: SELECT COUNT(*) FROM events (expect ~276)
```

### 4. ADD CONSTRAINTS (After Cleanup)
```bash
# Run migration
1. npx tsx run-migration.ts database/migrations/002_fingerprint_deduplication.sql
2. Verify: \d events (check constraints)
3. Test insert: Run scraper, verify no duplicates
```

### 5. UPDATE ON CONFLICT LOGIC
```bash
# Update events.ts
1. Change ON CONFLICT to use fingerprint
2. Test: Run scraper twice, verify UPDATE not INSERT
3. Commit: "Fix: Use fingerprint for deduplication"
```

### 6. ADD MONITORING
```bash
# Create monitoring script
1. Create scripts/check-duplicates.ts
2. Add to package.json: "check-dupes": "tsx scripts/check-duplicates.ts"
3. Run: npm run check-dupes
4. Expected: ✅ No duplicates found
```

---

## 🎯 SUCCESS CRITERIA

### Database
- ✅ 0 events with NULL scraper_source
- ✅ 0 duplicate fingerprints
- ✅ ~276 unique events (down from 526)
- ✅ UNIQUE constraint on fingerprint column
- ✅ NOT NULL constraint on scraper_source column

### Application
- ✅ Top 100 query returns 100 DIFFERENT events
- ✅ Frontend shows unique events (no #11-14 duplicates)
- ✅ New scraper runs don't create duplicates
- ✅ Monitoring detects any future duplicates

### Code
- ✅ All insertEvent() calls pass valid scraper_source
- ✅ ON CONFLICT uses fingerprint (or both constraints)
- ✅ test-full-pipeline.ts uses scraper.config.stateCode
- ✅ No undefined/null passed to insertEvent()

---

## ⚠️ RISKS & MITIGATIONS

### Risk 1: Deleting Wrong Events
**Mitigation**: 
- Backup entire database before cleanup
- Use dry-run mode first
- Verify fingerprints match before delete
- Keep backup for 30 days

### Risk 2: Breaking Existing References
**Mitigation**:
- Check event_bills and event_tags tables
- Cascade delete or re-link to kept event
- Verify foreign key constraints

### Risk 3: Migration Fails Mid-Way
**Mitigation**:
- Run in transaction: BEGIN; ... COMMIT/ROLLBACK;
- Test on local database first
- Have rollback script ready

### Risk 4: New Duplicates After Fix
**Mitigation**:
- Add monitoring script to CI/CD
- Run check-duplicates.ts daily
- Alert if duplicates detected
- Log all insertEvent() calls with scraper_source

---

## 📊 ESTIMATED IMPACT

### Database Size Reduction
- Before: 526 events (47% duplicates)
- After: ~276 events (0% duplicates)
- **Reduction: 250 rows (47% smaller)**

### Query Performance
- Fewer rows to scan in SELECT queries
- Faster JOINs (fewer event_bills/event_tags to join)
- Accurate aggregations (no duplicate counting)
- **Estimated**: 30-50% faster queries

### User Experience
- Top 100 shows 100 unique events
- No confusing duplicate events
- Correct event counts
- **User Satisfaction**: ⬆️⬆️⬆️

---

## 🔄 LONG-TERM RECOMMENDATIONS

### 1. Standardize Scraper Naming
```typescript
// Add to BaseScraper
export abstract class BaseScraper {
  get name(): string {
    return `scraper-${this.config.stateCode.toLowerCase()}`;
  }
}

// Usage
insertEvent(event, scraper.name);  // Now defined!
```

### 2. Add Validation Layer
```typescript
export async function insertEvent(
  event: LegislativeEvent, 
  scraperSource: string
): Promise<string> {
  // Validate inputs
  if (!scraperSource || scraperSource.trim() === '') {
    throw new Error('scraperSource is required and cannot be empty');
  }
  
  if (!event.name || !event.date) {
    throw new Error('Event must have name and date');
  }
  
  // Continue with insert...
}
```

### 3. Add Database Triggers
```sql
-- Trigger to prevent NULL scraper_source
CREATE OR REPLACE FUNCTION prevent_null_scraper_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scraper_source IS NULL THEN
    RAISE EXCEPTION 'scraper_source cannot be NULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_scraper_source
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_scraper_source();
```

### 4. Add Duplicate Alerts
```typescript
// In scheduled-scraper.ts
const dupesCheck = await pool.query(`
  SELECT fingerprint, COUNT(*) 
  FROM events 
  GROUP BY fingerprint 
  HAVING COUNT(*) > 1
`);

if (dupesCheck.rows.length > 0) {
  console.error(`❌ ALERT: ${dupesCheck.rows.length} duplicates detected!`);
  // Send alert email/webhook
}
```

---

## 📝 SUMMARY

### Root Cause
**`scraper.name` is undefined → `scraper_source = NULL` → UNIQUE constraint allows multiple NULLs → duplicates**

### Fix Steps
1. ✅ Fix `test-full-pipeline.ts` to use `scraper.config.stateCode`
2. ✅ Backup database
3. ✅ Clean duplicate events (keep earliest per fingerprint)
4. ✅ Update NULL scraper_source values
5. ✅ Add UNIQUE constraint on fingerprint
6. ✅ Change ON CONFLICT to use fingerprint
7. ✅ Add monitoring for future duplicates

### Timeline
- Investigation: COMPLETE
- Fix code: 5 minutes
- Backup: 2 minutes
- Cleanup: 10 minutes (with dry-run testing)
- Migration: 5 minutes
- Testing: 15 minutes
- **TOTAL**: ~40 minutes

### Result
- Database: 526 → 276 events (250 duplicates removed)
- Integrity: 47% duplicates → 0% duplicates
- Queries: 30-50% faster
- User Experience: ⬆️⬆️⬆️ Significant improvement

---

**End of Analysis**
