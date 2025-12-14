# State Legislative Scraper System

## 📖 Overview

This is a comprehensive, production-ready web scraping system for collecting legislative event data from all 50 US state legislatures. It's designed to handle the unique challenges of scraping government websites:

- **50 different HTML structures** (one per state)
- **Unreliable websites** that break frequently
- **Rate limiting** to avoid IP bans
- **Graceful degradation** (fallback to OpenStates API)
- **Detailed logging** for debugging and maintenance

---

## 🏗️ Architecture

### Core Components

```
netlify/functions/utils/scrapers/
├── base-scraper.ts          # Abstract base class for all scrapers
├── scraper-registry.ts      # Central registry managing all scrapers
├── cache-manager.ts         # In-memory caching layer
├── html-parser.ts           # Cheerio wrapper with utilities
├── date-parser.ts           # Parse various date formats
├── index.ts                 # Entry point & initialization
└── states/
    ├── new-hampshire.ts     # NH scraper (IMPLEMENTED)
    ├── california.ts        # CA scraper (TODO)
    ├── texas.ts             # TX scraper (TODO)
    └── ... 47 more states
```

### Data Flow

```
User Request (ZIP 03054, NH)
    ↓
state-events.ts (Netlify Function)
    ↓
1. Check Cache (30min TTL)
    ├─ HIT → Return cached data ✅
    └─ MISS → Continue
    ↓
2. Try Custom Scraper (ScraperRegistry.get('NH'))
    ├─ Enabled & Succeeds → Cache & Return ✅
    ├─ Disabled → Skip to fallback
    └─ Fails → Log error, continue to fallback
    ↓
3. Fallback to OpenStates API
    └─ Return OpenStates data (limited) ✅
```

---

## 🔧 How to Add a New State Scraper

### Step 1: Create State File

```typescript
// netlify/functions/utils/scrapers/states/your-state.ts
import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

export class YourStateScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'XX',
      stateName: 'Your State',
      websiteUrl: 'https://legislature.yourstate.gov/calendar',
      reliability: 'medium',
      updateFrequency: 6, // Hours
      maxRequestsPerMinute: 20
    };
    super(config);
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    // 1. Fetch HTML
    const html = await this.fetchPage(this.config.websiteUrl);
    const $ = parseHTML(html, 'YourState Calendar');

    // 2. Extract events (customize based on website structure)
    const events: RawEvent[] = [];
    
    $('table.calendar tr').each((i, row) => {
      // Parse each row
      const name = $(row).find('td.event-name').text();
      const dateStr = $(row).find('td.date').text();
      // ... extract other fields
      
      events.push({
        name,
        date: new Date(dateStr),
        location: 'State Capitol',
        // ... other fields
      });
    });

    return events;
  }
}
```

### Step 2: Register in Index

```typescript
// netlify/functions/utils/scrapers/index.ts
import { YourStateScraper } from './states/your-state';

export async function initializeScrapers(): Promise<void> {
  // ... existing scrapers
  ScraperRegistry.register('XX', new YourStateScraper());
}
```

### Step 3: Test

```bash
# Search for events in your state
curl "http://localhost:8888/.netlify/functions/state-events?state=XX"
```

---

## 📊 Logging System

Every component has **detailed logging** for debugging:

### Scraper Logs

```
[SCRAPER:NH] 🏗️ Scraper initialized
[SCRAPER:NH] 🚀 Starting scrape
[SCRAPER:NH] 🌐 Fetching page { url: '...', attempt: 1 }
[SCRAPER:NH] ✅ Page fetched { size: '45KB', status: 200 }
[SCRAPER:NH] 📦 Raw events scraped { count: 12 }
[SCRAPER:NH] 🔄 Transforming events { count: 12 }
[SCRAPER:NH] ✅ Scrape successful { eventsFound: 8, duration: '1234ms' }
```

### Registry Logs

```
[REGISTRY] ✅ Registered scraper { state: 'NH', totalScrapers: 1 }
[REGISTRY] 📊 Registry Status { totalScrapers: 10, enabled: 8, disabled: 2 }
[REGISTRY] ⚠️ Disabled scrapers [ { state: 'TX', failures: 3, error: '...' } ]
```

