# New Jersey Legislature Scraper Implementation Plan

## ✅ VERIFICATION: California Scraper Status

**CONFIRMED:** California scraper IS working via **custom scraping**, NOT OpenStates fallback!

Evidence from logs:
```
✅ Custom scraper available for CA
[CACHE] ✅ Hit (from file) {
  key: 'scraper:CA:events',
  age: '734min',
  file: 'scraper-CA-events.json'
}
```

Cache file contains real scraped data:
- Revenue And Taxation Committee (Jan 12, 2026 @ 2:30 PM)
- Higher Education Committee (Jan 13, 2026 @ 1:30 PM)
- CalFresh/Nutrition Joint Hearing (Dec 17, 2025 @ 10:00 AM)
- Locations: State Capitol rooms, Alameda City Hall, etc.
- ❌ `bills: null` - No bill data (MVP approach)

**Conclusion:** CA scraper fully functional with 12+ hour cache, returning 20+ events.

---

## Target State: New Jersey

**Population:** 9.3 million (12th largest US state)  
**Current Coverage:** 11 states, 211M people (63% of US)  
**With NJ:** 12 states, 220M people (66% of US)

---

## Phase 1: Data Source Analysis

### Primary Source: NJ Legislature Committee Schedules

**Base URL:** https://www.njleg.state.nj.us/

**Data Structure:**
- **Committee List Pages:**
  - Senate: https://www.njleg.state.nj.us/committees/senate-committees
  - Assembly: https://www.njleg.state.nj.us/committees/assembly-committees
  
- **Individual Committee Schedules:**
  - Format: `https://www.njleg.state.nj.us/committees/senate-committees/schedules?committee=SBA`
  - Format: `https://www.njleg.state.nj.us/committees/assembly-committees/schedules?committee=AAP`
  - Each committee has unique code (SBA, SCM, AAP, etc.)

**Committee Examples (Senate):**
- SBA = Budget and Appropriations
- SCM = Commerce
- SED = Education
- SEN = Environment and Energy
- SHH = Health, Human Services and Senior Citizens
- SJU = Judiciary
- STR = Transportation

**Committee Examples (Assembly):**
- AAP = Appropriations
- AAG = Agriculture and Food Security
- AAH = Aging and Senioraffairs
- ABU = Budget
- AED = Education
- AEN = Environment, Natural Resources and Solid Waste
- AHE = Health
- AJU = Judiciary

### Floor Session Schedule (NOT committee meetings)
**URLs:**
- Senate: https://www.njleg.state.nj.us/session-schedules?house=S
- Assembly: https://www.njleg.state.nj.us/session-schedules?house=A

**Data Available:**
- ✅ Floor session dates (Quorum, full sessions)
- ✅ Times (e.g., "1:00 PM", "12:00 PM", "TBA")
- ✅ Locations ("Senate Chambers", "Assembly Chambers")
- ❌ NOT committee meetings - these are full chamber votes
- ❌ No bill-level detail on schedule pages

**Example Data:**
```
Tuesday, January 13, 2026 - TBA - Assembly Chambers
Monday, January 12, 2026 - TBA - Assembly Chambers (Quorum)
Thursday, January 8, 2026 - TBA - Assembly Chambers (Quorum)
Thursday, December 18, 2025 - 1:00 PM - Quorum - Assembly Chambers
```

### Bill Information System
**URL:** https://www.njleg.state.nj.us/bill-search

**Capabilities:**
- Search by bill number (S196, A642, etc.)
- Advanced search by keywords, sponsor, subject
- Bill detail pages with full text, status, votes
- **Challenge:** Need committee meeting date first, then match bills

---

## Phase 2: Scraping Strategy

### Approach 1: Committee Schedule Pages (RECOMMENDED)

**Step 1: Discover all committees**
```typescript
// Scrape committee list pages
const senateCommittees = await scrapeCommitteeLis('senate-committees');
const assemblyCommittees = await scrapeCommitteeList('assembly-committees');

// Extract committee codes from links
// Example: "SBA Schedule" link → committee code = "SBA"
// Link format: /committees/senate-committees/schedules?committee=SBA
```

