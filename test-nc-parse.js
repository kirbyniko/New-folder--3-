// Test NC calendar parsing
import https from 'https';
import * as cheerio from 'cheerio';

https.get('https://www.ncleg.gov/LegislativeCalendar', (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    console.log(`Fetched ${html.length} bytes`);
    
    const $ = cheerio.load(html);
    
    // Test 1: Count cal-event-day
    const dayCount = $('.cal-event-day').length;
    console.log(`Found ${dayCount} .cal-event-day elements`);
    
    // Test 2: Find committee links
    const committeeLinks = $('a[href*="/Committees/CommitteeInfo/"]');
    console.log(`Found ${committeeLinks.length} committee links`);
    
    // Test 3: Extract first 3 committee names
    committeeLinks.slice(0, 3).each((i, el) => {
      const text = $(el).text().trim();
      console.log(`  - Committee ${i+1}: ${text}`);
    });
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
