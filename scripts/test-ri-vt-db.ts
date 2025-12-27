import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';
import { getPool } from '../lib/functions/utils/db/connection.js';
import crypto from 'crypto';

loadEnvFile();
initializeScrapers();

const pool = getPool();

async function runRIAndVT() {
  const states = ['RI', 'VT'];
  
  for (const state of states) {
    console.log(`\n📍 Processing ${state}...`);
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      console.log(`  ⚠️  No scraper found`);
      continue;
    }
    
    console.log(`  🔍 Running ${scraper.config.stateName} scraper...`);
    const events = await scraper.scrapeCalendar();
    console.log(`  ✅ Scraped ${events.length} events`);
    
    if (events.length > 0) {
      let inserted = 0;
      for (const event of events) {
        try {
          const fingerprint = crypto
            .createHash('sha256')
            .update(`${event.name}|${event.date}|${event.location || ''}`)
            .digest('hex');
          
          await pool.query(`
            INSERT INTO events (
              external_id, level, type, state_code, name, date, time,
              location_name, lat, lng, description, details_url, source_url,
              docket_url, virtual_meeting_url, committee_name,
              scraper_source, fingerprint, scraped_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
            ON CONFLICT (fingerprint) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              date = EXCLUDED.date,
              time = EXCLUDED.time,
              location_name = EXCLUDED.location_name,
              details_url = EXCLUDED.details_url,
              source_url = EXCLUDED.source_url,
              docket_url = EXCLUDED.docket_url,
              virtual_meeting_url = EXCLUDED.virtual_meeting_url,
              last_updated = NOW()
          `, [
            event.id,
            event.level || 'state',
            event.type || 'committee-meeting',
            state,
            event.name,
            event.date,
            event.time || null,
            event.location || null,
            event.lat,
            event.lng,
            event.description || null,
            event.detailsUrl || null,
            event.sourceUrl || null,
            event.docketUrl || null,
            event.virtualMeetingUrl || null,
            event.committee || null,
            scraper.config.stateName,
            fingerprint
          ]);
          inserted++;
        } catch (dbError: any) {
          console.error(`    ❌ DB error: ${dbError.message}`);
        }
      }
      console.log(`  💾 Inserted/updated ${inserted} events in database`);
    } else {
      console.log(`  ℹ️  No events found (${state === 'VT' ? 'legislature in recess' : 'no upcoming meetings'})`);
    }
  }
  
  await pool.end();
  console.log('\n✅ Done!');
}

runRIAndVT();
