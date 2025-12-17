# The Complete Guide to Building State Legislative Scrapers

**A step-by-step handbook for adding any state to Civitron**

Version 1.0 | December 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [The Scraper Architecture](#the-scraper-architecture)
4. [Phase 1: Research](#phase-1-research)
5. [Phase 2: Planning](#phase-2-planning)
6. [Phase 3: Implementation](#phase-3-implementation)
7. [Phase 4: Testing](#phase-4-testing)
8. [Phase 5: Integration](#phase-5-integration)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)
11. [Real Examples](#real-examples)

---

## Introduction

This guide teaches you how to create a scraper for any U.S. state legislature. You'll learn to extract committee meeting schedules, bills, and related information regardless of how the state publishes this data.

### What You'll Build

A TypeScript class that:
- Finds committee meeting schedules
- Extracts event details (time, location, committee)
- Discovers associated bills
- Provides meeting links (video/audio streams)
- Outputs standardized event objects

### Time Required

- **Simple state** (public HTML): 2-4 hours
- **Complex state** (API/JavaScript): 4-8 hours
- **First scraper** (learning): Add 2-4 hours

---

## Prerequisites

### Required Knowledge
- Basic TypeScript/JavaScript
- Understanding of HTTP requests
- HTML structure basics (if scraping HTML)
- JSON format (if using APIs)

### Tools You'll Need
- Code editor (VS Code recommended)
- Browser with Developer Tools
- Terminal/Command Line
- Node.js installed

### Helpful But Not Required
- Experience with DOM parsing
- Familiarity with REST APIs
- Understanding of web scraping ethics

---

## The Scraper Architecture

### Core Concept

Every scraper follows the same pattern:

```
1. Find where events are published → URLs/APIs
2. Fetch the data → HTTP requests
3. Parse the structure → Extract information
4. Follow links if needed → Get additional details
5. Structure the output → Standard format
```

### Base Scraper Class

All scrapers extend `BaseScraper`:

```typescript
export class StateScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'XX',
      stateName: 'State Name',
      websiteUrl: 'https://legislature.state.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    // Your implementation here
  }
}
```

### Output Format

Each scraper returns an array of `RawEvent` objects:

```typescript
interface RawEvent {
  name: string;              // Committee name
  date: string;              // ISO date string
  time?: string;             // Human-readable time
  location?: string;         // Physical location
  committee?: string;        // Committee name
  description?: string;      // Description
  sourceUrl?: string;        // Link to agenda/source
  virtualMeetingUrl?: string; // Video/streaming link
  bills?: BillInfo[];        // Associated bills
}
```

---

## Phase 1: Research

### Step 1: Find the Legislature Website

Google: `[state name] legislature website`

Examples:
- Arizona: https://www.azleg.gov/
- Tennessee: https://wapp.capitol.tn.gov/
- Massachusetts: https://malegislature.gov/
- Indiana: https://iga.in.gov/

### Step 2: Locate the Calendar/Events Page

Look for links labeled:
- "Calendar"
- "Committee Meetings"
- "Schedules"
- "Hearings & Events"
- "Daily Calendar"
- "Upcoming Meetings"

### Step 3: Analyze the Page Structure

Open Developer Tools (F12) and examine:

#### A) Is it static HTML or JavaScript-rendered?

**Test**: View page source (Ctrl+U)
- **Static HTML**: You see content in the source
- **JavaScript/SPA**: You see mostly `<script>` tags and empty `<div id="root">`

#### B) Are there API endpoints?

**Check Network tab** while page loads:
1. Open DevTools → Network tab
2. Refresh the page
3. Look for XHR/Fetch requests
4. Check if JSON data is being loaded

Common API patterns:
- `/api/committees`
- `/events.json`
- `/calendar/data`
- GraphQL endpoints

#### C) What's the URL pattern?

Look at how URLs change:
- Date-based: `/calendar/2025-12-17`
- Month-based: `/events/12-2025`
- Chamber-based: `/senate/schedule`
- Committee-based: `/committees/finance`

### Step 4: Examine Event Details

Click on an event and analyze:

1. **Where are bills listed?**
   - On the calendar page?
   - On a separate detail page?
   - In a PDF agenda?

2. **Are there meeting links?**
   - Video streaming URLs?
   - PDF agendas?
   - Location information?

3. **What's the bill format?**
   - HB 1234, SB 567 (House/Senate Bill)
   - H.1234, S.567 (with periods)
   - Bill numbers only: 1234

### Step 5: Document Your Findings

Create a research document:

```markdown
# [State] Legislature Scraper Research

## Website Structure
- Main site: [URL]
- Calendar page: [URL]
- Type: [Static HTML / JavaScript SPA / API]

## Event Data Location
- Calendar endpoint: [URL or path]
- Event detail pattern: [URL pattern]
- Update frequency: [Daily/Weekly/Monthly]

## Data Format
- Event listing: [HTML table / JSON / XML]
- Bill information: [Embedded / Separate page / PDF]
- Meeting links: [Yes/No, where located]

## URL Patterns
- Date format: [YYYY-MM-DD / MM-DD-YYYY / etc]
- Chambers: [Senate / House / Joint / All]
- Example URLs: [list 2-3 examples]

## Authentication
- Required: [Yes/No]
- Type: [API Key / OAuth / None]
- How to obtain: [Registration process]

## Special Notes
- [Any quirks, limitations, or important details]
```

---

## Phase 2: Planning

### Decision Tree: Choose Your Approach

```
Does the state have a public API?
├─ YES → Is authentication required?
│   ├─ YES → Use API with auth (like Indiana)
│   └─ NO → Use API without auth (like Arizona JSON endpoints)
└─ NO → Is the page static HTML?
    ├─ YES → Use HTML scraping (like Tennessee)
    └─ NO → Is it a JavaScript SPA?
        ├─ Can you find API endpoints? → Use discovered API
        └─ No API found? → Use headless browser OR use OpenStates fallback
```

### Planning Checklist

- [ ] Identified data source (HTML/API/PDF)
- [ ] Documented URL patterns
- [ ] Listed required HTTP headers
- [ ] Identified authentication needs
- [ ] Mapped out data flow
- [ ] Noted bill information location
- [ ] Found meeting link sources

### Create Implementation Outline

```markdown
## Implementation Plan for [State]

### Data Sources
1. Primary: [URL/API endpoint]
2. Secondary: [Detail pages/PDFs if needed]

### Scraping Strategy
1. Fetch: [describe what to fetch]
2. Parse: [describe parsing method]
3. Extract: [list fields to extract]
4. Follow: [describe any secondary requests]

### Methods to Implement
- `scrapeCalendar()` - Main entry point
- `fetchSchedule()` - Get event listings
- `parseEvents()` - Extract event data
- `fetchBills()` - Get bill information (if separate)
- `convertToRawEvent()` - Transform to standard format

### Edge Cases to Handle
- No events scheduled
- Cancelled events
- PDF parsing failures
- Missing data fields
```

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

- **v1.1** (Dec 2025) - Added Missouri example, dual-chamber patterns, ASP.NET alternative views, flexible time handling
- **v1.0** (Dec 2025) - Initial guide based on AZ, TN, MA, IN implementations

---

**Remember:** Every state is different. Use this guide as a framework, but adapt to each state's unique structure. When in doubt, examine working examples and ask questions!

**Happy Scraping! 🎉**
