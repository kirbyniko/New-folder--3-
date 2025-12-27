import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';

loadEnvFile();

async function testPAScraper() {
  initializeScrapers();
  const scraper = ScraperRegistry.get('PA');
  
  if (!scraper) {
    console.log('❌ No PA scraper found');
    return;
  }
  
  console.log('🔍 Testing PA scraper...');
  try {
    const events = await scraper.scrape();
    console.log(`✅ PA Events found: ${events.length}`);
    if (events.length > 0) {
      console.log(`\nFirst 3 events:`);
      events.slice(0, 3).forEach((e, i) => {
        console.log(`${i + 1}. ${e.name}`);
        console.log(`   Date: ${e.date}, Time: ${e.time || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No events returned from PA scraper');
    }
  } catch (error: any) {
    console.error('❌ Error scraping PA:', error.message);
    console.error(error.stack);
  }
}

testPAScraper();
