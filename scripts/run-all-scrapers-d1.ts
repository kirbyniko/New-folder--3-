/**
 * Run all state scrapers and populate D1 database
 * This will scrape events from all available state scrapers
 */

import { execSync } from 'child_process';
import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import crypto from 'crypto';
import { writeFileSync, unlinkSync } from 'fs';

loadEnvFile();

const STATE_COORDS: Record<string, { lat: number; lng: number }> = {
  'AL': { lat: 32.3617, lng: -86.2792 }, 'AK': { lat: 58.3019, lng: -134.4197 },
  'AZ': { lat: 33.4484, lng: -112.0740 }, 'AR': { lat: 34.7465, lng: -92.2896 },
  'CA': { lat: 38.5767, lng: -121.4934 }, 'CO': { lat: 39.7392, lng: -104.9903 },
  'CT': { lat: 41.7658, lng: -72.6734 }, 'DE': { lat: 39.1582, lng: -75.5244 },
  'FL': { lat: 30.4383, lng: -84.2807 }, 'GA': { lat: 33.7490, lng: -84.3880 },
  'HI': { lat: 21.3099, lng: -157.8581 }, 'ID': { lat: 43.6150, lng: -116.2023 },
  'IL': { lat: 39.7817, lng: -89.6501 }, 'IN': { lat: 39.7684, lng: -86.1581 },
  'IA': { lat: 41.5868, lng: -93.6250 }, 'KS': { lat: 39.0473, lng: -95.6752 },
  'KY': { lat: 38.1867, lng: -84.8753 }, 'LA': { lat: 30.4515, lng: -91.1871 },
  'ME': { lat: 44.3106, lng: -69.7795 }, 'MD': { lat: 38.9784, lng: -76.4922 },
  'MA': { lat: 42.3601, lng: -71.0589 }, 'MI': { lat: 42.7325, lng: -84.5555 },
  'MN': { lat: 44.9537, lng: -93.0900 }, 'MS': { lat: 32.2988, lng: -90.1848 },
  'MO': { lat: 38.5767, lng: -92.1735 }, 'MT': { lat: 46.5884, lng: -112.0245 },
  'NE': { lat: 40.8136, lng: -96.7026 }, 'NV': { lat: 39.1638, lng: -119.7674 },
  'NH': { lat: 43.2081, lng: -71.5376 }, 'NJ': { lat: 40.2206, lng: -74.7597 },
  'NM': { lat: 35.6870, lng: -105.9378 }, 'NY': { lat: 42.6526, lng: -73.7562 },
  'NC': { lat: 35.7796, lng: -78.6382 }, 'ND': { lat: 46.8083, lng: -100.7837 },
  'OH': { lat: 39.9612, lng: -82.9988 }, 'OK': { lat: 35.4676, lng: -97.5164 },
  'OR': { lat: 44.9429, lng: -123.0351 }, 'PA': { lat: 40.2732, lng: -76.8867 },
  'RI': { lat: 41.8240, lng: -71.4128 }, 'SC': { lat: 34.0007, lng: -81.0348 },
  'SD': { lat: 44.3683, lng: -100.3510 }, 'TN': { lat: 36.1627, lng: -86.7816 },
  'TX': { lat: 30.2672, lng: -97.7431 }, 'UT': { lat: 40.7608, lng: -111.8910 },
  'VT': { lat: 44.2601, lng: -72.5754 }, 'VA': { lat: 37.5407, lng: -77.4360 },
  'WA': { lat: 47.0379, lng: -122.9007 }, 'WV': { lat: 38.3498, lng: -81.6326 },
  'WI': { lat: 43.0731, lng: -89.4012 }, 'WY': { lat: 41.1400, lng: -104.8202 }
};

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function insertEventToD1(event: any, state: string, scraperName: string) {
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${event.name}|${event.date}|${event.location || ''}`)
    .digest('hex');
  
  const coords = STATE_COORDS[state] || { lat: 0, lng: 0 };
  const eventId = generateId();
  
  // Build SQL - handle potential single quotes in data
  const name = (event.name || '').replace(/'/g, "''");
  const location = (event.location || '').replace(/'/g, "''");
  const description = (event.description || '').replace(/'/g, "''");
  const detailsUrl = event.url || event.detailsUrl || '';
  const sourceUrl = event.sourceUrl || event.url || '';
  
  const sql = `
INSERT INTO events (
  id, external_id, level, type, state_code, name, date, time,
  location_name, lat, lng, description, details_url, source_url,
  scraper_source, fingerprint, scraped_at, last_updated
) VALUES (
  '${eventId}',
  '${event.id || eventId}',
  'state',
  '${event.type || 'committee'}',
  '${state}',
  '${name}',
  '${event.date}',
  ${event.time ? `'${event.time}'` : 'NULL'},
  ${location ? `'${location}'` : 'NULL'},
  ${coords.lat},
  ${coords.lng},
  ${description ? `'${description}'` : 'NULL'},
  ${detailsUrl ? `'${detailsUrl}'` : 'NULL'},
  ${sourceUrl ? `'${sourceUrl}'` : 'NULL'},
  '${scraperName}',
  '${fingerprint}',
  datetime('now'),
  datetime('now')
);`;
  
  const tempFile = `temp-event-${eventId}.sql`;
  writeFileSync(tempFile, sql);
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=${tempFile}`, { 
      stdio: 'pipe' 
    });
    unlinkSync(tempFile);
    return true;
  } catch (error: any) {
    unlinkSync(tempFile);
    // Check if it's a UNIQUE constraint violation (duplicate fingerprint)
    if (error.message.includes('UNIQUE constraint')) {
      // Update existing event instead
      try {
        const updateSql = `
UPDATE events SET
  name = '${name}',
  description = ${description ? `'${description}'` : 'NULL'},
  date = '${event.date}',
  time = ${event.time ? `'${event.time}'` : 'NULL'},
  location_name = ${location ? `'${location}'` : 'NULL'},
  details_url = ${detailsUrl ? `'${detailsUrl}'` : 'NULL'},
  source_url = ${sourceUrl ? `'${sourceUrl}'` : 'NULL'},
  last_updated = datetime('now')
WHERE fingerprint = '${fingerprint}';`;
        
        const updateFile = `temp-update-${eventId}.sql`;
        writeFileSync(updateFile, updateSql);
        execSync(`wrangler d1 execute civitracker-db --remote --file=${updateFile}`, { 
          stdio: 'pipe' 
        });
        unlinkSync(updateFile);
        return true;
      } catch (updateError) {
        return false;
      }
    }
    return false;
  }
}

