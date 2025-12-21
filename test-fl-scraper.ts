import 'dotenv/config';
import { initializeScrapers, ScraperRegistry } from './netlify/functions/utils/scrapers/index';

async function testFLScraper() {
  console.log('🧪 Testing Florida scraper...\n');
  
  await initializeScrapers();
  const scraper = ScraperRegistry.get('FL');
  
  if (!scraper) {
    console.log('❌ FL scraper not found');
    return;
  }

  const startTime = Date.now();
  const events = await scraper.scrape();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`\n✅ Result: ${events.length} events in ${duration}s`);
  
  if (events.length > 0) {
    console.log('\nSample event:');
    console.log(JSON.stringify(events[0], null, 2));
  }
}

testFLScraper();
