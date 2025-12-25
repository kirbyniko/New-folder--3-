import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { getPool } from '../netlify/functions/utils/db/connection.js';
import crypto from 'crypto';

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

const STATE_ABBRS = Object.keys(STATE_COORDS);

async function runAllScrapers() {
  console.log('🚀 Starting scraper run for all states...\n');
  
  initializeScrapers();
  const pool = getPool();
  
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};
  
  for (const state of STATE_ABBRS) {
    console.log(`\n📍 Processing ${state}...`);
    
    try {
      const scraper = ScraperRegistry.get(state);
      
      if (!scraper) {
        console.log(`  ⚠️  No scraper found for ${state}, skipping`);
        results[state] = { success: false, count: 0, error: 'No scraper available' };
        continue;
      }
      
      console.log(`  🔍 Running ${scraper.name}...`);
      const events = await scraper.scrape();
      console.log(`  ✅ Scraped ${events.length} events`);
      
      if (events.length > 0) {
        // Insert into database
        let inserted = 0;
        for (const event of events) {
          try {
            // Generate fingerprint for deduplication
            const fingerprint = crypto
              .createHash('sha256')
              .update(`${event.name}|${event.date}|${event.location || ''}`)
              .digest('hex');
            
            // Get state coordinates
            const coords = STATE_COORDS[state] || { lat: 0, lng: 0 };
            
            await pool.query(`
              INSERT INTO events (
                external_id, level, type, state_code, name, date, time,
                location_name, lat, lng, description, details_url, source_url,
                scraper_source, fingerprint, scraped_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
              ON CONFLICT (fingerprint) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                date = EXCLUDED.date,
                time = EXCLUDED.time,
                location_name = EXCLUDED.location_name,
                details_url = EXCLUDED.details_url,
                source_url = EXCLUDED.source_url,
                last_updated = NOW()
            `, [
              event.id,                                    // external_id
              'state',                                     // level
              event.type || 'committee',                   // type
              state,                                       // state_code
              event.name,                                  // name
              event.date,                                  // date
              event.time || null,                          // time
              event.location || null,                      // location_name
              coords.lat,                                  // lat
              coords.lng,                                  // lng
              event.description || null,                   // description
              event.url || event.detailsUrl || null,       // details_url
              event.sourceUrl || event.url || null,        // source_url
              scraper.name,                                // scraper_source
              fingerprint                                  // fingerprint
            ]);
            inserted++;
          } catch (dbError: any) {
            console.error(`    ❌ DB error for event ${event.id}:`, dbError.message);
          }
        }
        console.log(`  💾 Inserted/updated ${inserted} events in database`);
        results[state] = { success: true, count: inserted };
      } else {
        results[state] = { success: true, count: 0 };
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error scraping ${state}:`, error.message);
      results[state] = { success: false, count: 0, error: error.message };
    }
  }
  
  // Summary
  console.log('\n\n📊 SCRAPER RUN SUMMARY\n' + '='.repeat(50));
  let totalEvents = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (const [state, result] of Object.entries(results)) {
    if (result.success) {
      successCount++;
      totalEvents += result.count;
      if (result.count > 0) {
        console.log(`✅ ${state}: ${result.count} events`);
      }
    } else {
      failCount++;
      console.log(`❌ ${state}: ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Total states processed: ${STATE_ABBRS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total events scraped: ${totalEvents}`);
  
  await pool.end();
}

runAllScrapers().catch(console.error);
