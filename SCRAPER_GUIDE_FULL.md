# State & Local Legislative Scraper Guide

**Quick reference for adding states and cities to Civitron**

Version 1.2 | December 2025

---

## Quick Start

**Time per state:** 2-4 hours (simple) | 4-8 hours (complex)
**Pattern:** State legislature + capital city (when possible)

### The Process
1. **Research** - Find calendar URLs, test for APIs
2. **Implement** - Create scraper using patterns below
3. **Test** - Verify data extraction
4. **Integrate** - Register scraper, create static JSON
5. **Local** - Add capital city if available

### When Stuck
**🚨 IMPORTANT: If you cannot find the meeting calendar URL after 10 minutes of searching, STOP and ask the user for help.** Provide what you tried and let them help locate the correct calendar page.

---

## Table of Contents

1. [Decision Tree](#decision-tree)
2. [Research Phase](#research-phase)
3. [Implementation Patterns](#implementation-patterns)
4. [Local Events (Cities)](#local-events-cities)
5. [Integration Checklist](#integration-checklist)
6. [Common Issues](#common-issues)

---

## Decision Tree

```
1. Google: "[state] legislature committee meetings"
2. Open Developer Tools (F12) → Network tab
3. Check page type:
   
   ┌─ Static HTML? (view source shows content)
   │  └─ Use Cheerio HTML parsing
   │
   ├─ JSON API? (Network tab shows /api/ or .json)
   │  ├─ No auth required? → Direct fetch
   │  └─ Auth required? → Get API key
   │
   ├─ JavaScript SPA? (React/Vue, view source empty)
   │  ├─ GraphQL/REST visible? → Use that API
   │  └─ No API found? → Use OpenStates fallback
   │
   └─ Can't find calendar after 10min?
      → STOP and ask user for calendar URL
```

---

## Research Phase

### Step 1: Find Calendar URL

**Google search patterns:**
- "[state] legislature committee meetings"
- "[state] senate house calendar"
- "[state] legislative schedule"

**Common URL patterns:**
- `/calendar` or `/meetings`
- `/committees/schedule`
- `/events` or `/hearings`

**Examples:**
- Alabama: `https://alison.legislature.state.al.us/todays-schedule?tab=0`
- South Carolina: `https://www.scstatehouse.gov/meetings.php`
- Minnesota: `https://www.leg.mn.gov/cal.aspx?type=all`
- Missouri: `https://house.mo.gov/HearingsTimeOrder.aspx`

**🚨 If stuck after 10 minutes → ASK USER:** 
"I cannot find the [State] legislative meeting calendar. I tried these URLs: [list]. Can you help locate the correct calendar page?"

### Step 2: Analyze Structure

**Open DevTools (F12) → Network tab:**

1. **Static HTML** - Use Cheerio
   - View source (Ctrl+U) shows meeting data
   - Example: Tennessee, South Carolina

2. **JSON API** - Use fetch()
   - Network shows `/api/events` or `.json` files
   - Example: Arizona ALIS, Minnesota cal_details

3. **GraphQL** - Use GraphQL client
   - Network shows `/graphql` endpoint
   - Example: Alabama (though used OpenStates instead)

4. **OpenStates Fallback** - When website too complex
   - Requires API key: `OPENSTATES_API_KEY`
   - Example: Georgia, Alabama

### Step 3: Check Bill Sources

- **Embedded?** Bills in same response
- **Separate page?** Need to follow links
- **PDF only?** Extract with regex

---

## Implementation Patterns

### Pattern 1: Static HTML (Tennessee-style)

```typescript
const response = await fetch(url);
const html = await response.text();
const $ = cheerio.load(html);

$('table.schedule tr').each((_, row) => {
  const cells = $(row).find('td');
  const time = $(cells[0]).text().trim();
  const committee = $(cells[1]).text().trim();
  // Extract data...
});
```

### Pattern 2: JSON API (Arizona-style)

```typescript
const response = await fetch(`${API_URL}?date=${date}`);
const data = await response.json();

for (const event of data) {
  const parsed = {
    name: event.title,
    date: new Date(event.start_date).toISOString(),
    location: event.location
  };
}
```

### Pattern 3: OpenStates (Georgia/Alabama-style)

```typescript
const response = await fetch(
  `https://v3.openstates.org/events?jurisdiction=${jurisdictionId}`,
  { headers: { 'X-API-KEY': process.env.OPENSTATES_API_KEY } }
);
const data = await response.json();
// Parse data.results...
```

### Pattern 4: Multi-Chamber (Missouri-style)

```typescript
async scrapeCalendar() {
  const [houseHtml, senateHtml] = await Promise.all([
    fetch(this.houseUrl).then(r => r.text()),
    fetch(this.senateUrl).then(r => r.text())
  ]);
  
  const events = [
    ...this.parseHearings(houseHtml, 'House'),
    ...this.parseHearings(senateHtml, 'Senate')
  ];
  return events;
}
```

### Required Event Fields

```typescript
{
  id: "xx-timestamp-committee-name",
  name: "Committee on Finance",
  date: "2025-12-17T15:00:00.000Z", // ISO format
  time: "10:00 AM",
  location: "Room 123",
  committee: "Committee on Finance",
  type: "committee-meeting",
  level: "state",  // REQUIRED
  state: "XX",     // REQUIRED
  city: "Capital City",
  lat: 40.7128,    // State capitol coords
  lng: -74.0060,
  zipCode: null,
  description: "State committee meeting",
  sourceUrl: "https://legislature.gov/calendar", // Actual calendar URL
  virtualMeetingUrl: "https://stream.gov/video/123",
  bills: [...] // Optional
}
```

---

## Local Events (Cities)

### Quick Check: Legistar API

```bash
# Test if city uses Legistar
curl "https://webapi.legistar.com/v1/[cityname]/events"

# Common patterns:
# - montgomery, birmingham, phoenix
# - charlottenc, jeffersoncitymo (city+state)
# - stpaul (no spaces), nyc (abbreviated)
```

**If Legistar works:** Add to `netlify/functions/utils/legistar-cities.ts`

**If not found:** Create custom city scraper

### Finding City Council Calendars

**Google search:**
- "[city] city council meetings"
- "[city] city council agenda"
- "[city] municipal calendar"

**Examples found:**
- Montgomery, AL: `https://www.montgomeryal.gov/work/advanced-components/list-detail-pages/calendar-meeting-list`
- Birmingham, AL: `https://www.birminghamal.gov/events/calendar`
- Columbia, SC: `https://www.columbiasc.gov/city-council/meetings`

**🚨 If stuck after 10 minutes → ASK USER:**
"I cannot find the [City] city council meeting calendar. I tried these URLs: [list]. Can you help locate the correct calendar page?"

### City Scraper Template

Same as state scrapers, just change:
- `stateCode: 'XX'` → City identifier
- `level: 'state'` → `level: 'local'`
- `type: 'committee-meeting'` → `type: 'city-council'`

---

## Phase 3: Implementation

### Step 1: Create the Scraper File

Create: `netlify/functions/utils/scrapers/states/[state].ts`

```typescript
import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser'; // if scraping HTML

/**
 * [State Name] Legislature Scraper
 * Source: [URL]
 * 
 * [Brief description of the state's system]
 * 
 * Data sources:
 * - [List key URLs/endpoints]
 * 
 * Notes:
 * - [Any important information]
 */
export class StateNameScraper extends BaseScraper {
  private readonly baseUrl = 'https://legislature.state.gov';
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'XX',
      stateName: 'State Name',
      websiteUrl: 'https://legislature.state.gov/calendar',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🏛️ XX Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    // Return URLs to scrape
    return ['https://legislature.state.gov/calendar'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // 1. Fetch data
      // 2. Parse structure
      // 3. Extract events
      // 4. Get additional details if needed
      // 5. Return events
      
      this.log(`Found ${events.length} events`);
      return events;
    } catch (error) {
      const message = `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }
}
```

### Step 2: Implement Based on Data Source

#### Option A: Static HTML Scraping (like Tennessee)

```typescript
private async fetchSchedule(url: string): Promise<Event[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return this.parseHTML(html);
}

private parseHTML(html: string): Event[] {
  const events: Event[] = [];
  const $ = parseHTML(html);

  // Find event containers (adjust selectors for your state)
  const rows = $('table.schedule tr').toArray();
  
  for (const row of rows) {
    const $row = $(row);
    const cells = $row.find('td').toArray();
    
    if (cells.length >= 4) {
      const time = $(cells[0]).text().trim();
      const committee = $(cells[1]).text().trim();
      const location = $(cells[2]).text().trim();
      const agendaLink = $(cells[3]).find('a').attr('href');
      
      events.push({
        time,
        committee,
        location,
        agendaUrl: agendaLink ? this.baseUrl + agendaLink : undefined
      });
    }
  }
  
  return events;
}
```

#### Option B: JSON API (like Arizona)

```typescript
private async fetchCommittees(date: string): Promise<Committee[]> {
  const url = `${this.apiBase}/committees?date=${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
```

#### Option C: Authenticated API (like Indiana)

```typescript
constructor() {
  // ... config ...
  this.apiKey = process.env.STATE_API_KEY;
  
  if (!this.apiKey) {
    this.log('⚠️  No API key found. Set STATE_API_KEY environment variable.');
  }
}

private async fetchWithAuth(url: string): Promise<any> {
  if (!this.apiKey) {
    throw new Error('API key required');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Invalid API key');
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}
```

### Step 3: Extract Bills

Bills can be in three places:

#### A) Embedded in Event Data

```typescript
// Bills are in the same API response
const bills: BillInfo[] = event.bills?.map(b => ({
  id: b.billNumber,
  title: b.title,
  url: `${this.baseUrl}/bills/${b.billNumber}`
})) || [];
```

#### B) On Separate Detail Page

```typescript
private async fetchEventBills(eventUrl: string): Promise<BillInfo[]> {
  const response = await fetch(eventUrl);
  const html = await response.text();
  const $ = parseHTML(html);
  
  const bills: BillInfo[] = [];
  $('tr:has(td)').each((_, row) => {
    const $row = $(row);
    const billNum = $row.find('td:first').text().trim();
    const title = $row.find('td:nth-child(2)').text().trim();
    
    if (/^[HS]\.?\d+$/.test(billNum)) {
      bills.push({
        id: billNum,
        title,
        url: `${this.baseUrl}/bills/${billNum}`
      });
    }
  });
  
  return bills;
}
```

#### C) In PDF Documents

```typescript
private async extractBillsFromPdf(pdfUrl: string): Promise<string[]> {
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  const text = Buffer.from(buffer).toString('utf8');
  
  // Extract bill numbers (adjust regex for your state)
  const billMatches = text.matchAll(/\b(SB|HB)\s*(\d+)\b/gi);
  const billNumbers = new Set<string>();
  
  for (const match of billMatches) {
    billNumbers.add(`${match[1].toUpperCase()}${match[2]}`);
  }
  
  return Array.from(billNumbers);
}
```

### Step 4: Extract Meeting Links

Meeting links can be:

#### A) In HTML Attributes

```typescript
const videoLink = $('a[href*="video"]').attr('href');
const streamUrl = videoLink ? this.normalizeUrl(videoLink) : undefined;
```

#### B) In PDF Metadata

```typescript
private async extractMeetingLinkFromPdf(pdfUrl: string): Promise<string | null> {
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  const text = Buffer.from(buffer).toString('utf8');
  
  // Look for URLs in PDF metadata
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  return urlMatch ? urlMatch[0] : null;
}
```

#### C) Constructed from Data

```typescript
// Some states have predictable URL patterns
const meetingUrl = `${this.baseUrl}/video/${committee.id}/${date}`;
```

### Step 5: Convert to Standard Format

```typescript
private async convertToRawEvent(eventData: any): Promise<RawEvent | null> {
  try {
    // Parse date
    const eventDate = new Date(eventData.date);
    
    // Parse time if available
    if (eventData.time) {
      const timeMatch = eventData.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        eventDate.setHours(hours, minutes, 0, 0);
      }
    }

    // Fetch bills if needed
    let bills: BillInfo[] = [];
    if (eventData.agendaUrl) {
      bills = await this.fetchEventBills(eventData.agendaUrl);
    }

    return {
      name: eventData.committee,
      date: eventDate.toISOString(),
      time: eventData.time || 'TBD',
      location: eventData.location || 'State House',
      committee: eventData.committee,
      description: `${eventData.chamber || 'State'} committee meeting`,
      sourceUrl: eventData.agendaUrl,
      virtualMeetingUrl: eventData.videoUrl,
      bills: bills.length > 0 ? bills : undefined
    };
  } catch (error) {
    this.log(`Error converting event: ${error instanceof Error ? error.message : 'Unknown'}`);
    return null;
  }
}
```

### Step 6: Add Error Handling

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  try {
    const events: RawEvent[] = [];
    
    // Fetch multiple sources with error handling
    const sources = ['senate', 'house', 'joint'];
    
    for (const source of sources) {
      try {
        const sourceEvents = await this.fetchSource(source);
        events.push(...sourceEvents);
      } catch (error) {
        this.log(`Error fetching ${source}: ${error instanceof Error ? error.message : 'Unknown'}`);
        // Continue with other sources
      }
    }

    this.log(`Found ${events.length} total events`);
    return events;
  } catch (error) {
    const message = `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown'}`;
    this.log(message);
    throw new Error(message);
  }
}
```

---

## Phase 4: Testing

### Step 1: Create Test Script

Create: `test-[state]-scraper.cjs`

```javascript
const fs = require('fs');

async function testScraper() {
  console.log('Testing [State] Scraper...\n');
  
  // Your test code here
  // Simpler version of your scraper for quick testing
  
  const url = 'https://legislature.state.gov/calendar';
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  
  const html = await response.text();
  console.log('Fetched page, length:', html.length);
  
  // Test parsing
  const eventMatch = html.match(/committee-name-pattern/gi);
  console.log('Found events:', eventMatch ? eventMatch.length : 0);
  
  if (eventMatch) {
    console.log('First event:', eventMatch[0]);
  }
}

testScraper().catch(console.error);
```

### Step 2: Run Test

```bash
node test-[state]-scraper.cjs
```

### Step 3: Verify Output

Check that you're getting:
- ✅ Correct number of events
- ✅ Committee names extracted
- ✅ Dates and times parsed correctly
- ✅ Bills associated with events
- ✅ Meeting links when available

### Step 4: Test Edge Cases

Test with:
- Days with no events
- Past events
- Cancelled events
- Events with no bills
- Events with many bills (50+)

### Step 5: Build and Compile

```bash
npm run build
```

Fix any TypeScript errors.

---

## Phase 5: Integration

### Step 1: Register the Scraper

Edit `netlify/functions/utils/scrapers/index.ts`:

```typescript
// Add import
import { StateNameScraper } from './states/statename';

// In initializeScrapers():
Registry.register('XX', new StateNameScraper());
```

### Step 2: Add to State Events Handler

Edit `netlify/functions/state-events.ts`:

```typescript
// Add to static file loading check
if (stateAbbr === 'VA' || stateAbbr === 'AZ' || /* ... */ || stateAbbr === 'XX') {
  const stateNames: Record<string, string> = { 
    // ...
    'XX': 'State Name'
  };
  const fileNames: Record<string, string> = { 
    // ...
    'XX': 'statename-events.json'
  };
```

### Step 3: Generate Static JSON

Run your scraper and save output:

```javascript
// In test script:
const result = {
  events: events,
  count: events.length,
  billsCount: events.reduce((sum, e) => sum + (e.bills?.length || 0), 0),
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync('public/data/statename-events.json', JSON.stringify(result, null, 2));
```

### Step 4: Create Static JSON File

Create: `public/data/statename-events.json`

```json
{
  "events": [
    {
      "id": "xx-committee-name-2025-12-17",
      "name": "Committee on Finance",
      "date": "2025-12-17T15:00:00.000Z",
      "time": "10:00 AM",
      "location": "Room 123",
      "committee": "Committee on Finance",
      "type": "committee-meeting",
      "level": "state",
      "state": "XX",
      "city": "Capital City",
      "lat": 40.7128,
      "lng": -74.0060,
      "zipCode": null,
      "description": "State committee meeting",
      "sourceUrl": "https://legislature.state.gov/agenda.pdf",
      "virtualMeetingUrl": "https://legislature.state.gov/video/123",
      "bills": [
        {
          "id": "HB 1234",
          "title": "An Act relating to...",
          "url": "https://legislature.state.gov/bills/HB1234"
        }
      ]
    }
  ],
  "count": 1,
  "billsCount": 1,
  "lastUpdated": "2025-12-17T00:00:00.000Z"
}
```

### Step 5: Test Integration

1. Build the project: `npm run build`
2. Start the server: `npm run dev`
3. Visit: `http://localhost:3000/`
4. Check that state events appear

### Step 6: Clean Up

Remove test files:
```bash
rm test-[state]-scraper.cjs
rm temp-*.html
rm temp-*.pdf
```

---

## Common Patterns

### Pattern 1: Multi-Chamber Scraping

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const allEvents: RawEvent[] = [];
  
  // Fetch from multiple chambers
  const chambers = ['senate', 'house', 'joint'];
  
  for (const chamber of chambers) {
    const url = `${this.baseUrl}/${chamber}/schedule`;
    const events = await this.fetchChamber(url, chamber);
    allEvents.push(...events);
  }
  
  return allEvents;
}
```

### Pattern 2: Date Range Iteration

```typescript
private getDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(this.formatDate(date));
  }
  
  return dates;
}

async scrapeCalendar(): Promise<RawEvent[]> {
  const allEvents: RawEvent[] = [];
  const dates = this.getDateRange(14); // Next 2 weeks
  
  for (const date of dates) {
    const dayEvents = await this.fetchDay(date);
    allEvents.push(...dayEvents);
  }
  
  return allEvents;
}
```

### Pattern 3: Pagination Handling

```typescript
private async fetchAllPages(baseUrl: string): Promise<any[]> {
  const allData: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const url = `${baseUrl}?page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      allData.push(...data);
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return allData;
}
```

### Pattern 4: Retry Logic

```typescript
private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.ok) {
        return response;
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      this.log(`Retry ${i + 1}/${maxRetries}: ${lastError.message}`);
      
      // Wait before retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed');
}
```

### Pattern 5: URL Normalization

```typescript
private normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  if (url.startsWith('/')) {
    return `${this.baseUrl}${url}`;
  }
  return `${this.baseUrl}/${url}`;
}
```

### Pattern 6: Dual-Chamber Unified Parsing

When House and Senate use the same HTML structure, create reusable parsing functions:

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const allEvents: RawEvent[] = [];
  
  // Fetch both chambers
  const houseHtml = await this.fetchHouse();
  const senateHtml = await this.fetchSenate();
  
  // Use same parser for both
  allEvents.push(...this.parseHearings(houseHtml, 'House'));
  allEvents.push(...this.parseHearings(senateHtml, 'Senate'));
  
  return allEvents;
}

private parseHearings(html: string, chamber: string): RawEvent[] {
  const events: RawEvent[] = [];
  const $ = cheerio.load(html);
  
  // Both chambers use same table structure
  $('table[border="0"]').each((_, table) => {
    const $table = $(table);
    const committee = $table.find('th:contains("Committee:")').next().text();
    const date = $table.find('th:contains("Date:")').next().text();
    const time = $table.find('th:contains("Time:")').next().text();
    const location = $table.find('th:contains("Location:")').next().text();
    
    events.push({
      name: committee,
      date,
      time,
      location,
      chamber,
      // ... other fields
    });
  });
  
  return events;
}
```

### Pattern 7: ASP.NET Alternative Views

ASP.NET sites often have "modern" complex views and "traditional" simpler views:

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  // Try traditional view first (cleaner HTML)
  const traditionalUrl = 'https://house.mo.gov/HearingsTimeOrder.aspx';
  
  // Instead of complex ASP.NET ViewState page:
  // const complexUrl = 'https://house.mo.gov/AllHearings.aspx';
  
  const response = await fetch(traditionalUrl);
  const html = await response.text();
  
  // Traditional view has clean table structure
  // No need to deal with ViewState, postback, etc.
  return this.parseHearings(html);
}
```

**When to look for alternatives:**
- Page contains `__VIEWSTATE` and complex JavaScript
- HTML is heavily obfuscated or uses data attributes
- Page requires postbacks or form submissions
- Look for links like "Traditional View", "Classic View", "Time Order", "Simple View"

### Pattern 8: Flexible Time Handling

Legislative schedules often include conditional timing:

```typescript
private parseTime(timeStr: string): { time: string, originalText: string } {
  // Preserve full text for context
  const originalText = timeStr.trim();
  
  // Extract primary time
  const timeMatch = timeStr.match(/(\d+:\d+\s*[AP]M)/i);
  const time = timeMatch ? timeMatch[1] : 'TBD';
  
  return { time, originalText };
}

// Usage:
const { time, originalText } = this.parseTime('4:30 PM or upon adjournment');
event.time = time; // "4:30 PM"
event.description = `Meeting at ${originalText}`; // Full context
```

**Common patterns:**
- "4:30 PM or upon adjournment"
- "Upon adjournment (whichever is later)"
- "Immediately following floor session"
- "30 minutes after session convenes"

### Pattern 9: Graceful Empty State Handling

Check for "no data" messages before parsing:

```typescript
private async fetchSenate(): Promise<RawEvent[]> {
  const response = await fetch(this.senateUrl);
  const html = await response.text();
  
  // Check for empty state messages
  if (html.toLowerCase().includes('no hearings scheduled') ||
      html.toLowerCase().includes('no meetings scheduled') ||
      html.toLowerCase().includes('none scheduled')) {
    this.log('No Senate hearings found');
    return [];
  }
  
  return this.parseHearings(html, 'Senate');
}
```

---

## Troubleshooting

### Problem: No Events Found

**Possible Causes:**
1. Wrong URL or endpoint
2. Incorrect HTML selectors
3. JavaScript-rendered content
4. Authentication required
5. No events scheduled

**Solutions:**
```typescript
// Add detailed logging
this.log(`Fetching from: ${url}`);
this.log(`Response status: ${response.status}`);
this.log(`Content length: ${html.length}`);
this.log(`Found elements: ${elements.length}`);

// Save response for inspection
fs.writeFileSync('debug-response.html', html);
```

### Problem: HTML Parsing Fails

**Possible Causes:**
1. Incorrect selectors
2. Dynamic content
3. Nested structures

**Solutions:**
```typescript
// Test selectors in browser console
// document.querySelectorAll('your.selector')

// Try more flexible selectors
const rows = $('tr').filter((_, el) => {
  return $(el).text().includes('Committee');
}).toArray();

// Use multiple fallback selectors
const committee = 
  $row.find('.committee-name').text() ||
  $row.find('td:nth-child(2)').text() ||
  $row.find('strong').first().text();
```

### Problem: Date Parsing Issues

**Solution:**
```typescript
private parseDate(dateStr: string): Date {
  // Try multiple formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\w+)\s+(\d+),\s+(\d{4})/   // Month DD, YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      // Parse based on which format matched
      return this.parseMatchedDate(match);
    }
  }
  
  // Fallback to native Date parser
  return new Date(dateStr);
}
```

### Problem: Bills Not Extracted

**Check:**
1. Are bills on the same page or separate?
2. Is the bill format correctly identified?
3. Are there actually bills for this event?

**Debug:**
```typescript
this.log(`Looking for bills in: ${eventUrl}`);
this.log(`Bill format regex: ${billRegex}`);
this.log(`Found matches: ${matches.length}`);

// Test regex in isolation
const testBills = ['HB 1234', 'SB 567', 'H.R. 890'];
testBills.forEach(bill => {
  this.log(`${bill} matches: ${billRegex.test(bill)}`);
});
```

### Problem: Too Many/Too Few Events

**Solutions:**
```typescript
// Add filtering
if (event.status === 'Cancelled' || event.status === 'Completed') {
  continue; // Skip
}

// Add date filtering
const eventDate = new Date(event.date);
const today = new Date();
if (eventDate < today) {
  continue; // Skip past events
}

// Add type filtering
if (event.type === 'Floor Session') {
  continue; // Skip floor sessions, only want committees
}
```

### Problem: Rate Limiting

**Solution:**
```typescript
// Add delays between requests
private async delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async scrapeCalendar(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  
  for (const date of dates) {
    const dayEvents = await this.fetchDay(date);
    events.push(...dayEvents);
    
    // Wait between requests
    await this.delay(this.config.requestDelay);
  }
  
  return events;
}
```

---

## Real Examples

### Example 1: Tennessee (HTML Tables)

**Challenge:** Parse HTML tables with committee meetings

**Solution:**
```typescript
private parseScheduleHTML(html: string): Event[] {
  const events: Event[] = [];
  const $ = parseHTML(html);

  // Find all tables
  const tables = $('table.date-table').toArray();
  
  for (const table of tables) {
    const $table = $(table);
    
    // Skip header row
    const rows = $table.find('tr').toArray().slice(1);
    
    for (const row of rows) {
      const $row = $(row);
      const cells = $row.find('td').toArray();
      
      if (cells.length < 6) continue;

      const time = $(cells[0]).text().trim();
      const committee = $(cells[2]).text().trim();
      const location = $(cells[4]).text().trim();
      
      // Extract PDF link
      const pdfLink = $(cells[3]).find('a[href*=".pdf"]').attr('href');
      
      // Extract video link
      const videoLink = $(cells[5]).find('a[href*="videowrapper"]').attr('href');

      events.push({
        time,
        committee,
        location,
        pdfUrl: pdfLink ? `https://capitol.tn.gov${pdfLink}` : undefined,
        videoUrl: videoLink ? `https://wapp.capitol.tn.gov${videoLink}` : undefined
      });
    }
  }

  return events;
}
```

**Key Lessons:**
- Always skip header rows
- Check cell count before accessing
- Extract links from nested elements
- Normalize relative URLs to absolute

### Example 2: Arizona (JSON API with PDFs)

**Challenge:** Fetch JSON data, download PDFs to extract meeting links

**Solution:**
```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  
  // 1. Fetch JSON agendas
  const [houseAgendas, senateAgendas] = await Promise.all([
    this.fetchAgendas('H', start, end),
    this.fetchAgendas('S', start, end)
  ]);

  const allAgendas = [...houseAgendas, ...senateAgendas];
  
  // 2. Process each agenda
  for (const agenda of allAgendas) {
    if (agenda.cancelled === 1) continue;
    
    const event = await this.convertAgendaToEvent(agenda);
    if (event) events.push(event);
  }

  return events;
}

