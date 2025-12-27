import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';
import { getPool } from '../lib/functions/utils/db/connection.js';
import crypto from 'crypto';

loadEnvFile();

const NY_COORDS = { lat: 42.6526, lng: -73.7562 };

async function scrapeNY() {
  console.log('🔍 Scraping NY and adding to database...\n');
  
  initializeScrapers();
  const pool = getPool();
  const scraper = ScraperRegistry.get('NY');
  
  if (!scraper) {
    console.log('❌ No NY scraper found');
    return;
  }
  
  try {
    const events = await scraper.scrape();
    console.log(`✅ Found ${events.length} NY events\n`);
    
    if (events.length === 0) {
      console.log('⚠️ No events to insert');
      return;
    }
    
    let inserted = 0;
    for (const event of events) {
      try {
        const fingerprint = crypto
          .createHash('sha256')
          .update(`${event.name}|${event.date}|${event.location || ''}`)
          .digest('hex');
        
        // Parse and normalize time (convert "10:00 a.m." to "10:00:00" or null if invalid)
        let normalizedTime = null;
        if (event.time) {
          const timeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm)?/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2];
            const period = timeMatch[3]?.toLowerCase();
            
            if (period && (period.includes('p') || period.includes('P')) && hour < 12) {
              hour += 12;
            } else if (period && (period.includes('a') || period.includes('A')) && hour === 12) {
              hour = 0;
            }
            
            normalizedTime = `${String(hour).padStart(2, '0')}:${minute}:00`;
          }
        }
        
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
          'NY',                                        // state_code
          event.name,                                  // name
          event.date,                                  // date
          normalizedTime,                              // time
          event.location || null,                      // location_name
          NY_COORDS.lat,                               // lat
          NY_COORDS.lng,                               // lng
          event.description || null,                   // description
          event.url || event.detailsUrl || null,       // details_url
          event.sourceUrl || event.url || null,        // source_url
          scraper.name,                                // scraper_source
          fingerprint                                  // fingerprint
        ]);
        inserted++;
        console.log(`  ✓ ${event.name.substring(0, 60)}...`);
      } catch (dbError: any) {
        console.error(`  ❌ DB error: ${dbError.message}`);
      }
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} NY events into database`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

scrapeNY();
