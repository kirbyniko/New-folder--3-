import 'dotenv/config';
import { initializeScrapers, ScraperRegistry } from './netlify/functions/utils/scrapers/index';
import { insertEvent, insertBills, insertTags } from './netlify/functions/utils/db/events';

async function testFullPipeline() {
  console.log('🚀 Testing full data pipeline: Scraper → Database → Query\n');

  // Initialize scrapers
  await initializeScrapers();
  const scraper = ScraperRegistry.get('CA');
  
  if (!scraper) {
    throw new Error('CA scraper not found');
  }

  // Scrape events
  console.log('📥 Scraping CA events...');
  const events = await scraper.scrape();
  console.log(`✅ Scraped ${events.length} events\n`);

  // Insert into database
  console.log('💾 Inserting events into database...');
  let successCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      const eventId = await insertEvent(event, `scraper-${scraper.config.stateCode.toLowerCase()}`);
      
      // Insert bills if present
      if (event.bills && event.bills.length > 0) {
        await insertBills(eventId, event.bills, 'CA');
        console.log(`  ✅ Event "${event.name}": ${event.bills.length} bills`);
      } else {
        console.log(`  ✅ Event "${event.name}": no bills`);
      }

      // Insert tags if present
      if (event.tags && event.tags.length > 0) {
        await insertTags(eventId, event.tags);
      }

      successCount++;
    } catch (error) {
      console.error(`  ❌ Error inserting event "${event.name}":`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`  ✅ Success: ${successCount} events`);
  console.log(`  ❌ Errors: ${errorCount} events`);

  // Query database to verify
  console.log('\n🔍 Querying database to verify...');
  const pg = await import('pg');
  const { Client } = pg.default;
  
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  await client.connect();

  // Check events table
  const eventsResult = await client.query(`
    SELECT 
      id, name, state_code, committee_name, 
      details_url, docket_url, agenda_url
    FROM events 
    WHERE state_code = 'CA'
    LIMIT 3
  `);

  console.log('\n📋 Sample events in database:');
  for (const row of eventsResult.rows) {
    console.log(`  • ${row.name}`);
    console.log(`    State: ${row.state_code || 'N/A'}`);
    console.log(`    Committee: ${row.committee_name || 'N/A'}`);
    console.log(`    Details URL: ${row.details_url ? '✅' : '❌'}`);
    console.log(`    Docket URL: ${row.docket_url ? '✅' : '❌'}`);
    console.log(`    Agenda URL: ${row.agenda_url ? '✅' : '❌'}`);
  }

  // Check bills
  const billsResult = await client.query(`
    SELECT COUNT(*) as count FROM event_bills
  `);
  console.log(`\n📊 Bills in database: ${billsResult.rows[0].count}`);

  // Check if bills are linked to events
  const linkedBillsResult = await client.query(`
    SELECT 
      e.name as event_name,
      COUNT(b.id) as bill_count
    FROM events e
    LEFT JOIN event_bills eb ON e.id = eb.event_id
    LEFT JOIN bills b ON eb.bill_id = b.id
    WHERE e.state_code = 'CA'
    GROUP BY e.id, e.name
    HAVING COUNT(b.id) > 0
    LIMIT 3
  `);

  console.log('\n📋 Events with bills:');
  for (const row of linkedBillsResult.rows) {
    console.log(`  • ${row.event_name}: ${row.bill_count} bills`);
  }

  await client.end();

  console.log('\n✅ Pipeline test complete!');
}

testFullPipeline().catch(error => {
  console.error('❌ Pipeline test failed:', error);
  process.exit(1);
});
