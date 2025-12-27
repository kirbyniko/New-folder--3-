/**
 * Scrape states and insert directly into D1
 * Bypasses PostgreSQL and writes straight to Cloudflare D1
 */

import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';
import { execSync } from 'child_process';
import crypto from 'crypto';

function generateFingerprint(event: any): string {
  const key = `${event.name}-${event.date}-${event.location}-${event.state}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

function escapeSQL(str: string | undefined): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function scrapeStateToD1(stateCode: string): Promise<void> {
  console.log(`\n🔍 Scraping ${stateCode}...`);
  
  await initializeScrapers();
  const scraper = ScraperRegistry.get(stateCode);
  
  if (!scraper) {
    console.log(`❌ No scraper found for ${stateCode}`);
    return;
  }

  try {
    const events = await scraper.scrape();
    console.log(`📊 Found ${events.length} events for ${stateCode}`);

    if (events.length === 0) {
      console.log(`⏭️  Skipping ${stateCode} - no events`);
      return;
    }

    // Build batch INSERT statement
    const values: string[] = [];
    
    for (const event of events) {
      const fingerprint = generateFingerprint(event);
      const id = crypto.randomUUID();
      
      values.push(`(
        ${escapeSQL(id)},
        ${escapeSQL(event.level)},
        ${escapeSQL(event.type)},
        ${escapeSQL(event.state)},
        ${escapeSQL(event.name)},
        ${escapeSQL(event.date)},
        ${escapeSQL(event.time)},
        ${escapeSQL(event.location)},
        ${escapeSQL(event.location)},
        ${event.lat || 0},
        ${event.lng || 0},
        ${escapeSQL(event.description)},
        ${escapeSQL(event.committee)},
        ${escapeSQL(event.detailsUrl)},
        ${escapeSQL(event.docketUrl)},
        ${escapeSQL(event.virtualMeetingUrl)},
        ${escapeSQL(event.sourceUrl)},
        ${event.allowsPublicParticipation ? 1 : 0},
        datetime('now'),
        datetime('now'),
        ${escapeSQL(`${stateCode}-scraper`)},
        ${escapeSQL(event.sourceUrl)},
        ${escapeSQL(fingerprint)}
      )`);
    }

    const sql = `
      INSERT OR REPLACE INTO events (
        id, level, type, state_code, name, date, time, location_name, location_address,
        lat, lng, description, committee_name, details_url, docket_url,
        virtual_meeting_url, source_url, allows_public_participation,
        scraped_at, last_updated, scraper_source, external_id, fingerprint
      ) VALUES ${values.join(',\n')};
    `;

    // Write to temp file and execute with wrangler
    const tempFile = `temp-${stateCode}-insert.sql`;
    const fs = await import('fs');
    fs.writeFileSync(tempFile, sql);

    console.log(`💾 Inserting ${events.length} events into D1...`);
    
    try {
      execSync(`wrangler d1 execute civitracker-db --remote --file="${tempFile}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ ${stateCode} complete`);
    } catch (error) {
      console.error(`❌ Failed to insert ${stateCode}:`, error);
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempFile);
      } catch {}
    }

  } catch (error) {
    console.error(`❌ Error scraping ${stateCode}:`, error);
  }
}

// Run for specified states
const states = process.argv.slice(2);
if (states.length === 0) {
  console.log('Usage: npx tsx scripts/scrape-to-d1.ts MA NY CA ...');
  process.exit(1);
}

console.log(`🚀 Scraping ${states.length} states to D1...`);

for (const state of states) {
  await scrapeStateToD1(state.toUpperCase());
}

console.log('\n✅ All done!');
