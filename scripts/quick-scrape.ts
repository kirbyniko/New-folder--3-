/**
 * Quick Scraper - Test run for 5 states
 * Populates production database with sample data
 */

import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { getPool } from '../netlify/functions/utils/db/connection.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { insertEvent, insertBills, insertTags } from '../netlify/functions/utils/db/events.js';

// Load environment variables
loadEnvFile();

// Test with 5 states that have good scrapers
const TEST_STATES = ['CA', 'NY', 'PA', 'IL', 'MA'];

async function quickScrape() {
  console.log('🚀 Starting quick test scrape for', TEST_STATES.length, 'states...\n');
  
  await initializeScrapers();
  const pool = getPool();
  
  let totalEvents = 0;
  let totalBills = 0;
  let totalTags = 0;
  const startTime = Date.now();
  
  for (const state of TEST_STATES) {
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      console.log(`⚠️  ${state}: No scraper available\n`);
      continue;
    }
    
    try {
      console.log(`🔄 ${state}: Starting scrape...`);
      const stateStart = Date.now();
      
      const events = await scraper.scrape();
      console.log(`   Found ${events.length} events`);
      
      if (events.length === 0) {
        console.log(`   ⚠️  No events to insert\n`);
        continue;
      }
      
      let stateEventCount = 0;
      let stateBillCount = 0;
      let stateTagCount = 0;
      
      for (const event of events) {
        try {
          const eventId = await insertEvent(event, `test-scraper-${state.toLowerCase()}`);
          stateEventCount++;
          
          // Insert bills if present
          if (event.bills && event.bills.length > 0) {
            const billCount = await insertBills(eventId, event.bills, state);
            stateBillCount += billCount;
          }
          
          // Insert tags if present
          if (event.tags && event.tags.length > 0) {
            const tagCount = await insertTags(eventId, event.tags);
            stateTagCount += tagCount;
          }
        } catch (insertError: any) {
          // Skip duplicates silently
          if (insertError.code !== '23505') {
            console.error(`   ❌ Error inserting event: ${insertError.message}`);
          }
        }
      }
      
      totalEvents += stateEventCount;
      totalBills += stateBillCount;
      totalTags += stateTagCount;
      
      const stateTime = Math.round((Date.now() - stateStart) / 1000);
      console.log(`   ✅ Inserted ${stateEventCount} events, ${stateBillCount} bills, ${stateTagCount} tags (${stateTime}s)\n`);
      
    } catch (error: any) {
      console.error(`   ❌ ${state} scraper failed: ${error.message}\n`);
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log('━'.repeat(50));
  console.log('📊 SCRAPING COMPLETE');
  console.log('━'.repeat(50));
  console.log(`Total Events:  ${totalEvents}`);
  console.log(`Total Bills:   ${totalBills}`);
  console.log(`Total Tags:    ${totalTags}`);
  console.log(`Time Taken:    ${totalTime}s`);
  console.log(`States Scraped: ${TEST_STATES.length}`);
  console.log('━'.repeat(50));
  console.log('\n✅ Test scrape complete! Check https://civitracker.netlify.app\n');
  
  await pool.end();
}

quickScrape().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
