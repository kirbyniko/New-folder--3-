# Docket & Bill Integration Implementation Plan

**Project:** CivicPulse Legislative Event Tracking  
**Phase:** 1 - New Hampshire Docket Enhancement  
**Start Date:** December 14, 2025  
**Target Completion:** TBD (systematic, quality-focused approach)

---

## 🎯 Project Goals

### Primary Objective
Enhance the New Hampshire scraper to extract detailed docket information including:
- ✅ Bill numbers (HB 1234, SB 567)
- ✅ Bill titles and descriptions
- ✅ Links to full bill text
- ✅ Virtual meeting URLs (Zoom, Teams)
- ✅ Bill sponsors and status
- ✅ Fiscal notes and impact analysis

### Success Criteria
1. Every NH event with a docket link shows **"View Docket"** button in UI
2. Clicking docket reveals list of bills being discussed
3. Each bill is clickable → opens full bill text
4. Bills are tagged by policy area (healthcare, education, etc.)
5. Virtual meeting links are prominent and functional
6. Data updates every 6 hours automatically

---

## 📋 Implementation Phases

### ✅ Phase 0: Planning & Documentation (COMPLETE)
- [x] Document current scraper architecture
- [x] Create `SCRAPER_ARCHITECTURE.md`
- [x] Analyze existing NH scraper implementation
- [x] Define enhanced data models
- [x] Create this implementation plan

---

### 🔄 Phase 1: NH Docket HTML Analysis (CURRENT)

#### Step 1.1: Inspect Live Docket Page
**Action:** Visit actual NH docket page and document structure

**Test URL (example):**
```
https://www.gencourt.state.nh.us/house/schedule/details.aspx?id=<event-id>
```

**Extract:**
- HTML structure for bill listings
- CSS selectors for bill numbers
- Link patterns for bill text
- Zoom link format/location
- Committee member info structure
- Document sections (agenda, bills, notes)

**Deliverable:** `NH_DOCKET_STRUCTURE.md` with:
- Screenshots of example dockets
- HTML snippets showing key elements
- CSS selector mapping
- URL patterns documented

#### Step 1.2: Create Test Scraper
**File:** `netlify/functions/test-nh-docket.ts`

```typescript
import { parseHTML } from './utils/scrapers/html-parser';

async function testDocketScrape() {
  // Test with known event ID
  const testEventId = '<known-event-id-from-03054>';
  const url = `https://www.gencourt.state.nh.us/house/schedule/details.aspx?id=${testEventId}`;
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = parseHTML(html);
  
  console.log('=== DOCKET PAGE STRUCTURE ===');
  console.log('Title:', $('h1, h2').first().text());
  console.log('Bills found:', $('.bill-item, .legislation-item, tr:has(a[href*="bill"])').length);
  
  // Test various selectors
  console.log('\n=== TESTING SELECTORS ===');
  console.log('Links containing "bill":', $('a[href*="bill"]').length);
  console.log('Links containing "HB":', $('a:contains("HB")').length);
  console.log('Links containing "SB":', $('a:contains("SB")').length);
  console.log('Links containing "zoom":', $('a[href*="zoom"]').length);
  
  // Output first few examples
  console.log('\n=== SAMPLE BILL LINKS ===');
  $('a[href*="bill"]').slice(0, 5).each((i, el) => {
    console.log(`${i + 1}. Text: ${$(el).text()} | Href: ${$(el).attr('href')}`);
  });
}

testDocketScrape().catch(console.error);
```

**Run:**
```bash
npx tsx netlify/functions/test-nh-docket.ts
```

#### Step 1.3: Document Findings
Create detailed mapping of docket page elements.

**Estimated Time:** 2-4 hours

---

### 📊 Phase 2: Data Model Updates

#### Step 2.1: Extend TypeScript Interfaces

**File:** `src/types/event.ts`

```typescript
// Add to existing LegislativeEvent interface
export interface LegislativeEvent {
  // ... existing fields ...
  
  // 🆕 Docket Information
  docketUrl?: string;            // Link to official docket page
  bills?: Bill[];                // Bills being discussed
  virtualMeetingUrl?: string;    // Zoom/Teams/WebEx link
  agendaUrl?: string;            // PDF agenda if available
  
