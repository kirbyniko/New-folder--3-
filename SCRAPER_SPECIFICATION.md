# Universal Scraper Specification

## Purpose
This document defines the exact data structure needed to create ANY legislative/government meeting scraper. Whether state legislature, city council, county board - the data points are the same.

---

## Target Data Points (What Every Scraper Collects)

Every scraper must extract these fields:

```typescript
interface ScrapedEvent {
  // REQUIRED
  name: string;              // Event/meeting name
  date: Date | string;       // When it happens
  
  // LOCATION (at least one required)
  location?: string;         // Physical location name
  lat?: number;              // Latitude
  lng?: number;              // Longitude
  virtualMeetingUrl?: string; // Zoom/Teams/WebEx link
  
  // IDENTIFIERS
  state: string;             // 2-letter state code
  city?: string;             // City name (for local)
  level: 'federal' | 'state' | 'local';
  
  // DETAILS (highly recommended)
  time?: string;             // Start time
  committee?: string;        // Committee/board name
  description?: string;      // Meeting description
  type?: string;             // "hearing", "meeting", "session"
  
  // URLS (critical for enrichment)
  detailsUrl?: string;       // Link to full meeting details
  docketUrl?: string;        // Link to agenda/docket PDF
  sourceUrl?: string;        // Original calendar page URL
  
  // AGENDA ITEMS
  bills?: Array<{            // Bills/ordinances to be discussed
    number: string;
    title?: string;
    url?: string;
  }>;
  
  // METADATA
  allowsPublicParticipation?: boolean;
  agendaText?: string;       // Full agenda text if parseable
}
```

---

## Scraper Input Specification

To build a scraper, provide this JSON structure:

```json
{
  "metadata": {
    "jurisdiction": "City of Example / State of Example",
    "state_code": "XX",
    "level": "state|local",
    "calendar_name": "Legislative Calendar / City Council Calendar",
    "base_url": "https://example.gov",
    "scraper_type": "static|dynamic|api",
    "requires_javascript": true|false,
    "notes": "Any special considerations"
  },
  
  "calendar_page": {
    "url": "https://example.gov/calendar",
    "method": "static|dynamic",
    
    "navigation": {
      "month_view_button": {
        "selector": "button.month-view",
        "outer_html": "<button class='month-view'>Month</button>",
        "optional": true
      },
      "next_button": {
        "selector": "button.next-month",
        "outer_html": "<button class='next-month'>Next →</button>",
        "action": "click",
        "wait_after": 500
      },
      "previous_button": {
        "selector": "button.prev-month",
        "outer_html": "<button class='prev-month'>← Prev</button>"
      }
    },
    
    "event_list": {
      "container_selector": "div.calendar-events",
      "event_item_selector": "div.event-card",
      "sample_outer_html": "<div class='event-card' data-id='12345'>...</div>"
    },
    
    "event_fields": {
      "name": {
        "selector": "h3.event-title",
        "attribute": null,
        "sample_html": "<h3 class='event-title'>Committee on Finance</h3>",
        "sample_value": "Committee on Finance"
      },
      "date": {
        "selector": "span.event-date",
        "attribute": "data-date",
        "format": "YYYY-MM-DD",
        "sample_html": "<span class='event-date' data-date='2025-01-15'>Jan 15, 2025</span>",
        "sample_value": "2025-01-15"
      },
      "time": {
        "selector": "span.event-time",
        "sample_html": "<span class='event-time'>10:00 AM</span>",
        "sample_value": "10:00 AM"
      },
      "location": {
        "selector": "div.event-location",
        "sample_html": "<div class='event-location'>Room 201, City Hall</div>",
        "sample_value": "Room 201, City Hall"
      },
      "committee": {
        "selector": "span.committee-name",
        "sample_html": "<span class='committee-name'>Finance Committee</span>",
        "sample_value": "Finance Committee"
      },
      "details_link": {
        "selector": "a.details-link",
        "attribute": "href",
        "sample_html": "<a class='details-link' href='/meetings/12345'>View Details</a>",
        "sample_value": "/meetings/12345",
        "is_relative": true
      }
    }
  },
  
  "details_page": {
    "requires_navigation": true,
    "url_pattern": "https://example.gov/meetings/{id}",
    
    "fields": {
      "agenda_url": {
        "selector": "a.agenda-pdf",
        "attribute": "href",
        "sample_html": "<a class='agenda-pdf' href='/agendas/12345.pdf'>Download Agenda</a>",
        "sample_value": "/agendas/12345.pdf"
      },
      "docket_url": {
        "selector": "a.docket-link",
        "attribute": "href"
      },
      "virtual_meeting_url": {
        "selector": "a.zoom-link",
        "attribute": "href",
        "patterns": ["zoom.us", "teams.microsoft.com", "webex.com"]
      },
      "description": {
        "selector": "div.meeting-description",
        "sample_html": "<div class='meeting-description'>Discussion of FY2026 budget...</div>"
      },
      "bills": {
        "container_selector": "ul.agenda-items",
        "item_selector": "li.bill-item",
        "fields": {
          "number": {
            "selector": "span.bill-number",
            "pattern": "[A-Z]{1,3}\\s*\\d+"
          },
          "title": {
            "selector": "span.bill-title"
          },
          "url": {
            "selector": "a.bill-link",
            "attribute": "href"
          }
        }
      }
    }
  },
  
  "geocoding": {
    "default_location": "City Hall, Example City, XX",
    "default_lat": 40.7128,
    "default_lng": -74.0060,
    "location_patterns": [
      {
        "match": "City Hall",
        "lat": 40.7128,
        "lng": -74.0060
      },
      {
        "match": "Room 201",
        "location": "City Hall, Example City, XX"
      }
    ]
  },
  
  "rate_limiting": {
    "requests_per_minute": 20,
    "delay_between_requests": 500,
    "max_concurrent": 3
  },
  
  "examples": [
    {
      "description": "Sample calendar page HTML",
      "url": "https://example.gov/calendar",
      "html": "<!-- Full page HTML or key sections -->"
    },
    {
      "description": "Sample event details page",
      "url": "https://example.gov/meetings/12345",
      "html": "<!-- Full details page HTML -->"
    }
  ]
}
```

