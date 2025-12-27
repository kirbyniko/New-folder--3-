import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';
import { insertEvent } from './src/db/events.js';

async function test() {
  console.log('🧪 Testing D1 insert with Vermont scraper...\n');
  
  await initializeScrapers();
  const scraper = ScraperRegistry.get('VT');
  
  if (!scraper) {
    console.error('❌ No VT scraper found');
    process.exit(1);
  }
  
  console.log('🔍 Scraping Vermont...');
  const events = await scraper.scrape();
  console.log(`📊 Found ${events.length} VT events`);
  
  if (events.length > 0) {
    console.log('\n💾 Inserting first event into D1...');
    console.log(`   Event: ${events[0].name}`);
    console.log(`   Date: ${events[0].date}`);
    
    const id = await insertEvent(events[0]);
    console.log(`✅ Insert complete! ID: ${id}`);
  } else {
    console.log('⚠️  No events to insert');
  }
}

test().catch(console.error);
