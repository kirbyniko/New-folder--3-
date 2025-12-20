import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkIowaPublicHearings() {
  const url = 'https://www.legis.iowa.gov/committees/publicHearings?ga=91';
  
  console.log('Checking Iowa Public Hearings...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status}\n`);
    
    if (response.status === 200) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Check for table structure
      console.log(`Tables found: ${$('table').length}`);
      
      // Look for hearing entries
      const rows = $('table tr').slice(0, 10);
      console.log(`\nFirst 10 table rows:\n`);
      
      rows.each((idx, row) => {
        const cells = $(row).find('td, th');
        if (cells.length > 0) {
          const rowData = cells.map((_, cell) => $(cell).text().trim()).get();
          console.log(`Row ${idx + 1}: ${rowData.join(' | ')}`);
        }
      });
      
      // Check page content for dates
      const bodyText = $('body').text();
      const dateMatches = bodyText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi);
      
      if (dateMatches) {
        const uniqueDates = [...new Set(dateMatches)];
        console.log(`\n\nDates found on page:`);
        uniqueDates.slice(0, 10).forEach(date => console.log(`  ${date}`));
      }
      
      // Check for "no hearings" or similar messages
      if (bodyText.toLowerCase().includes('no hearing') || 
          bodyText.toLowerCase().includes('no public hearing') ||
          bodyText.toLowerCase().includes('no scheduled')) {
        console.log('\n⚠️ Page indicates no hearings scheduled');
      }
      
      // Check what GA (General Assembly) means
      console.log('\n\nChecking for General Assembly info...');
      const gaText = bodyText.match(/91st.*?(General Assembly|Session|Legislature)/gi);
      if (gaText) {
        console.log(`Found: ${gaText[0]}`);
      }
    }
    
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }
}

checkIowaPublicHearings().catch(console.error);
