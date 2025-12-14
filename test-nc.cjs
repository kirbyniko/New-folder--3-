// Test North Carolina scraper
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

async function testNC() {
  console.log('Testing North Carolina scraper...\n');
  
  const url = 'https://www.ncleg.gov/Calendars';
  console.log(`Fetching: ${url}`);
  
  const html = await fetchPage(url);
  console.log(`Page size: ${Math.round(html.length / 1024)}KB\n`);
  
  const $ = cheerio.load(html);
  console.log(`Title: ${$('title').text()}\n`);
  
  const events = [];
  
  // Look for calendar/meeting links
  $('a').each((_, link) => {
    const href = $(link).attr('href');
    const text = $(link).text().trim();
    if (href && text && (text.length > 5)) {
      // Check if link contains committee, meeting, or calendar info
      if (href.includes('Committee') || href.includes('Meeting') || href.includes('Calendar') || 
          text.toLowerCase().includes('committee') || text.toLowerCase().includes('meeting')) {
        events.push({ text, href });
      }
    }
  });
  
  console.log(`Found ${events.length} potential event links:\n`);
  events.slice(0, 10).forEach(e => {
    console.log(`  • ${e.text}`);
    console.log(`    ${e.href}\n`);
  });
}

testNC().catch(console.error);