private async convertAgendaToEvent(agenda: any): Promise<RawEvent | null> {
  // Parse date/time
  const [datePart, timePart] = agenda.start.split(' ');
  const date = new Date(datePart);
  
  // Download PDF and extract meeting URL
  let meetingUrl: string | null = null;
  if (agenda.PDFFile) {
    const pdfUrl = `${this.baseUrl}${agenda.PDFFile}`;
    meetingUrl = await this.extractMeetingLinkFromPdf(pdfUrl);
  }
  
  return {
    name: agenda.longtitle,
    date: date.toISOString(),
    time: agenda.time,
    location: agenda.location,
    committee: agenda.longtitle,
    description: 'Committee meeting',
    sourceUrl: pdfUrl,
    virtualMeetingUrl: meetingUrl || undefined
  };
}
```

**Key Lessons:**
- Use Promise.all for parallel fetching
- Skip cancelled events early
- PDFs can contain valuable metadata
- Null-check before accessing properties

### Example 3: Massachusetts (Calendar Scraping)

**Challenge:** Scrape monthly calendar pages, visit detail pages for bills

**Solution:**
```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  
  // 1. Get 3 months of calendar URLs
  const urls = this.getCalendarUrls(3);
  
  // 2. Fetch each month
  for (const url of urls) {
    const monthEvents = await this.fetchCalendarPage(url);
    events.push(...monthEvents);
  }
  
  // 3. Visit detail pages for bills
  for (const event of events) {
    if (event.status === 'Confirmed' || event.status === 'Underway') {
      const { bills } = await this.fetchEventDetails(event.detailUrl);
      event.bills = bills;
    }
  }

  return events;
}

