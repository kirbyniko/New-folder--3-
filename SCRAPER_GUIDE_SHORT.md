# State & Local Scraper Guide (Quick Reference)

**Version 2.0** | Updated for Database-First Architecture

---

## Architecture Overview (NEW)

### Data Flow
```
Scraper → PostgreSQL (auto-tags) → Netlify Blobs → Frontend
```

**Key Changes:**
- Scrapers write to PostgreSQL FIRST (single source of truth)
- Auto-tagging happens on insert (25 categories, ~150 keywords)
- Database exports to Netlify Blobs nightly (3 AM UTC)
- Frontend reads from blobs only (zero SQL injection risk)
- Static JSON files still used as fallback/cache

---

## Process Overview

**Time:** 2-4 hours per state + capital city
**Pattern:** Always attempt State + Local coverage

### Workflow
1. **Research** (15min) - Find calendar URLs
2. **Test** (10min) - Check structure (HTML/API/SPA)
3. **Implement** (1-2hr) - Build scraper using patterns
4. **Integrate** (30min) - Register, scraper writes to DB, create static JSON
5. **Local** (1hr) - Add capital city

### 🚨 Critical Rule
**If you cannot find the calendar URL after 10 minutes of searching, STOP and ASK THE USER for help.**

Provide what you tried:
- URLs tested
- Google searches used
- What you expected vs what you found

---

## Decision Tree

```
1. Google "[state] legislature committee meetings"
2. Open browser DevTools → Network tab
3. Determine type:

├─ Static HTML? (view source shows content)
│  └─ Use Cheerio + fetch()
│
├─ JSON API visible? (Network shows /api/)  
│  └─ Use fetch() with headers
│
├─ JavaScript SPA? (React/Vue, empty source)
│  ├─ GraphQL/REST endpoint? → Use API
│  ├─ No API but simple calendar? → Use Puppeteer
│  └─ Too complex? → Use OpenStates
│
└─ Can't find after 10min? → ASK USER
```

---

## Implementation Patterns

### 1. Static HTML (Tennessee, South Carolina, Louisiana)

```typescript
export class StateScraper extends BaseScraper {
  private readonly url = 'https://state.gov/meetings';
  
  async scrapeCalendar(): Promise<RawEvent[]> {
    const response = await fetch(this.url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const events: RawEvent[] = [];
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      events.push({
        name: $(cells[1]).text().trim(),
        date: this.parseDate($(cells[0]).text()),
        location: $(cells[2]).text().trim()
      });
    });
    return events;
  }
}
```

### 2. JSON API (Arizona, Minnesota)

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const url = `${this.apiBase}/events?date=${date}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.map(event => ({
    name: event.title,
    date: new Date(event.start_date).toISOString(),
    location: event.location
  }));
}
```

### 3. Agenda Parsing Enhancement (Louisiana)

**When agenda URLs exist, parse for meeting details:**

```typescript
private async parseAgenda(agendaUrl: string): Promise<{ items: string[] }> {
  const html = await fetch(agendaUrl).then(r => r.text());
  const $ = cheerio.load(html);
  const items: string[] = [];
  
  // Extract numbered agenda items (skip headers like "CALL TO ORDER")
  $('#TableAgendaItems tr').each((_, row) => {
    const text = $(row).text().trim();
    const match = text.match(/^\d+\.\s+(.+)/);
    if (match && match[1]) {
      items.push(match[1].substring(0, 150)); // Truncate long items
    }
  });
  return { items };
}

async convertEventToRaw(event: StateEvent): Promise<RawEvent> {
  const agenda = await this.parseAgenda(event.agendaUrl);
  return {
    ...baseFields,
    description: agenda.items.length > 0 
      ? `Agenda: ${agenda.items.slice(0, 3).join('; ')}${agenda.items.length > 3 ? '...' : ''}`
      : ''
  };
}
```

**Key Points:**
- Agendas may be HTML (not PDF) - check link before implementing
- Extract numbered items only (e.g., "1. To receive an update...")
- Filter headers: "CALL TO ORDER", "ROLL CALL", "BUSINESS", "ADJOURNMENT"
- Limit to first 3 items, truncate each to 150 chars
- Some agendas may be empty - handle gracefully

### 4. Puppeteer for Dynamic Calendars (Lexington, Birmingham, Montpelier)

**When to use:** Calendar is JavaScript-rendered (empty view-source), no API available

#### Simple Calendar (Lexington, Birmingham)

```typescript
import { scrapeWithPuppeteer } from '../puppeteer-helper';

export async function scrapeLexingtonMeetings(): Promise<RawEvent[]> {
  const events = await scrapeWithPuppeteer(url, {
    waitFor: 3000, // Wait for JS to render
    evaluate: async (page) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Use page.evaluate to run in browser context
      const eventLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/calendar/"]'));
        return links.map(link => ({
          title: link.textContent?.trim(),
          url: (link as HTMLAnchorElement).href,
          // Extract date from URL or parent text
          dateStr: link.href.match(/\/(\d{4}-\d{2}-\d{2})\//)?.[1],
          // Extract time from parent context
          timeStr: link.parentElement?.textContent?.match(/–\s*(\d{1,2}(?::\d{2})?\s*[ap]\.m\.)/)?.[1]
        }));
      });
      
      return eventLinks;
    }
  });
  return events.map(e => convertToRawEvent(e));
}
```

#### Complex Calendar with Date Range + Infinite Scroll (Montpelier)

**Complexity:** Material-UI calendar requiring date input interaction and scrolling

