/**
 * Test Smart Scraping System
 * Tests the new incremental update logic for Iowa and Illinois
 */

import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index';
import { 
  markStateEventsAsUnseen,
  incrementUnseenEventsCycleCount,
  archiveRemovedEvents,
  insertEvent,
  insertBills,
  getAllStateEventsForExport
} from '../lib/functions/utils/db/events';
import { getPool } from '../lib/functions/utils/db/connection';

async function testSmartScraping() {
  console.log('🧪 Testing Smart Scraping System\n');
  
  await initializeScrapers();
  
  // Test states
  const testStates = ['IA', 'IL'];
  
  for (const state of testStates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${state}`);
    console.log('='.repeat(60));
    
    const scraper = ScraperRegistry.get(state);
    if (!scraper) {
      console.log(`❌ No scraper found for ${state}`);
      continue;
    }
    
    try {
      // Step 1: Mark existing events as unseen
      console.log('\n📝 Step 1: Marking existing events as unseen...');
      await markStateEventsAsUnseen(state);
      
      // Step 2: Run scraper
      console.log('\n🔍 Step 2: Running scraper...');
      const startTime = Date.now();
      const events = await scraper.scrape();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Scraper completed in ${(duration / 1000).toFixed(2)}s`);
      console.log(`📊 Found ${events.length} events`);
      
      if (events.length > 0) {
        console.log('\n📄 Sample events:');
        events.slice(0, 3).forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.name}`);
          console.log(`     Date: ${event.date}`);
          console.log(`     Committee: ${event.committee || 'N/A'}`);
        });
        
        // Step 3: Insert events into database
        console.log(`\n💾 Step 3: Inserting ${events.length} events into database...`);
        let insertedCount = 0;
        for (const event of events) {
          try {
            const eventId = await insertEvent(event, `scraper-${state.toLowerCase()}`);
            insertedCount++;
            
            if (event.bills && event.bills.length > 0) {
              await insertBills(eventId, event.bills, state);
            }
          } catch (err: any) {
            console.error(`   ⚠️  Failed to insert event: ${err.message}`);
          }
        }
        console.log(`✅ Inserted/updated ${insertedCount} events`);
        
        // Step 4: Archive removed events
        console.log('\n🗑️  Step 4: Checking for removed events...');
        const archivedCount = await archiveRemovedEvents(state, 2);
        if (archivedCount > 0) {
          console.log(`📦 Archived ${archivedCount} removed events`);
        } else {
          console.log('✅ No events to archive');
        }
        
      } else {
        console.log('\n⚠️  No events found - testing data preservation...');
        
        // Increment cycle count for unseen events
        const unseenCount = await incrementUnseenEventsCycleCount(state);
        console.log(`📊 ${unseenCount} existing events not found in this scrape`);
        console.log('✅ Existing data preserved (not deleted)');
      }
      
      // Step 5: Export to verify
      console.log('\n📤 Step 5: Exporting data...');
      const exportedEvents = await getAllStateEventsForExport(state);
      console.log(`✅ Exported ${exportedEvents.length} active events`);
      
      if (exportedEvents.length > 0) {
        const withBills = exportedEvents.filter(e => e.bills && e.bills.length > 0).length;
        const withTags = exportedEvents.filter(e => e.tags && e.tags.length > 0).length;
        console.log(`   📄 ${withBills} events with bills`);
        console.log(`   🏷️  ${withTags} events with tags`);
      }
      
    } catch (error: any) {
      console.error(`\n❌ Error testing ${state}:`, error.message);
      console.error(error.stack);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Smart Scraping Test Complete');
  console.log('='.repeat(60));
  
  // Close database connection
  const pool = getPool();
  await pool.end();
}

testSmartScraping().catch(console.error);