private async fetchEventDetails(url: string): Promise<{ bills: BillInfo[] }> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = parseHTML(html);

  const bills: BillInfo[] = [];
  
  // Bills are in table rows
  $('tr:has(td)').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();
    
    if (cells.length >= 2) {
      const billNum = $(cells[0]).text().trim();
      const title = $(cells[1]).text().trim();
      
      // Validate bill format
      if (/^[HS]\.\d+$/.test(billNum)) {
        bills.push({
          id: billNum,
          title,
          url: `https://malegislature.gov/Bills/194/${billNum}`
        });
      }
    }
  });

  return { bills };
}
```

**Key Lessons:**
- Fetch multiple months for comprehensive data
- Two-stage scraping: list then details
- Validate data format before including
- Filter by event status

### Example 4: Indiana (Authenticated API)

**Challenge:** Use REST API with authentication

**Solution:**
```typescript
constructor() {
  super(config);
  this.apiKey = process.env.INDIANA_API_KEY;
  
  if (!this.apiKey) {
    this.log('⚠️  No API key. Set INDIANA_API_KEY environment variable.');
  }
}

async scrapeCalendar(): Promise<RawEvent[]> {
  if (!this.apiKey) {
    throw new Error('API key required');
  }

  const events: RawEvent[] = [];
  const dates = this.getUpcomingDates(14);
  
  for (const date of dates) {
    const dailyEvents = await this.fetchDailyCommittees(date);
    events.push(...dailyEvents);
  }

  return events;
}