```typescript
import { Page } from 'puppeteer';

export async function scrapeMontpelierMeetings(): Promise<RawEvent[]> {
  const events = await scrapeWithPuppeteer(url, {
    waitFor: 'input[aria-label="From Date"]',
    evaluate: async (page: Page) => {
      // Step 1: Wait for React/Material-UI to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 2: Set date range inputs
      const today = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 10);
      const formatDate = (d: Date) => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
      
      const fromDateInput = await page.$('input[aria-label="From Date"]');
      if (fromDateInput) {
        await fromDateInput.click({ clickCount: 3 }); // Select all
        await fromDateInput.type(formatDate(today));
      }
      
      const toDateInput = await page.$('input[aria-label="To Date"]');
      if (toDateInput) {
        await toDateInput.click({ clickCount: 3 });
        await toDateInput.type(formatDate(futureDate));
      }
      
      // Step 3: Wait for calendar to update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 4: Infinite scroll to load all events
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 20;
      
      while (scrollAttempts < maxScrollAttempts) {
        // Scroll container to bottom
        await page.evaluate(() => {
          const eventList = document.querySelector('#event-list-table');
          if (eventList) {
            eventList.scrollTop = eventList.scrollHeight;
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if height changed (new content loaded)
        const currentHeight = await page.evaluate(() => {
          const eventList = document.querySelector('#event-list-table');
          return eventList ? eventList.scrollHeight : 0;
        });
        
        if (currentHeight === previousHeight) break; // No more content
        
        previousHeight = currentHeight;
        scrollAttempts++;
      }
      
      // Step 5: Extract events from fully loaded calendar
      return await page.evaluate(() => {
        const eventElements = document.querySelectorAll('#event-list-table .MuiPaper-root');
        return Array.from(eventElements).map((el, i) => {
          const titleEl = el.querySelector('h6, h5');
          const title = titleEl?.textContent?.trim() || '';
          const dateTimeText = el.textContent || '';
          const dateMatch = dateTimeText.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
          const timeMatch = dateTimeText.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
          
          return {
            id: `montpelier-${i}-${Date.now()}`,
            title,
            date: dateMatch ? dateMatch[0] : '',
            time: timeMatch ? timeMatch[0] : '',
            location: 'Montpelier City Hall'
          };
        });
      });
    },
    timeout: 90000 // Long timeout for complex interaction
  });
  
  return events.map(e => convertToRawEvent(e));
}
```

**Key Patterns for Complex Calendars:**
- **Date Inputs:** Use `click({ clickCount: 3 })` to select all text before typing
- **Infinite Scroll:** Loop until `scrollHeight` stops changing
- **Material-UI:** Wait 5s+ for React components to initialize
- **Timeout:** Use 60-90s timeout for complex pages (pass to `scrapeWithPuppeteer`)
- **Selectors:** Look for `aria-label`, `#id`, `.MuiPaper-root`, `role="button"`

**Key Points:**
- Use `page.evaluate()` to run code in browser context (has access to `document`)
- Wait 3-6 seconds for dynamic content to load
- Extract dates from URLs when possible (more reliable than parsing text)
- Look for time patterns in parent elements: `– 4:30 p.m.` or `– 11 a.m.`
- Cache results (24hr) since Puppeteer is slower

### 5. OpenStates Fallback (Georgia, Alabama, New Mexico)

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const url = `https://v3.openstates.org/events?jurisdiction=${this.jurisdictionId}`;
  const response = await fetch(url, {
    headers: { 'X-API-KEY': process.env.OPENSTATES_API_KEY }
  });
  const data = await response.json();
  
  // Filter out past events
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingEvents = data.results.filter(e => {
    const eventDate = new Date(e.start_date);
    return eventDate >= today;
  });
  
  return upcomingEvents.map(this.parseOpenStatesEvent);
}
```

**When to use:** Complex/inaccessible official calendars, no clean API available

### 6. Trumba Calendar RSS (Juneau)

**When to use:** City uses Trumba calendar system (check for `www.trumba.com/scripts/spuds.js`)

```typescript
import { Parser } from 'xml2js';

export async function scrapeJuneauMeetings(): Promise<RawEvent[]> {
  const rssUrl = 'https://www.trumba.com/calendars/city-and-borough-of-juneau-events.rss';
  const response = await fetch(rssUrl);
  const xmlText = await response.text();
  const parser = new Parser();
  const result = await parser.parseStringPromise(xmlText);
  
  const items = result.rss?.channel?.[0]?.item || [];
  const events: RawEvent[] = [];
  
  for (const item of items) {
    const title = item.title?.[0] || '';
    const description = item.description?.[0] || '';
    const category = item.category?.[0] || ''; // Contains date: "2025/12/21 (Sat)"
    
    // Skip cancelled/closed events
    if (title.toLowerCase().includes('cancelled')) continue;
    
    // Parse date from category
    const dateMatch = category.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (!dateMatch) continue;
    
    // Parse time from description HTML
    const timeMatch = description.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
    
    // Extract location, committee, virtual meeting URL from description
    // Clean HTML entities: &amp;nbsp; &lt; &gt; etc.
    
    events.push({
      id: `juneau-${date.getTime()}-${titleHash}`,
      name: title,
      date: eventDate.toISOString(),
      time: timeStr,
      location,
      committee,
      sourceUrl: 'https://juneau.org/calendar',
      docketUrl: item['x-trumba:weblink']?.[0] || undefined
    });
  }
  
  return events;
}
```

**Setup:** `npm install xml2js @types/xml2js`  
**Finding Trumba:** Look for `$Trumba.addSpud({webName: "..."})` in page source  
**RSS Format:** `https://www.trumba.com/calendars/[webName].rss`