---

## Chrome Extension Data Collection Flow

### Phase 1: Metadata
1. **Jurisdiction Name** (text input)
2. **State Code** (dropdown)
3. **Level** (radio: State / Local)
4. **Calendar URL** (text input)
5. **Requires JavaScript?** (checkbox)

### Phase 2: Calendar Page Structure
**User clicks elements on the page, extension captures:**

1. **Month View Button** (optional)
   - Click to select
   - Captures: selector, outerHTML
   
2. **Next Month Button**
   - Click to select
   - Captures: selector, outerHTML
   - Extension tests: "Does clicking this change the calendar?"

3. **Event List Container**
   - Click to select
   - Extension highlights all matching elements
   - Confirms: "These are all the events?"

4. **Single Event Item**
   - Click one event card/row
   - Extension captures the pattern

### Phase 3: Event Field Mapping
**For the selected event, user clicks each field:**

1. **Event Name** - Click the title
2. **Date** - Click the date element
3. **Time** - Click the time element
4. **Location** - Click location text
5. **Committee** - Click committee name
6. **Details Link** - Click the "View Details" link

**Extension captures for each:**
- CSS selector
- Full outerHTML
- Text content or href value
- Parent structure (for context)

### Phase 4: Details Page (if applicable)
**Extension opens the details link, user clicks:**

1. **Agenda PDF Link** - Click "Download Agenda"
2. **Docket Link** - Click "View Docket"
3. **Video/Virtual Link** - Click Zoom/Teams link
4. **Description** - Click meeting description
5. **Bill List Container** - Click agenda items section
6. **Single Bill Item** - Click one bill/ordinance

### Phase 5: Review & Export
Extension shows:
- Captured selectors
- Sample values
- HTML snippets
- Confidence score

**Output:** JSON file ready for scraper generation

---

## Scraper Generation Rules

### Rule 1: Static vs Dynamic
```typescript
if (requires_javascript) {
  use_puppeteer();
  // Load page, wait for dynamic content
} else {
  use_cheerio();
  // Parse static HTML directly
}
```

### Rule 2: URL Handling
```typescript
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return baseUrl + url;
  return baseUrl + '/' + url;
}
```

### Rule 3: Date Parsing
```typescript
// Try multiple patterns
const patterns = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'MMM DD, YYYY',
  'MMMM D, YYYY'
];
```

### Rule 4: Geocoding Fallback
```typescript
if (no_lat_lng) {
  if (location_string) {
    geocode(location_string);
  } else {
    use_default_location();
  }
}
```

### Rule 5: Error Handling
```typescript
try {
  const value = element.querySelector(selector)?.textContent;
  if (!value) throw new Error('Required field missing');
} catch (error) {
  log_error_with_context();
  use_fallback_or_skip();
}
```

---

## Validation Checklist

Before generating scraper, verify:
- [ ] Can extract event name
- [ ] Can extract date
- [ ] Can extract at least one location type (physical/virtual)
- [ ] Can navigate pagination (if needed)
- [ ] Can follow details links (if needed)
- [ ] Sample output matches expected format
- [ ] Rate limiting configured
- [ ] Error handling for missing fields

---

## Output Formats

### Scraper Code Output
```typescript
import { BaseScraper, RawEvent } from '../base-scraper';

export class ExampleScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'XX',
      stateName: 'Example',
      websiteUrl: 'https://example.gov',
      reliability: 'high',
      updateFrequency: 6
    });
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    // Generated code based on specification
  }
}
```

### Test Output
```typescript
{
  "scraper": "Example",
  "timestamp": "2025-12-25T12:00:00Z",
  "events_found": 15,
  "sample_event": {
    "name": "Finance Committee Meeting",
    "date": "2025-01-15",
    "time": "10:00 AM"
  },
  "validation": {
    "has_required_fields": true,
    "geocoded": true,
    "links_valid": true
  }
}
```

---

## Quick Reference: Field Priority

**🔴 CRITICAL (scraper fails without these):**
- name
- date
- state
- level

**🟡 HIGH PRIORITY (needed for usefulness):**
- time
- location OR lat/lng OR virtualMeetingUrl
- committee
- detailsUrl

**🟢 NICE TO HAVE (enrichment):**
- docketUrl
- bills[]
- description
- agendaText

---

## Example: Minimal Valid Specification

```json
{
  "metadata": {
    "jurisdiction": "Anytown City Council",
    "state_code": "CA",
    "level": "local",
    "base_url": "https://anytown.ca.gov"
  },
  "calendar_page": {
    "url": "https://anytown.ca.gov/calendar",
    "event_list": {
      "event_item_selector": ".event"
    },
    "event_fields": {
      "name": { "selector": ".title" },
      "date": { "selector": ".date" },
      "details_link": { 
        "selector": "a", 
        "attribute": "href" 
      }
    }
  },
  "geocoding": {
    "default_location": "City Hall, Anytown, CA"
  }
}
```

This would generate a working scraper!

---

## Next Steps

1. **Build Chrome Extension** that captures this JSON
2. **Create Scraper Generator** that converts JSON → TypeScript
3. **Test Suite** that validates scrapers against sample data
4. **Repository** of community-contributed specifications

---

**This specification allows ANYONE to create a scraper by just clicking elements on a webpage!**
