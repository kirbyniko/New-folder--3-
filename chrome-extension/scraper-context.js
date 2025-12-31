// Scraper Context - Real working examples and tactics for AI generation
// Based on SCRAPER_GUIDE_SHORT.md patterns

const SCRAPER_CONTEXTS = {
  'scraper-guide': {
    name: 'Full Scraper Guide (agendas, PDFs, APIs)',
    size: '~600 tokens',
    content: `
**SCRAPER PATTERNS:**

**PDF Agenda URLs:**
\`\`\`javascript
const pdfLinks = [];
$('a[href$=".pdf"], a:contains("Agenda")').each((i, el) => {
  const href = $(el).attr('href');
  if (href && (href.includes('agenda') || href.endsWith('.pdf'))) {
    pdfLinks.push(href.startsWith('http') ? href : new URL(href, baseUrl).href);
  }
});
\`\`\`

**Date Parsing:**
\`\`\`javascript
function parseDate(dateStr) {
  const formats = [/\d{4}-\d{2}-\d{2}/, /\d{1,2}\/\d{1,2}\/\d{4}/, /[A-Z][a-z]+ \d{1,2}, \d{4}/];
  for (const f of formats) {
    const m = dateStr.match(f);
    if (m) return new Date(m[0]).toISOString();
  }
  return dateStr;
}
\`\`\`

**API Detection:** Check DevTools Network tab for /api/events, /api/meetings, /api/calendar
`
  },
  'basic-selectors': {
    name: 'Basic Selector Patterns',
    size: '~200 tokens',
    content: `
**SELECTOR FALLBACKS:**
\`\`\`javascript
// Try 5+ selectors
const selectors = ['.event-title', '[class*="title"]', '[data-title]', 'h1, h2, h3', '.name'];
let title = null;
for (const sel of selectors) {
  const el = $(sel).first();
  if (el.length && el.text().trim()) {
    title = el.text().trim();
    break;
  }
}

// Text matching: $('*').filter((i,el) => $(el).text().match(/\d{1,2}\/\d{1,2}\/\d{4}/)).first()
// Parent nav: eventCard.find('h3, .title, [class*="title"]').first().text()
// Wildcards: $('[class*="event"]'), $('[class^="cal-"]'), $('[data-type]')
\`\`\`
`
  },

  'puppeteer-tactics': {
    name: 'Puppeteer Tactics (JS-Heavy Pages)',
    size: '~300 tokens',
    content: `
**PUPPETEER PATTERNS:**

\`\`\`javascript
// Date inputs
await page.$('input[aria-label="From Date"]').click({ clickCount: 3 });
await page.type('01/01/2025');
await page.keyboard.press('Enter');
await page.waitForTimeout(2000);

// Infinite scroll
for (let i = 0; i < 20; i++) {
  await page.evaluate(() => document.querySelector('#list').scrollTop = document.querySelector('#list').scrollHeight);
  await page.waitForTimeout(1000);
}

// Wait for React/Vue
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForTimeout(5000);
await page.waitForSelector('.event-list', { timeout: 10000 });

// Extract
const events = await page.evaluate(() => 
  Array.from(document.querySelectorAll('.event')).map(el => ({
    title: el.querySelector('h3, .title')?.textContent?.trim() || '',
    date: el.querySelector('.date, time')?.textContent?.trim() || ''
  }))
);
\`\`\`
`
  },

  'error-handling': {
    name: 'Error Handling & Null Safety',
    size: '~200 tokens',
    content: `
**SAFE EXTRACTION:**

\`\`\`javascript
// Cheerio
try {
  const el = $('.title, h3').first();
  data.title = el.length ? el.text().trim() : null;
} catch (e) {
  data.title = null;
}

// Puppeteer
try {
  data.date = await page.evaluate(() => {
    const el = document.querySelector('.date, time');
    return el ? el.textContent.trim() : null;
  });
} catch (e) {
  data.date = null;
}

// Multiple fallbacks with logging
let title = null;
for (const sel of ['.title', 'h3', '[data-title]']) {
  const el = $(sel).first();
  if (el.length) { title = el.text().trim(); break; }
}
\`\`\`
`
  },

  'date-parsing': {
    name: 'Date & Time Parsing',
    size: '~150 tokens',
    content: `
**DATE PATTERNS:**
\`\`\`javascript
const datePatterns = [
  /\d{1,2}\/\d{1,2}\/\d{4}/,        // 01/15/2025
  /\d{4}-\d{2}-\d{2}/,              // 2025-01-15
  /[A-Z][a-z]+ \d{1,2}, \d{4}/,    // January 15, 2025
];

let dateText = element.text();
for (const p of datePatterns) {
  const m = dateText.match(p);
  if (m) return m[0];
}

// Time: /\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?/
// To ISO: new Date(dateStr).toISOString()
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
