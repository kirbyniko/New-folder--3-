import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';

loadEnvFile();

async function debugNYScraper() {
  initializeScrapers();
  const scraper = ScraperRegistry.get('NY');
  
  if (!scraper) {
    console.log('❌ No NY scraper found');
    return;
  }
  
  console.log('🔍 Debugging NY scraper...');
  console.log(`Today's date: ${new Date().toISOString()}`);
  
  try {
    // Access the private method via any cast
    const scraperAny = scraper as any;
    const hearings = await scraperAny.fetchPublicHearings();
    
    console.log(`\n📅 Found ${hearings.length} hearings:\n`);
    for (const hearing of hearings) {
      const parsedDate = scraperAny.parseNYDate(hearing.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFuture = parsedDate >= today;
      
      console.log(`Date: ${hearing.date} → ${parsedDate.toISOString()} (Future: ${isFuture})`);
      console.log(`  Committee: ${hearing.committee}`);
      console.log(`  Topic: ${hearing.topic.substring(0, 80)}...`);
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugNYScraper();
