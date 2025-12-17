# State & Local Scraper Guide (Quick Reference)

**Version 1.2** | Condensed for AI context efficiency

---

## Process Overview

**Time:** 2-4 hours per state + capital city
**Pattern:** Always attempt State + Local coverage

### Workflow
1. **Research** (15min) - Find calendar URLs
2. **Test** (10min) - Check structure (HTML/API/SPA)
3. **Implement** (1-2hr) - Build scraper using patterns
4. **Integrate** (30min) - Register + create JSON
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

### 4. Puppeteer for Dynamic Calendars (Lexington, Birmingham)

**When to use:** Calendar is JavaScript-rendered (empty view-source), no API available

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

**Key Points:**
- Use `page.evaluate()` to run code in browser context (has access to `document`)
- Wait 3-6 seconds for dynamic content to load
- Extract dates from URLs when possible (more reliable than parsing text)
- Look for time patterns in parent elements: `– 4:30 p.m.` or `– 11 a.m.`
- Cache results (24hr) since Puppeteer is slower

### 5. OpenStates Fallback (Georgia, Alabama)

```typescript
async scrapeCalendar(): Promise<RawEvent[]> {
  const url = `https://v3.openstates.org/events?jurisdiction=${this.jurisdictionId}`;
  const response = await fetch(url, {
    headers: { 'X-API-KEY': process.env.OPENSTATES_API_KEY }
  });
  const data = await response.json();
  return data.results.map(this.parseOpenStatesEvent);
}
```

### 4. Multi-Chamber (Missouri, Minnesota)

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

### 5. Puppeteer (Client-Rendered/Blocked Sites)

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
  sourceUrl: "https://state.gov/calendar", // Actual calendar page
  virtualMeetingUrl: "https://state.gov/video/123",
  bills: [...]  // Optional
}
```

---

## Integration Checklist

### 1. Create Scraper
```bash
netlify/functions/utils/scrapers/states/[state].ts
```

### 2. Register
```typescript
// In netlify/functions/utils/scrapers/index.ts
import { StateScraper } from './states/state';
Registry.register('XX', new StateScraper());
```

### 3. Add Static File Handler
```typescript
// In netlify/functions/state-events.ts
if (stateAbbr === 'XX') {
  const stateNames = { 'XX': 'State Name' };
  const fileNames = { 'XX': 'state-events.json' };
  // ...
}
```

### 4. Create JSON
```bash
public/data/state-events.json
```

### 5. Update Sidebar
```typescript
// In src/components/StateSidebar.tsx
{ code: 'XX', name: 'State Name', status: 'complete', notes: 'X events' }
```

### 6. Test
```bash
npm run build
# Check for TypeScript errors
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

### Duplicate Event IDs
**Symptoms:** React warnings "Encountered two children with the same key"  
**Cause:** ID generation creates collisions (e.g., using `substring(0, 12)` on base64)  
**Fix:** Use timestamp + unique hash: `${city}-${date.getTime()}-${titleHash}`

### Generic sourceUrl  
Use actual calendar page, not homepage:
- ❌ `https://state.gov/`
- ✅ `https://state.gov/calendar`

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
fetch(`/.netlify/functions/local-meetings?lat=${lat}&lng=${lng}&radius=${radius}${cacheBuster}`)
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
- [ ] Static JSON file created in `public/data/[state]-events.json`
- [ ] Local cities added to `legistar-cities.ts` OR custom geo-detection
- [ ] Custom scrapers handle `sourceUrl` → `url` field mapping
- [ ] Cache invalidated: delete `public/cache/local-[city]-events.json`

### Frontend  
- [ ] Add cache-buster to local-meetings calls in `src/App.tsx` (if not present)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Verify in browser console: server logs show function invocations
- [ ] Check Network tab: responses not coming from browser cache

### Testing
```bash
# Test state scraper
npx tsx netlify/functions/test-[state]-scraper.ts

# Test local endpoint directly
Invoke-RestMethod "http://localhost:8888/.netlify/functions/local-meetings?lat=XX&lng=XX&radius=50"

# Verify frontend sees events (browser console should show):
# 📊 Parsed results - Federal: X State: X Local: X
```

### Production Deployment
- [ ] Puppeteer scrapers: Lambda needs 1024MB+ memory, 30s+ timeout
- [ ] `@sparticuz/chromium` binary deployed (check `external_node_modules` in `netlify.toml`)
- [ ] Environment variables set: `OPENSTATES_API_KEY`, `CONGRESS_API_KEY`

---

**Remember:** When stuck finding calendars, ASK THE USER for help! They can quickly identify the correct URL.