private async fetchDailyCommittees(date: string): Promise<RawEvent[]> {
  const url = `${this.apiBase}/2026/committees?date=${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': `iga-api-client-${this.apiKey}`,
      'x-api-key': this.apiKey!,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Invalid API key');
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return this.parseCommittees(data, date);
}
```

**Key Lessons:**
- Check for API key in constructor
- Provide clear error messages
- Include all required headers
- Handle authentication errors gracefully

### Example 5: Missouri (Dual-Chamber Tables)

**Challenge:** Scrape both House and Senate with ASP.NET pages, unified table parsing

**Website Research:**
- House: https://house.mo.gov/HearingsTimeOrder.aspx
- Senate: https://www.senate.mo.gov/hearingsschedule/hrings.htm
- Both use clean HTML tables with `<th>` labels and `<td>` values

**Discovery:** House has two views:
- AllHearings.aspx (complex ASP.NET ViewState)
- HearingsTimeOrder.aspx (traditional view with simple tables) ✅ Use this!

**Solution:**
```typescript
export class MissouriScraper extends BaseScraper {
  private houseUrl = 'https://house.mo.gov/HearingsTimeOrder.aspx';
  private senateUrl = 'https://www.senate.mo.gov/hearingsschedule/hrings.htm';

  async scrapeCalendar(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    
    // Fetch both chambers in parallel
    const [houseHtml, senateHtml] = await Promise.all([
      this.fetchHouseHearings(),
      this.fetchSenateHearings()
    ]);
    
    // Parse both with shared logic
    events.push(...this.parseHouseHearings(houseHtml));
    events.push(...this.parseSenateHearings(senateHtml));
    
    return events;
  }

  private async fetchHouseHearings(): Promise<string> {
    const response = await fetch(this.houseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`House HTTP ${response.status}`);
    }
    
    return response.text();
  }

  private parseHouseHearings(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    const $ = cheerio.load(html);
    
    // Find all hearing tables (border="0" width="100%")
    $('table[border="0"][width="100%"]').each((_, table) => {
      const $table = $(table);
      
      // Extract data from <th>/<td> pairs
      const committee = $table
        .find('th:contains("Committee:")')
        .next('td')
        .find('a')
        .text()
        .trim();
      
      const dateText = $table
        .find('th:contains("Hearing Date")')
        .parent()
        .text()
        .replace('Hearing Date', '')
        .trim();
      
      const time = $table
        .find('th:contains("Time:")')
        .next('td')
        .text()
        .trim();
      
      const location = $table
        .find('th:contains("Location:")')
        .next('td')
        .text()
        .trim();
      
      const note = $table
        .find('th:contains("Note:")')
        .next('td')
        .text()
        .trim();
      
      if (!committee || !dateText) return;
      
      // Parse date: "Wednesday, January 14, 2026"
      const date = new Date(dateText);
      
      // Handle conditional timing: "4:30 PM or upon adjournment"
      const timeMatch = time.match(/(\d+:\d+\s*[AP]M)/i);
      const primaryTime = timeMatch ? timeMatch[1] : 'TBD';
      
      events.push({
        name: committee,
        date: date.toISOString(),
        time: primaryTime,
        location: location || 'State Capitol',
        committee,
        type: 'committee-meeting',
        level: 'state',
        state: 'MO',
        city: 'Jefferson City',
        lat: 38.5767,
        lng: -92.1735,
        description: note || 'House committee hearing',
        sourceUrl: this.houseUrl,
        bills: [] // Bills could be extracted from note field
      });
    });
    
    return events;
  }

  private async fetchSenateHearings(): Promise<string> {
    const response = await fetch(this.senateUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Senate HTTP ${response.status}`);
    }
    
    return response.text();
  }

  private parseSenateHearings(html: string): RawEvent[] {
    // Check for empty state
    if (html.toLowerCase().includes('no hearings scheduled')) {
      this.log('No Senate hearings scheduled');
      return [];
    }
    
    // Use same table parsing logic as House
    // Senate uses identical structure
    return this.parseHouseHearings(html);
  }
}
```

**Key Lessons:**
- **Look for alternative views** on ASP.NET sites - often there's a "traditional" or "time order" view with cleaner HTML
- **Avoid ViewState complexity** - if you see `__VIEWSTATE` and postback mechanisms, search for simpler alternatives
- **Dual-chamber unified parsing** - when both chambers use identical HTML structure, create shared parsing methods
- **Flexible time handling** - legislative schedules often include "or upon adjournment" - extract primary time but preserve full context
- **Graceful empty states** - check for "no hearings scheduled" messages before attempting to parse
- **Parallel fetching** - use `Promise.all()` to fetch both chambers simultaneously for better performance

**HTML Structure Pattern:**
```html
<table border="0" width="100%">
  <tr>
    <th scope="row">Committee:</th>
    <td><a href="...">Corrections and Public Institutions</a></td>
  </tr>
  <tr>
    <th scope="row">Hearing Date</th>
    <td>Wednesday, January 14, 2026</td>
  </tr>
  <tr>
    <th scope="row">Time:</th>
    <td>4:30 PM or upon adjournment (whichever is later)</td>
  </tr>
  <tr>
    <th scope="row">Location:</th>
    <td>House Hearing Room 6</td>
  </tr>
  <tr>
    <th scope="row">Note:</th>
    <td>Informational discussion on Department staffing</td>
  </tr>
