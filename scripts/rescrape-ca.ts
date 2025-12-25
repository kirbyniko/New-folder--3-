import { CaliforniaScraper } from '../netlify/functions/utils/scrapers/states/california';
import { insertEvent, insertBills } from '../netlify/functions/utils/db/events';
import { getPool } from '../netlify/functions/utils/db/connection';

async function rescrapeCA() {
  console.log('🔄 Re-scraping California events to populate bill descriptions...\n');
  
  const scraper = new CaliforniaScraper();
  const pool = getPool();
  
  try {
    // Scrape events
    const events = await scraper.scrapeCalendar();
    console.log(`✅ Scraped ${events.length} events\n`);
    
    // Count bills
    let totalBills = 0;
    let billsWithDesc = 0;
    
    for (const event of events) {
      if (event.bills) {
        totalBills += event.bills.length;
        billsWithDesc += event.bills.filter(b => b.description).length;
      }
    }
    
    console.log(`📊 Bills found:`);
    console.log(`   Total: ${totalBills}`);
    console.log(`   With descriptions: ${billsWithDesc} (${totalBills > 0 ? Math.round(billsWithDesc/totalBills*100) : 0}%)\n`);
    
    // Delete existing CA events
    console.log('🧹 Cleaning up old CA events...');
    const deleteResult = await pool.query(`DELETE FROM events WHERE state_code = 'CA'`);
    console.log(`   ✅ Deleted ${deleteResult.rowCount} old events\n`);
    
    // Insert new events with bills
    console.log('💾 Inserting events and bills...');
    let insertedEvents = 0;
    let insertedBills = 0;
    
    for (const event of events) {
      try {
        const eventId = await insertEvent({
          state_code: 'CA',
          name: event.name,
          date: event.date,
          time: event.time,
          location: event.location,
          committee: event.committee,
          type: event.type,
          description: event.description,
          details_url: event.detailsUrl,
          docket_url: event.docketUrl,
          virtual_meeting_url: event.virtualMeetingUrl,
          allows_public_participation: event.allowsPublicParticipation,
          external_id: event.externalId,
          tags: event.tags || []
        });
        
        insertedEvents++;
        
        if (event.bills && event.bills.length > 0) {
          await insertBills(eventId, event.bills, 'CA');
          insertedBills += event.bills.length;
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error inserting event: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Inserted ${insertedEvents} events`);
    console.log(`   ✅ Inserted/updated ${insertedBills} bills\n`);
    
    // Verify descriptions in database
    console.log('🔍 Verifying bill descriptions in database...');
    const billCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(description) as with_desc,
        COUNT(summary) as with_summary
      FROM bills 
      WHERE state_code = 'CA'
    `);
    
    const stats = billCheck.rows[0];
    console.log(`   Total CA bills: ${stats.total}`);
    console.log(`   With description: ${stats.with_desc} (${Math.round(stats.with_desc/stats.total*100)}%)`);
    console.log(`   With summary: ${stats.with_summary} (${Math.round(stats.with_summary/stats.total*100)}%)`);
    
    console.log('\n✅ Re-scrape complete! Bills now have descriptions for LLM summarization.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

rescrapeCA();
