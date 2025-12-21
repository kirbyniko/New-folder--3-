/**
 * Populate Database Script
 * Manually runs scrapers for key states and saves to PostgreSQL
 */

import { getPool } from '../netlify/functions/utils/db/connection.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { insertEvent, insertBills, insertTags } from '../netlify/functions/utils/db/events.js';

const STATES_TO_SCRAPE = ['NY', 'TX', 'IL', 'PA', 'OH', 'FL', 'CA', 'MA'];

async function main() {
  console.log('🚀 Starting database population...\n');
  
  await initializeScrapers();
  const pool = getPool();
  
  // Clean up old data
  console.log('🧹 Cleaning up old events (>24h)...');
  const cleanupResult = await pool.query(
    `DELETE FROM events WHERE scraped_at < NOW() - INTERVAL '24 hours'`
  );
  console.log(`   Deleted ${cleanupResult.rowCount} old events\n`);
  
  let totalEvents = 0;
  let totalBills = 0;
  let totalTags = 0;
  
  for (const state of STATES_TO_SCRAPE) {
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      console.log(`⚠️  ${state}: No scraper available`);
      continue;
    }
    
    try {
      console.log(`🔄 ${state}: Starting scrape...`);
      const events = await scraper.scrape();
      console.log(`   Found ${events.length} events`);
      
      let stateEventCount = 0;
      let stateBillCount = 0;
      let stateTagCount = 0;
      
      for (const event of events) {
        try {
          const eventId = await insertEvent(event, `manual-scraper-${state.toLowerCase()}`);
          stateEventCount++;
          
          if (event.bills && event.bills.length > 0) {
            await insertBills(eventId, event.bills, state);
            stateBillCount += event.bills.length;
          }
          
          if (event.tags && event.tags.length > 0) {
            await insertTags(eventId, event.tags);
            stateTagCount += event.tags.length;
          }
        } catch (eventErr: any) {
          console.error(`   ❌ Error inserting event "${event.name}":`, eventErr.message);
        }
      }
      
      totalEvents += stateEventCount;
      totalBills += stateBillCount;
      totalTags += stateTagCount;
      
      console.log(`✅ ${state}: Saved ${stateEventCount} events, ${stateBillCount} bills, ${stateTagCount} tags\n`);
      
    } catch (error: any) {
      console.error(`❌ ${state}: Scrape failed:`, error.message, '\n');
    }
  }
  
  // Show final stats
  console.log('📊 Final Statistics:');
  console.log(`   Total Events: ${totalEvents}`);
  console.log(`   Total Bills: ${totalBills}`);
  console.log(`   Total Tags: ${totalTags}`);
  
  // Query database stats
  const statsQuery = await pool.query(`
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT state_code) as total_states,
      SUM(CASE WHEN allows_public_participation THEN 1 ELSE 0 END) as public_participation_count
    FROM events
    WHERE date >= CURRENT_DATE
  `);
  
  const billsQuery = await pool.query(`
    SELECT COUNT(DISTINCT event_id) as events_with_bills
    FROM event_bills
  `);
  
  const tagsQuery = await pool.query(`
    SELECT COUNT(DISTINCT event_id) as events_with_tags
    FROM event_tags
  `);
  
  console.log('\n📊 Database Statistics:');
  console.log(`   Total Events: ${statsQuery.rows[0].total_events}`);
  console.log(`   States: ${statsQuery.rows[0].total_states}`);
  console.log(`   Events with Bills: ${billsQuery.rows[0].events_with_bills}`);
  console.log(`   Events with Tags: ${tagsQuery.rows[0].events_with_tags}`);
  console.log(`   Public Participation: ${statsQuery.rows[0].public_participation_count}`);
  
  console.log('\n✅ Database population complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
