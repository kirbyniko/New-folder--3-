# State Bill Extraction Patterns

## Overview

When scraping bills from 50 state legislatures, you'll encounter **two main architectures**:

### Pattern 1: Direct Bill Extraction (Simple)
**Example:** Pennsylvania
- ✅ Bills listed directly on event pages
- ✅ No separate docket pages
- ✅ Simple regex extraction
- ✅ No mapping builders needed

**When to use:**
- Bills appear in meeting descriptions/agendas
- Event pages have full bill information
- No JavaScript-heavy separate pages

### Pattern 2: Separate Docket Pages (Complex)
**Example:** New Hampshire
- ⚠️ Bills on separate pages (not in event listings)
- ⚠️ JavaScript-loaded pages
- ⚠️ Requires committee ID mapping
- ⚠️ Needs mapping builder tools

**When to use:**
- Bills only on linked pages (not in event HTML)
- Committee pages load via JavaScript
- Need semi-static mappings (IDs, chapters, codes)

---

## Pattern 1: Direct Bill Extraction

### Pennsylvania Example

```typescript
// No mapping needed! Bills in event description:
// "Voting meeting on HB 469, HB 513, HB 562"

private extractBills(text: string): string[] {
  const billPattern = /\b([HS]B)\s+(\d+)\b/gi;
  const matches = text.matchAll(billPattern);
  const bills: string[] = [];
  for (const match of matches) {
    bills.push(`${match[1].toUpperCase()} ${match[2]}`);
  }
  return [...new Set(bills)];
}
```

**Advantages:**
- Fast (no extra network calls)
- Simple (regex only)
- No maintenance (no mappings to update)

**States using this pattern:**
- Pennsylvania ✅ (10+ events with bills)
- [More to be discovered...]

---

## Pattern 2: Mapping Builder for Separate Dockets

### The Problem (New Hampshire Example)

When bills are on separate pages that are hard to scrape but rarely change:
- Committee IDs and chapters (NH: `id=1451&txtchapternumber=19-P:1`)
- JavaScript-loaded docket pages
- District mappings
- Member rosters
- Building/room codes

**Bad approach:** Scrape at runtime
- Slow (adds 5-10 seconds per scrape)
- Fragile (JavaScript-heavy pages)
- Wasteful (same data scraped repeatedly)
- Complex (headless browsers in production)

**Good approach:** Build mappings once, hardcode them
- Fast (zero overhead at runtime)
- Reliable (static data in code)
- Simple (no special dependencies)
- Maintainable (update manually when needed)

### Architecture for Pattern 2

```
┌─────────────────────────────────────────────────────┐
│                    PRODUCTION                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  State Scraper (new-hampshire.ts)            │  │
│  │                                               │  │
│  │  const committees = {                        │  │
│  │    'COMMITTEE A': { id: '1451', ... },      │  │
│  │    'COMMITTEE B': { id: '1452', ... }       │  │
│  │  };                                          │  │
│  │                                               │  │
│  │  // Fast! No network calls, no browser       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              MAINTENANCE (Manual)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  Mapping Builder                             │  │
│  │  (build-nh-committee-mappings.js)            │  │
│  │                                               │  │
│  │  Uses Puppeteer to scrape JavaScript pages  │  │
│  │  Outputs TypeScript-ready code              │  │
│  │  Run ONCE, copy output into scraper         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### When to Run Builders

- ✅ Initial setup for new state
- ✅ Annual maintenance check
- ✅ When logs show "mapping not found" errors  
- ✅ After state website redesign
- ❌ NOT on every scrape
- ❌ NOT in CI/CD pipeline
- ❌ NOT triggered automatically

### For New Hampshire (Current Example)

**Setup:**
```bash
npm install puppeteer  # One-time install
npm run build-mappings:nh
```

**Output:**
```typescript
const knownCommittees = {
  'STATE COMMISSION ON AGING': { id: '1451', chapter: '19-P:1' },
  'STATE VETERANS ADVISORY COMMITTEE': { id: '1234', chapter: '115:1' },
  // ... 30 more committees
};
// Last updated: 12/15/2025
```

**Copy & Paste** into `new-hampshire.ts` → Commit → Deploy → Done!

**Re-run when needed** (maybe once a year, if ever)

## Expanding to Other States

### State-Specific Challenges

| State | Challenge | Builder Approach |
|-------|-----------|------------------|
| **NH** | JavaScript-loaded committees | Puppeteer |
| **CA** | District → Member mapping | Static scrape |
| **TX** | Room codes for locations | API call + parse |
| **FL** | Committee schedule IDs | Form POST |
| **NY** | Custom bill numbering | Regex + lookup table |

### Template for New State

Create `tools/build-[state]-mappings.js`:

```javascript
import puppeteer from 'puppeteer';