**Step 2: Scrape each committee's schedule**
```typescript
async function scrapeCommitteeSchedule(
  chamber: 'senate' | 'assembly',
  committeeCode: string
): Promise<RawEvent[]> {
  const url = `https://www.njleg.state.nj.us/committees/${chamber}-committees/schedules?committee=${committeeCode}`;
  
  const html = await this.fetchPage(url);
  const $ = parseHTML(html);
  
  // Parse schedule table/list
  // Expected structure: Date, Time, Location, (Bills?)
}
```

**Step 3: Parse meeting details**
```
Expected fields:
- Date: (format TBD - need to inspect actual schedule pages)
- Time: "10:00 AM", "2:00 PM", "TBA"
- Location: Room numbers, State House locations
- Bills: (if listed on schedule - may require separate scraping)
```

**🔍 RESEARCH NEEDED:**
- What do actual committee schedule pages look like?
- Do they list upcoming meetings with dates/times?
- Do they include bill numbers/agendas?
- Are they HTML tables or calendar widgets?

### Approach 2: Legislative Calendar (ALTERNATIVE)

**URL:** https://www.njleg.state.nj.us/legislative-calendar

**Pros:**
- Centralized calendar view
- May show all committee meetings in one place
- Possibly easier to parse than individual committee pages

**Cons:**
- Unknown format (need to inspect)
- May only show floor sessions, not committees
- Could be JavaScript-heavy calendar widget (harder to scrape)

### Approach 3: OpenStates API Fallback

**If custom scraping fails:**
```typescript
// Fall back to OpenStates API
const response = await fetch(
  `https://v3.openstates.org/events?jurisdiction=ocd-jurisdiction/country:us/state:nj/government&per_page=100`,
  { headers: { 'X-API-Key': OPENSTATES_API_KEY } }
);
```

**Pros:**
- Reliable, structured data
- Already implemented in state-events.ts
- No custom HTML parsing needed

**Cons:**
- May not have all meetings
- Less control over data quality
- Dependent on OpenStates updates

---

## Phase 3: Implementation Plan (MVP)

### Step 1: Research Phase (15 minutes)
```bash
# Manually inspect committee schedule pages
curl https://www.njleg.state.nj.us/committees/senate-committees/schedules?committee=SBA
curl https://www.njleg.state.nj.us/committees/assembly-committees/schedules?committee=AAP
```

**Questions to answer:**
1. Do schedule pages exist and have upcoming meetings?
2. What's the HTML structure? (table, list, calendar widget?)
3. Are bill numbers listed?
4. What's the date format?
5. Are locations specified?

### Step 2: Scraper Implementation (30-45 minutes)

**File:** `netlify/functions/utils/scrapers/states/new-jersey.ts`

```typescript
import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface NJCommittee {
  code: string;
  name: string;
  chamber: 'Senate' | 'Assembly';
}