  // 🆕 Enhanced Metadata
  sponsors?: Legislator[];       // Bill sponsors
  publicCommentAllowed?: boolean;
  registrationRequired?: boolean;
  registrationUrl?: string;
}

export interface Bill {
  // Identity
  id: string;                    // Bill number (HB 1234, SB 567)
  title: string;                 // Short title
  fullTitle?: string;            // Long title if different
  
  // Content
  description?: string;          // Bill summary
  status: BillStatus;            // Current legislative status
  
  // Links
  url: string;                   // Bill text URL
  fiscalNoteUrl?: string;        // Fiscal impact analysis
  
  // People
  primarySponsor?: Legislator;
  coSponsors?: Legislator[];
  
  // Classification
  tags?: string[];               // Policy area tags (auto-generated)
  committee?: string;            // Current committee
  
  // Metadata
  introducedDate?: string;
  lastActionDate?: string;
  lastActionText?: string;
}

export interface Legislator {
  name: string;
  party: 'R' | 'D' | 'I' | 'L' | 'G' | 'Other';
  district?: string;
  chamber: 'House' | 'Senate';
  title?: string;                // Rep, Sen, etc.
  photoUrl?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
}

export enum BillStatus {
  Introduced = 'introduced',
  InCommittee = 'in-committee',
  CommitteeReported = 'committee-reported',
  OnFloor = 'on-floor',
  PassedChamber = 'passed-chamber',
  InOtherChamber = 'in-other-chamber',
  PassedBothChambers = 'passed-both',
  SentToGovernor = 'sent-to-governor',
  Signed = 'signed',
  Vetoed = 'vetoed',
  VetoOverridden = 'veto-overridden',
  Dead = 'dead',
  Withdrawn = 'withdrawn'
}
```

#### Step 2.2: Update RawEvent Interface

**File:** `netlify/functions/utils/scrapers/base-scraper.ts`

```typescript
export interface RawEvent {
  // ... existing fields ...
  
  // 🆕 Optional docket fields
  docketUrl?: string;
  bills?: BillInfo[];
  virtualMeetingUrl?: string;
}

export interface BillInfo {
  id: string;
  title: string;
  url: string;
  sponsors?: string[];
  status?: string;
}
```

**Estimated Time:** 1-2 hours

---

### 🔧 Phase 3: NH Scraper Enhancement

#### Step 3.1: Add Docket Scraping Method

**File:** `netlify/functions/utils/scrapers/states/new-hampshire.ts`

```typescript
/**
 * Scrape docket details from event details page
 */
private async scrapeDocket(detailsUrl: string): Promise<DocketData | null> {
  try {
    this.log('📋 Scraping docket', { url: detailsUrl });
    
    const html = await this.fetchPage(detailsUrl);
    const $ = parseHTML(html);
    
    const docketData: DocketData = {
      bills: [],
      virtualMeetingUrl: undefined
    };
    
    // Extract bill information
    // (Selectors determined in Phase 1)
    $('.bill-item, a[href*="bill.aspx"]').each((_, el) => {
      const $el = $(el);
      const billNumber = this.extractBillNumber($el.text());
      const billTitle = this.extractBillTitle($el);
      const billUrl = this.resolveBillUrl($el.attr('href'));
      
      if (billNumber && billUrl) {
        docketData.bills.push({
          id: billNumber,
          title: billTitle || billNumber,
          url: billUrl,
          status: 'in-committee' // Default, can be enhanced later
        });
      }
    });
    
    // Extract virtual meeting link
    const zoomLink = $('a[href*="zoom.us"], a[href*="teams.microsoft.com"]').first().attr('href');
    if (zoomLink) {
      docketData.virtualMeetingUrl = zoomLink;
    }
    
    this.log('✅ Docket scraped', {
      bills: docketData.bills.length,
      hasZoom: !!docketData.virtualMeetingUrl
    });
    
    return docketData;
    
  } catch (error) {
    this.logError('❌ Docket scrape failed', error, { url: detailsUrl });
    return null;
  }
}

