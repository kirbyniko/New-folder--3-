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
Events crash without `level: "state"` field

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