### 7. Multi-Chamber (Missouri, Minnesota)

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const [house, senate] = await Promise.all([
    fetch(this.houseUrl).then(r => r.text()),
    fetch(this.senateUrl).then(r => r.text())
  ]);
  
  return [
    ...this.parseHearings(house, 'House'),
    ...this.parseHearings(senate, 'Senate')
  ];
}
```

### 7. Multi-Chamber (Missouri, Minnesota)

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const [house, senate] = await Promise.all([
    fetch(this.houseUrl).then(r => r.text()),
    fetch(this.senateUrl).then(r => r.text())
  ]);
  
  return [
    ...this.parseHearings(house, 'House'),
    ...this.parseHearings(senate, 'Senate')
  ];
}
```

### 8. Puppeteer (Client-Rendered/Blocked Sites)

**When to use:** React/Vue calendars OR Akamai/Cloudflare blocks

```typescript
import { scrapeWithPuppeteer } from '../puppeteer-helper';

const events = await scrapeWithPuppeteer(url, {
  waitFor: '.calendar', // Selector or ms
  evaluate: async (page) => {
    await new Promise(r => setTimeout(r, 3000)); // Let data load
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event')).map(el => ({
        title: el.querySelector('h3')?.textContent?.trim(),
        date: el.querySelector('.date')?.textContent?.trim()
      }));
    });
  }
});
```

**Setup:** `npm install puppeteer @sparticuz/chromium`  
**Cost:** 3-5s per scrape. Cache 24hrs. Lambda: 1024MB+, 30s timeout.

---

## Required Event Format

```typescript
{
  id: "xx-1234567890000-committee-name",
  name: "Committee on Finance",
  date: "2025-12-17T15:00:00.000Z", // ISO
  time: "10:00 AM",
  location: "Room 123",
  committee: "Committee on Finance",
  type: "committee-meeting",
  level: "state",  // REQUIRED
  state: "XX",     // REQUIRED  
  city: "Capital City",
  lat: 40.7128,    // Capitol coords
  lng: -74.0060,
  zipCode: null,
  description: "State committee meeting",
  sourceUrl: "https://state.gov/calendar", // REQUIRED: Actual calendar page being scraped
  docketUrl: "https://state.gov/agenda.pdf", // Optional: Only if specific agenda exists
  virtualMeetingUrl: "https://state.gov/video/123", // Optional
  bills: [...]  // Optional
}
```

**🚨 Critical sourceUrl Rule:**
- `sourceUrl` should **always point to the calendar page being scraped**
- Frontend displays this prominently above events so users can verify the source
- Use actual calendar URL, not generic homepage or archive pages
- Only set `docketUrl` if a **specific meeting agenda** exists (not generic agendas page)

**🆕 Auto-Tagging:**
- Tags are **automatically generated** when events are inserted into PostgreSQL
- No need to manually add tags - `insertEvent()` calls `autoTagEvent()` internally
- 25 tag categories with ~150 keywords (healthcare, education, environment, etc.)
- Tags match against event name, description, and committee fields

---

## Integration Checklist

### 1. Create Scraper
```bash
lib/functions/utils/scrapers/states/[state].ts
```

### 2. Register in Scraper Registry
```typescript
// In lib/functions/utils/scrapers/index.ts
import { StateScraper } from './states/state';
Registry.register('XX', new StateScraper());
```

### 3. Database Integration (NEW)
**Scheduled scraper automatically:**
- Writes scraped events to PostgreSQL via `insertEvent()`
- Auto-generates tags using keyword matching
- Inserts related bills via `insertBills()`
- Exports from database to Netlify Blobs

**Manual testing:**
```typescript
import { insertEvent, insertBills } from './utils/db/events';

for (const event of scrapedEvents) {
  const eventId = await insertEvent(event, 'scraper-xx');
  if (event.bills?.length > 0) {
    await insertBills(eventId, event.bills, 'XX');
  }
}
```

### 4. Add Static File Handler (Fallback)
```typescript
// In lib/functions/state-events.ts
if (stateAbbr === 'XX') {
  const stateNames = { 'XX': 'State Name' };
  const fileNames = { 'XX': 'state-events.json' };
  // ...
}
```

### 5. Create Static JSON (Optional Cache)
```bash
public/data/state-events.json
```

### 6. Update Sidebar
```typescript
// In src/components/StateSidebar.tsx
{ code: 'XX', name: 'State Name', status: 'complete', notes: 'X events' }
```

### 7. Test
```bash
npm run build
# Check for TypeScript errors

# Test database write (if USE_POSTGRESQL=true)
npx tsx lib/functions/test-[state]-scraper.ts
```

---

## Local Events (Cities)

### Quick Legistar Check

```bash
curl "https://webapi.legistar.com/v1/[cityname]/events"

# Common patterns:
# - montgomery, phoenix, atlanta
# - stpaul (no space), charlottenc (city+state)
```

**If works:** Add to `legistar-cities.ts`:
```typescript
{
  name: 'City Name',
  state: 'XX',
  client: 'cityname',
  population: 100000,
  lat: 40.0,
  lng: -74.0
}
```

**If not:** Build custom scraper (see below)

### Custom City Scrapers

#### When Basic Fetch Fails

**Client-Side Rendered (React/Next.js/Dynamic)**
- Symptoms: Skeleton loaders, empty HTML source, data loads after render
- Examples: Birmingham AL (Next.js), Lexington KY (dynamic calendar)
- Solution: **Puppeteer**

