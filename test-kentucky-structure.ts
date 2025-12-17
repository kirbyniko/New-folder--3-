import * as cheerio from 'cheerio';

async function testKentuckyStructure() {
  const url = 'https://apps.legislature.ky.gov/legislativecalendar';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== Testing Kentucky Calendar Structure ===\n');

  // Find all date headers and meetings
  const meetings: any[] = [];
  let currentDate = '';

  $('*').each((_, el) => {
    const text = $(el).text().trim();
    
    // Check for date headers (e.g., "Monday, December 16, 2025")
    if (text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}$/)) {
      currentDate = text;
      console.log(`\nDate: ${currentDate}`);
    }
    
    // Check for time/location patterns
    if (text.match(/^\d{1,2}:\d{2}\s+[ap]m,\s+Annex Room/)) {
      const timeMatch = text.match(/^(\d{1,2}:\d{2}\s+[ap]m),\s+(.*)/);
      if (timeMatch) {
        console.log(`  Time: ${timeMatch[1]}`);
        console.log(`  Location: ${timeMatch[2]}`);
      }
    }
  });

  // Try different selectors
  console.log('\n=== Checking h3 tags ===');
  $('h3').each((i, el) => {
    console.log(`H3 ${i}: ${$(el).text().trim()}`);
  });

  console.log('\n=== Checking strong tags ===');
  $('strong').slice(0, 20).each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 200) {
      console.log(`Strong ${i}: ${text}`);
    }
  });

  console.log('\n=== Checking for committee links ===');
  $('a[href*="Committee-Details"]').slice(0, 5).each((i, el) => {
    console.log(`Link ${i}: ${$(el).text().trim()}`);
    console.log(`  URL: ${$(el).attr('href')}`);
  });
}

testKentuckyStructure().catch(console.error);