### Cache Logs

```
[CACHE] ❌ Miss { key: 'scraper:NH:events' }
[CACHE] 💾 Set { key: 'scraper:NH:events', ttl: '1800s', size: 1 }
[CACHE] ✅ Hit { key: 'scraper:NH:events', age: '234s' }
```

### HTML Parser Logs

```
[HTML-PARSER] ✅ Parsed HTML { context: 'NH House Calendar', size: '45KB', title: 'House Calendar' }
[HTML-PARSER] 📊 Parsing table { selector: 'table.calendar' }
[HTML-PARSER] 📋 Table headers { headers: ['Date', 'Committee', 'Time'] }
[HTML-PARSER] ✅ Table parsed { rows: 15, sample: {...} }
```

### Date Parser Logs

```
[DATE-PARSER] 📅 Parsing date { input: 'January 15, 2025 at 10:00 AM' }
[DATE-PARSER] ✅ Date parsed { output: '2025-01-15T10:00:00.000Z', parser: 'parseWithTime' }
```

---

## 🛡️ Error Handling & Health Tracking

### Automatic Failure Detection

```typescript
// After 3 consecutive failures, scraper auto-disables
scraper.getHealth()
// {
//   stateCode: 'NH',
//   enabled: false,  // Auto-disabled
//   consecutiveFailures: 3,
//   lastError: 'Timeout fetching page',
//   lastAttempt: Date(...)
// }
```

### Manual Control

```typescript
// Disable a scraper
ScraperRegistry.disable('NH');

// Re-enable after fixing
ScraperRegistry.enable('NH');
ScraperRegistry.resetHealth('NH');
```

### Health Check

```typescript
// Check all scrapers
const stats = await ScraperRegistry.healthCheck();
console.log(stats);
// {
//   totalScrapers: 10,
//   enabledScrapers: 8,
//   disabledScrapers: 2,
//   recentSuccesses: 7,
//   recentFailures: 1
// }
```

---

## 📦 Caching Strategy

### Cache Keys

- **Format**: `scraper:{STATE}:events`
- **TTL**: 30 minutes (1800 seconds)
- **Storage**: In-memory (Netlify Function instance)

### Cache Flow

```typescript
// Check cache
const cached = CacheManager.get('scraper:NH:events');
if (cached) {
  return cached; // Fast response!
}

// Cache miss - scrape fresh
const events = await scraper.scrape();
CacheManager.set('scraper:NH:events', events, 1800);
```

### Cache Stats

```typescript
CacheManager.getStats()
// {
//   hits: 45,
//   misses: 12,
//   size: 8,
//   hitRate: 0.79  // 79% cache hit rate
// }
```

---

## 🎯 HTML Parsing Utilities

### Common Patterns

#### Parse Table

```typescript
const rows = parseTable($, 'table.calendar');
// Returns: Array<Record<string, string>>
// [{ Date: '1/15/25', Committee: 'Finance', ... }]
```

#### Extract Links

```typescript
const links = extractLinks($, '.events', baseUrl);
// Returns: [{ text: 'View Details', href: 'https://...' }]
```

#### Find by Text

```typescript
const element = findByText($, 'td', 'Finance Committee');
// Returns: Cheerio element
```

---

## 📅 Date Parsing

### Supported Formats

```typescript
parseDate('January 15, 2025')        // ✅
parseDate('1/15/2025')               // ✅
parseDate('2025-01-15')              // ✅
parseDate('Next Tuesday')            // ✅
parseDate('Tomorrow')                // ✅
parseDate('Jan 15')                  // ✅ (assumes current/next year)
```

### With Time

```typescript
parseDateTimeString('January 15, 2025 at 10:00 AM')
// Returns: {
//   date: Date(2025-01-15T10:00:00),
//   hasTime: true,
//   timeString: '10:00 AM',
//   confidence: 'high'
// }
```

---

## 🚀 Performance

### Rate Limiting

- Default: **30 requests/minute**
- Configurable per scraper
- Automatic backoff if limit reached