**Security Blocks (Akamai/Cloudflare)**
- Symptoms: 403 Forbidden, "Access Denied", edgesuite.net error
- Example: Montgomery, AL (Akamai protection)
- Solution: **Puppeteer** bypasses bot detection

**Dynamic Calendars (JavaScript-rendered)**
- Symptoms: `view-source:` shows minimal HTML, calendar loads via AJAX
- Examples: Lexington KY government calendar
- Solution: **Puppeteer** with `page.evaluate()` to extract rendered content
- Pattern: Wait 3+ seconds, extract links with dates/times from DOM

#### Puppeteer Pattern

```typescript
import { scrapeWithPuppeteer } from '../puppeteer-helper';

const events = await scrapeWithPuppeteer(url, {
  waitFor: 3000, // Wait for calendar JS to render (ms)
  evaluate: async (page) => {
    await new Promise(r => setTimeout(r, 3000)); // Additional wait if needed
    
    // IMPORTANT: Use page.evaluate() to run code in browser context
    return await page.evaluate(() => {
      // This code runs IN THE BROWSER - has access to document
      return Array.from(document.querySelectorAll('a[href*="/calendar/"]')).map(el => ({
        title: el.textContent?.trim(),
        url: (el as HTMLAnchorElement).href,
        // Extract date from URL (most reliable)
        dateStr: el.href.match(/\/(\d{4}-\d{2}-\d{2})\//)?.[1],
        // Extract time from parent text (look for "– 4:30 p.m." pattern)
        timeStr: el.parentElement?.textContent?.match(/–\s*(\d{1,2}(?::\d{2})?\s*[ap]\.m\.)/)?.[1]
      }));
    });
  }
});

// Time extraction patterns to look for:
// "– 4:30 p.m." "– 11 a.m." "at 2:00 PM" "@ 9:30 AM"
```

**Setup:**
```bash
npm install puppeteer @sparticuz/chromium
```

**Integration in local-meetings.ts:**
```typescript
// 1. Alabama geo-detection (add to nearbyCities logic)
const isAlabama = (lat >= 30.2 && lat <= 35.0) && (lng >= -88.5 && lng <= -84.9);
if (isAlabama) {
  nearbyCities.push({ name: 'Birmingham', client: 'birmingham', ... });
  nearbyCities.push({ name: 'Montgomery', client: 'montgomery', ... });
}

// 2. Prioritize custom scrapers before Legistar cities
const customCities = nearbyCities.filter(c => c.client === 'birmingham' || c.client === 'montgomery');
const legistarCities = nearbyCities.filter(c => c.client !== 'birmingham' && c.client !== 'montgomery');
const prioritizedCities = [...customCities, ...legistarCities];

// 3. Handle in city processing loop
if (city.client === 'birmingham') {
  const rawEvents = await scrapeBirminghamMeetings();
  // Convert RawEvent → local-meetings format
  const events = rawEvents.map(evt => sanitizeEvent({
    ...evt,
    level: 'local',
    url: evt.sourceUrl || null // KEY: map sourceUrl to url
  }));
  CacheManager.set(cacheKey, events, 86400); // Cache for 24h
  return events;
}
```

**Performance:**
- First request: 10-15s (Puppeteer launch + scrape)
- Cached requests: <50ms (24h TTL)
- Lambda requirements: 1024MB+ memory, 30s+ timeout

**Performance:** 3-5s browser launch + render time. Cache 24hrs to minimize usage.

**Lambda:** Uses `@sparticuz/chromium` for serverless (1024MB+ memory, 30s+ timeout)

### Finding City Calendars

**Google:** "[city] city council meetings"

**Test URLs:**
- Montgomery, AL: Puppeteer (Akamai blocks)
- Birmingham, AL: Puppeteer (client-rendered)
- NYC: Custom Legistar HTML scraper

**🚨 If stuck after 10min → ASK USER**

### 🚨 CRITICAL: City Processing Limit

**The local-meetings endpoint only processes the first 5 cities** via `.slice(0, 5)`.

**Issue:** Custom cities added via geo-detection (Santa Fe, Birmingham, etc.) may be at the END of the nearbyCities array after Legistar cities are found. If your custom city is at position 6+, **it will never be scraped**.

**Solution:** Add custom city to BOTH prioritization filters:

```typescript
// In lib/functions/local-meetings.ts around line 372

// 1. Add to customCities filter (gets processed first)
const customCities = nearbyCities.filter(c => 
  c.client === 'birmingham' || 
  c.client === 'montgomery' ||
  c.client === 'santafe' ||      // ADD YOUR CITY HERE
  c.client === 'lexington' ||
  // ... other custom cities
);

// 2. Add to otherCities exclusion (prevent duplication)
const otherCities = nearbyCities.filter(c => 
  c.client !== 'birmingham' && 
  c.client !== 'montgomery' &&
  c.client !== 'santafe' &&      // ADD YOUR CITY HERE
  c.client !== 'lexington' &&
  // ... other custom cities
);
```

**Why This Matters:**
- Santa Fe, NM was added via geo-detection ✅
- It appeared LAST in the 11-city array (position 10) ❌
- Processing stopped at city 5, Santa Fe never scraped ❌
- Server logs showed "Adding Santa Fe" but never "SANTA FE SCRAPER INVOKED" ❌

