// Trigger NJ scrape and save to cache (run in background)
import { initializeScrapers, ScraperRegistry } from './netlify/functions/utils/scrapers/index.js';

console.log('Initializing scrapers...');
await initializeScrapers();

const scraper = ScraperRegistry.get('NJ');
if (scraper) {
  console.log('✓ NJ scraper found');
  console.log('🕷️ Starting scrape (this will take ~2 minutes)...');
  
  try {
    const events = await scraper.scrape();
    console.log(`\n✅ SUCCESS! Scraped ${events.length} events`);
    console.log('\nSample events:');
    events.slice(0, 3).forEach(e => {
      console.log(`- ${e.name}`);
      console.log(`  ${e.date.substring(0,10)} at ${e.time}`);
      if (e.bills) console.log(`  📄 ${e.bills.length} bills`);
    });
    
    console.log('\n✓ Results are now cached for 24 hours');
    console.log('✓ Frontend requests will be instant');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
} else {
  console.error('❌ NJ scraper not found');
}
