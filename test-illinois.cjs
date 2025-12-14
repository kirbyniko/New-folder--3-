// Test Illinois scraper directly
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

async function testIllinois() {
  console.log('Testing Illinois scraper...\n');
  
  const urls = [
    'https://www.ilga.gov/senate/schedules/',
    'https://www.ilga.gov/house/schedules/'
  ];
  
  for (const url of urls) {
    console.log(`\nFetching: ${url}`);
    
    try {
      const html = await fetchPage(url);
      console.log(`Page size: ${Math.round(html.length / 1024)}KB`);
      
      const $ = cheerio.load(html);
      
      // Show page title
      console.log(`Title: ${$('title').text()}`);
      
      // Look for links to actual schedule pages
      console.log('\nLinks found:');
      $('a').each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (text && href && (href.includes('schedule') || href.includes('hearing') || href.includes('calendar'))) {
          console.log(`  • ${text}: ${href}`);
        }
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }
}

testIllinois().catch(console.error);
