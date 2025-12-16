# California State Legislature Scraper Implementation Plan

## Target State
**California** - Most populous US state (39.5M people, 12% of US population)

---

## Phase 1: Data Source Analysis

### Primary Source: California Assembly Daily File
**URL:** https://www.assembly.ca.gov/dailyfile

**Data Available:**
- ✅ Committee meeting dates (format: `12/11/25`, `01/12/26`)
- ✅ Meeting times (format: `9am`, `2:30pm`, `10am`)
- ✅ Committee names (e.g., "Revenue And Taxation", "Higher Education")
- ✅ Locations (e.g., "State Capitol, Room 126", "Chula Vista City Hall 276 4th Ave")
- ❌ Bills/agenda items (NOT shown in table - need additional scraping)
- ❌ Bill descriptions (requires bill detail pages)

**Data Structure:**
```
| Date     | Time    | Committee Name                          | Location                           |
|----------|---------|----------------------------------------|-----------------------------------|
| 12/11/25 | 9am     | Joint Hearing Assembly Environmental... | Scripps Seaside Forum 8610...     |
| 12/12/25 | 2:30pm  | Joint Hearing Economic Development...   | Chula Vista City Hall 276 4th Ave |
| 01/12/26 | 2:30pm  | Revenue And Taxation                    | State Capitol, Room 126           |
```

### Secondary Source: California Senate
**URL:** https://www.senate.ca.gov/
- Need to investigate if Senate has similar daily file
- May have separate committee schedule page

### Tertiary Source: Bill Information (for agenda/descriptions)
**URL:** https://leginfo.legislature.ca.gov/
- Official legislative information system
- Can search bills by committee
- Provides bill descriptions and full text
- **Challenge:** No direct API, would need to:
  1. Extract bill numbers from meeting pages (if available)
  2. Look up each bill on leginfo.legislature.ca.gov
  3. Extract title/description

---

## Phase 2: Implementation Strategy

### Step 1: Enhanced Meeting Scraper (Daily File Table)
**Goal:** Extract all committee meetings with dates, times, locations

**Implementation:**
```typescript
// Already exists in california.ts but needs enhancement
class CaliforniaScraper extends BaseScraper {
  
  async scrapeCalendar(): Promise<RawEvent[]> {
    // 1. Fetch Assembly Daily File
    const assemblyEvents = await this.scrapeAssemblyCalendar();
    
    // 2. Fetch Senate schedule (TODO: find Senate URL)
    const senateEvents = await this.scrapeSenateCalendar();
    
    return [...assemblyEvents, ...senateEvents];
  }
  
  private async scrapeAssemblyCalendar(): Promise<RawEvent[]> {
    const html = await this.fetchPage('https://www.assembly.ca.gov/dailyfile');
    const $ = parseHTML(html);
    
    // Parse table rows
    // Current code targets: '.committee-hearing-table tbody tr.committee-hearing-details'
    // Need to verify actual HTML structure
  }
}
```

**Verification Needed:**
- Current scraper targets `.committee-hearing-table` class
- Need to inspect actual HTML to confirm selectors
- May need to update parsing logic

### Step 2: Bill/Agenda Extraction (OPTIONAL - for tags)
**Goal:** Extract bills associated with each meeting for better tagging

**Two Approaches:**

**Option A: Direct Bill Links (if available)**
```typescript
// Check if meeting detail page has bill list
async getMeetingAgenda(meetingUrl: string): Promise<string[]> {
  const html = await this.fetchPage(meetingUrl);
  const $ = parseHTML(html);
  
  // Extract bill numbers (e.g., "AB 123", "SB 456")
  const bills = [];
  $('a[href*="/bill/"]').each((_, el) => {
    const billText = $(el).text();
    const billMatch = billText.match(/(AB|SB)\s*\d+/i);
    if (billMatch) bills.push(billMatch[0]);
  });
  
  return bills;
}
```

**Option B: Committee Page Scraping**
```typescript
// Navigate to committee page, find upcoming meetings
async getCommitteeBills(committee: string): Promise<string[]> {
  // 1. Find committee page URL
  // 2. Look for "Upcoming Hearings" section
  // 3. Extract bill list for specific date
  
  // This is MORE COMPLEX and may not be worth the effort
}
```

### Step 3: Bill Description Lookup (OPTIONAL - for better event names)
**Goal:** Replace generic "Committee Hearing" with actual topics

```typescript
async getBillDescription(billNumber: string): Promise<string> {
  // leginfo.legislature.ca.gov doesn't have clean API
  // Would need to:
  // 1. Search for bill: https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml
  // 2. Navigate to bill page
  // 3. Extract title/description
  
  // ALTERNATIVE: Use bill number as tag only, skip description
}
```

