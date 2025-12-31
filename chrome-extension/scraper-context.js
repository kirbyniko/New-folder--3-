// Scraper Context - Real working examples and tactics for AI generation
// Based on SCRAPER_GUIDE_SHORT.md patterns

const SCRAPER_CONTEXTS = {
  'scraper-guide': {
    name: 'Full Scraper Guide (agendas, PDFs, APIs)',
    size: '~2000 tokens',
    content: `
**COMPLETE SCRAPER GUIDE - ALL PATTERNS**

This guide includes strategies for:
- Static HTML calendar scraping
- PDF agenda parsing
- API endpoint discovery
- JavaScript-heavy sites (Puppeteer)
- Date range handling
- Multi-page pagination
- Error recovery

### Finding Calendar URLs:
1. Google "[state/city] legislature committee meetings"
2. Check official government sites (.gov domains)
3. Look for "Calendar", "Meetings", "Agendas" sections
4. Common patterns:
   - /calendar
   - /meetings
   - /committees/meetings
   - /clerk/agendas

### PDF Agenda Detection:
Many government sites link to PDF agendas. Look for:
- Links with .pdf extension
- "Agenda" or "Meeting Materials" text
- Download/document icons

**Pattern for extracting PDF URLs:**
\`\`\`javascript
const pdfLinks = [];
$('a[href$=".pdf"], a:contains("Agenda"), a:contains("agenda")').each((i, el) => {
  const href = $(el).attr('href');
  if (href && (href.includes('agenda') || href.endsWith('.pdf'))) {
    pdfLinks.push({
      url: href.startsWith('http') ? href : new URL(href, baseUrl).href,
      text: $(el).text().trim()
    });
  }
});
\`\`\`

### State Legislature Patterns:
Most states have similar structures:
- House committees
- Senate committees
- Joint committees
- Public hearings
- Bill readings

Common field names:
- Committee Name
- Meeting Date/Time
- Location/Room
- Agenda URL (PDF)
- Bill Numbers
- Video/Audio Stream

### API Detection:
1. Open browser DevTools → Network tab
2. Look for XHR/Fetch requests
3. Common API patterns:
   - /api/events
   - /api/meetings
   - /api/calendar
   - GraphQL endpoints

### Date Handling:
**Always try to extract:**
- ISO format: 2025-12-30T10:00:00Z
- If not available, parse: "December 30, 2025"
- Time zones matter for government meetings!

\`\`\`javascript
function parseGovernmentDate(dateStr) {
  // Try various formats
  const formats = [
    /\d{4}-\d{2}-\d{2}/, // ISO
    /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
    /[A-Z][a-z]+ \d{1,2}, \d{4}/ // Month DD, YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) return new Date(match[0]).toISOString();
  }
  return dateStr; // Fallback
}
\`\`\`
`
  },
  'basic-selectors': {
    name: 'Basic Selector Patterns',
    size: '~500 tokens',
    content: `
**SELECTOR STRATEGIES THAT WORK:**

1. **Multiple Fallbacks** (always try 5+ options):
   \`\`\`javascript
   // BEST PRACTICE - Aggressive fallback chain
   let title = null;
   const titleSelectors = [
     '.event-title',           // Exact match
     '[class*="title"]',       // Partial match
     '[data-title]',           // Data attribute
     'h1, h2, h3',             // Heading tags
     '.name, .heading',        // Common alternatives
     '*[title]'                // Any element with title attr
   ];
   
   for (const selector of titleSelectors) {
     const el = $(selector).first();
     if (el.length && el.text().trim()) {
       title = el.text().trim();
       console.log(\`Found title with: \${selector}\`);
       break;
     }
   }
   
   if (!title) {
     console.log('Title not found, tried:', titleSelectors.join(', '));
   }
   \`\`\`

2. **Text Content Matching** (when exact selector fails):
   \`\`\`javascript
   // Find by text content
   let dateElement = $('*').filter((i, el) => {
     return $(el).text().match(/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/);
   }).first();
   \`\`\`

3. **Parent/Child Navigation**:
   \`\`\`javascript
   // If you find one element, look around it
   let eventCard = $('.event-card');
   let title = eventCard.find('h3, h4, .title, [class*="title"]').first().text();
   let date = eventCard.find('[class*="date"], time, .date').first().text();
   \`\`\`

4. **Attribute Wildcards**:
   \`\`\`javascript
   // Match partial class names
   $('[class*="event"]')   // class contains "event"
   $('[class^="cal-"]')    // class starts with "cal-"
   $('[data-type]')        // has data-type attribute
   \`\`\`
`
  },

  'puppeteer-tactics': {
    name: 'Puppeteer Tactics (JS-Heavy Pages)',
    size: '~800 tokens',
    content: `
**PUPPETEER PATTERNS FOR COMPLEX PAGES:**

1. **Date Inputs** (Material-UI, React Date Pickers):
   \`\`\`javascript
   const dateInput = await page.$('input[aria-label="From Date"]');
   await dateInput.click({ clickCount: 3 }); // Select all text
   await dateInput.type('01/01/2025');
   await page.keyboard.press('Enter');
   await page.waitForTimeout(2000); // Wait for calendar to update
   \`\`\`

2. **Infinite Scroll Loading**:
   \`\`\`javascript
   let previousHeight = 0;
   for (let i = 0; i < 20; i++) {
     await page.evaluate(() => {
       const container = document.querySelector('#event-list');
       if (container) container.scrollTop = container.scrollHeight;
     });
     await page.waitForTimeout(1000);
     
     const currentHeight = await page.evaluate(() => {
       return document.querySelector('#event-list')?.scrollHeight || 0;
     });
     
     if (currentHeight === previousHeight) break; // No more content
     previousHeight = currentHeight;
   }
   \`\`\`

3. **Wait for React/Vue to Load**:
   \`\`\`javascript
   await page.goto(url, { waitUntil: 'networkidle0' });
   await page.waitForTimeout(5000); // Wait for framework
   await page.waitForSelector('.event-list, [role="main"]', { timeout: 10000 });
   \`\`\`

4. **Extract in Browser Context**:
   \`\`\`javascript
   const events = await page.evaluate(() => {
     return Array.from(document.querySelectorAll('.event')).map(el => ({
       title: el.querySelector('h3, .title')?.textContent?.trim() || '',
       date: el.querySelector('.date, time')?.textContent?.trim() || '',
       location: el.querySelector('.location, .venue')?.textContent?.trim() || ''
     }));
   });
   \`\`\`

**CRITICAL:** Always use 60-90s timeout for Puppeteer scripts!
`
  },

  'error-handling': {
    name: 'Error Handling & Null Safety',
    size: '~600 tokens',
    content: `
**ALWAYS USE TRY-CATCH FOR EACH FIELD:**

1. **Cheerio Field Extraction Pattern**:
   \`\`\`javascript
   // GOOD - Safe extraction with null checks
   try {
     const titleElement = $('.event-title, .title, h3').first();
     data.title = titleElement.length ? titleElement.text().trim() : null;
   } catch (e) {
     console.log('Title extraction failed:', e.message);
     data.title = null;
   }
   
   // BAD - Can throw undefined errors
   data.title = $('.event-title').first().text().trim();
   \`\`\`

2. **Puppeteer Field Extraction Pattern**:
   \`\`\`javascript
   // GOOD - Safe page.evaluate with fallback
   try {
     data.date = await page.evaluate(() => {
       const el = document.querySelector('.event-date, .date, time');
       return el ? el.textContent.trim() : null;
     });
   } catch (e) {
     console.log('Date extraction failed:', e.message);
     data.date = null;
   }
   
   // BAD - Can crash if selector not found
   data.date = await page.$eval('.event-date', el => el.textContent.trim());
   \`\`\`

3. **Multiple Fallback Pattern**:
   \`\`\`javascript
   try {
     // Try 3-4 different selectors
     let title = null;
     for (const selector of ['.event-title', '.title', 'h3.name', '[data-title]']) {
       const el = $(selector).first();
       if (el.length) {
         title = el.text().trim();
         break;
       }
     }
     data.title = title;
   } catch (e) {
     data.title = null;
   }
   \`\`\`

4. **Array Extraction Safety**:
   \`\`\`javascript
   try {
     const events = $('.event').toArray().map(el => {
       const $el = $(el);
       return {
         title: $el.find('.title').first().text().trim() || 'Untitled',
         date: $el.find('.date').first().text().trim() || null
       };
     }).filter(e => e.title && e.date); // Remove incomplete items
     
     data.events = events.length > 0 ? events : [];
   } catch (e) {
     data.events = [];
   }
   \`\`\`

**RULE:** Every field extraction = one try-catch block. Never let undefined crash the script!
`
  },

  'date-parsing': {
    name: 'Date & Time Parsing',
    size: '~400 tokens',
    content: `
**DATE EXTRACTION PATTERNS:**

1. **Common Formats**:
   \`\`\`javascript
   // Match various date formats
   const datePatterns = [
     /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,        // 01/15/2025
     /\\d{4}-\\d{2}-\\d{2}/,                // 2025-01-15
     /[A-Z][a-z]+ \\d{1,2}, \\d{4}/,       // January 15, 2025
     /\\d{1,2}-[A-Z][a-z]+-\\d{4}/         // 15-Jan-2025
   ];
   
   let dateText = element.text();
   for (const pattern of datePatterns) {
     const match = dateText.match(pattern);
     if (match) return match[0];
   }
   \`\`\`

2. **Time Extraction**:
   \`\`\`javascript
   // Match time patterns
   const timeMatch = text.match(/\\d{1,2}:\\d{2}\\s*(?:AM|PM|am|pm)?/);
   const time = timeMatch ? timeMatch[0] : null;
   \`\`\`

3. **Convert to ISO**:
   \`\`\`javascript
   function parseToISO(dateStr) {
     try {
       return new Date(dateStr).toISOString();
     } catch {
       return dateStr; // Return original if parse fails
     }
   }
   \`\`\`
`
  },

  'error-handling': {
    name: 'Error Handling & Logging',
    size: '~300 tokens',
    content: `
**ROBUST ERROR HANDLING:**

1. **Track What You Tried**:
   \`\`\`javascript
   const metadata = {
     notes: [],
     selectors_tried: {}
   };
   
   // Try multiple selectors, log attempts
   let title = null;
   const titleSelectors = ['.event-title', 'h3.title', '[data-title]'];
   for (const selector of titleSelectors) {
     const el = $(selector).first();
     if (el.length) {
       title = el.text().trim();
       metadata.notes.push(\`title: found with \${selector}\`);
       break;
     }
   }
   
   if (!title) {
     metadata.notes.push(\`title: tried \${titleSelectors.join(', ')} - none worked\`);
   }
   \`\`\`

2. **Partial Success is OK**:
   \`\`\`javascript
   return {
     success: true, // Still success if we got SOME data
     data: {
       title: title || null,
       date: date || null,
       location: location || 'Unknown'
     },
     metadata: {
       fieldsFound: [title, date, location].filter(x => x).length,
       notes: metadata.notes
     }
   };
   \`\`\`
`
  }
};

// Get selected contexts based on user checkboxes
function getSelectedContexts(selections) {
  return selections
    .map(key => SCRAPER_CONTEXTS[key]?.content || '')
    .join('\n\n---\n\n');
}

// Get context info for UI
function getContextInfo() {
  return Object.entries(SCRAPER_CONTEXTS).map(([key, ctx]) => ({
    key,
    name: ctx.name,
    size: ctx.size
  }));
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCRAPER_CONTEXTS, getSelectedContexts, getContextInfo };
}

// Also export to window for browser extension use
if (typeof window !== 'undefined') {
  window.SCRAPER_CONTEXTS = SCRAPER_CONTEXTS;
  window.getSelectedContexts = getSelectedContexts;
  window.getContextInfo = getContextInfo;
}
