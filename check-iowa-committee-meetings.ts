import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkIowaCommitteeMeetings() {
  const urls = [
    'https://www.legis.iowa.gov/committees/meetings/meetingsListComm?ga=91',
    'https://www.legis.iowa.gov/committees/meetings?ga=91',
    'https://www.legis.iowa.gov/committees/interim',
    'https://www.legis.iowa.gov/committees/interim/meetings',
  ];
  
  for (const url of urls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Checking: ${url}`);
    console.log('='.repeat(80));
    
    try {
      const response = await fetch(url);
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for any meeting listings
        const tables = $('table');
        console.log(`Tables: ${tables.length}`);
        
        if (tables.length > 0) {
          const rows = tables.first().find('tr').length;
          console.log(`Rows in first table: ${rows}`);
          
          if (rows > 1) {
            console.log('\nFirst 3 rows:');
            tables.first().find('tr').slice(0, 3).each((idx, row) => {
              const text = $(row).text().trim().replace(/\s+/g, ' ').substring(0, 150);
              console.log(`  ${idx + 1}. ${text}`);
            });
          }
        }
        
        // Look for "no meetings" message
        const bodyText = $('body').text().toLowerCase();
        if (bodyText.includes('no meeting') || bodyText.includes('no committee') || bodyText.includes('not scheduled')) {
          console.log('\n⚠️ Page indicates no meetings');
        }
      }
      
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }
}

checkIowaCommitteeMeetings().catch(console.error);
