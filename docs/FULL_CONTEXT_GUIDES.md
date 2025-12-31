# Full Context Guides (Reference Only)

These are the complete, verbose versions of the context guides. The extension uses condensed versions to minimize token usage.

## scraper-guide (Full - ~2000 tokens)

**Purpose:** Comprehensive guide for scraping state legislature websites, including PDF extraction, calendar discovery, and API detection.

### Finding Calendar URLs

State legislature websites typically organize their calendars in these patterns:

1. **Direct Calendar Pages**: `/calendar`, `/schedule`, `/meetings`, `/events`
2. **Committee Pages**: `/committees`, `/standing-committees` (often have individual committee calendars)
3. **Session Pages**: `/session`, `/legislative-session` (may include daily calendars)
4. **News/Announcements**: `/news`, `/press-releases` (sometimes link to upcoming events)

When scraping legislatures, prioritize finding structured data sources:
- Look for `/api/`, `/_api/`, `/services/` endpoints
- Check Network tab for XHR/Fetch requests
- Examine page source for inline JSON in `<script>` tags
- Test common API patterns: `/api/calendar`, `/api/events`, `/api/committees`

### PDF Extraction Pattern

Many state legislatures publish agendas as PDFs. Use this robust extraction pattern:

```javascript
const extractPDFText = async (pdfUrl) => {
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = new Uint8Array(response.data);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    return null;
  }
};
```

### Date Parsing Function

State legislature calendars use inconsistent date formats. This function handles most common patterns:

```javascript
const parseDate = (dateStr) => {
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr).toISOString();
  }
  
  // Handle "Month DD, YYYY" format
  const monthDayYear = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (monthDayYear) {
    return new Date(`${monthDayYear[1]} ${monthDayYear[2]}, ${monthDayYear[3]}`).toISOString();
  }
  
  // Handle "DD/MM/YYYY" or "MM/DD/YYYY" format
  const slashDate = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDate) {
    // Assume MM/DD/YYYY for US legislatures
    return new Date(`${slashDate[3]}-${slashDate[1]}-${slashDate[2]}`).toISOString();
  }
  
  // Fallback to native Date parsing
  return new Date(dateStr).toISOString();
};
```

### API Detection Tips

Before scraping HTML, check if the site exposes structured data:

1. **Open browser DevTools** → Network tab
2. **Navigate to calendar page** and watch for XHR/Fetch requests
3. **Look for JSON responses** with event/meeting data
4. **Test common endpoints**:
   - `[baseUrl]/api/calendar`
   - `[baseUrl]/api/events?date=2024-01-01`
   - `[baseUrl]/services/meetings`
   - `[baseUrl]/_api/committee/schedule`

If API exists, prefer it over HTML scraping for:
- Faster execution
- More reliable data structure
- Less breakage when UI changes
- Easier pagination handling

---

## basic-selectors (Full - ~500 tokens)

**Purpose:** Fundamental selector patterns for resilient HTML scraping.

### Multiple Fallback Pattern

Never rely on a single selector. Use arrays of fallbacks ordered from most specific to most generic:

```javascript
// GOOD: Multiple fallbacks with clear priority
const titleSelectors = [
  'h1.meeting-title',           // Most specific (class + element)
  '[data-field="title"]',       // Semantic attribute
  'h1',                         // Generic element
  '.title',                     // Generic class
];

for (const selector of titleSelectors) {
  const element = $(selector).first();
  if (element.length && element.text().trim()) {
    title = element.text().trim();
    break;
  }
}

// BAD: Single selector with no fallback
const title = $('h1.meeting-title').text(); // Breaks if class changes
```

### Text Matching for Ambiguous Pages

When selectors are unreliable, match by text content:

```javascript
// Find links containing "calendar" or "schedule"
const calendarLink = $('a').filter((i, el) => {
  const text = $(el).text().toLowerCase();
  return text.includes('calendar') || text.includes('schedule') || text.includes('meetings');
}).first().attr('href');

// Find headers that introduce date/time information
const dateHeader = $('th, td, span').filter((i, el) => {
  const text = $(el).text().toLowerCase();
  return text === 'date' || text === 'time' || text === 'when';
}).first().parent();
```

### Parent/Sibling Navigation