/**
 * Extract bill number from text (HB 1234, SB 567, etc.)
 */
private extractBillNumber(text: string): string | null {
  const match = text.match(/\b(HB|SB|HCR|SCR|CACR)\s*(\d+)\b/i);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : null;
}

/**
 * Extract bill title from element
 */
private extractBillTitle($el: any): string {
  // Implementation depends on HTML structure
  // May be in title attribute, adjacent text, etc.
  return $el.attr('title') || $el.text().replace(/^(HB|SB|HCR|SCR|CACR)\s*\d+\s*[:-]?\s*/i, '').trim();
}

/**
 * Resolve relative bill URL to absolute
 */
private resolveBillUrl(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith('http')) return href;
  return `https://www.gencourt.state.nh.us${href.startsWith('/') ? '' : '/'}${href}`;
}

interface DocketData {
  bills: BillInfo[];
  virtualMeetingUrl?: string;
}
```

#### Step 3.2: Integrate Docket Scraping into Main Flow

```typescript
/**
 * Main scraping method - enhanced with docket data
 */
protected async scrapeCalendar(): Promise<RawEvent[]> {
  this.log('📅 Starting NH calendar scrape (JSON endpoints)');

  const urls = await this.getPageUrls();
  const allEvents: RawEvent[] = [];

  // Fetch House calendar
  const houseEvents = await this.scrapeCalendarJSON(urls[0], 'House');
  allEvents.push(...houseEvents);

  // Fetch Senate calendar
  const senateEvents = await this.scrapeCalendarJSON(urls[1], 'Senate');
  allEvents.push(...senateEvents);

  // 🆕 Enhance with docket data
  this.log('🔍 Enriching events with docket data...');
  for (const event of allEvents) {
    if (event.detailsUrl) {
      await this.delay(this.config.requestDelay || 500); // Rate limiting
      
      const docketData = await this.scrapeDocket(event.detailsUrl);
      if (docketData) {
        event.bills = docketData.bills;
        event.virtualMeetingUrl = docketData.virtualMeetingUrl;
      }
    }
  }

  this.log('✅ NH scrape complete', {
    totalEvents: allEvents.length,
    eventsWithBills: allEvents.filter(e => e.bills && e.bills.length > 0).length,
    eventsWithZoom: allEvents.filter(e => e.virtualMeetingUrl).length
  });

  return allEvents;
}
```

#### Step 3.3: Update Event Conversion

Ensure `convertNHEventToRaw` preserves docket URL:

```typescript
private convertNHEventToRaw(nhEvent: NHCalendarEvent, chamber: string): RawEvent | null {
  // ... existing code ...
  
  const detailsUrl = nhEvent.url 
    ? `${baseUrl}${nhEvent.url}` 
    : undefined;

  return {
    // ... existing fields ...
    detailsUrl: detailsUrl,
    docketUrl: detailsUrl, // 🆕 Same as details for NH
  };
}
```

**Estimated Time:** 4-6 hours

---

### 🎨 Phase 4: UI Enhancement

#### Step 4.1: Create BillList Component

**File:** `src/components/BillList.tsx`

```tsx
import type { Bill } from '../types/event';
import { autoTagEvent } from '../utils/tagging';
import './BillList.css';

interface BillListProps {
  bills: Bill[];
  onBillClick?: (bill: Bill) => void;
}