async function runAllScrapers() {
  console.log('🚀 Starting scraper run for all states...\n');
  console.log('📦 Initializing scrapers...\n');
  
  initializeScrapers();
  
  const STATE_ABBRS = Object.keys(STATE_COORDS);
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};
  
  for (const state of STATE_ABBRS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${state} - Processing...`);
    console.log('='.repeat(60));
    
    try {
      const scraper = ScraperRegistry.get(state);
      
      if (!scraper) {
        console.log(`  ⚠️  No scraper found, skipping`);
        results[state] = { success: false, count: 0, error: 'No scraper available' };
        continue;
      }
      
      console.log(`  🔍 Running scraper: ${scraper.name}`);
      const events = await scraper.scrape();
      console.log(`  ✅ Scraped ${events.length} events`);
      
      if (events.length > 0) {
        let inserted = 0;
        console.log(`  💾 Inserting events into D1...`);
        
        for (const event of events) {
          const success = await insertEventToD1(event, state, scraper.name);
          if (success) {
            inserted++;
            process.stdout.write('.');
          }
        }
        
        console.log(`\n  ✅ Inserted/updated ${inserted}/${events.length} events`);
        results[state] = { success: true, count: inserted };
      } else {
        console.log(`  ⚠️  No events found`);
        results[state] = { success: true, count: 0 };
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      results[state] = { success: false, count: 0, error: error.message };
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  let totalEvents = 0;
  let successStates = 0;
  let failStates = 0;
  let noEvents = 0;
  
  const statesWithEvents: string[] = [];
  const statesFailed: string[] = [];
  const statesEmpty: string[] = [];
  
  for (const [state, result] of Object.entries(results)) {
    if (result.success) {
      successStates++;
      totalEvents += result.count;
      if (result.count > 0) {
        statesWithEvents.push(`${state} (${result.count})`);
      } else {
        noEvents++;
        statesEmpty.push(state);
      }
    } else {
      failStates++;
      statesFailed.push(`${state}: ${result.error}`);
    }
  }
  
  console.log(`\n✅ States with events (${statesWithEvents.length}):`);
  console.log(`   ${statesWithEvents.join(', ')}`);
  
  if (statesEmpty.length > 0) {
    console.log(`\n⚠️  States with scrapers but no events (${statesEmpty.length}):`);
    console.log(`   ${statesEmpty.join(', ')}`);
  }
  
  if (statesFailed.length > 0) {
    console.log(`\n❌ States that failed (${statesFailed.length}):`);
    statesFailed.forEach(err => console.log(`   ${err}`));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total states processed: ${STATE_ABBRS.length}`);
  console.log(`Successful: ${successStates}`);
  console.log(`Failed: ${failStates}`);
  console.log(`Total events inserted: ${totalEvents}`);
  console.log(`\n🎉 View at: https://civitracker.pages.dev\n`);
}

runAllScrapers().catch(console.error);