When data is spread across related elements:

```javascript
// Find date, then get associated meeting info from siblings/parent
const meetings = [];
$('.meeting-date').each((i, dateEl) => {
  const date = $(dateEl).text().trim();
  const parent = $(dateEl).parent();
  
  const title = parent.find('.meeting-title').text().trim();
  const location = parent.find('.meeting-location').text().trim();
  
  meetings.push({ date, title, location });
});
```

### Wildcard Attribute Matching

Use `*=` for partial attribute matches:

```javascript
// Match any class containing "meeting"
$('[class*="meeting"]')

// Match any href containing "calendar"
$('a[href*="calendar"]')

// Match any data attribute starting with "event"
$('[data-event-id]')
```

---

## puppeteer-tactics (Full - ~800 tokens)

**Purpose:** Advanced Puppeteer patterns for JavaScript-heavy sites.

### Date Input Handling

Many calendar sites require date selection via `<input type="date">`:

```javascript
// Method 1: Direct value setting (fastest)
await page.evaluate((selector, dateStr) => {
  const input = document.querySelector(selector);
  if (input) {
    input.value = dateStr; // Format: YYYY-MM-DD
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, 'input[type="date"]', '2024-01-15');

// Method 2: Typing (slower but triggers all events)
await page.click('input[type="date"]');
await page.keyboard.type('01/15/2024'); // Format depends on locale

// Method 3: Clear and set (most reliable)
const dateInput = await page.$('input[type="date"]');
await dateInput.click({ clickCount: 3 }); // Select all
await page.keyboard.press('Backspace');
await dateInput.type('2024-01-15');
```

### Infinite Scroll / Load More

For sites that load content dynamically as you scroll:

```javascript
// Pattern 1: Scroll to bottom repeatedly
let previousHeight = 0;
let currentHeight = await page.evaluate('document.body.scrollHeight');

while (currentHeight > previousHeight) {
  previousHeight = currentHeight;
  
  await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  await page.waitForTimeout(1000); // Wait for new content to load
  
  currentHeight = await page.evaluate('document.body.scrollHeight');
}

// Pattern 2: Click "Load More" button
while (true) {
  const loadMoreButton = await page.$('button:contains("Load More")');
  if (!loadMoreButton) break;
  
  await loadMoreButton.click();
  await page.waitForTimeout(1000);
}
```

### Waiting for React/Vue Rendering

JavaScript frameworks render asynchronously. Wait for specific content:

```javascript
// Wait for specific element to appear
await page.waitForSelector('.meeting-list', { timeout: 10000 });

// Wait for element to contain non-empty content
await page.waitForFunction(
  selector => {
    const el = document.querySelector(selector);
    return el && el.textContent.trim().length > 0;
  },
  { timeout: 10000 },
  '.meeting-list'
);

// Wait for specific number of items to load
await page.waitForFunction(
  count => document.querySelectorAll('.meeting-item').length >= count,
  { timeout: 10000 },
  5 // Wait for at least 5 meetings
);
```

### Extracting Data from Browser Context

Sometimes data is easier to extract in the browser than in Node:

```javascript
const meetings = await page.evaluate(() => {
  const results = [];
  
  document.querySelectorAll('.meeting-item').forEach(item => {
    const title = item.querySelector('.title')?.textContent?.trim();
    const date = item.querySelector('.date')?.textContent?.trim();
    const location = item.querySelector('.location')?.textContent?.trim();
    
    if (title && date) {
      results.push({ title, date, location });
    }
  });
  
  return results;
});
```

---

## error-handling (Full - ~600 tokens)

**Purpose:** Robust error handling patterns for production scrapers.

### Try-Catch with Fallbacks (Cheerio)

Wrap every selector operation in try-catch, especially when navigating deep structures:

```javascript
let title = null;

// Method 1: Try multiple selectors with individual error handling
const titleSelectors = ['h1.meeting-title', '[data-title]', 'h1', '.title'];
for (const selector of titleSelectors) {
  try {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      if (text) {
        title = text;
        break;
      }
    }
  } catch (error) {
    console.warn(`Selector "${selector}" failed:`, error.message);
    continue; // Try next selector
  }
}

// Method 2: Wrap entire extraction block
try {
  const meetingCard = $('.meeting-card').first();
  title = meetingCard.find('.title').text().trim();
  date = meetingCard.find('.date').text().trim();
  location = meetingCard.find('.location').text().trim();
} catch (error) {
  console.error('Failed to extract meeting data:', error);
  // Return partial data or null
  return { title, date: null, location: null };
}
```