export default function BillList({ bills, onBillClick }: BillListProps) {
  if (!bills || bills.length === 0) {
    return (
      <div className="no-bills">
        <p>📄 No bills listed for this event</p>
      </div>
    );
  }

  return (
    <div className="bill-list">
      <h4>📋 Bills on Docket ({bills.length})</h4>
      <ul className="bills">
        {bills.map(bill => {
          // Auto-tag bill based on title/description
          const tags = autoTagEvent({
            name: bill.title,
            description: bill.description || ''
          });

          return (
            <li key={bill.id} className="bill-item">
              <div className="bill-header">
                <strong className="bill-number">{bill.id}</strong>
                <span className="bill-status">{bill.status}</span>
              </div>
              
              <p className="bill-title">{bill.title}</p>
              
              {tags.length > 0 && (
                <div className="bill-tags">
                  {tags.map(tag => (
                    <span key={tag} className="bill-tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="bill-actions">
                <a 
                  href={bill.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bill-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBillClick?.(bill);
                  }}
                >
                  📜 Read Full Text →
                </a>
                
                {bill.fiscalNoteUrl && (
                  <a 
                    href={bill.fiscalNoteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bill-link fiscal-note"
                  >
                    💰 Fiscal Note →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

**File:** `src/components/BillList.css`

```css
.bill-list {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.bill-list h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.bills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bill-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.bill-item:hover {
  border-color: #8b5cf6;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.bill-number {
  color: #8b5cf6;
  font-size: 1rem;
  font-weight: 600;
}

.bill-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  text-transform: capitalize;
}

.bill-title {
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.bill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.bill-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 3px;
}

.bill-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bill-link {
  color: #8b5cf6;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}

.bill-link:hover {
  color: #6d28d9;
  text-decoration: underline;
}

.bill-link.fiscal-note {
  color: #059669;
}

.bill-link.fiscal-note:hover {
  color: #047857;
}

.no-bills {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.no-bills p {
  margin: 0;
}
```

#### Step 4.2: Update Event Card to Show Bills

**File:** `src/components/TabbedEvents.tsx`

Add BillList import and usage:

```tsx
import BillList from './BillList';

// In event card rendering:
<article key={`${event.level}-${event.id}`} className="event-card">
  {/* ... existing header/name/tags ... */}
  
  {/* 🆕 Docket & Virtual Meeting Section */}
  {(event.docketUrl || event.virtualMeetingUrl) && (
    <div className="event-docket-section">
      {event.docketUrl && (
        <a 
          href={event.docketUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="docket-link"
        >
          📋 View Docket →
        </a>
      )}
      
      {event.virtualMeetingUrl && (
        <a 
          href={event.virtualMeetingUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="zoom-link"
        >
          🎥 Join Virtual Meeting →
        </a>
      )}
    </div>
  )}
  
  {/* 🆕 Bill List */}
  {event.bills && event.bills.length > 0 && (
    <BillList 
      bills={event.bills}
      onBillClick={(bill) => {
        console.log('Bill clicked:', bill);
        // Track analytics, etc.
      }}
    />
  )}
  
  {/* ... rest of event card ... */}
</article>
```

**Add CSS:**

```css
.event-docket-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.docket-link,
.zoom-link {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.docket-link {
  background: #8b5cf6;
  color: white;
}

.docket-link:hover {
  background: #7c3aed;
  transform: translateY(-1px);
}

.zoom-link {
  background: #2563eb;
  color: white;
}

.zoom-link:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
```

**Estimated Time:** 3-4 hours

---

### 🧪 Phase 5: Testing & Validation

#### Step 5.1: Unit Tests

**File:** `netlify/functions/tests/nh-docket-scraper.test.ts`

```typescript
import { NewHampshireScraper } from '../utils/scrapers/states/new-hampshire';

describe('NH Docket Scraper', () => {
  let scraper: NewHampshireScraper;
  
  beforeEach(() => {
    scraper = new NewHampshireScraper();
  });
  
  test('extracts bill numbers correctly', () => {
    // Test bill number extraction
    expect(extractBillNumber('HB 1234 - Title')).toBe('HB 1234');
    expect(extractBillNumber('SB567: Another Bill')).toBe('SB 567');
    expect(extractBillNumber('No bill here')).toBeNull();
  });
  
  test('scrapes docket with bills', async () => {
    // Test with real event ID
    const events = await scraper.scrape();
    const eventWithDocket = events.find(e => e.bills && e.bills.length > 0);
    
    expect(eventWithDocket).toBeDefined();
    expect(eventWithDocket?.bills?.length).toBeGreaterThan(0);
    expect(eventWithDocket?.bills?.[0]).toHaveProperty('id');
    expect(eventWithDocket?.bills?.[0]).toHaveProperty('url');
  });
});
```

#### Step 5.2: Integration Tests

Test full flow:
1. Scrape NH calendar
2. Extract docket URLs
3. Scrape docket pages
4. Parse bill information
5. Validate data structure
6. Check UI rendering

#### Step 5.3: Manual Testing Checklist

- [ ] Events from 03054 ZIP code show docket links
- [ ] "View Docket" button appears and works
- [ ] Bill list renders correctly
- [ ] Bill numbers are formatted properly (HB 1234, not HB1234)
- [ ] Bill titles are readable and complete
- [ ] Clicking bill opens correct bill text page
- [ ] Virtual meeting links work (test Zoom redirect)
- [ ] Tags are applied to bills appropriately
- [ ] Mobile view is responsive
- [ ] Loading states are smooth
- [ ] Error handling is graceful (missing docket, etc.)

**Estimated Time:** 4-6 hours

---

### 🚀 Phase 6: Deployment & Monitoring

#### Step 6.1: Environment Variables

No new environment variables needed (using existing NH scraper setup).

#### Step 6.2: Deployment Checklist

- [ ] All TypeScript compiles without errors
- [ ] Tests pass locally
- [ ] Build succeeds (`npm run build`)
- [ ] Preview deployment tested
- [ ] Cache invalidation tested
- [ ] Rate limiting verified
- [ ] Error logging reviewed
- [ ] Performance metrics baseline

#### Step 6.3: Rollout Strategy

**Stage 1: Canary (10% traffic)**
- Monitor error rates
- Check docket scraping success rate
- Validate bill extraction accuracy

**Stage 2: Gradual (50% traffic)**
- Monitor performance impact
- Check cache hit rates
- Gather user feedback

**Stage 3: Full Rollout (100%)**
- Announce new feature
- Update documentation
- Monitor usage analytics

**Estimated Time:** 2-3 hours

---

## 📊 Success Metrics

### Technical Metrics
- **Docket Scrape Success Rate:** > 95%
- **Bill Extraction Accuracy:** > 98%
- **Average Scrape Time:** < 2 seconds per docket
- **Cache Hit Rate:** > 80%
- **Error Rate:** < 2%

### User Metrics
- **Docket Click-Through Rate:** Track engagement
- **Bill Link Clicks:** Measure interest in legislation
- **Virtual Meeting Joins:** Track remote participation

### Data Quality Metrics
- **Events with Dockets:** % of NH events with docket data
- **Bills per Event:** Average number of bills
- **Complete Bill Records:** % with title, URL, and tags

---

## 🔄 Future Enhancements

### Phase 2: Bill Status Tracking
- Scrape bill status from NH legislature site
- Track bill progress through committees
- Show voting records
- Alert on status changes

### Phase 3: Legislator Profiles
- Scrape legislator information
- Show photos and bios
- Display voting history
- Contact information

### Phase 4: Multi-State Rollout
- Apply NH docket model to CA
- Adapt to NY API
- Custom scrapers for TX, FL, PA
- Unified docket interface

### Phase 5: Advanced Features
- AI bill summarization
- Impact analysis
- Constituent tracking
- Testify remotely integration

---

## 📝 Notes & Considerations

### Rate Limiting
- NH allows ~20 requests/minute
- Add 500ms delay between docket scrapes
- Implement exponential backoff on errors

### Caching Strategy
- Cache dockets for 6 hours (same as events)
- Invalidate on manual refresh
- Separate cache keys for dockets vs events

### Error Handling
- If docket scrape fails, show event without bills
- Log errors but don't block event display
- Provide fallback "View on Official Site" link

### Performance
- Docket scraping adds ~500ms per event
- Consider parallel fetching with Promise.all()
- Limit to first 20 events if needed

### Data Privacy
- No personal information scraped
- All data is public legislative records
- Follow NH robots.txt guidelines

---

## 🎓 Learning Resources

- [NH Legislature Website](https://www.gencourt.state.nh.us/)
- [NH House Schedule](https://www.gencourt.state.nh.us/house/schedule/)
- [NH Senate Schedule](https://www.gencourt.state.nh.us/senate/schedule/)
- [NH Bill Search](https://www.gencourt.state.nh.us/bill_status/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Ready to Begin?** Start with Phase 1, Step 1.1: Inspect a live NH docket page and document the HTML structure. Take your time and be thorough - quality over speed! 🎯