</table>
```

**Testing Results:**
- ✅ Generated `missouri-events.json` with 1 House hearing
- ✅ Extracted all fields: committee, date, time, location, note
- ✅ Handled "or upon adjournment" timing gracefully
- ✅ Senate correctly returned empty array (no hearings scheduled)

---

## Checklist: Is Your Scraper Complete?

Before submitting, verify:

### Functionality
- [ ] Fetches events from all relevant sources (Senate/House/Joint)
- [ ] Parses dates and times correctly
- [ ] Extracts committee names
- [ ] Gets location information
- [ ] Finds associated bills (if available)
- [ ] Includes meeting links (video/PDF)
- [ ] Handles errors gracefully
- [ ] Logs useful debugging information

### Code Quality
- [ ] Follows TypeScript best practices
- [ ] Includes JSDoc comments
- [ ] Has proper error handling
- [ ] Uses appropriate rate limiting
- [ ] No hardcoded sensitive data
- [ ] Clean, readable code

### Integration
- [ ] Registered in scraper registry
- [ ] Added to state-events handler
- [ ] Static JSON file created
- [ ] Builds without errors
- [ ] Test script created and verified

### Documentation
- [ ] Source URLs documented
- [ ] Special requirements noted (API keys, etc.)
- [ ] Known limitations listed
- [ ] Update frequency documented

---

## Next Steps

After completing a scraper:

1. **Test Thoroughly**
   - Run during different times of day
   - Test with various date ranges
   - Verify on actual legislature schedule

2. **Monitor Performance**
   - Check response times
   - Monitor error rates
   - Watch for rate limiting

3. **Create Documentation**
   - Add to SCRAPERS_API_SETUP.md if API required
   - Document any special setup
   - Note maintenance considerations

4. **Set Up Automation**
   - Schedule regular runs
   - Implement caching strategy
   - Set up error notifications

5. **Maintain**
   - Monitor for website changes
   - Update selectors as needed
   - Respond to user feedback

---

## Quick Reference

### Common Selectors

```typescript
// Tables
$('table.schedule tr')
$('tbody tr:not(:first-child)')

// Links
$('a[href*="agenda"]')
$('a:contains("Committee")')

// Text content
$('.committee-name').text().trim()
$('td:nth-child(2)').text()

// Attributes
$('a').attr('href')
$('div').data('event-id')
```

### Date Parsing

```typescript
// ISO format
new Date('2025-12-17')

// Custom parsing
const [year, month, day] = dateStr.split('-').map(Number);
new Date(year, month - 1, day)

// Time parsing
const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
let hours = parseInt(match[1]);
if (match[3] === 'PM' && hours !== 12) hours += 12;
```

### URL Patterns

```typescript
// Relative to absolute
url.startsWith('http') ? url : `${this.baseUrl}${url}`

// Query parameters
`${url}?date=${date}&chamber=${chamber}`