**Debugging:**
Look for these log patterns:
```
✅ New Mexico coordinates detected!
🏛️ Adding Santa Fe to nearby cities
📋 Total cities to scrape: 11 (including New Mexico cities)
Found 11 Legistar cities within 500 miles: [..., 'Santa Fe']  <-- Position 10!
🎯 Processing cities: ['Oklahoma City', ..., 'Santa Fe']       <-- But only first 5 processed!
🏛️ OKLAHOMA CITY SCRAPER INVOKED  <-- City 1
[No Santa Fe scraper log] <-- Never reached!
Total local events found: 14  <-- From other cities, not Santa Fe
```

**Quick Check:** After adding geo-detection, verify your custom city appears in the `customCities` prioritization filters, not just the geo-detection block.

---

## Common Issues

### No Events Found
- Wrong URL?
- JavaScript-rendered?
- Check Network tab for APIs
- Try OpenStates fallback

### Missing `level` Field
Events crash without `level: "state"` field. Always ensure scrapers return events with:
- `level: 'state'` or `level: 'local'`
- `name: string` (event title)
- `committee: string` (committee name)

Common bug: Using only partial fields like `title` without `name` + `committee` causes frontend crashes.

### Database Connection Issues (NEW)
**Symptoms:** Events not appearing in admin panel or frontend after scraping

**Check:**
```bash
# Verify environment variable
echo $env:DATABASE_URL
echo $env:USE_POSTGRESQL

# Test connection
npx tsx -e "import { checkDatabaseConnection } from './lib/functions/utils/db/connection.js'; checkDatabaseConnection().then(console.log)"
```

**Fallback:** If database unavailable, scheduled-scraper stores directly to blobs

### Tags Not Appearing (NEW)
**Auto-tagging should happen automatically via `insertEvent()`**

**Verify:**
- Event has `name`, `description`, or `committee` fields (tagging requires text)
- Check database: `SELECT * FROM event_tags WHERE event_id = 'xxx'`
- Run manual tag update: `POST /.lib/functions/update-tags`

### Duplicate Event IDs
**Symptoms:** React warnings "Encountered two children with the same key"  
**Cause:** ID generation creates collisions (e.g., using `substring(0, 12)` on base64)  
**Fix:** Use timestamp + unique hash: `${city}-${date.getTime()}-${titleHash}`

### Missing/Wrong sourceUrl  
**Critical:** `sourceUrl` must be the actual calendar page being scraped (frontend displays it above all events):
- ❌ Homepage: `https://state.gov/`
- ❌ Archive: `https://city.gov/agendas/` (unless scraping that specific page)
- ✅ Calendar: `https://state.gov/committee-meetings`
- ✅ Schedule: `https://city.gov/board-calendar`

### Wrong docketUrl
**Only set if specific meeting agenda exists:**
- ❌ Generic agendas page: `https://city.gov/meeting-agendas/`
- ❌ Archive without specific link: Don't set `docketUrl`
- ✅ Specific PDF: `https://state.gov/agenda-2025-01-15.pdf`
- ✅ Specific HTML agenda: `https://state.gov/meeting/12345/agenda`

### No Local Events Showing in Frontend
**Root Cause:** Browser caching empty responses from failed scraper attempts

**Symptoms:**
- Backend returns events when tested directly (curl/Invoke-RestMethod)
- Frontend shows 0 events with fast response time (~40ms)
- No server logs for local-meetings requests

**Solution:**
1. Delete cache files: `public/cache/local-[city]-events.json`
2. Add cache-buster to frontend fetch calls (like state-events has)
3. Hard refresh browser (Ctrl+Shift+R)

**Frontend Fix Required:**
```typescript
// In src/App.tsx, add timestamp to local-meetings calls:
const cacheBuster = `&_t=${Date.now()}`;
fetch(`/.lib/functions/local-meetings?lat=${lat}&lng=${lng}&radius=${radius}${cacheBuster}`)
```

### Puppeteer Environment Detection
**Issue:** `@sparticuz/chromium` tries to load Lambda binary in dev mode

**Symptoms:**
```
TypeError: The "path" argument must be of type string. Received undefined
    at chromium.executablePath()
```

**Solution:** Check for `NETLIFY_DEV` environment variable:
```typescript
const isProduction = !!process.env.AWS_LAMBDA_FUNCTION_VERSION;
const isNetlifyDev = !!process.env.NETLIFY_DEV;

if (isProduction && !isNetlifyDev) {
  // Use Lambda chromium
} else {
  // Use local Chrome
}
```

### No Local Events Despite Backend Working
- Check Legistar first
- City website may be inaccessible (Akamai, React SPA)
- For Alabama-style custom scrapers: prioritize in city processing
- ASK USER for calendar URL

### Calendar Sources Not Showing (0 Events Bug)

**Symptoms:** State has 0 events but calendar sources don't appear in frontend

**Root Causes:**
1. **Backend:** `database-empty` path missing calendar sources and CORS headers
2. **Frontend:** Sources button hidden when `activeEvents.length === 0`

**Backend Fix (state-events.ts):**
```typescript
if (event_count === 0) {
  // Get calendar sources from scraper even when no events
  const scraper = ScraperRegistry.get(stateAbbr);
  const calendarSources = scraper?.getCalendarSources?.() || [];
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Expose-Headers': 'X-Data-Source, X-Message, X-Calendar-Sources',
      'X-Calendar-Sources': JSON.stringify(calendarSources)
    },
    body: JSON.stringify([])
  };
}
```