---

## Phase 3: Tagging Strategy

### Automatic Tags (from meeting data)
```typescript
function tagCAEvent(event: RawEvent): string[] {
  const tags = [];
  
  // Committee-based tags
  if (event.committee.toLowerCase().includes('revenue')) tags.push('taxation');
  if (event.committee.toLowerCase().includes('education')) tags.push('education');
  if (event.committee.toLowerCase().includes('health')) tags.push('healthcare');
  if (event.committee.toLowerCase().includes('water')) tags.push('environment');
  if (event.committee.toLowerCase().includes('transportation')) tags.push('infrastructure');
  
  // Location-based tags (if outside capitol)
  if (!event.location.includes('State Capitol')) {
    tags.push('field-hearing');
  }
  
  // Chamber tags
  if (event.committee.includes('Assembly')) tags.push('assembly');
  if (event.committee.includes('Senate')) tags.push('senate');
  if (event.committee.includes('Joint')) tags.push('joint-hearing');
  
  return tags;
}
```

### Bill-Based Tags (if we implement bill scraping)
```typescript
async function enrichWithBillTags(event: RawEvent, bills: string[]): Promise<string[]> {
  const tags = event.tags || [];
  
  for (const bill of bills.slice(0, 3)) { // Limit to 3 bills to avoid slowness
    const description = await getBillDescription(bill);
    
    // Extract keywords from bill description
    if (description.toLowerCase().includes('climate')) tags.push('climate');
    if (description.toLowerCase().includes('housing')) tags.push('housing');
    if (description.toLowerCase().includes('cannabis')) tags.push('cannabis');
    // ... etc
  }
  
  return [...new Set(tags)]; // Remove duplicates
}
```

---

## Phase 4: Implementation Flow

### Recommended Approach (PRAGMATIC)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Scrape Assembly Daily File Table                       │
│  ├─ Extract: Date, Time, Committee, Location                   │
│  ├─ Create RawEvent objects                                    │
│  └─ Apply committee-based auto-tagging                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Scrape Senate Schedule (if similar format)             │
│  ├─ Find Senate equivalent of Daily File                       │
│  ├─ Parse same way as Assembly                                 │
│  └─ Merge with Assembly events                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: OPTIONAL - Bill Extraction (if links exist)            │
│  ├─ Check if meeting detail pages have bill lists              │
│  ├─ Extract bill numbers only (skip descriptions for speed)    │
│  └─ Add as metadata: event.bills = ['AB 123', 'SB 456']        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Cache & Return (24-hour TTL)                           │
│  ├─ Cache key: 'scraper:CA:events'                             │
│  ├─ TTL: 86400 seconds (24 hours)                              │
│  └─ Return events sorted by date                               │
└─────────────────────────────────────────────────────────────────┘
```

### Alternative Approach (COMPREHENSIVE but SLOW)

```
Step 1: Scrape Daily File → Extract meeting IDs
Step 2: For each meeting → Navigate to detail page → Extract bill list
Step 3: For each bill → Look up on leginfo.legislature.ca.gov → Extract description
Step 4: Apply bill-based tagging
Step 5: Cache & Return

⚠️ WARNING: This would take 10-30 seconds per page load
⚠️ REASON: Multiple HTTP requests per meeting (N meetings × M bills = lots of requests)
⚠️ RECOMMENDATION: Skip unless user explicitly requests bill details
```

---

## Phase 5: Local Events (Legistar Cities in CA)

### California Cities Using Legistar
```typescript
// From legistar-cities.ts
const CA_CITIES = [
  { name: 'Los Angeles', client: 'losangeles', lat: 34.0522, lng: -118.2437, pop: 3898747 },
  { name: 'San Diego', client: 'sandiego', lat: 32.7157, lng: -117.1611, pop: 1386932 },
  { name: 'San Jose', client: 'sanjose', lat: 37.3382, lng: -121.8863, pop: 1013240 },
  { name: 'San Francisco', client: 'sanfrancisco', lat: 37.7749, lng: -122.4194, pop: 873965 },
  { name: 'Fresno', client: 'fresno', lat: 36.7378, lng: -119.7871, pop: 542107 },
  // ... more cities
];
```

**Status:** Already implemented in `local-meetings.ts`
- Uses Legistar API for each city
- Filters by distance from search location
- No additional work needed for CA local events

---

## Phase 6: Success Criteria

### Minimum Viable Product (MVP)
- ✅ Scrape Assembly Daily File successfully
- ✅ Extract 20+ upcoming committee meetings
- ✅ Parse dates, times, committees, locations correctly
- ✅ Apply committee-based auto-tagging
- ✅ Cache results for 24 hours
- ✅ Display in frontend with proper formatting

### Enhanced Version (if time permits)
- ✅ Scrape Senate schedule
- ✅ Extract bill numbers from meeting pages (if available)
- ✅ Add bill numbers as metadata (display in event details)
- ❌ Skip bill description lookup (too slow, not worth it)

### Out of Scope (for now)
- ❌ Full bill text scraping
- ❌ Bill description lookups from leginfo.legislature.ca.gov
- ❌ Real-time bill tracking
- ❌ Vote records

---

## Phase 7: Testing Plan

### Test 1: HTML Structure Verification
```typescript
// Verify current selectors work
const html = await fetch('https://www.assembly.ca.gov/dailyfile');
const $ = cheerio.load(html);