// Path construction
`${this.baseUrl}/${chamber}/committees/${id}`
```

### Error Handling

```typescript
try {
  // risky operation
} catch (error) {
  this.log(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  return []; // or throw
}
```

---

## Glossary

- **BaseScraper**: Parent class all scrapers extend
- **RawEvent**: Standard event format scrapers return
- **BillInfo**: Standard bill information format
- **parseHTML**: Cheerio-based HTML parser
- **ScraperConfig**: Configuration object for scrapers
- **Static JSON**: Pre-scraped data cached on disk
- **OpenStates**: Fallback API for state legislative data

---

## Additional Resources

- **Cheerio Documentation**: https://cheerio.js.org/
- **Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **OpenStates API**: https://docs.openstates.org/api-v3/
- **Web Scraping Ethics**: Follow robots.txt, respect rate limits

---

## Version History

- **v1.2** (Dec 2025) - Added Part 4: Local Events Scraping (city councils, Legistar integration, custom city scrapers, state + local coverage pattern)
- **v1.1** (Dec 2025) - Added Missouri example, dual-chamber patterns, ASP.NET alternative views, flexible time handling
- **v1.0** (Dec 2025) - Initial guide based on AZ, TN, MA, IN implementations

---

**Remember:** Every state is different. Use this guide as a framework, but adapt to each state's unique structure. When in doubt, examine working examples and ask questions!

**Happy Scraping! 🎉**

---

# Part 4: Local Events Scraping (City Council Meetings)

## Why Local Events Matter

After implementing state legislature scrapers, the next tier is local city council meetings. These provide comprehensive civic engagement coverage by including:

- City council committee meetings
- Municipal board hearings
- Local legislative sessions
- Public hearings and community input opportunities

**Key Principle:** For each state you scrape, also scrape the state capital and/or most populous cities to provide complete legislative coverage (state + local).

---

## Local Events Architecture

### How the Local Events System Works

The current system uses the **Legistar API** as the primary data source:

1. **Database**: `netlify/functions/utils/legistar-cities.ts` contains 52 major US cities
2. **Endpoint**: `/.netlify/functions/local-meetings` fetches meetings near a location
3. **API Format**: `https://webapi.legistar.com/v1/{client}/events`
4. **Geographic Query**: Find cities within radius of coordinates
5. **Event Filtering**: Return upcoming events (next 90 days), max 10 per city

**Example Query:**
```
GET /.netlify/functions/local-meetings?lat=34.0007&lng=-81.0348&radius=50
```

**Current Coverage:**
- ✅ 52 cities across 27 states
- ❌ No coverage for 23+ states (including SC, SD, WY, ID, MT, VT, WV, etc.)

---

## Approach 1: Adding Legistar Cities

### Step 1: Test If City Uses Legistar

Many cities use Legistar's meeting management platform. Test if a city is available:

```bash
# Test if city is on Legistar
curl "https://webapi.legistar.com/v1/columbia/events"
```

**Successful Response (200 OK):**
```json
[
  {
    "EventId": 12345,
    "EventGuid": "abc123...",
    "EventLastModifiedUtc": "2025-12-17T10:00:00Z",
    "EventBodyName": "City Council",
    "EventDate": "2025-12-18T18:00:00",
    "EventTime": "6:00 PM",
    "EventLocation": "City Hall",
    "EventAgendaFile": "https://...",
    "EventMinutesFile": null
  }
]
```

**Not Found (404 or empty):**
```
City not on Legistar - need custom scraper
```

### Step 2: Find the Client Name

The client name in the URL is usually:
- Lowercase city name: `columbia`, `atlanta`, `phoenix`
- City + state: `charlottenc`, `jeffersoncitymo`
- Sometimes abbreviated: `nyc`, `la`, `chi`

**How to find it:**
1. Visit the city's website
2. Find the "Meetings" or "City Council" page
3. Look for Legistar-powered pages (URL contains `legistar.com`)
4. Extract client name from URL: `https://{client}.legistar.com/`

**Example:** Charlotte, NC
```
Website: https://charlottenc.legistar.com/
Client name: "charlottenc"
API endpoint: https://webapi.legistar.com/v1/charlottenc/events
```

### Step 3: Add to Database

Edit `netlify/functions/utils/legistar-cities.ts`:

```typescript
export const LEGISTAR_CITIES: LegistarCity[] = [
  // ... existing cities ...
  
  // South Carolina
  {
    name: 'Columbia',
    state: 'SC',
    client: 'columbia',
    population: 137300,
    lat: 34.0007,
    lng: -81.0348
  },
  
  // Missouri
  {
    name: 'Jefferson City',
    state: 'MO',
    client: 'jeffersoncitymo',
    population: 43000,
    lat: 38.5767,
    lng: -92.1735
  },
  
  // Minnesota
  {
    name: 'St. Paul',
    state: 'MN',
    client: 'stpaul',
    population: 311500,
    lat: 44.9537,
    lng: -93.1022
  }
];
```

### Step 4: Verify Integration

After adding cities, test the local meetings endpoint:

```bash
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:3000/.netlify/functions/local-meetings?lat=34.0007&lng=-81.0348&radius=50"
$response.events | Select-Object -First 5
```

Expected output:
```json
{
  "events": [
    {
      "id": "columbia-city-council-2025-12-18",
      "name": "City Council Meeting",
      "date": "2025-12-18T18:00:00Z",
      "location": "City Hall",
      "city": "Columbia",
      "state": "SC",
      "sourceUrl": "https://columbia.legistar.com/Calendar.aspx"
    }
  ],
  "count": 1
}
```

---

## Approach 2: Custom City Scrapers

When a city doesn't use Legistar, create a custom scraper just like you do for states.

### When to Create Custom Scrapers

- City is not on Legistar
- City is a state capital or major population center
- City provides public meeting schedules online

### City Scraper Pattern

City council websites follow similar patterns to state legislatures:

**Common URL Patterns:**
```
https://www.{city}.gov/city-council/meetings
https://www.{city}.gov/calendar
https://{city}.civicweb.net/portal/
https://{city}.municipalcodeonline.com/meetings
```

**Common Data Structures:**
- HTML tables (like Tennessee state scraper)
- Calendar grids (like Massachusetts state scraper)
- JSON APIs (like Arizona state scraper)
- PDF agendas (like many state scrapers)

### Example: NYC Council (Custom Scraper)

New York City Council required a custom scraper because standard Legistar didn't provide enough data.

**File:** `netlify/functions/utils/scrapers/local/nyc-council.ts`

```typescript
import * as cheerio from 'cheerio';

export async function scrapeNYCCouncil(): Promise<Event[]> {
  const url = 'https://council.nyc.gov/committees/';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const events: Event[] = [];

  // Find committee meeting listings
  $('.committee-meeting').each((_, el) => {
    const $meeting = $(el);
    
    const committee = $meeting.find('.committee-name').text().trim();
    const dateStr = $meeting.find('.meeting-date').text().trim();
    const time = $meeting.find('.meeting-time').text().trim();
    const location = $meeting.find('.meeting-location').text().trim();
    const agendaLink = $meeting.find('a[href*="agenda"]').attr('href');

    events.push({
      name: committee,
      date: new Date(dateStr).toISOString(),
      time,
      location,
      sourceUrl: agendaLink ? `https://council.nyc.gov${agendaLink}` : undefined
    });
  });

  return events;
}
```

**Key Pattern:** Apply the same scraping techniques you learned for states to cities.

### Creating a City Scraper: Step-by-Step

#### Step 1: Research the City Website

**Find the meetings page:**
```
Google: "{city name} city council meetings"
Google: "{city name} city council agenda"
Google: "{city name} public meetings calendar"
```

**Example: Columbia, SC**
```
Search: "columbia sc city council meetings"
Result: https://www.columbiasc.gov/city-council/meetings
```

#### Step 2: Analyze the Structure

Open Developer Tools and examine:

1. **Is it static HTML or JavaScript?**
   - View source (Ctrl+U)
   - Check Network tab for API calls

2. **What's the data format?**
   - HTML table?
   - Calendar widget?
   - Embedded PDF?
   - JSON API?

3. **Where are agendas located?**
   - Same page?
   - Separate detail pages?
   - PDF documents?

#### Step 3: Create the Scraper File

Create: `netlify/functions/utils/scrapers/local/{city}.ts`

```typescript
import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import * as cheerio from 'cheerio';

/**
 * {City Name} City Council Scraper
 * Source: {URL}
 * 
 * Scrapes city council meetings, committee hearings, and public sessions.
 * 
 * Data sources:
 * - Meetings calendar: {URL}
 * - Agendas: {URL pattern}
 * 
 * Notes:
 * - {Any important information}
 */
