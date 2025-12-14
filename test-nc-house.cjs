const https = require('https');
const cheerio = require('cheerio');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  console.log('Testing North Carolina Senate Calendar...\n');
  
  const url = 'https://calendars.ncleg.gov/CurrentCalendarDoc/S';
  console.log(`Fetching: ${url}`);
  
  const html = await fetch(url);
  console.log(`Page size: ${Math.round(html.length / 1024)}KB\n`);
  
  const $ = cheerio.load(html);
  console.log(`Title: ${$('title').text()}\n`);
  
  // Try to find committee meetings
  console.log('Looking for committee meetings...\n');
  
  // Look for any tables
  let eventCount = 0;
  $('table').each((i, table) => {
    const $table = $(table);
    console.log(`Table ${i + 1}:`);
    
    $table.find('tr').slice(0, 5).each((j, row) => {
      const $row = $(row);
      const text = $row.text().trim();
      if (text.length > 0 && text.length < 200) {
        console.log(`  Row ${j + 1}: ${text}`);
        if (text.match(/committee|meeting|hearing/i)) {
          eventCount++;
        }
      }
    });
    console.log('');
  });
  
  // Look for specific committee-related elements
  const committeeElements = $('[class*="committee"], [class*="meeting"], [class*="calendar"]');
  console.log(`Found ${committeeElements.length} elements with committee/meeting/calendar classes`);
  
  committeeElements.slice(0, 10).each((i, el) => {
    const $el = $(el);
    console.log(`  ${i + 1}. ${$el.attr('class')}: ${$el.text().trim().substring(0, 100)}`);
  });
  
  console.log(`\n✅ Potential committee meetings found: ${eventCount}`);
}

test().catch(console.error);
