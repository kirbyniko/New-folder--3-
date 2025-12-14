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
  console.log('Testing Georgia legislature API/website...\n');
  
  // Test the API endpoint from the scraper
  const apiUrl = 'https://www.legis.ga.gov/api/meetings';
  console.log(`1. Testing API: ${apiUrl}`);
  
  try {
    const html = await fetch(apiUrl);
    console.log(`   Response size: ${Math.round(html.length / 1024)}KB`);
    console.log(`   First 200 chars: ${html.substring(0, 200)}\n`);
  } catch (err) {
    console.log(`   Error: ${err.message}\n`);
  }
  
  // Try alternative URLs
  const urls = [
    'https://www.legis.ga.gov/schedule',
    'https://www.legis.ga.gov/calendar',
    'https://www.legis.ga.gov/committees'
  ];
  
  for (const url of urls) {
    console.log(`Testing: ${url}`);
    try {
      const html = await fetch(url);
      console.log(`   Response size: ${Math.round(html.length / 1024)}KB`);
      
      if (html.length > 2000) {
        const $ = cheerio.load(html);
        console.log(`   Title: ${$('title').text()}`);
        
        // Look for meeting/committee related content
        const links = $('a[href*="meeting"], a[href*="committee"], a[href*="calendar"]');
        console.log(`   Found ${links.length} relevant links`);
        if (links.length > 0) {
          links.slice(0, 3).each((i, el) => {
            console.log(`     - ${$(el).text().trim().substring(0, 50)}: ${$(el).attr('href')}`);
          });
        }
      }
      console.log('');
    } catch (err) {
      console.log(`   Error: ${err.message}\n`);
    }
  }
}

test().catch(console.error);