### Try-Catch with Fallbacks (Puppeteer)

Page interactions can fail due to timing, element visibility, or navigation:

```javascript
// Pattern 1: Try operation with fallback
let content = null;
try {
  await page.waitForSelector('.meeting-list', { timeout: 5000 });
  content = await page.$eval('.meeting-list', el => el.innerHTML);
} catch (error) {
  console.warn('Primary selector failed, trying fallback');
  try {
    await page.waitForSelector('.calendar-container', { timeout: 5000 });
    content = await page.$eval('.calendar-container', el => el.innerHTML);
  } catch (fallbackError) {
    console.error('All selectors failed:', fallbackError);
    return []; // Return empty array instead of crashing
  }
}

// Pattern 2: Graceful click failures
try {
  const button = await page.$('button.load-more');
  if (button) {
    await button.click();
    await page.waitForTimeout(1000);
  }
} catch (error) {
  console.warn('Could not click load more button:', error.message);
  // Continue with whatever data we have
}
```

### Logging for Debugging

Always log extraction attempts to help diagnose issues:

```javascript
console.log(`Attempting to extract meetings from ${url}`);

const titleSelectors = ['h1.meeting-title', '[data-title]', 'h1'];
let title = null;

for (const selector of titleSelectors) {
  try {
    const element = $(selector).first();
    if (element.length) {
      title = element.text().trim();
      console.log(`✓ Found title with selector: ${selector}`);
      break;
    } else {
      console.log(`✗ No elements found for selector: ${selector}`);
    }
  } catch (error) {
    console.warn(`✗ Selector "${selector}" threw error:`, error.message);
  }
}

if (!title) {
  console.error('Failed to extract title with any selector');
}
```

---

## date-parsing (Full - ~400 tokens)

**Purpose:** Handle inconsistent date formats across state legislature websites.

### Common Date Regex Patterns

State legislatures use wildly different date formats. Match them all:

```javascript
// ISO format: 2024-01-15 or 2024-01-15T10:30:00
const isoMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}:\d{2})?/);

// US format: January 15, 2024 or Jan 15, 2024
const monthDayYearMatch = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);

// Slash format: 01/15/2024 or 1/15/24
const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);

// Dash format: 01-15-2024
const dashMatch = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);

// Day-first format: 15 January 2024
const dayFirstMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
```

### Time Extraction

Extract time components separately, then combine with date:

```javascript
// Match time with optional AM/PM
const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

if (timeMatch) {
  let hours = parseInt(timeMatch[1]);
  const minutes = timeMatch[2];
  const ampm = timeMatch[4];
  
  // Convert to 24-hour format
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  
  const time = `${String(hours).padStart(2, '0')}:${minutes}:00`;
}
```

### Unified Parsing Function

Combine all patterns into a single robust function:

```javascript
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // ISO format (highest priority)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return new Date(dateStr).toISOString();
    }
    
    // Month Day, Year format
    const mdy = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
    if (mdy) {
      return new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`).toISOString();
    }
    
    // Slash format (assume MM/DD/YYYY for US)
    const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) {
      return new Date(`${slash[3]}-${slash[1]}-${slash[2]}`).toISOString();
    }
    
    // Fallback to native parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed) ? null : parsed.toISOString();
    
  } catch (error) {
    console.error('Date parsing failed:', error);
    return null;
  }
};
```

### ISO 8601 Conversion

Always return dates in ISO 8601 format for consistency:

```javascript
// Good: ISO 8601 with timezone
const isoDate = new Date('2024-01-15T10:30:00').toISOString();
// Returns: "2024-01-15T10:30:00.000Z"

// Good: Preserve timezone if available
const withTimezone = new Date('2024-01-15T10:30:00-05:00').toISOString();

// Bad: Ambiguous format
const badDate = '01/15/2024'; // Is this Jan 15 or Feb 1?
```
