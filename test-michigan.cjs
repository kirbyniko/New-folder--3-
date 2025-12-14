// Test Michigan scraper directly
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

async function testMichigan() {
  console.log('Testing Michigan scraper...\n');
  
  const url = 'https://www.legislature.mi.gov/Committees/Meetings';
  console.log(`Fetching: ${url}`);
  
  const html = await fetchPage(url);
  console.log(`Page size: ${Math.round(html.length / 1024)}KB\n`);
  
  const $ = cheerio.load(html);
  const events = [];
  
  // Find committee links with dates
  $('a[href*="/Committees/Meeting"]').each((_, link) => {
    const $link = $(link);
    const committee = $link.text().trim();
    const meetingUrl = $link.attr('href');
    
    // Get parent text to find date/time
    const parentText = $link.parent().text();
    
    // Look for date pattern: MM/DD/YYYY HH:MM AM/PM
    const dateMatch = parentText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)/i);
    
    if (dateMatch && committee) {
      events.push({
        committee,
        date: dateMatch[1],
        time: dateMatch[2],
        url: `https://www.legislature.mi.gov${meetingUrl}`
      });
    }
  });
  
  console.log(`Found ${events.length} events:\n`);
  events.slice(0, 5).forEach(e => {
    console.log(`  • ${e.committee}`);
    console.log(`    ${e.date} at ${e.time}`);
    console.log(`    ${e.url}\n`);
  });
}

testMichigan().catch(console.error);
