import { initializeScrapers, ScraperRegistry } from './lib/functions/utils/scrapers/index.js';

async function test() {
  console.log('Initializing scrapers...');
  await initializeScrapers();
  
  const scraper = ScraperRegistry.get('AK');
  if (!scraper) {
    console.log('❌ No AK scraper found');
    return;
  }
  
  console.log('✅ Found AK scraper');
  console.log('Running scraper...');
  
  const events = await scraper.scrape();
  
  console.log(`\n📊 Results:`);
  console.log(`Total events: ${events.length}`);
  
  const stateEvents = events.filter(e => e.level === 'state');
  const localEvents = events.filter(e => e.level === 'local');
  
  console.log(`State-level: ${stateEvents.length}`);
  console.log(`Local-level: ${localEvents.length}`);
  
  if (localEvents.length > 0) {
    console.log(`\n📍 First 3 Juneau events:`);
    localEvents.slice(0, 3).forEach(e => {
      console.log(`  - ${e.name}`);
      console.log(`    Date: ${e.date}`);
    });
  }
}

test().catch(console.error);