export class CityNameCouncilScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.{city}.gov';
  private readonly calendarUrl = 'https://www.{city}.gov/city-council/meetings';
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'XX', // State abbreviation
      stateName: 'City Name', // Used as display name
      websiteUrl: 'https://www.{city}.gov/city-council',
      reliability: 'high',
      updateFrequency: 24, // Hours between updates
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🏛️ {City} Council Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.calendarUrl];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      // 1. Fetch calendar page
      const response = await fetch(this.calendarUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // 2. Parse meetings
      const events = await this.parseMeetings(html);
      
      this.log(`Found ${events.length} city council events`);
      return events;
    } catch (error) {
      const message = `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private async parseMeetings(html: string): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const $ = cheerio.load(html);

    // Adjust selectors for your city's HTML structure
    $('.meeting-item').each((_, el) => {
      const $item = $(el);
      
      const name = $item.find('.meeting-title').text().trim();
      const dateStr = $item.find('.meeting-date').text().trim();
      const time = $item.find('.meeting-time').text().trim();
      const location = $item.find('.meeting-location').text().trim();
      const agendaLink = $item.find('a[href*="agenda"]').attr('href');

      if (!name || !dateStr) return;

      const date = new Date(dateStr);

      events.push({
        name,
        date: date.toISOString(),
        time: time || 'TBD',
        location: location || 'City Hall',
        committee: name,
        type: 'city-council',
        level: 'local',
        state: 'XX',
        city: 'City Name',
        lat: 0.0000, // City coordinates
        lng: 0.0000,
        description: 'City council meeting',
        sourceUrl: agendaLink ? this.normalizeUrl(agendaLink) : this.calendarUrl
      });
    });

    return events;
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`;
    }
    return `${this.baseUrl}/${url}`;
  }
}
```

#### Step 4: Test the Scraper

Create test script: `test-{city}-council.cjs`

```javascript
const cheerio = require('cheerio');

