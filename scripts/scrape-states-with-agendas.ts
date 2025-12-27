/**
 * Scrape States with PDF Agendas - Write Directly to D1
 * 
 * States with known docket_url support:
 * - Arkansas (AR)
 * - Connecticut (CT) 
 * - Hawaii (HI)
 * - Montana (MT)
 * - Nevada (NV)
 * - New Hampshire (NH) - has docket extraction
 * - New Mexico (NM)
 * - Utah (UT)
 * - Wyoming (WY)
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';

// State coordinates for lat/lng
const STATE_COORDS: Record<string, {lat: number, lng: number}> = {
  AR: { lat: 34.7465, lng: -92.2896 },
  CT: { lat: 41.7658, lng: -72.6734 },
  HI: { lat: 21.3099, lng: -157.8581 },
  MT: { lat: 46.5891, lng: -112.0391 },
  NV: { lat: 39.1638, lng: -119.7674 },
  NH: { lat: 43.2081, lng: -71.5376 },
  NM: { lat: 35.6870, lng: -105.9378 },
  UT: { lat: 40.7608, lng: -111.8910 },
  WY: { lat: 41.1400, lng: -104.8202 }
};

const STATES_WITH_AGENDAS = ['AR', 'CT', 'HI', 'MT', 'NV', 'NH', 'NM', 'UT', 'WY'];

async function scrapeAndSaveToD1(state: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Scraping ${state}...`);
  console.log('='.repeat(70));
  
  initializeScrapers();
  const scraper = ScraperRegistry.get(state);
  
  if (!scraper) {
    console.log(`❌ No scraper found for ${state}`);
    return { state, inserted: 0, error: 'No scraper found' };
  }
  
  try {
    const events = await scraper.scrape();
    console.log(`✅ Found ${events.length} ${state} events\n`);
    
    if (events.length === 0) {
      return { state, inserted: 0, error: null };
    }
    
    // Filter to only events with docket_url
    const eventsWithAgendas = events.filter(e => (e as any).docketUrl);
    console.log(`📄 ${eventsWithAgendas.length} events have docket_url\n`);
    
    const coords = STATE_COORDS[state] || { lat: 0, lng: 0 };
    let inserted = 0;
    
    for (const event of eventsWithAgendas) {
      try {
        const eventId = uuidv4();
        const fingerprint = crypto
          .createHash('sha256')
          .update(`${event.name}|${event.date}|${event.location || ''}`)
          .digest('hex');
        
        // Normalize time
        let normalizedTime = null;
        if (event.time) {
          const timeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          if (timeMatch) {
            let [_, hour, minute, meridiem] = timeMatch;
            let hours = parseInt(hour);
            if (meridiem?.toLowerCase() === 'pm' && hours !== 12) hours += 12;
            if (meridiem?.toLowerCase() === 'am' && hours === 12) hours = 0;
            normalizedTime = `${hours.toString().padStart(2, '0')}:${minute}:00`;
          }
        }
        
        const sql = `
INSERT INTO events (
  id, level, state_code, name, date, time,
  lat, lng, location_name, location_address, description,
  committee_name, type, details_url, docket_url, virtual_meeting_url,
  source_url, allows_public_participation,
  scraper_source, external_id, fingerprint, created_at, last_updated
) VALUES (
  '${eventId}',
  'state',
  '${state}',
  '${event.name.replace(/'/g, "''")}',
  '${event.date}',
  ${normalizedTime ? `'${normalizedTime}'` : 'NULL'},
  ${coords.lat},
  ${coords.lng},
  ${event.location ? `'${event.location.replace(/'/g, "''")}'` : 'NULL'},
  NULL,
  ${event.description ? `'${event.description.replace(/'/g, "''").substring(0, 500)}'` : 'NULL'},
  ${event.committee ? `'${event.committee.replace(/'/g, "''")}'` : 'NULL'},
  ${event.type ? `'${event.type}'` : 'NULL'},
  ${event.detailsUrl ? `'${event.detailsUrl}'` : 'NULL'},
  ${(event as any).docketUrl ? `'${(event as any).docketUrl}'` : 'NULL'},
  ${event.virtualMeetingUrl ? `'${event.virtualMeetingUrl}'` : 'NULL'},
  ${(event as any).sourceUrl ? `'${(event as any).sourceUrl}'` : 'NULL'},
  0,
  'scraper-${state.toLowerCase()}',
  '${fingerprint.substring(0, 16)}',
  '${fingerprint}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT (fingerprint) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  details_url = EXCLUDED.details_url,
  docket_url = EXCLUDED.docket_url,
  last_updated = datetime('now');
`;
        
        execSync(`wrangler d1 execute civitracker-db --remote --command "${sql.replace(/\n/g, ' ')}"`, { 
          stdio: 'pipe' 
        });
        
        inserted++;
        console.log(`  ✓ ${event.name.substring(0, 60)}...`);
        console.log(`    📄 Docket: ${((event as any).docketUrl || '').substring(0, 60)}...\n`);
        
      } catch (dbError: any) {
        if (!dbError.message?.includes('UNIQUE constraint')) {
          console.error(`  ❌ DB error: ${dbError.message}`);
        }
      }
    }
    
    console.log(`✅ ${state}: Inserted ${inserted} events with agendas\n`);
    return { state, inserted, error: null };
    
  } catch (error: any) {
    console.error(`❌ ${state} error: ${error.message}\n`);
    return { state, inserted: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Scraping States with PDF Agenda Support\n');
  console.log('States to scrape:', STATES_WITH_AGENDAS.join(', '));
  console.log('\n');
  
  const results: Array<{state: string, inserted: number, error: string | null}> = [];
  
  for (const state of STATES_WITH_AGENDAS) {
    const result = await scrapeAndSaveToD1(state);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  let totalInserted = 0;
  results.forEach(r => {
    const status = r.error ? `❌ Error: ${r.error}` : `✅ ${r.inserted} events`;
    console.log(`${r.state}: ${status}`);
    totalInserted += r.inserted;
  });
  
  console.log(`\nTotal: ${totalInserted} events with agendas added to D1`);
  console.log('\n🎉 Ready to extract agendas! Run:');
  console.log('   npx tsx scripts/extract-all-agendas.ts\n');
}

main();