**Frontend Fix (TabbedEvents.tsx):**
```typescript
// Show header if events OR calendar sources exist
{(activeEvents.length > 0 || calendarSources.length > 0) && (
  <div className="events-header">
    <h3>{activeEvents.length} Events</h3>
    <div className="events-controls">
      {/* Only show layout toggle if events exist */}
      {activeEvents.length > 0 && (
        <div className="layout-toggle">...</div>
      )}
      {/* Show sources button if sources exist (even with 0 events) */}
      {calendarSources.length > 0 && (
        <button onClick={() => setShowSources(!showSources)}>
          📁 Sources
        </button>
      )}
    </div>
  </div>
)}
```

**Key Points:**
- Always include `Access-Control-Expose-Headers` listing `X-Calendar-Sources`
- Call `scraper.getCalendarSources()` in ALL return paths (including empty database)
- Frontend must show sources button when `calendarSources.length > 0` regardless of event count
- Conditional rendering: `(events.length > 0 || sources.length > 0)` not just `(events.length > 0)`

### Clicking State Shows 0 Events (State + Local Debugging)

**Symptom:** Click state in sidebar (e.g., "New Mexico") → shows "0 Events" and no sources, despite having working scrapers.

**Understanding the Flow:**
When you click a state in the sidebar, the frontend:
1. Uses that state's capitol coordinates (e.g., Santa Fe for NM: 35.6870, -105.9378)
2. Fetches **state-level** events: `state-events?state=NM`
3. Fetches **local events** nearby: `local-meetings?lat=35.6870&lng=-105.9378&radius=500`
4. Combines both and displays

**Debugging Steps:**

1. **Test State Events Endpoint:**
   ```powershell
   curl "http://localhost:8888/.lib/functions/state-events?state=NM" | ConvertFrom-Json | Select-Object count, calendarSources
   ```
   - If `count: 0` but `calendarSources` has items → State scraper working but no current events (check API key if using OpenStates)
   - If no `calendarSources` → See "Calendar Sources Not Showing" section below

2. **Test Local Events Endpoint:**
   ```powershell
   $response = Invoke-RestMethod "http://localhost:8888/.lib/functions/local-meetings?lat=35.6870&lng=-105.9378&radius=500"
   "Events: $($response.events.Count)"
   $response.events | Select-Object -First 3 | Format-Table name, city, committee
   ```
   - If `0 events` but scraper works → Check cache file: `public/cache/local-santafe-events.json`
   - Delete cache file and retry
   - Check server logs for scraper errors

3. **Check Browser Console:**
   - Open DevTools (F12) → Console tab
   - Look for: `📊 Parsed results - Federal: X State: X Local: X`
   - If shows `Local: 15` but UI shows 0 → Frontend filtering issue (date/distance)
   - If shows `Local: 0` → Backend issue (see step 2)

4. **Common Causes:**

   **State Events = 0:**
   - OpenStates API key not set: `$env:OPENSTATES_API_KEY = "your-key"`
   - Legislature not in session (expected behavior)
   - State scraper not registered in `state-events.ts`

   **Local Events = 0:**
   - Cached empty response: Delete `public/cache/local-[city]-events.json`
   - Geo-detection not working: Check lat/lng bounds in `local-meetings.ts`
   - Scraper error: Check server terminal for error logs
   - Custom scraper not in handler: Search `local-meetings.ts` for `if (city.client === 'yourcity')`

5. **Quick Fix Checklist:**
   ```powershell
   # Clear all local caches
   Remove-Item public/cache/local-*.json -Force
   
   # Verify state in sidebar
   # Check src/components/StateSidebar.tsx:
   # { code: 'NM', name: 'New Mexico', status: 'complete', notes: '...' }
   
   # Verify geo-detection
   # Check lib/functions/local-meetings.ts for state bounds check
   
   # Hard refresh browser
   # Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   ```

6. **Frontend Sources Not Showing:**
   - Even with 0 events, sources should display if available
   - Check response headers: `X-Calendar-Sources` header must be exposed
   - Frontend must check: `(events.length > 0 || sources.length > 0)` not just `(events.length > 0)`

### Calendar Sources Not Showing (Troubleshooting)

**Symptom:** Implemented scraper with `getCalendarSources()`, but frontend shows no sources button.

**Checklist:**

1. **Is the state registered in state-events.ts?**
   ```typescript
   // Check if state is in the static file handling list
   if (stateAbbr === 'XX' || ... || stateAbbr === 'YourState') {
   ```
   - If missing, add state code to the condition
   - Add to `stateNames` record: `'XX': 'Your State'`
   - Add to `fileNames` record: `'XX': 'your-state-events.json'`

2. **Does the static JSON file exist with calendarSources?**
   ```bash
   ls public/data/your-state-events.json
   cat public/data/your-state-events.json
   ```
   - **CRITICAL:** File MUST include `calendarSources` array field
   - Create it with this structure:
   ```json
   {
     "state": "XX",
     "stateName": "Your State",
     "count": 0,
     "billsCount": 0,
     "lastUpdated": "2025-12-22T00:00:00.000Z",
     "events": [],
     "calendarSources": [
       {
         "name": "Your State Legislature Calendar",
         "url": "https://state.gov/calendar",
         "type": "primary",
         "lastChecked": "2025-12-22T00:00:00.000Z",
         "status": "active",
         "notes": "Official calendar"
       }
     ],
     "note": "Your State events scraped via [method]. [Context]."
   }
   ```
   - Without `calendarSources` field, sources won't show in frontend!

3. **Does scraper have getCalendarSources()?**
   ```typescript
   getCalendarSources() {
     return [
       {
         name: 'Your State Legislature Calendar',
         url: 'https://state.gov/calendar',
         type: 'primary' as const,
         lastChecked: new Date().toISOString(),
         status: 'active' as const,
         notes: 'Official calendar'
       }
     ];
   }
   ```