async function buildStateMappings() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // 1. Navigate to data source
  await page.goto('https://legislature.state.gov/data-page');
  
  // 2. Extract data
  const mappings = await page.evaluate(() => {
    // Your scraping logic here
    return { /* extracted data */ };
  });
  
  // 3. Output TypeScript format
  console.log('const STATE_MAPPINGS = {');
  Object.entries(mappings).forEach(([key, value]) => {
    console.log(`  '${key}': ${JSON.stringify(value)},`);
  });
  console.log('};');
  console.log(`// Last updated: ${new Date().toLocaleDateString()}`);
  
  await browser.close();
}

buildStateMappings();
```

Add to `package.json`:
```json
"scripts": {
  "build-mappings:[state]": "node tools/build-[state]-mappings.js"
}
```

## Benefits at Scale

### For 50 States

**Without builders:**
- Runtime: 50 states × 10 sec overhead = **8+ minutes per scrape**
- Complexity: Puppeteer in production
- Reliability: 50 points of JavaScript failure

**With builders:**
- Runtime: 50 states × 0 sec overhead = **instant**
- Complexity: Simple static mappings
- Reliability: Rock solid (data is in code)
- Maintenance: ~1 hour per year to update all states

### ROI Calculation

**Initial investment:**
- 50 states × 30 min to build tool = 25 hours

**Ongoing savings:**
- Every scrape: 8 minutes saved
- Per day (hourly scrapes): 8 min × 24 = 192 min saved
- Per year: ~2000 hours saved
- **Payback time: < 1 day**

## Best Practices

### 1. Document Last Updated Date
```typescript
const committees = {
  // ... mappings
};
// Last verified: December 15, 2025
// Next check: December 2026
```

### 2. Add Validation in Production
```typescript
if (!this.committeeIdMap.has(committee)) {
  this.log('⚠️ Unmapped committee - run build-mappings:nh', { committee });
}
```

### 3. Keep Builders Simple
- No complex dependencies
- Clear output format
- Error messages with troubleshooting
- Works offline after initial run

### 4. Version Control
- Commit builders to `/tools`
- Commit mappings in scrapers
- Track changes over time
- Easy rollback if needed

### 5. Monitor for Staleness
```typescript
const LAST_UPDATED = new Date('2025-12-15');
const AGE_DAYS = (Date.now() - LAST_UPDATED) / (1000 * 60 * 60 * 24);

if (AGE_DAYS > 365) {
  this.log('⚠️ Mappings over 1 year old - consider updating');
}
```

## Troubleshooting

### Builder doesn't find data
1. Check if website changed structure
2. Inspect page manually in browser
3. Check network tab for AJAX calls
4. May need to adjust selectors/timing

### Mapping becomes invalid
1. Logs will show errors
2. Run builder to get fresh data
3. Copy new output
4. Commit and redeploy

### Builder takes too long
- Add `{ timeout: 60000 }` to page.goto
- Reduce `waitForTimeout` if possible
- Check network speed

## Migration Path

### Phase 1: NH Only (Current)
- ✅ Builder tool created
- 📝 Run manually to populate mappings
- 🚀 Deploy with hardcoded data

### Phase 2: Top 10 States
- Create builders for each state
- Follow same pattern
- Document state-specific quirks

### Phase 3: All 50 States
- Standardize builder interface
- Create master script to run all builders
- Annual maintenance routine

## Summary

### Pattern Decision Matrix

| Factor | Direct Extraction (PA) | Mapping Builder (NH) |
|--------|----------------------|---------------------|
| **Bills in event HTML?** | ✅ Yes | ❌ No (separate pages) |
| **JavaScript required?** | ❌ No | ✅ Yes (docket pages) |
| **Mapping builder needed?** | ❌ No | ✅ Yes |
| **Runtime speed** | ⚡⚡⚡ Instant | ⚡⚡ Fast (once mapped) |
| **Maintenance effort** | ⭐ Zero | ⭐⭐ Periodic updates |
| **Implementation time** | 🕐 30 min | 🕐🕐 2-3 hours |
| **Complexity** | Simple regex | Medium (Puppeteer tools) |

### State Coverage

**✅ Pattern 1 (Direct Extraction):**
- Pennsylvania: 19 events, 10 with bills

**⚠️ Pattern 2 (Mapping Builder Required):**
- New Hampshire: 63 events, 1 committee mapped (31 more needed)

**🔍 To Be Determined:**
- California, Texas, Florida, New York, Illinois, Ohio, Georgia, North Carolina, Michigan (9 states)

### Key Insights

**For Pattern 1 (Direct):**
- Bills listed directly in meeting agendas
- Simple regex extraction
- Zero maintenance
- Preferred approach when available

**For Pattern 2 (Mapping):**
- Semi-static data should be treated as **build-time dependencies**, not runtime data
- Build mappings offline (manual tool)
- Hardcode in scraper
- Update when needed (rarely)

**Benefits of mapping builder approach:**
- ⚡ Instant runtime performance
- 🛡️ Reliable and predictable  
- 🔧 Simple maintenance
- 📈 Scales to 50 states easily

---

**Recommendation:** Always check if Pattern 1 works first. Only use Pattern 2 when bills are on separate, hard-to-scrape pages.
