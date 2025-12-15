# Legislative Event Scraper Architecture

**Last Updated:** December 14, 2025  
**Version:** 2.0 - Enhanced with Docket & Bill Integration

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Current State Scrapers](#current-state-scrapers)
4. [Event Data Model](#event-data-model)
5. [Enhancement Roadmap](#enhancement-roadmap)
6. [Development Guidelines](#development-guidelines)

---

## 🎯 System Overview

### Purpose
Aggregate legislative events (hearings, committee meetings, votes) from all 50 US states into a unified, searchable database with rich metadata including dockets, bills, and legislative documents.

### Current Coverage
- **11 States Implemented:** NH, CA, TX, FL, NY, PA, IL, OH, GA, NC, MI
- **Population Coverage:** 200M+ Americans
- **Event Sources:** State legislature websites, JSON APIs, HTML scraping

### Technology Stack
- **Backend:** TypeScript, Netlify Functions
- **Frontend:** React, Vite
- **Scraping:** Cheerio (HTML parsing), native fetch
- **Geocoding:** OpenCage API
- **Caching:** In-memory with TTL

---

## 🏗️ Architecture Components

### 1. Base Scraper (`base-scraper.ts`)
**Location:** `netlify/functions/utils/scrapers/base-scraper.ts`

Abstract base class providing:
- ✅ Structured logging with state prefixes
- ✅ HTTP utilities with timeout/retry
- ✅ Rate limiting (per-minute requests)
- ✅ Cache integration
- ✅ Health tracking & metrics
- ✅ XSS protection via sanitization
- ✅ Geocoding with fallback coordinates

**Key Methods:**
```typescript
abstract scrapeCalendar(): Promise<RawEvent[]>
protected fetchPage(url: string): Promise<string>
protected log(message: string, data?: any): void
protected logError(message: string, error: any, data?: any): void
async geocodeAddress(address: string): Promise<{lat: number, lng: number}>
```

### 2. Scraper Registry (`scraper-registry.ts`)
**Location:** `netlify/functions/utils/scrapers/scraper-registry.ts`

Centralized registry managing all scrapers:
- Register/retrieve scrapers by state code
- Health monitoring across all scrapers
- Enable/disable scrapers dynamically
- Aggregate statistics & metrics

**API:**
```typescript
ScraperRegistry.register(stateCode: string, scraper: BaseScraper)
ScraperRegistry.get(stateCode: string): BaseScraper | undefined
ScraperRegistry.getStats(): RegistryStats
ScraperRegistry.getHealth(stateCode: string): ScraperHealth
```

### 3. Cache Manager (`cache-manager.ts`)
**Location:** `netlify/functions/utils/scrapers/cache-manager.ts`

TTL-based caching system:
- Default TTL: 6 hours
- Automatic expiration
- Memory-efficient storage
- Per-state cache keys

### 4. HTML Parser (`html-parser.ts`)
Wrapper around Cheerio for safe HTML parsing with XSS protection.

### 5. Date Parser (`date-parser.ts`)
Robust date parsing supporting multiple formats:
- ISO 8601 (`2025-01-15T14:30:00Z`)
- US formats (`1/15/2025`, `January 15, 2025`)
- Relative dates (`today`, `tomorrow`, `next Monday`)

---

## 🗺️ Current State Scrapers

### New Hampshire (NH) ⭐ **Reference Implementation**
**File:** `states/new-hampshire.ts`  
**Source:** JSON API (FullCalendar.js format)  
**Reliability:** ⭐⭐⭐⭐⭐ High  
**Update Frequency:** Every 6 hours

**Endpoints:**
- House: `http://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents`
- Senate: `http://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents`

**Response Format:**
```json
{
  "d": "[{\"title\":\"COMMITTEE : Location\",\"start\":\"2025-12-15T15:00:00\",\"end\":\"2025-12-15T17:00:00\",\"backgroundColor\":\"#2980b9\",\"url\":\"details.aspx?id=123\",\"allDay\":false}]"
}
```

**Event Types (by color):**
- 🔵 Blue (`#2980b9`): Public Hearing
- 🟢 Green (`#66a362`): Committee Meeting
- 🟠 Orange (`#d68100`): Executive Session
- 🔴 Red (`#b74545`): Committee of Conference

**Details URLs:**
- House: `https://www.gencourt.state.nh.us/house/schedule/{url}`
- Senate: `https://www.gencourt.state.nh.us/senate/schedule/{url}`

**🎯 Enhancement Target:**
NH provides **docket pages** with:
- Bill numbers (e.g., HB 1234, SB 567)
- Bill titles & descriptions
- Sponsor information
- Links to full bill text
- Zoom/virtual meeting links
- Committee member lists

**Example Docket URL:**
`https://www.gencourt.state.nh.us/house/schedule/details.aspx?id=123`

---

### California (CA)
**File:** `states/california.ts`  
**Source:** Assembly Daily File (HTML)  
**Reliability:** ⭐⭐⭐⭐ High  
**Update Frequency:** Every 6 hours

**Scraping Strategy:**
- Parse HTML table: `.committee-hearing-table tbody tr.committee-hearing-details`
- Extract: date, time, committee, location
- Date format: `MM/DD/YY`
- Time format: `9am`, `2:30pm`

---

### Texas (TX)
**File:** `states/texas.ts`  
**Source:** Texas Legislature Online  
**Reliability:** ⭐⭐⭐⭐ High  
**Update Frequency:** Every 6 hours

---

### Florida (FL)
**File:** `states/florida.ts`  
**Source:** Florida Legislature Website  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### New York (NY)
**File:** `states/new-york.ts`  
**Source:** NY Senate Open Data API  
**Reliability:** ⭐⭐⭐⭐ High  
**Update Frequency:** Every 6 hours

---

### Pennsylvania (PA)
**File:** `states/pennsylvania.ts`  
**Source:** PA General Assembly Website  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### Illinois (IL)
**File:** `states/illinois.ts`  
**Source:** Illinois General Assembly  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### Ohio (OH)
**File:** `states/ohio.ts`  
**Source:** Ohio Legislature Website  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### Georgia (GA)
**File:** `states/georgia.ts`  
**Source:** Georgia General Assembly  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### North Carolina (NC)
**File:** `states/north-carolina.ts`  
**Source:** NC General Assembly  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

### Michigan (MI)
**File:** `states/michigan.ts`  
**Source:** Michigan Legislature Website  
**Reliability:** ⭐⭐⭐ Medium  
**Update Frequency:** Every 12 hours

---

## 📊 Event Data Model

### Current Schema (`src/types/event.ts`)
```typescript
export interface LegislativeEvent {
  // Core Identity
  id: string;                    // Unique identifier
  name: string;                  // Event name/title
  
  // Temporal
  date: string;                  // ISO 8601 date
  time: string;                  // Human-readable time
  
  // Location
  location: string;              // Address/room
  lat: number;                   // Latitude
  lng: number;                   // Longitude
  city?: string;                 // City name
  state?: string;                // State code
  zipCode: string | null;        // ZIP code
  
  // Classification
  committee: string;             // Committee name
  type: string;                  // hearing, meeting, vote, etc.
  level: 'federal' | 'state' | 'local';
  
  // Metadata
  url?: string | null;           // Details page URL
  description?: string;          // Event description
  tags?: string[];               // Auto-generated tags
  
  // Computed
  distance?: number;             // Miles from user (client-side)
}
```

### Enhanced Schema (Proposed v2.0)
```typescript
export interface LegislativeEvent {
  // ... existing fields ...
  
  // 🆕 Docket & Bill Information
  docketUrl?: string;            // Link to official docket
  bills?: Bill[];                // Bills being discussed
  virtualMeetingUrl?: string;    // Zoom/Teams link
  agendaUrl?: string;            // Agenda document URL
  minutesUrl?: string;           // Meeting minutes (if available)
  
  // 🆕 Enhanced Metadata
  sponsors?: Legislator[];       // Bill sponsors
  witnesses?: string[];          // Scheduled witnesses
  publicCommentAllowed?: boolean; // Can public comment?
  livestreamUrl?: string;        // Live video stream
}

export interface Bill {
  id: string;                    // Bill number (HB 1234, SB 567)
  title: string;                 // Short title
  description?: string;          // Full description
  status: BillStatus;            // Current status
  url: string;                   // Bill text URL
  sponsors: Legislator[];        // Primary sponsors
  tags?: string[];               // Policy area tags
  fiscalNote?: string;           // Fiscal impact
}

export interface Legislator {
  name: string;
  party: 'R' | 'D' | 'I' | 'Other';
  district?: string;
  title?: string;                // Rep, Sen, etc.
  photoUrl?: string;
}

export enum BillStatus {
  Introduced = 'introduced',
  InCommittee = 'in-committee',
  OnFloor = 'on-floor',
  Passed = 'passed',
  Signed = 'signed',
  Vetoed = 'vetoed',
  Dead = 'dead'
}
```

---

## 🚀 Enhancement Roadmap

### Phase 1: New Hampshire Docket Integration ⭐ **CURRENT PRIORITY**
**Goal:** Extract docket information from NH event detail pages

**Tasks:**
1. ✅ Document current NH scraper architecture
2. 🔄 Analyze NH docket HTML structure
3. 🔄 Create `NHDocketScraper` class
4. 🔄 Extract bill numbers from docket
5. 🔄 Parse bill metadata (title, sponsors, status)
6. 🔄 Extract Zoom/virtual meeting links
7. 🔄 Update `LegislativeEvent` schema
8. 🔄 Update UI to display bills & docket links
9. 🔄 Add bill filtering/search
10. 🔄 Test with real NH events

**Technical Approach:**
```typescript
// New method in NewHampshireScraper
async scrapeDocket(eventId: string, detailsUrl: string): Promise<DocketInfo> {
  const html = await this.fetchPage(detailsUrl);
  const $ = parseHTML(html);
  
  // Extract bill numbers
  const bills: Bill[] = [];
  $('.bill-item').each((_, el) => {
    const billNumber = $(el).find('.bill-number').text().trim();
    const billTitle = $(el).find('.bill-title').text().trim();
    const billUrl = $(el).find('a').attr('href');
    
    bills.push({
      id: billNumber,
      title: billTitle,
      url: billUrl,
      // ... more fields
    });
  });
  
  // Extract virtual meeting link
  const zoomLink = $('a[href*="zoom.us"]').attr('href');
  
  return { bills, virtualMeetingUrl: zoomLink };
}
```

---

### Phase 2: Bill Text Analysis
**Goal:** Parse bill text and extract key provisions

**Enhancements:**
- Full text search across bills
- AI summarization of bill content
- Track amendments & changes
- Voting records by legislator

---

### Phase 3: Multi-State Docket Support
**Goal:** Extend docket scraping to all 11 states

**Priority Order:**
1. NH (reference implementation)
2. CA (structured data)
3. NY (API available)
4. TX (large volume)
5. FL, PA, IL, OH, GA, NC, MI

---

### Phase 4: Real-Time Updates
**Goal:** Push notifications for bill status changes

**Features:**
- WebSocket connections
- Bill tracking lists
- Email/SMS alerts
- Calendar integration (iCal export)

---

### Phase 5: Citizen Engagement
**Goal:** Enable direct civic participation

**Features:**
- Find my legislator
- Submit public comments
- Track voting records
- Testify remotely
- Bill impact calculator

---

## 🛠️ Development Guidelines

### Creating a New State Scraper

1. **Create scraper file:**
   ```bash
   touch netlify/functions/utils/scrapers/states/[state-name].ts
   ```

2. **Implement class:**
   ```typescript
   import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
   
   export class StateScraper extends BaseScraper {
     constructor() {
       const config: ScraperConfig = {
         stateCode: 'XX',
         stateName: 'State Name',
         websiteUrl: 'https://legislature.state.gov/calendar',
         reliability: 'medium',
         updateFrequency: 12,
         maxRequestsPerMinute: 20,
         requestDelay: 500
       };
       super(config);
     }
     
     protected async scrapeCalendar(): Promise<RawEvent[]> {
       // Implementation
     }
   }
   ```

3. **Register in index:**
   ```typescript
   // In netlify/functions/utils/scrapers/index.ts
   import { StateScraper } from './states/state-name';
   
   // In initializeScrapers()
   Registry.register('XX', new StateScraper());
   ```

4. **Test:**
   ```bash
   # Create test file
   netlify/functions/test-[state]-scraper.ts
   
   # Run test
   npx tsx netlify/functions/test-[state]-scraper.ts
   ```

### Adding Docket Support to Existing Scraper

1. **Update RawEvent interface** (add optional fields):
   ```typescript
   interface RawEvent {
     // ... existing fields ...
     docketUrl?: string;
     bills?: BillInfo[];
     virtualMeetingUrl?: string;
   }
   ```

2. **Add docket scraping method:**
   ```typescript
   private async scrapeDocket(detailsUrl: string): Promise<DocketData> {
     const html = await this.fetchPage(detailsUrl);
     const $ = parseHTML(html);
     
     // Extract bill info
     // Extract meeting links
     // Return structured data
   }
   ```

3. **Call during calendar scrape:**
   ```typescript
   protected async scrapeCalendar(): Promise<RawEvent[]> {
     const events = await this.scrapeBasicEvents();
     
     // Enhance with docket data
     for (const event of events) {
       if (event.detailsUrl) {
         const docket = await this.scrapeDocket(event.detailsUrl);
         event.bills = docket.bills;
         event.virtualMeetingUrl = docket.zoomLink;
       }
     }
     
     return events;
   }
   ```

### Testing Checklist

- ✅ Events have unique IDs
- ✅ Dates are in the future
- ✅ Geocoding succeeds (or has fallback)
- ✅ Rate limiting works (no 429 errors)
- ✅ XSS protection applied
- ✅ Error handling graceful
- ✅ Logs are clear & structured
- ✅ Cache invalidation works
- ✅ Docket URLs are valid
- ✅ Bill numbers parse correctly

---

## 📝 Notes & Best Practices

### Scraping Etiquette
- Respect `robots.txt`
- Implement rate limiting (500ms+ delays)
- Use caching aggressively
- Identify with User-Agent
- Monitor for 429/503 responses

### Error Handling
- Always provide fallback coordinates
- Log errors with context
- Continue processing on partial failures
- Track consecutive failures
- Auto-disable unhealthy scrapers

### Data Quality
- Validate dates (must be future)
- Sanitize HTML to prevent XSS
- Normalize address formats
- Handle missing fields gracefully
- Deduplicate events

### Performance
- Batch geocoding requests
- Cache aggressively (6-12 hours)
- Use streaming for large responses
- Implement pagination where needed
- Monitor memory usage

---

## 🔗 Related Documentation

- [`REBUILD_INSTRUCTIONS.md`](./REBUILD_INSTRUCTIONS.md) - Full system rebuild guide
- [`src/types/event.ts`](./src/types/event.ts) - TypeScript type definitions
- [`netlify/functions/utils/scrapers/base-scraper.ts`](./netlify/functions/utils/scrapers/base-scraper.ts) - Base implementation
- [OpenStates API Docs](https://docs.openstates.org/api-v3/) - Alternative data source

---

**Questions?** Reference the NH scraper (`states/new-hampshire.ts`) as the canonical example.
