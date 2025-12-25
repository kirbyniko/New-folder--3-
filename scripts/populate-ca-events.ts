import { CaliforniaScraper } from '../netlify/functions/utils/scrapers/states/california';
import { getPool } from '../netlify/functions/utils/db/connection';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;

async function populateCAEvents() {
  console.log('🔄 Populating California events and linking bills...\n');
  
  const scraper = new CaliforniaScraper();
  const pool = getPool();
  const sql = neon(DATABASE_URL);
  
  try {
    // Scrape events
    console.log('📥 Scraping California events...');
    const events = await scraper.scrapeCalendar();
    console.log(`✅ Found ${events.length} events\n`);
    
    // California State Capitol coordinates
    const CA_LAT = 38.5767;
    const CA_LNG = -121.4934;
    
    let inserted = 0;
    let billsLinked = 0;
    
    for (const event of events) {
      try {
        // Insert event with required coordinates
        const eventResult = await sql`
          INSERT INTO events (
            level, state_code, name, date, time,
            lat, lng, location_name, description,
            committee_name, type, details_url, docket_url, 
            virtual_meeting_url, source_url,
            allows_public_participation,
            scraper_source, external_id, fingerprint
          ) VALUES (
            'state', 'CA', ${event.name}, ${event.date}, ${event.time || null},
            ${CA_LAT}, ${CA_LNG}, ${event.location || 'California State Capitol'}, ${event.description || null},
            ${event.committee || null}, ${event.type || 'hearing'}, ${event.detailsUrl || null}, 
            ${event.docketUrl || null}, ${event.virtualMeetingUrl || null}, ${event.sourceUrl || null},
            ${event.allowsPublicParticipation || false},
            'manual', ${event.externalId || event.name}, ${event.name + event.date}
          )
          ON CONFLICT (scraper_source, external_id) 
          DO UPDATE SET
            last_updated = NOW(),
            name = EXCLUDED.name,
            date = EXCLUDED.date
          RETURNING id
        `;
        
        const eventId = eventResult[0].id;
        inserted++;
        
        // Link bills to event
        if (event.bills && event.bills.length > 0) {
          for (const bill of event.bills) {
            try {
              // First ensure bill exists or insert it
              const billResult = await sql`
                INSERT INTO bills (state_code, bill_number, title, description, url, status)
                VALUES ('CA', ${bill.id}, ${bill.title}, ${bill.description || null}, ${bill.url}, ${bill.status || null})
                ON CONFLICT (state_code, bill_number) 
                DO UPDATE SET
                  title = COALESCE(EXCLUDED.title, bills.title),
                  description = COALESCE(EXCLUDED.description, bills.description),
                  url = COALESCE(EXCLUDED.url, bills.url)
                RETURNING id
              `;
              
              const billId = billResult[0].id;
              
              // Link event to bill
              await sql`
                INSERT INTO event_bills (event_id, bill_id)
                VALUES (${eventId}, ${billId})
                ON CONFLICT DO NOTHING
              `;
              
              billsLinked++;
            } catch (billError: any) {
              console.error(`   ⚠️ Error linking bill ${bill.id}: ${billError.message}`);
            }
          }
        }
        
        if (event.bills && event.bills.length > 0) {
          console.log(`✅ ${event.committee}: ${event.bills.length} bills`);
        }
        
      } catch (error: any) {
        console.error(`❌ Error inserting event: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   Events inserted: ${inserted}`);
    console.log(`   Bills linked: ${billsLinked}`);
    
    // Verify
    console.log('\n🔍 Verifying...');
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM events WHERE state_code = 'CA') as events,
        (SELECT COUNT(DISTINCT b.id) FROM bills b 
         JOIN event_bills eb ON b.id = eb.bill_id 
         JOIN events e ON eb.event_id = e.id 
         WHERE e.state_code = 'CA') as linked_bills
    `;
    
    console.log(`   CA events: ${stats[0].events}`);
    console.log(`   CA bills linked to events: ${stats[0].linked_bills}`);
    
    console.log('\n✅ Done! Bills should now appear in DataViewer.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

populateCAEvents();