export class NewJerseyScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NJ',
      stateName: 'New Jersey',
      websiteUrl: 'https://www.njleg.state.nj.us/',
      reliability: 'high',
      updateFrequency: 12, // Check twice daily
      maxRequestsPerMinute: 30,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ NJ Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.njleg.state.nj.us/committees/senate-committees',
      'https://www.njleg.state.nj.us/committees/assembly-committees'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      // Step 1: Get list of all committees
      const committees = await this.discoverCommittees();
      
      // Step 2: Scrape each committee's schedule
      const events: RawEvent[] = [];
      for (const committee of committees) {
        const committeeEvents = await this.scrapeCommitteeSchedule(committee);
        events.push(...committeeEvents);
      }
      
      this.log(`✅ Scraped ${events.length} NJ events from ${committees.length} committees`);
      return events;
      
    } catch (error) {
      this.log(`❌ NJ scraper error: ${error}`);
      return [];
    }
  }

  private async discoverCommittees(): Promise<NJCommittee[]> {
    const committees: NJCommittee[] = [];
    
    // Senate committees
    const senateHtml = await this.fetchPage('https://www.njleg.state.nj.us/committees/senate-committees');
    const $senate = parseHTML(senateHtml);
    
    // Find all "Schedule" links
    $senate('a[href*="schedules?committee="]').each((_, link) => {
      const href = $senate(link).attr('href');
      const match = href?.match(/committee=([A-Z]+)/);
      if (match) {
        const code = match[1];
        const name = $senate(link).closest('div').find('h3, h4').text().trim();
        committees.push({ code, name, chamber: 'Senate' });
      }
    });
    
    // Assembly committees
    const assemblyHtml = await this.fetchPage('https://www.njleg.state.nj.us/committees/assembly-committees');
    const $assembly = parseHTML(assemblyHtml);
    
    $assembly('a[href*="schedules?committee="]').each((_, link) => {
      const href = $assembly(link).attr('href');
      const match = href?.match(/committee=([A-Z]+)/);
      if (match) {
        const code = match[1];
        const name = $assembly(link).closest('div').find('h3, h4').text().trim();
        committees.push({ code, name, chamber: 'Assembly' });
      }
    });
    
    this.log(`📋 Discovered ${committees.length} NJ committees`);
    return committees;
  }

  private async scrapeCommitteeSchedule(committee: NJCommittee): Promise<RawEvent[]> {
    const chamber = committee.chamber.toLowerCase();
    const url = `https://www.njleg.state.nj.us/committees/${chamber}-committees/schedules?committee=${committee.code}`;
    
    try {
      const html = await this.fetchPage(url);
      const $ = parseHTML(html);
      
      // TODO: Parse actual HTML structure
      // This will depend on what we find in Step 1 (Research Phase)
      
      const events: RawEvent[] = [];
      
      // PLACEHOLDER - needs real implementation after research
      // Expected: Loop through meetings, extract date/time/location
      
      return events;
      
    } catch (error) {
      this.log(`Error scraping ${committee.name}: ${error}`);
      return [];
    }
  }
}
```

### Step 3: Register Scraper (5 minutes)

**File:** `netlify/functions/utils/scrapers/index.ts`

```typescript
// Add import
import { NewJerseyScraper } from './states/new-jersey';

// Add to registration
export async function initializeScrapers(): Promise<void> {
  // ... existing registrations
  Registry.register('NJ', new NewJerseyScraper());
  
  // Log shows NJ added
  Registry.logStatus();
}
```

### Step 4: Test & Debug (15 minutes)

```bash
# Test NJ scraper directly
curl http://localhost:8888/.netlify/functions/state-events?state=NJ

# Check cache file created
ls -lh public/cache/scraper-NJ-events.json

# Verify events returned
cat public/cache/scraper-NJ-events.json | jq '.data | length'
```

---

## Phase 4: Tagging Strategy

### Committee-Based Tags
```typescript
function tagNJEvent(event: RawEvent): string[] {
  const tags = [];
  const committee = event.committee.toLowerCase();
  
  // Policy area tags
  if (committee.includes('budget') || committee.includes('appropriations')) tags.push('budget');
  if (committee.includes('education')) tags.push('education');
  if (committee.includes('health')) tags.push('healthcare');
  if (committee.includes('environment')) tags.push('environment');
  if (committee.includes('transportation')) tags.push('infrastructure');
  if (committee.includes('judiciary')) tags.push('legal');
  if (committee.includes('labor')) tags.push('labor');
  if (committee.includes('commerce')) tags.push('business');
  if (committee.includes('agriculture')) tags.push('agriculture');
  
  // Chamber tags
  if (committee.includes('senate')) tags.push('senate');
  if (committee.includes('assembly')) tags.push('assembly');
  
  return tags;
}
```

### Bill-Based Tags (FUTURE - Phase 2)
**If/when we implement bill scraping:**
```typescript
// 1. Extract bill numbers from committee schedule
const bills = extractBillNumbers(scheduleHtml); // ['S196', 'A642']

// 2. Look up each bill
for (const billNumber of bills.slice(0, 3)) {
  const billInfo = await scrapeBillDetails(billNumber);
  
  // 3. Extract tags from bill title/synopsis
  const billTags = extractTagsFromBillText(billInfo.title);
  tags.push(...billTags);
}
```

**🔍 BILL SCRAPING HINTS (for next prompt):**

1. **Bill Search Pattern:**
   - URL: `https://www.njleg.state.nj.us/bill-search`
   - Can search by bill number directly
   - Example: Search "S196" → Get bill detail page

