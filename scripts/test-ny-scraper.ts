import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';

loadEnvFile();

async function testNYScraper() {
  initializeScrapers();
  const scraper = ScraperRegistry.get('NY');
  
  if (!scraper) {
    console.log('❌ No NY scraper found');
    return;
  }
  
  console.log('🔍 Testing NY scraper...');
  try {
    const events = await scraper.scrape();
    console.log(`✅ NY Events found: ${events.length}`);
    if (events.length > 0) {
      console.log(`Sample: ${events[0].name}`);
      console.log(`Date: ${events[0].date}`);
      console.log(`Location: ${events[0].location}`);
    } else {
      console.log('⚠️ No events returned from NY scraper');
    }
  } catch (error: any) {
    console.error('❌ Error scraping NY:', error.message);
  }
}

testNYScraper();
