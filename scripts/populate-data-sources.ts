// Populate data_sources table from scraper metadata
import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { getPool } from '../netlify/functions/utils/db/connection.js';
import { createHash } from 'crypto';

loadEnvFile();

const pool = getPool();

async function populateDataSources() {
  console.log('🔧 Initializing scrapers...');
  await initializeScrapers();

  const scrapers = ScraperRegistry.getAllScrapers();
  console.log(`📊 Found ${scrapers.length} scrapers`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const scraper of scrapers) {
    const stateCode = scraper.config.stateCode;
    
    // Check if scraper has getCalendarSources method
    if (typeof scraper.getCalendarSources !== 'function') {
      console.log(`⚠️  ${stateCode}: No getCalendarSources() method`);
      continue;
    }

    try {
      const sources = scraper.getCalendarSources();
      
      if (!sources || sources.length === 0) {
        console.log(`⚠️  ${stateCode}: No calendar sources returned`);
        continue;
      }

      for (const source of sources) {
        // Generate unique ID
        const id = createHash('sha256')
          .update(`${stateCode}-${source.name}-${source.url}`)
          .digest('hex')
          .substring(0, 16);

        // Check if already exists
        const existing = await pool.query(
          'SELECT id FROM data_sources WHERE id = $1',
          [id]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(`
            UPDATE data_sources 
            SET 
              name = $1,
              url = $2,
              type = $3,
              description = $4,
              notes = $5,
              status = $6,
              last_checked = $7,
              update_frequency_hours = $8,
              updated_at = NOW()
            WHERE id = $9
          `, [
            source.name,
            source.url,
            source.type || 'primary',
            source.description || null,
            source.notes || null,
            source.status || 'active',
            source.lastChecked || new Date().toISOString(),
            scraper.config.updateFrequency || 24,
            id
          ]);
          updated++;
          console.log(`✅ ${stateCode}: Updated "${source.name}"`);
        } else {
          // Insert new
          await pool.query(`
            INSERT INTO data_sources (
              id, state_code, name, url, type, description, 
              notes, status, last_checked, update_frequency_hours
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            id,
            stateCode,
            source.name,
            source.url,
            source.type || 'primary',
            source.description || null,
            source.notes || null,
            source.status || 'active',
            source.lastChecked || new Date().toISOString(),
            scraper.config.updateFrequency || 24
          ]);
          inserted++;
          console.log(`✨ ${stateCode}: Inserted "${source.name}"`);
        }
      }
    } catch (error: any) {
      errors++;
      console.error(`❌ ${stateCode}: ${error.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✨ Inserted: ${inserted}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);

  await pool.end();
}

populateDataSources().catch(console.error);