4. **Test the scraper directly:**
   ```bash
   npx tsx lib/functions/test-your-state-scraper.ts
   ```
   - Should show "📁 Calendar Sources (even with 0 events)"
   - Verify sources array is not empty

5. **Check state-events response headers:**
   ```powershell
   $response = Invoke-WebRequest "http://localhost:8888/.lib/functions/state-events?state=XX" -Method GET
   $response.Headers['X-Calendar-Sources']
   ```
   - Should return JSON array of sources
   - If empty/missing, sources not being passed through

6. **Verify scraper is registered:**
   ```typescript
   // In lib/functions/utils/scrapers/index.ts
   Registry.register('XX', new YourStateScraper());
   ```

**Common Issue:** State added to registry but NOT added to state-events.ts static file list → sources never reach frontend even though scraper works.

**Quick Fix:**
1. Add state to `state-events.ts` static handling
2. Create static JSON file in `public/data/`
3. Hard refresh browser (Ctrl+Shift+R)

---

## Real-World Examples

**Tennessee** (Static HTML)
- URL: `https://wapp.capitol.tn.gov/apps/schedule/`
- Method: Cheerio parsing tables
- Chambers: House + Senate separate pages

**Arizona** (JSON API)
- URL: `https://www.azleg.gov/json/`
- Method: Direct JSON fetch
- Bonus: PDF scraping for meeting links

**Minnesota** (Hybrid)
- URL: `https://www.leg.mn.gov/cal.aspx`
- Method: Table + detail API
- Pattern: List page → API for details

**Alabama** (OpenStates + Custom Local)
- State URL: `https://alison.legislature.state.al.us/todays-schedule`
- State Method: OpenStates API (site too complex, GraphQL exists but overkill)
- Local: Birmingham (Next.js + Puppeteer) + Montgomery (Akamai bypass + Puppeteer)
- Integration: Geo-detection (lat 30.2-35.0, lng -88.5 to -84.9) auto-adds cities
- Result: 3 state + 19 local events (7 Birmingham + 12 Montgomery)

**Alaska** (OpenStates State + Trumba RSS Local)
- State URL: `https://www.akleg.gov/basis/Committee/` (BASIS system for Session 34)
- State Method: Cheerio scraping of committee detail pages (returns 0 events when not in session)
- State Result: 0 events (legislature not in session until Jan 2026)
- Local: Juneau (City and Borough) - Trumba calendar system with RSS feed
- Local URL: `https://www.trumba.com/calendars/city-and-borough-of-juneau-events.rss`
- Local Method: XML RSS parsing with xml2js library
- Local Features: Assembly, Planning Commission, Airport Board, Docks & Harbors, advisory committees
- Integration: Geo-detection (lat 54.0-72.0, lng -170.0 to -130.0) auto-adds Juneau
- Result: 0 state + 46 local events (Assembly, boards, commissions)
- Key Learning: Trumba RSS provides comprehensive municipal government meetings when state legislature not in session

**Louisiana** (Static HTML + Agenda Parsing + CivicPlus Local)
- State URL: `https://legis.la.gov/legis/ByCmte.aspx` (static table)
- State Method: Cheerio + async agenda parsing from `Agenda.aspx?m=[ID]`
- Agenda Enhancement: Extracts numbered meeting items for description field
- Local: Baton Rouge AgendaCenter (CivicPlus system, static HTML)
- Integration: Geo-detection (lat 28.9-33.0, lng -94.0 to -88.8) auto-adds Baton Rouge
- Result: 4 state (1 with agenda details) + 81 local events (Metropolitan Council)
- Tip: User said "PDF agendas" but they're actually HTML pages - always verify link type

**Kentucky** (Static HTML State + Puppeteer Local)
- State URL: `https://apps.legislature.ky.gov/legislativecalendar` (static weekly calendar)
- State Method: Cheerio parsing of `.TimeAndLocation`, `.CommitteeName`, `.Agenda` divs
- State Features: Embedded agendas (3 of 4 events have agenda descriptions)
- Local: Lexington government calendar (Puppeteer for dynamic JavaScript site)
- Local URL: `https://www.lexingtonky.gov/calendar`
- Local Method: Puppeteer with `page.evaluate()` to extract event links after JS render
- Integration: Geo-detection (lat 36.5-39.1, lng -89.6 to -81.9) auto-adds Lexington
- Result: 4 state (committee meetings) + 42 local events (councils, boards, commissions)
- Key Learning: Dynamic calendar required Puppeteer; extract dates from URLs, times from parent text

**Oregon** (OpenStates State + Puppeteer Paginated Local)
- State URL: `https://olis.oregonlegislature.gov/LIZ/Committees/Meeting/List` (often empty during interim)
- State Method: OpenStates API (legislature meets biennially in odd years)
- State Result: 1 event (Rules and Executive Appointments, Sept 29)
- Local: Portland custom CMS with pagination
- Local URL: `https://www.portland.gov/auditor/council-clerk/events` (48+ events across 3 pages)
- Local Method: Puppeteer with multi-page scraping (pages 0-2)
- Local Pattern: Extract h2 links with `/events/` URLs, parse sibling content for date/time
- Integration: Geo-detection (lat 42.0-46.3, lng -124.6 to -116.5) auto-adds Portland
- Result: 1 state + 48 local events (26 Council, 9 Committee, 1 Work Session, 12 Executive)
- Key Learning: **Pagination** - loop through pages until <10 events found, add 1s delay between requests

