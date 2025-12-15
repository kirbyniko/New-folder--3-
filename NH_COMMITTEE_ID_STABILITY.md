# NH Committee ID Stability Analysis

## Summary
Committee IDs **should be stable** for practical purposes, but they're **not guaranteed permanent**.

## Technical Details

### What Are These IDs?
- **ID Parameter**: Database primary key (e.g., `id=1451`)
  - Integer values
  - References committee records in NH's database
  - Required to access docket pages

- **Chapter Parameter**: RSA legal citation (e.g., `chapter=19-P:1`)
  - References New Hampshire Revised Statutes Annotated
  - Permanent legal citations (don't change unless law is amended)
  - NOT sufficient alone to access docket pages

### Test Results
```
✅ ID ONLY (id=1451): Works
❌ RSA chapter ONLY (txtchapternumber=19-P:1): Fails
✅ BOTH together: Works
```

**Conclusion:** The `id` parameter is the primary key; chapter is supplementary.

## Stability Assessment

### ✅ Evidence FOR Long-Term Stability

1. **Government System Conventions**
   - Government databases rarely reorganize primary keys
   - Would break existing bookmarks and external links
   - No migration benefits to justify the disruption

2. **URL Longevity**
   - These URLs are publicly shared in:
     - Legislature documents
     - Meeting minutes
     - External websites
     - Email notifications
   - Breaking them would cause significant issues

3. **Observed Stability**
   - Committee ID `1451` (State Commission on Aging) is currently working
   - System appears mature (not a new beta system)
   - RSA chapter 19-P:1 corresponds correctly to the committee

4. **Low Change Frequency**
   - Statutory committees are established by law
   - Their IDs would only change if:
     - Database is completely rebuilt
     - Committee records are merged/split
     - System is migrated to new platform

### ❌ Risk Factors

1. **No API Guarantee**
   - No public documentation promises ID stability
   - IDs are internal database details, not public API

2. **Database-Dependent**
   - IDs are auto-increment integers
   - Not derived from stable attributes (like RSA chapters)
   - Could theoretically be reassigned

3. **No Direct Scraping**
   - Cannot automatically validate all IDs
   - Page uses JavaScript to load committee list
   - Must manually visit each event to get IDs

## Mitigation Strategy

### 1. Built-In Validation
The scraper now checks if docket pages load correctly:
```typescript
if (docketHtml.includes('Object moved') || docketHtml.includes('404')) {
  this.log('❌ Docket ID appears invalid - committee ID may have changed!');
}
```

### 2. Last Verified Dates
Each mapping includes verification date:
```typescript
// Last verified: December 2025
'STATE COMMISSION ON AGING': { id: '1451', chapter: '19-P:1' }
```

### 3. Clear Update Instructions
When IDs fail, logs show:
- Which committee failed
- What URL was attempted
- How to get the new ID manually

### 4. Monitoring Approach
- Check logs for "Docket ID appears invalid" warnings
- If found, visit event page → click "See Docket" → update ID
- Expected frequency: Rarely (years between changes, if ever)

## Comparison to Alternatives

### Option A: Hardcoded IDs (Current Approach)
- ✅ Fast and reliable
- ✅ No external dependencies
- ❌ Manual maintenance if IDs change
- **Verdict:** Best approach given constraints

### Option B: Headless Browser (Puppeteer)
- ✅ Could scrape JavaScript-loaded pages
- ❌ Slow (adds 5-10 seconds per scrape)
- ❌ Heavy resource usage
- ❌ More failure points
- **Verdict:** Overkill for this use case

### Option C: ASP.NET Form POST Simulation
- ✅ Could potentially extract IDs automatically
- ❌ Complex ViewState handling
- ❌ Fragile (breaks if form changes)
- ❌ Still requires committee name matching
- **Verdict:** More effort than manual updates

### Option D: Find Hidden API
- ✅ Would be ideal if it exists
- ❌ No evidence of public API
- ❌ JavaScript likely calls server-side code directly
- **Verdict:** Doesn't appear to exist

## Recommendation

**Use hardcoded mappings with monitoring.**

### Why This Works:
1. IDs are practically stable (government system, public URLs)
2. Changes would be rare (maybe once every few years, if ever)
3. Validation detects failures immediately
4. Update process is simple (5 minutes per committee)
5. Alternative approaches add complexity without solving the core issue

### Maintenance Plan:
- **Daily:** Automated log monitoring detects failures
- **When ID fails:** 
  1. Visit event page manually (30 seconds)
  2. Click "See Docket" (5 seconds)
  3. Copy new ID from URL (10 seconds)
  4. Update mapping in code (30 seconds)
  5. Redeploy (2 minutes)
- **Total time per fix:** ~5 minutes
- **Expected frequency:** Rarely, possibly never

### Cost-Benefit:
- **Effort to add mappings now:** 15 minutes (top 10 committees)
- **Expected maintenance over 5 years:** Maybe 0-3 updates (15 minutes total)
- **Benefit:** Bills extracted for 40+ events continuously
- **ROI:** Excellent

## Action Items

✅ **Done:**
- Added ID validation to detect failures
- Added clear logging when IDs are invalid
- Documented update process

📝 **Recommended:**
- Map top 10 committees (15 minutes)
- Monitor logs weekly for first month
- Set up alert if "Docket ID appears invalid" appears

🔮 **Future:**
- If >5 IDs change in one month, consider Puppeteer approach
- Otherwise, stick with manual updates (simpler and more reliable)

---

**Bottom Line:** Committee IDs should remain stable for years. The hardcoded approach is appropriate and maintainable.
