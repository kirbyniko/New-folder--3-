// Test Ohio scraper
const https = require('https');
const cheerio = require('cheerio');

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function testOhio() {
  console.log('Testing Ohio scraper...\n');
  
  const url = 'https://www.legislature.ohio.gov/schedules/calendar';
  console.log(`Fetching: ${url}`);
  
  const html = await fetchPage(url);
  console.log(`Page size: ${Math.round(html.length / 1024)}KB\n`);
  
  const $ = cheerio.load(html);
  console.log(`Title: ${$('title').text()}\n`);
  
  // Look for calendar events
  const events = [];
  
  // Try different selectors
  $('.calendar-event, .meeting, .committee-meeting, .event-item').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      console.log(`Found element: ${text.substring(0, 100)}`);
      events.push(text);
    }
  });
  
  if (events.length === 0) {
    console.log('No events with common selectors. Checking for any links or tables...\n');
    
    // Look for tables
    $('table').each((i, table) => {
      console.log(`\nTable ${i + 1}:`);
      $(table).find('tr').slice(0, 3).each((_, row) => {
        const cells = $(row).find('td, th');
        if (cells.length > 0) {
          const rowText = cells.map((_, cell) => $(cell).text().trim()).get().join(' | ');
          console.log(`  ${rowText}`);
        }
      });
    });
  }
  
  console.log(`\nTotal events found: ${events.length}`);
}

testOhio().catch(console.error);