```typescript
// In scraper config
maxRequestsPerMinute: 20,
requestDelay: 500  // 500ms between requests
```

### Timeout Protection

- HTTP requests: **10 second timeout**
- Automatic retry: **3 attempts** with exponential backoff
- Prevents hanging functions

---

## 📈 Monitoring

### Registry Status

```bash
# View all scrapers
ScraperRegistry.logStatus()
```

Output:
```
[REGISTRY] 📊 Registry Status {
  totalScrapers: 10,
  enabled: 8,
  disabled: 2,
  registeredStates: ['NH', 'CA', 'TX', ...]
}
[REGISTRY] ⚠️ Disabled scrapers [
  { state: 'TX', failures: 3, error: 'Timeout' }
]
```

### Per-Scraper Health

```typescript
const health = scraper.getHealth();
console.log(health);
// {
//   stateCode: 'NH',
//   enabled: true,
//   lastAttempt: Date(...),
//   lastSuccess: Date(...),
//   consecutiveFailures: 0,
//   lastError: null,
//   eventsScraped: 8
// }
```

---

## 🔍 Debugging Tips

### 1. Enable Verbose Logging

All logs are enabled by default with emoji prefixes for easy scanning.

### 2. Check Scraper Health

```typescript
// In state-events.ts function
const scraper = ScraperRegistry.get('NH');
console.log(scraper?.getHealth());
```

### 3. Inspect HTML Structure

```typescript
// In scraper, log raw HTML sample
const html = await this.fetchPage(url);
console.log('HTML Sample:', html.substring(0, 1000));
```

### 4. Test Date Parsing

```typescript
import { parseDate } from './date-parser';
const result = parseDate('January 15, 2025 at 10:00 AM');
console.log(result);
```

### 5. Cache Inspection

```typescript
CacheManager.logStats();
console.log(CacheManager.getAllEntries());
```

---

## 🛠️ Maintenance

### When a Scraper Breaks

**Symptoms:**
- Scraper auto-disables after 3 failures
- Logs show: `[SCRAPER:XX] ❌ Scrape failed`

**Steps:**

1. **Inspect the website** - Did HTML structure change?
2. **Update selectors** in state scraper file
3. **Test locally** with direct scraper call
4. **Re-enable** after fixing:
   ```typescript
   ScraperRegistry.resetHealth('XX');
   ```

### Regular Maintenance

- **Weekly**: Review disabled scrapers
- **Monthly**: Update 2-3 broken scrapers
- **Quarterly**: Add new state scrapers

---

## 📋 Roadmap

### Phase 1: Infrastructure ✅
- [x] Base scraper class
- [x] Registry system
- [x] HTML parser utilities
- [x] Date parser
- [x] Caching
- [x] NH scraper (proof of concept)

### Phase 2: Tier 1 States (10 states)
- [x] NH - New Hampshire
- [ ] CA - California
- [ ] TX - Texas
- [ ] NY - New York
- [ ] FL - Florida
- [ ] IL - Illinois
- [ ] PA - Pennsylvania
- [ ] OH - Ohio
- [ ] MI - Michigan
- [ ] MA - Massachusetts

### Phase 3: Tier 2 States (20 states)
- [ ] States with structured calendars
- [ ] States with iCal feeds

### Phase 4: Tier 3 States (20 states)
- [ ] PDF-only calendars
- [ ] Complex multi-page sites

---

## 📝 Code Examples

### Complete Scraper Template

See `states/new-hampshire.ts` for a fully documented example with:
- Multi-page scraping (House + Senate)
- Table parsing
- List parsing
- Div-based layouts
- Comprehensive error handling
- Detailed logging

---

## 🤝 Contributing

When adding a new state scraper:

1. **Document the website structure** in comments
2. **Add comprehensive logging** at each step
3. **Handle errors gracefully** (don't crash on missing elements)
4. **Test with real data** before committing
5. **Update this README** with state-specific notes

---

## 🎓 Learning Resources

- **Cheerio**: https://cheerio.js.org/
- **date-fns**: https://date-fns.org/
- **Netlify Functions**: https://docs.netlify.com/functions/overview/

---

**Built with ❤️ for civic engagement**
