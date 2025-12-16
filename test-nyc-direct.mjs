/**
 * Direct test of NYC Council HTML scraping
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

async function testNYC() {
  console.log('Fetching NYC Council calendar...');
  const url = 'https://legistar.council.nyc.gov/Calendar.aspx?Mode=This%20Month';
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  
  const html = await response.text();
  console.log(`HTML length: ${html.length}`);
  
  const $ = cheerio.load(html);
  const rows = $('tr').length;
  console.log(`Found ${rows} rows`);
  
  // Find data rows
  let count = 0;
  $('tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    
    if (cells.length >= 4) {
      const committeeText = cells.eq(0).text().trim();
      const dateText = cells.eq(1).text().trim();
      
      if (committeeText && dateText && committeeText !== 'Committee') {
        count++;
        if (count <= 3) {
          console.log(`\nRow ${count}:`);
          console.log(`  Committee: ${committeeText.substring(0, 60)}`);
          console.log(`  Date: ${dateText}`);
          console.log(`  Time: ${cells.eq(2).text().trim()}`);
          console.log(`  Location: ${cells.eq(3).text().trim().substring(0, 40)}`);
        }
      }
    }
  });
  
  console.log(`\nTotal events found: ${count}`);
}

testNYC().catch(console.error);