// Test current selector
const rows = $('.committee-hearing-table tbody tr.committee-hearing-details');
console.log(`Found ${rows.length} rows with current selector`);

// If 0, investigate actual structure
$('table').each((i, table) => {
  console.log(`Table ${i}:`, $(table).attr('class'));
});
```

### Test 2: Date Parsing
```typescript
// Test date formats from Daily File
const testDates = ['12/11/25', '01/12/26', '02/30/26'];
testDates.forEach(date => {
  const parsed = parseCADate(date);
  console.log(`${date} → ${parsed.toISOString()}`);
});
```

### Test 3: End-to-End
```bash
# Run scraper manually
curl http://localhost:8888/.netlify/functions/state-events?state=CA

# Expected output: 20+ events with dates in future
# Expected cache: scraper-CA-events.json created
# Expected time: <2 seconds (first run), <100ms (cached)
```

---

## Phase 8: Next Steps After CA

### Remaining States by Population
1. **Texas** (30.5M) - Already implemented ✅
2. **Florida** (22.6M) - Already implemented ✅
3. **New York** (19.6M) - Already implemented ✅
4. **Pennsylvania** (12.9M) - Already implemented ✅
5. **Illinois** (12.6M) - Already implemented ✅
6. **Ohio** (11.8M) - Already implemented ✅
7. **Georgia** (11.0M) - Already implemented ✅
8. **North Carolina** (10.8M) - Already implemented ✅
9. **Michigan** (10.0M) - Already implemented ✅
10. **New Jersey** (9.3M) - **NEXT TARGET**
11. **Virginia** (8.7M)
12. **Washington** (7.8M)
13. **Arizona** (7.4M)
14. **Massachusetts** (7.0M)
15. **Tennessee** (7.1M)

**Coverage Status:**
- Current: 11 states (CA, TX, FL, NY, PA, IL, OH, GA, NC, MI, NH)
- Combined population: ~211M (63% of US)
- **Goal:** 15 states = 75% of US population

---

## Decision Point: Implementation Approach

### Option 1: MVP First (RECOMMENDED)
**Timeline:** 30-45 minutes
1. Update CA scraper to current HTML structure (15 min)
2. Verify scraping works (10 min)
3. Add committee-based tagging (10 min)
4. Test end-to-end (10 min)

**Pros:**
- Fast delivery
- High reliability
- Easy to maintain
- Good enough for user needs

**Cons:**
- No bill-level detail
- Generic event descriptions

### Option 2: Full Bill Integration (NOT RECOMMENDED)
**Timeline:** 3-4 hours
1. Implement MVP (45 min)
2. Add meeting detail scraping (60 min)
3. Add bill lookup system (90 min)
4. Debug and optimize (60 min)

**Pros:**
- More detailed event information
- Better tagging accuracy

**Cons:**
- Much slower performance
- Fragile (multiple scraping points)
- High maintenance burden
- May break frequently

---

## Recommendation

**GO WITH OPTION 1 (MVP)**

**Reasoning:**
1. Users care about WHEN/WHERE meetings happen, not necessarily every bill
2. Committee names provide enough context for tagging
3. Speed matters more than completeness
4. Can always add bill details later if users request it
5. Following the pattern that's worked for other 10 states

**User Experience:**
```
Event: "Revenue And Taxation Committee Meeting"
Date: January 12, 2026
Time: 2:30 PM
Location: State Capitol, Room 126
Tags: #taxation #assembly #budget
```

vs.

```
Event: "Revenue And Taxation Committee Meeting - Discussing AB 123 (Tax Reform), SB 456 (Sales Tax), AB 789 (Property Tax)"
Date: January 12, 2026
Time: 2:30 PM  
Location: State Capitol, Room 126
Tags: #taxation #assembly #budget #tax-reform #sales-tax #property-tax

⚠️ But takes 15 seconds to load instead of <1 second
```

**User will prefer the fast version.**
