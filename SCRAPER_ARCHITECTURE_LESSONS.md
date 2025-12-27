# Scraper Architecture Lessons Learned

## Critical Bug: Local Scrapers Level Field

### The Problem
**Discovered**: 2025-12-27  
**Impact**: HIGH - All local events were invisible in the data viewer

Local scrapers were not setting `level: 'local'` on their events, and the base scraper was hardcoding `level: 'state'` instead of respecting the raw event's level field. This caused:

1. All local events to be marked as state-level
2. Data viewer to show incorrect counts
3. Users unable to filter by local vs state events
4. 6 states (AK, MT, NV, VT, OK, UT, MA) had "hidden" local events

### Root Cause Analysis

**Architectural Flaw**: Two-part failure
1. **Base Scraper** (`lib/functions/utils/scrapers/base-scraper.ts` line 263):
   ```typescript
   // WRONG:
   level: 'state',
   
   // CORRECT:
   level: raw.level || 'state',
   ```

2. **Local Scrapers**: Missing `level: 'local'` in event objects:
   - `helena.ts` (Montana)
   - `las-vegas.ts` (Nevada)
   - `montpelier.ts` (Vermont)
   - `oklahoma-city.ts` (Oklahoma)
   - `salt-lake-city.ts` (Utah)
   - `boston.ts` (Massachusetts) - had `level: 'city'` instead

### Why This Wasn't Caught Earlier

1. **No Type Enforcement**: `level` field wasn't required in `RawEvent` interface
2. **Default Behavior**: Base scraper silently overwrote any level value
3. **No Validation**: No tests checking event level correctness
4. **Manual Testing**: Only tested state-level scrapers initially

### The Fix (Commit 36a4971)

1. **Base Scraper**: Changed hardcoded `level: 'state'` to `level: raw.level || 'state'`
2. **Local Scrapers**: Added `level: 'local'` to all 6 affected scrapers
3. **Juneau Fix**: Added `level: 'local'` to Juneau scraper (Alaska)

### Lessons Learned

#### 1. **Type Safety is Critical**
```typescript
// BEFORE (optional):
interface RawEvent {
  level?: 'state' | 'local';
}

// AFTER (required):
interface RawEvent {
  level: 'state' | 'local';
}
```

Make critical fields **required** with type constraints.

#### 2. **Never Hardcode Defaults That Override Data**
```typescript
// BAD:
level: 'state',  // Ignores raw.level

// GOOD:
level: raw.level || 'state',  // Respects raw.level, fallback to state
```

#### 3. **Validate at Runtime**
Add validation in base scraper:
```typescript
if (raw.level && !['state', 'local'].includes(raw.level)) {
  console.warn(`Invalid level: ${raw.level} for event ${raw.name}`);
}
```

#### 4. **Test Local Scrapers Separately**
Local scrapers have different behavior patterns:
- Different data sources (city websites vs state legislature)
- Different event types (city council vs committee hearings)
- Different level requirements

#### 5. **Architectural Smell: Silent Failures**
The bug was "silent" - scrapers worked but produced incorrect data. Better to:
- Throw errors for missing required fields
- Log warnings for suspicious values
- Validate in development mode

### Prevention Checklist

When adding a new local scraper:
- [ ] Set `level: 'local'` explicitly
- [ ] Test with base scraper transformation
- [ ] Verify in database query: `SELECT level FROM events WHERE state_code = ?`
- [ ] Check data viewer shows local vs state breakdown

When modifying base scraper:
- [ ] Never hardcode values that override raw data
- [ ] Always use fallbacks: `raw.field || defaultValue`
- [ ] Add runtime validation for enums
- [ ] Test with both state and local events

### Testing Strategy

Created `scripts/test-all-scrapers.ts` to systematically check:
- ✅ All events have `level` field
- ✅ `level` is either 'state' or 'local'
- ✅ Local scrapers produce local events
- ✅ State scrapers produce state events (or both)
- ⚠️  No events with invalid level values

### Impact

**Before Fix**:
- Alaska: 0 events visible (61 hidden)
- Montana: ? events hidden
- Nevada: ? events hidden
- Vermont: ? events hidden
- Oklahoma: ? events hidden
- Utah: ? events hidden
- Massachusetts: ? events hidden (marked as 'city')

**After Fix**:
- All local events properly marked
- Data viewer shows accurate counts
- Event filtering works correctly

### Related Issues

This same pattern could affect other fields:
- `type` (hardcoded vs from raw event)
- `state` (hardcoded vs from scraper config)
- `allowsPublicParticipation` (might be overwritten)

### Recommendations

1. **Audit all base scraper transforms** for hardcoded values
2. **Make RawEvent interface stricter** with required fields
3. **Add integration tests** that run actual scrapers
4. **Create validation layer** between scraper and database
5. **Document critical fields** in scraper development guide

### Files Changed

- `lib/functions/utils/scrapers/base-scraper.ts` - Fixed level override
- `lib/functions/utils/scrapers/local/helena.ts` - Added level: 'local'
- `lib/functions/utils/scrapers/local/las-vegas.ts` - Added level: 'local'
- `lib/functions/utils/scrapers/local/montpelier.ts` - Added level: 'local'
- `lib/functions/utils/scrapers/local/oklahoma-city.ts` - Added level: 'local'
- `lib/functions/utils/scrapers/local/salt-lake-city.ts` - Added level: 'local'
- `lib/functions/utils/scrapers/local/boston.ts` - Changed 'city' to 'local'
- `lib/functions/utils/scrapers/local/juneau.ts` - Added level: 'local'

### Next Steps

1. Run `npx tsx scripts/test-all-scrapers.ts` to verify all scrapers
2. Update RawEvent interface to make level required
3. Add validation in base scraper
4. Document local scraper requirements
5. Create scraper development checklist