2. **Bill Detail Page Structure:**
   - URL format: `https://www.njleg.state.nj.us/bills/<session>/S196`
   - Contains: Title, Sponsor, Synopsis, Status, Full Text
   - May have committee hearing dates/times

3. **Efficient Approach:**
   - If committee schedule lists bills → scrape bill numbers from schedule
   - Batch lookup bill details (limit to 3-5 bills per meeting to avoid slowness)
   - Cache bill descriptions with 24-hour TTL
   - Extract keywords from synopsis for enhanced tagging

4. **Alternative: Direct Bill-Committee Link:**
   - Some legislatures have "Committee Agenda" pages with bills listed
   - NJ may have `/committees/{chamber}-committees/meetings?committee={code}` endpoint
   - Could show bills scheduled for specific meeting dates

5. **Performance Consideration:**
   - Bill lookup adds 200-500ms per bill
   - For 20 meetings × 3 bills each = 60 bill lookups = 12-30 seconds
   - **Mitigation:** Cache aggressively, limit bills per meeting, run async

---

## Phase 5: Local Events (Legistar Cities in NJ)

### New Jersey Cities Using Legistar
```typescript
// From legistar-cities.ts
const NJ_CITIES = [
  { name: 'Newark', client: 'newark', lat: 40.7357, lng: -74.1724, pop: 311549 },
  { name: 'Jersey City', client: 'jerseycity', lat: 40.7178, lng: -74.0431, pop: 292449 },
  { name: 'Paterson', client: 'paterson', lat: 40.9168, lng: -74.1718, pop: 159732 },
  // ... possibly more
];
```

**Status:** Already implemented in `local-meetings.ts`
- Uses Legistar API for each city
- No additional work needed for NJ local events
- Will automatically show when user searches NJ locations

---

## Phase 6: Success Criteria

### Minimum Viable Product (MVP)
- ✅ Scrape Senate committee schedules
- ✅ Scrape Assembly committee schedules
- ✅ Extract dates, times, committee names, locations
- ✅ Apply committee-based auto-tagging
- ✅ Cache results for 24 hours
- ✅ Return 20+ upcoming committee meetings
- ✅ Display in frontend with proper formatting

### Enhanced Version (Future - Phase 2)
- ✅ Extract bill numbers from committee schedules
- ✅ Look up bill details (title, synopsis)
- ✅ Add bill-based tagging
- ✅ Cache bill info separately (24hr TTL)
- ❌ Skip full bill text (too large)

### Out of Scope (for now)
- ❌ Floor session votes/roll calls
- ❌ Bill amendment tracking
- ❌ Real-time vote monitoring
- ❌ Historical bill data

---

## Phase 7: Timeline

### MVP Implementation: 60-90 minutes
- **Research Phase:** 15 min (inspect committee schedule pages)
- **Core Scraper:** 30 min (implement meeting extraction)
- **Registration:** 5 min (add to scrapers/index.ts)
- **Testing:** 10 min (verify events returned)
- **Debugging:** 10 min (fix HTML parsing issues)
- **Polish:** 10 min (logging, error handling)

### Bill Integration (Future): +2-3 hours
- **Bill number extraction:** 30 min
- **Bill detail scraper:** 45 min
- **Caching logic:** 30 min
- **Enhanced tagging:** 20 min
- **Testing:** 30 min
- **Performance optimization:** 30 min

---

## Phase 8: Risk Assessment

### Low Risk
- ✅ NJ legislature website appears stable
- ✅ Committee structure well-defined
- ✅ Similar to other states we've implemented

### Medium Risk
- ⚠️ Committee schedule pages may use JavaScript calendar widgets
- ⚠️ Meeting dates might be PDFs instead of HTML
- ⚠️ May not have detailed agendas online

### High Risk
- ❌ If committee schedules aren't publicly available online
- ❌ If all data requires authentication/login
- ❌ If using complex AJAX/SPA that's hard to scrape

**Mitigation:** OpenStates API fallback always available if custom scraping fails

---

## Phase 9: Next Steps After NJ

