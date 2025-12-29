import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';

async function testScrapers() {
  console.log('🔍 Testing scrapers for states with no events...\n');
  
  await initializeScrapers();
  
  const statesToTest = ['CT', 'FL', 'HI'];
  
  for (const state of statesToTest) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${state}...`);
    console.log('='.repeat(60));
    
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      console.log(`❌ No scraper found for ${state}`);
      continue;
    }
    
    try {
      const startTime = Date.now();
      const events = await scraper.scrape();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`\n✅ ${state}: Found ${events.length} events (${duration}s)`);
      
      if (events.length > 0) {
        console.log('\nFirst 3 events:');
        events.slice(0, 3).forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.name}`);
          console.log(`     Date: ${event.date}, Time: ${event.time || 'N/A'}`);
          console.log(`     Level: ${event.level || 'state'}`);
        });
      } else {
        console.log('\n⚠️  No events found - this may be due to:');
        console.log('   - Legislature in recess/interim');
        console.log('   - No meetings scheduled yet');
        console.log('   - Scraper needs debugging');
      }
    } catch (error: any) {
      console.error(`\n❌ ${state} Error:`, error.message);
      console.error('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing complete');
  console.log('='.repeat(60));
}

testScrapers().catch(console.error);
