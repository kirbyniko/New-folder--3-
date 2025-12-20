import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function extractDesMoinesMeetings() {
  const url = 'https://www.dsm.city/calendar.php?view=list&calendar=5&month=12&day=01&year=2025';
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  
  console.log('Extracting Des Moines meetings...\n');
  
  // Look for the main content area
  const mainContent = $('#middle_content, #content, main, .content');
  if (mainContent.length > 0) {
    console.log('Found main content area\n');
    
    // Look for event listings
    const events: any[] = [];
    
    // Try different patterns
    $('h3, h4, .event-title, .meeting-title').each((idx, heading) => {
      const title = $(heading).text().trim();
      if (title && title.length > 5) {
        console.log(`Heading ${idx + 1}: ${title}`);
        
        // Look for date/time info near the heading
        const parent = $(heading).parent();
        const siblings = $(heading).nextAll().slice(0, 3);
        const nearby = parent.text() + siblings.text();
        
        // Check for date patterns
        const dateMatch = nearby.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
        if (dateMatch) {
          console.log(`  Date: ${dateMatch[0]}`);
        }
        
        // Check for time
        const timeMatch = nearby.match(/\b\d{1,2}:\d{2}\s*[AaPp][Mm]\b/);
        if (timeMatch) {
          console.log(`  Time: ${timeMatch[0]}`);
        }
        
        console.log('');
      }
    });
    
    // Also check for any divs or sections that might contain events
    $('div').each((_, div) => {
      const text = $(div).text().trim();
      if (text.toLowerCase().includes('city council') && text.includes('2025')) {
        const snippet = text.substring(0, 200);
        console.log(`\nPotential meeting div: ${snippet}...`);
      }
    });
  }
  
  // Check page title
  console.log(`\n\nPage title: ${$('title').text()}`);
  
  // Check for any scripts that might load data
  $('script').each((_, script) => {
    const src = $(script).attr('src');
    if (src && (src.includes('calendar') || src.includes('event'))) {
      console.log(`Found calendar script: ${src}`);
    }
  });
}

extractDesMoinesMeetings().catch(console.error);