### Remaining Top States by Population
1. ✅ California (39.5M) - **WORKING!**
2. ✅ Texas (30.5M)
3. ✅ Florida (22.6M)
4. ✅ New York (19.6M)
5. ✅ Pennsylvania (12.9M)
6. ✅ Illinois (12.6M)
7. ✅ Ohio (11.8M)
8. ✅ Georgia (11.0M)
9. ✅ North Carolina (10.8M)
10. ✅ Michigan (10.0M)
11. 🔄 **New Jersey (9.3M)** - **NEXT**
12. ⏳ Virginia (8.7M) - After NJ
13. ⏳ Washington (7.8M)
14. ⏳ Arizona (7.4M)
15. ⏳ Massachusetts (7.0M)

**Coverage Goal:** 15 states = 75% of US population

---

## Decision Point: Implementation Approach

### Option 1: MVP First (RECOMMENDED)
**Timeline:** 60-90 minutes

1. Research committee schedule HTML structure (15 min)
2. Implement basic meeting scraper (30 min)
3. Add committee-based tagging (10 min)
4. Register and test (20 min)

**Pros:**
- Fast delivery
- Proven pattern (worked for 11 other states)
- Low complexity
- Easy to maintain

**Cons:**
- No bill-level detail initially
- Generic event descriptions

### Option 2: Full Bill Integration (DEFER TO PHASE 2)
**Timeline:** 3-4 hours

1. Implement MVP (60 min)
2. Add bill number extraction (30 min)
3. Build bill detail scraper (45 min)
4. Implement caching (30 min)
5. Enhanced tagging (20 min)
6. Test and optimize (60 min)

**Pros:**
- More detailed information
- Better tagging accuracy
- Richer user experience

**Cons:**
- Much longer implementation
- More complex maintenance
- Slower performance (unless heavily cached)
- Higher chance of breaking

---

## Recommendation

**GO WITH OPTION 1 (MVP)**

**Reasoning:**
1. Consistent with successful pattern from other 11 states
2. User priority is WHEN/WHERE meetings happen
3. Bill details can be added later if users request
4. Speed and reliability > completeness
5. Committee names provide sufficient context for tagging

**User Experience:**
```
Event: "Senate Budget and Appropriations Committee Meeting"
Date: January 15, 2026
Time: 10:00 AM
Location: State House, Committee Room 10
Tags: #budget #appropriations #senate
```

This is sufficient for civic engagement purposes. Users can click through to legislature website for full agendas if needed.

---

## 📋 BILL SCRAPING NOTES (For Future Reference)

**When we decide to implement bill integration, consider these patterns:**

### Pattern 1: Committee Page → Bill List
Some states show bills on the committee meeting page itself:
```html
<div class="meeting">
  <h3>January 15, 2026 - 10:00 AM</h3>
  <ul class="bills">
    <li><a href="/bills/S196">S196 - Education Funding Act</a></li>
    <li><a href="/bills/A642">A642 - Property Tax Relief</a></li>
  </ul>
</div>
```

**If NJ has this:** Extract bill numbers directly from meeting page

### Pattern 2: Separate Agenda PDFs
Some states publish PDF agendas:
```html
<a href="/agendas/senate/budget/2026-01-15.pdf">Download Agenda</a>
```

**If NJ has this:** Skip bill scraping (PDF parsing too complex) OR use PDF text extraction library

### Pattern 3: Bill Detail API
Some states have bill lookup endpoints:
```
GET /api/bills/{billNumber}
Returns: { title, synopsis, status, sponsors }
```

**If NJ has this:** Use API instead of HTML scraping (much faster)

### Pattern 4: Search-Based Lookup
If no direct links, use bill search:
```
POST /bill-search
Body: { billNumber: "S196" }
→ Redirects to bill detail page
→ Scrape title/synopsis from HTML
```

**Performance Tips:**
- Cache bill details for 7 days (bills don't change frequently)
- Limit to 3-5 most important bills per meeting
- Run bill lookups in parallel (Promise.all)
- Add exponential backoff for rate limiting
- Consider using a bill details queue/batch processor

---

## Summary

**MVP Goal:** Scrape NJ Senate & Assembly committee meeting schedules, extract dates/times/locations, apply basic tagging, cache for 24 hours.

**Timeline:** 60-90 minutes

**Approach:** Custom HTML scraper → fallback to OpenStates if needed

**Next State After NJ:** Virginia (8.7M people)

**Bill Integration:** Deferred to Phase 2 based on user demand
