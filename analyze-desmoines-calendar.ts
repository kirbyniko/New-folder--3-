import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeDesMoinesCalendar() {
  const url = 'https://www.dsm.city/calendar.php?view=list&calendar=5&month=12&day=01&year=2025';
  
  console.log('Analyzing Des Moines calendar...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status}\n`);
    
    if (response.status === 200) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      console.log(`Tables found: ${$('table').length}`);
      console.log(`List items found: ${$('li').length}`);
      console.log(`Divs with class containing 'event': ${$('div[class*="event"]').length}`);
      console.log(`Divs with class containing 'calendar': ${$('div[class*="calendar"]').length}\n`);
      
      // Look for event entries
      console.log('Looking for event patterns...\n');
      
      // Check for table rows
      if ($('table').length > 0) {
        console.log('First table structure:');
        $('table').first().find('tr').slice(0, 5).each((idx, row) => {
          const cells = $(row).find('td, th');
          const rowText = cells.map((_, cell) => $(cell).text().trim()).get().join(' | ');
          console.log(`  Row ${idx + 1}: ${rowText.substring(0, 150)}`);
        });
      }
      
      // Check for list structure
      if ($('li').length > 0) {
        console.log('\nFirst 5 list items:');
        $('li').slice(0, 5).each((idx, li) => {
          const text = $(li).text().trim().replace(/\s+/g, ' ').substring(0, 150);
          const links = $(li).find('a').length;
          console.log(`  ${idx + 1}. ${text} (${links} links)`);
        });
      }
      
      // Look for specific selectors
      const selectors = ['.event', '.meeting', '.calendar-item', 'article', '.item'];
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`\n\nFound ${elements.length} elements with selector: ${selector}`);
          console.log('First element:');
          console.log(elements.first().html()?.substring(0, 500));
        }
      }
      
      // Check for dates
      const bodyText = $('body').text();
      const dateMatches = bodyText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi);
      if (dateMatches) {
        console.log(`\n\nDates found: ${[...new Set(dateMatches)].slice(0, 10).join(', ')}`);
      }
    }
    
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }
}

analyzeDesMoinesCalendar().catch(console.error);