**Oklahoma** (Puppeteer + PDF Bill/Agenda Extraction + PrimeGov Local)
- State URL: `https://www.okhouse.gov/calendars` (dynamic Next.js calendar with date range)
- State Method: Puppeteer scraping of OK House calendar (client-rendered)
- Date/Time Parsing: Extracted from meeting notice PDF filenames (format: CMN-XX-YYYYMMDD-HHMMSS00.pdf)
- Bill Extraction: Automated PDF parsing using pdfjs-dist to extract HB/SB numbers from meeting notices
- SourceUrl: Individual committee pages (e.g., `/committees/house/approp/ap-natur`)
- Meeting Notices: PDF links included in description field for reference
- State Result: 5 events (House A&B subcommittees, current meetings are budget hearings without bills)
- Local: Oklahoma City PrimeGov portal (JSON API - similar to Legistar but different structure)
- Local URL: `https://okc.primegov.com/api/v2/PublicPortal/ListUpcomingMeetings`
- Local Method: Direct JSON API fetch + PDF agenda parsing (no Puppeteer needed)
- Local Features: Returns meeting titles, dates, times, document links (PDF/HTML agendas)
- Local PDF Parsing: Extracts up to 5 agenda items from first 3 pages using pattern matching (numbered/lettered/Roman items)
- Local Description: Includes direct PDF links + agenda item summaries (e.g., "Documents: Agenda: [PDF URL] | Agenda: Item 1; Item 2; Item 3 (+ 2 more items)")
- Local docketUrl: First PDF agenda document URL (direct link for "View Docket" button)
- Integration: Geo-detection (lat 34.5-37.0, lng -103.0 to -94.4) auto-adds Oklahoma City
- Result: 5 state + 7 local events (Housing Authority, Airport Trust, Park Commission, etc.)
- Bills: Fully automated extraction from PDFs (0 bills in current meetings - budget reviews, not bill hearings)
- Note: State requires Puppeteer + pdfjs-dist library. Local uses clean REST API with PDF parsing (24hr cache).

**Missouri** (ASP.NET Alternative)
- URL: `https://house.mo.gov/HearingsTimeOrder.aspx`
- Method: Avoided complex ViewState page
- Tip: Look for "traditional view" links

---

## Quick Commands

### Test scraper
```bash
node test-[state]-scraper.cjs
```

### Build
```bash
npm run build
```

### Check Legistar
```powershell
Invoke-RestMethod "https://webapi.legistar.com/v1/[city]/events" | Select-Object -First 3
```

### View JSON
```powershell
Get-Content "public/data/state-events.json" | ConvertFrom-Json
```

---

## Integration Checklist

After implementing state + local scrapers:

### Backend
- [ ] Scraper registered in `index.ts`
- [ ] Scraper writes to PostgreSQL via `insertEvent()` (auto-tags)
- [ ] Bills inserted via `insertBills()` if applicable
- [ ] Static JSON file created in `public/data/[state]-events.json` (fallback)
- [ ] Local cities added to `legistar-cities.ts` OR custom geo-detection
- [ ] Custom scrapers handle `sourceUrl` → `url` field mapping
- [ ] Cache invalidated: delete `public/cache/local-[city]-events.json`

### Database (NEW)
- [ ] Environment: `USE_POSTGRESQL=true`, `DATABASE_URL` set
- [ ] Connection test passes: `checkDatabaseConnection()`
- [ ] Events visible in admin panel: `/admin` DataViewer
- [ ] Tags auto-generated (check `event_tags` table)
- [ ] Export function works: `getAllStateEventsForExport('XX')`

### Scheduled Scraper (NEW)
- [ ] Runs nightly at 3 AM UTC via Netlify Functions
- [ ] Writes events to PostgreSQL first (primary)
- [ ] Exports from database to Netlify Blobs (secondary)
- [ ] Logs scraper health to `scraper_health` table
- [ ] Fallback to direct blob storage if database unavailable

### Frontend  
- [ ] Add cache-buster to local-meetings calls in `src/App.tsx` (if not present)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Verify in browser console: server logs show function invocations
- [ ] Check Network tab: responses not coming from browser cache
- [ ] Tags display correctly (from database via blobs, not client-generated)
- [ ] **CRITICAL:** Calendar sources button shows even with 0 events (see Frontend Fix below)

### Testing
```bash
# Test state scraper
npx tsx lib/functions/test-[state]-scraper.ts

# Test database write
npx tsx -e "import { insertEvent } from './lib/functions/utils/db/events.js'; /* test code */"

# Test local endpoint directly
Invoke-RestMethod "http://localhost:8888/.lib/functions/local-meetings?lat=XX&lng=XX&radius=50"

# Verify frontend sees events (browser console should show):
# 📊 Parsed results - Federal: X State: X Local: X

# Check database tags
# SELECT e.name, array_agg(et.tag_name) FROM events e 
# LEFT JOIN event_tags et ON e.id = et.event_id 
# WHERE e.state_code = 'XX' GROUP BY e.name;
```

### Production Deployment
- [ ] Puppeteer scrapers: Lambda needs 1024MB+ memory, 30s+ timeout
- [ ] `@sparticuz/chromium` binary deployed (check `external_node_modules` in `netlify.toml`)
- [ ] Environment variables set: `DATABASE_URL`, `USE_POSTGRESQL=true`, `OPENSTATES_API_KEY`, `CONGRESS_API_KEY`
- [ ] Scheduled function configured (3 AM UTC daily)
- [ ] Database connection verified in production
- [ ] Netlify Blobs enabled (automatic on deploy)

---

**Remember:** When stuck finding calendars, ASK THE USER for help! They can quickly identify the correct URL.
