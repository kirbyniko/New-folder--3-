import { loadEnvFile } from './lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from './lib/functions/utils/scrapers/index.js';

loadEnvFile();

async function testAlaska() {
  console.log('Initializing scrapers...');
  await initializeScrapers();
  
  const scraper = ScraperRegistry.get('AK');
  if (!scraper) {
    console.error('❌ No Alaska scraper found!');
    return;
  }
  
  console.log('✅ Alaska scraper found');
  console.log('📅 Scraping Alaska events...\n');
  
  try {
    const events = await scraper.scrape();
    console.log(`\n✅ Found ${events.length} Alaska events`);
    
    if (events.length > 0) {
      console.log('\n📋 Sample events:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   URL: ${event.sourceUrl}`);
      });
    } else {
      console.log('⚠️  No events found - Alaska legislature may be in recess');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAlaska();
