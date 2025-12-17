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
│  └─ No API? → Use OpenStates
│
└─ Can't find after 10min? → ASK USER
```

---

## Implementation Patterns

### 1. Static HTML (Tennessee, South Carolina)

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

### 3. OpenStates Fallback (Georgia, Alabama)

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

**Client-Side Rendered (React/Next.js)**
- Symptoms: Skeleton loaders, empty HTML source, data loads after render
- Example: Birmingham, AL (Next.js calendar)
- Solution: **Puppeteer**

**Security Blocks (Akamai/Cloudflare)**
- Symptoms: 403 Forbidden, "Access Denied", edgesuite.net error
- Example: Montgomery, AL (Akamai protection)
- Solution: **Puppeteer** bypasses bot detection

#### Puppeteer Pattern

```typescript
import { scrapeWithPuppeteer } from '../puppeteer-helper';

const events = await scrapeWithPuppeteer(url, {
  waitFor: '.calendar-grid', // CSS selector or ms
  evaluate: async (page) => {
    await new Promise(r => setTimeout(r, 3000)); // Let data load
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event')).map(el => ({
        title: el.querySelector('h3')?.textContent?.trim(),
        date: el.querySelector('.date')?.textContent?.trim(),
        url: el.querySelector('a')?.href
      }));
    });
  }
});
```

**Setup:**
```bash
npm install puppeteer @sparticuz/chromium
```

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
Events crash without `level: "state"` field

### Generic sourceUrl  
Use actual calendar page, not homepage:
- ❌ `https://state.gov/`
- ✅ `https://state.gov/calendar`

### No Local Events
- Check Legistar first
- City website may be inaccessible
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

**Alabama** (OpenStates)
- URL: `https://alison.legislature.state.al.us/todays-schedule`
- Method: OpenStates API (site too complex)
- Note: GraphQL exists but OpenStates simpler

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

**Remember:** When stuck finding calendars, ASK THE USER for help! They can quickly identify the correct URL.