async function testCityCouncil() {
  console.log('Testing {City} Council Scraper...\n');
  
  const url = 'https://www.{city}.gov/city-council/meetings';
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('✓ Fetched page successfully');
    console.log(`Content length: ${html.length} bytes\n`);
    
    // Test selector
    const meetings = $('.meeting-item').length;
    console.log(`Found ${meetings} meeting elements\n`);
    
    // Extract first meeting
    const first = $('.meeting-item').first();
    if (first.length > 0) {
      console.log('First meeting:');
      console.log('  Name:', first.find('.meeting-title').text().trim());
      console.log('  Date:', first.find('.meeting-date').text().trim());
      console.log('  Time:', first.find('.meeting-time').text().trim());
      console.log('  Location:', first.find('.meeting-location').text().trim());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCityCouncil();
```

Run test:
```bash
node test-{city}-council.cjs
```

#### Step 5: Register the Scraper

**Option A: Add to Legistar Cities (if using local-meetings endpoint)**

Edit `netlify/functions/utils/legistar-cities.ts`:

```typescript
export const CUSTOM_CITY_SCRAPERS: Record<string, () => Promise<Event[]>> = {
  'nyc': async () => {
    const { scrapeNYCCouncil } = await import('./scrapers/local/nyc-council');
    return scrapeNYCCouncil();
  },
  'columbia': async () => {
    const { ColumbiaCouncilScraper } = await import('./scrapers/local/columbia');
    const scraper = new ColumbiaCouncilScraper();
    return scraper.scrapeCalendar();
  }
};
```

**Option B: Create dedicated endpoint**

Create: `netlify/functions/city-{city}-events.ts`

```typescript
import type { Handler } from '@netlify/functions';
import { CityNameCouncilScraper } from './utils/scrapers/local/cityname';

export const handler: Handler = async (event) => {
  try {
    const scraper = new CityNameCouncilScraper();
    const events = await scraper.scrapeCalendar();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // 1 hour cache
      },
      body: JSON.stringify({
        events,
        count: events.length,
        lastUpdated: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

#### Step 6: Create Static JSON (Optional)

For better performance, generate static JSON file:

```javascript
// In test script:
const fs = require('fs');

const result = {
  events: events,
  count: events.length,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(
  'public/data/cityname-council-events.json',
  JSON.stringify(result, null, 2)
);

console.log(`✓ Saved ${events.length} events to JSON`);
```

---

## Pattern: State + Local Coverage

### New Standard for State Implementations

For each state you implement, also add local events:

```typescript
// Example: South Carolina
// State: southcarolina.ts (state legislature)
// Local: columbia.ts (capital city council)

// Example: Minnesota
// State: minnesota.ts (state legislature)
// Local: stpaul.ts or minneapolis.ts (major city)

// Example: Missouri
// State: missouri.ts (state legislature)
// Local: jeffersoncity.ts (capital) or kansascity.ts (largest city)
```

### Prioritization Strategy

**When adding local coverage:**

1. **First Priority:** State capital
   - Usually seat of government
   - Often has coordinated legislative activity
   - Example: Columbia, SC; St. Paul, MN; Jefferson City, MO

2. **Second Priority:** Most populous city
   - Largest impact on residents
   - Often has more active city government
   - Example: Minneapolis, MN; Kansas City, MO; Charleston, SC

3. **Third Priority:** Cities with existing Legistar
   - Easiest to add (just add to database)
   - No custom scraper needed
   - Check: https://webapi.legistar.com/v1/{city}/events

### Implementation Checklist

For each state:

- [ ] Implement state legislature scraper
- [ ] Test and verify state events
- [ ] Research state capital city website
- [ ] Test if capital uses Legistar API
- [ ] Add to legistar-cities.ts OR create custom city scraper
- [ ] Test local events endpoint
- [ ] Verify local events appear in frontend
- [ ] Document any special setup required
- [ ] Create static JSON files for both state and local
- [ ] Update SCRAPER_GUIDE.md with any new patterns

### Example: Complete South Carolina Coverage

**State Legislature:**
```typescript
// netlify/functions/utils/scrapers/states/southcarolina.ts
export class SouthCarolinaScraper extends BaseScraper {
  // Scrapes SC House and Senate committees
  // Source: https://www.scstatehouse.gov/meetings.php
}
```

**Columbia City Council:**
```typescript
// netlify/functions/utils/scrapers/local/columbia.ts
export class ColumbiaCouncilScraper extends BaseScraper {
  // Scrapes Columbia city council meetings
  // Source: https://www.columbiasc.gov/city-council/meetings
}
```

**Result:** Complete legislative coverage for South Carolina residents
- ✅ State committee meetings
- ✅ City council meetings
- ✅ Comprehensive civic engagement opportunities

---

## Finding Legistar Cities: Quick Reference

### Test if City Uses Legistar

```bash
# PowerShell
$city = "columbia"
Invoke-RestMethod -Uri "https://webapi.legistar.com/v1/$city/events" | Select-Object -First 3

# Bash/curl
curl "https://webapi.legistar.com/v1/columbia/events" | jq '.[0:3]'
```

### Common Client Name Patterns

| City | Client Name | Pattern |
|------|-------------|---------|
| New York City | `nyc` | Abbreviated |
| Los Angeles | `lacity` | "la" + "city" |
| Chicago | `chicago` | Full name |
| Phoenix | `phoenix` | Full name |
| Charlotte, NC | `charlottenc` | City + state |
| Jefferson City, MO | `jeffersoncitymo` | Full + state |
| St. Paul, MN | `stpaul` | No spaces |

### Legistar City Discovery Workflow

1. Visit city's official website
2. Find "City Council" or "Meetings" section
3. Look for Legistar-powered pages (URL contains `legistar.com`)
4. Extract client name from URL
5. Test API endpoint: `https://webapi.legistar.com/v1/{client}/events`
6. If successful, add to `legistar-cities.ts`
7. If not found, create custom scraper

---

## Common City Website Patterns

### Pattern 1: WordPress + Calendar Plugin

**Example Structure:**
```
https://www.{city}.gov/events/city-council-meeting/
```

**Scraping Approach:**
```typescript
// Calendar plugin often has JSON feed
const feedUrl = 'https://www.{city}.gov/wp-json/tribe/events/v1/events';

const response = await fetch(feedUrl);
const data = await response.json();

const events = data.events.map(event => ({
  name: event.title,
  date: event.start_date,
  location: event.venue.venue,
  sourceUrl: event.url
}));
```

### Pattern 2: CivicPlus/CivicWeb Platforms

**Example Structure:**
```
https://{city}.civicweb.net/portal/Meetings/List
```

**Scraping Approach:**
```typescript
// Usually has API endpoint
const apiUrl = 'https://{city}.civicweb.net/api/v1/meetings';

const response = await fetch(apiUrl, {
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  }
});

const meetings = await response.json();
```

### Pattern 3: Granicus/Legistar (Most Common)

**Example Structure:**
```
https://{city}.legistar.com/Calendar.aspx
```

**Scraping Approach:**
```typescript
// Use Legistar API (no custom scraper needed!)
const apiUrl = `https://webapi.legistar.com/v1/${client}/events`;
// Already integrated in local-meetings.ts
```

### Pattern 4: Custom Government Platform

**Example Structure:**
```
https://www.{city}.gov/city-council/meetings
```

**Scraping Approach:**
```typescript
// HTML scraping (like state scrapers)
const response = await fetch(url);
const html = await response.text();
const $ = cheerio.load(html);

$('.meeting-row').each((_, row) => {
  // Extract meeting details
});
```

---

## Troubleshooting Local Scrapers

### Problem: City Not on Legistar

**Solution:** Create custom scraper using state scraping techniques

**Steps:**
1. Research city website structure
2. Apply HTML/API parsing patterns from state scrapers
3. Create dedicated city scraper file
4. Test and verify
5. Integrate via local-meetings endpoint or dedicated endpoint

### Problem: City Website Has No Meeting Calendar

**Alternatives:**
1. Check county government website
2. Look for regional council of governments
3. Check state municipal league listings
4. Search for "{city name} city council agenda" PDFs

### Problem: Meetings Only Available as PDFs

**Solution:** PDF parsing (similar to state scrapers)

```typescript
private async extractMeetingsFromPdf(pdfUrl: string): Promise<Meeting[]> {
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  const text = Buffer.from(buffer).toString('utf8');
  
  // Extract meeting info using regex
  const dateMatch = text.match(/Date:\s*(\w+\s+\d+,\s+\d{4})/);
  const timeMatch = text.match(/Time:\s*(\d+:\d+\s*[AP]M)/i);
  
  return [{
    date: dateMatch ? dateMatch[1] : 'TBD',
    time: timeMatch ? timeMatch[1] : 'TBD',
    sourceUrl: pdfUrl
  }];
}
```

### Problem: JavaScript-Rendered Calendar

**Solution:** Look for API endpoints (Network tab)

Many modern calendar widgets load data via API:
1. Open Developer Tools
2. Go to Network tab
3. Filter by XHR/Fetch
4. Refresh page
5. Look for JSON responses with meeting data
6. Use discovered API endpoint directly

---

## Quick Start: Adding Local Coverage

### Scenario 1: City Uses Legistar (Easy)

```typescript
// 1. Test API
curl "https://webapi.legistar.com/v1/columbia/events"

// 2. If successful, edit legistar-cities.ts
{
  name: 'Columbia',
  state: 'SC',
  client: 'columbia',
  population: 137300,
  lat: 34.0007,
  lng: -81.0348
}

// 3. Done! Local events will automatically appear
```

**Time Required:** 5-10 minutes

### Scenario 2: City Needs Custom Scraper (Medium)

```typescript
// 1. Create scraper file
// netlify/functions/utils/scrapers/local/cityname.ts

// 2. Apply state scraping patterns
// - HTML parsing (Tennessee-style)
// - API fetching (Arizona-style)
// - Multi-page scraping (Massachusetts-style)

// 3. Test with test-cityname-council.cjs

// 4. Register in local-meetings.ts or create dedicated endpoint

// 5. Generate static JSON
```

**Time Required:** 1-2 hours (similar to state scraper)

### Scenario 3: No Meeting Calendar Available (Hard)

```bash
# 1. Search for alternative sources
Google: "{city name} city council agenda"
Google: "{city name} public meetings calendar"

# 2. Check related websites
- County government
- Regional planning organizations
- State municipal associations

# 3. If found, proceed with custom scraper
# If not found, document limitation and move to next city
```

**Time Required:** Variable (15 minutes to 3 hours)

---

## Complete Example: Adding Minnesota Coverage

### Step 1: State Scraper (Already Done)

```typescript
// netlify/functions/utils/scrapers/states/minnesota.ts
export class MinnesotaScraper extends BaseScraper {
  // Scrapes MN Legislature committee meetings
}
```

Result: ✅ 20 state events

### Step 2: Check State Capital (St. Paul)

```bash
# Test if St. Paul uses Legistar
curl "https://webapi.legistar.com/v1/stpaul/events"
```

**Result:** ✅ St. Paul uses Legistar!

### Step 3: Add to Database

Edit `legistar-cities.ts`:

```typescript
{
  name: 'St. Paul',
  state: 'MN',
  client: 'stpaul',
  population: 311500,
  lat: 44.9537,
  lng: -93.1022
}
```

### Step 4: Check Alternate City (Minneapolis)

```bash
# Test Minneapolis
curl "https://webapi.legistar.com/v1/minneapolis/events"
```

**Result:** ✅ Minneapolis also uses Legistar!

```typescript
{
  name: 'Minneapolis',
  state: 'MN',
  client: 'minneapolis',
  population: 429954,
  lat: 44.9778,
  lng: -93.2650
}
```

### Step 5: Test Local Events

```bash
# Query near St. Paul
curl "http://localhost:3000/.netlify/functions/local-meetings?lat=44.9537&lng=-93.1022&radius=50"
```

**Result:** ✅ Returns both St. Paul and Minneapolis city council meetings!

### Final Result: Complete Minnesota Coverage

- ✅ State Legislature: 20 events (MN House/Senate committees)
- ✅ St. Paul City Council: ~15 events (local government)
- ✅ Minneapolis City Council: ~20 events (local government)
- **Total:** ~55 civic engagement opportunities for Minnesota residents

**Time Spent:** 10 minutes to add both cities (they were already on Legistar!)

---

## Summary

### Legistar Approach (Preferred - When Available)

1. Test city API: `https://webapi.legistar.com/v1/{city}/events`
2. Add to `legistar-cities.ts` if successful
3. Events automatically integrated via `local-meetings` endpoint
4. **Time:** 5-10 minutes per city

### Custom Scraper Approach (When Legistar Unavailable)

1. Research city council website
2. Analyze structure (HTML/API/PDF)
3. Create scraper using state patterns
4. Test and verify
5. Integrate via local-meetings or dedicated endpoint
6. **Time:** 1-2 hours per city (similar to state scraper)

### Best Practices

- ✅ Add local coverage for every state you implement
- ✅ Prioritize state capitals first, then populous cities
- ✅ Check Legistar before building custom scrapers
- ✅ Apply same scraping techniques as state-level work
- ✅ Document any special requirements or limitations
- ✅ Test both state and local events together
- ✅ Create static JSON for better performance

### Coverage Goal

**Current State:** 12 custom state scrapers + 52 Legistar cities (27 states)

**Target State:** Every implemented state should have:
- State legislature scraper (House + Senate committees)
- Capital city scraper (city council meetings)
- Optional: Additional major cities in the state

**Example Goals:**
- South Carolina: ✅ State + ❌ Columbia (needs custom scraper or Legistar check)
- Minnesota: ✅ State + ✅ St. Paul + ✅ Minneapolis (both on Legistar!)
- Missouri: ✅ State + ❓ Jefferson City (check Legistar) + ❓ Kansas City (check Legistar)

---

**Remember:** Local events are just as important as state events for comprehensive civic engagement. Every state scraper you build should be paired with local city coverage for complete legislative tracking!
