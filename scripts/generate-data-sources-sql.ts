// Populate data_sources table (D1 Cloudflare version)
import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';

loadEnvFile();

async function populateDataSources() {
  console.log('🔧 Initializing scrapers...');
  await initializeScrapers();

  // Get all scrapers by iterating through state codes
  const stateCodes = [
    'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD',
    'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
    'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
  ];

  const sqlStatements: string[] = [];
  let processed = 0;

  for (const stateCode of stateCodes) {
    const scraper = ScraperRegistry.get(stateCode);
    if (!scraper) {
      console.log(`⚠️  ${stateCode}: No scraper registered`);
      continue;
    }
    
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

        const escapeSql = (str: string | null | undefined) => {
          if (!str) return 'NULL';
          return `'${str.replace(/'/g, "''")}'`;
        };

        // Generate INSERT OR REPLACE statement
        const sql = `INSERT OR REPLACE INTO data_sources (
          id, state_code, name, url, type, description, 
          notes, status, last_checked, update_frequency_hours, updated_at
        ) VALUES (
          ${escapeSql(id)},
          ${escapeSql(stateCode)},
          ${escapeSql(source.name)},
          ${escapeSql(source.url)},
          ${escapeSql(source.type || 'primary')},
          ${escapeSql(source.description || null)},
          ${escapeSql(source.notes || null)},
          ${escapeSql(source.status || 'active')},
          ${escapeSql(source.lastChecked || new Date().toISOString())},
          ${scraper.config.updateFrequency || 24},
          datetime('now')
        );`;

        sqlStatements.push(sql);
        processed++;
        console.log(`✅ ${stateCode}: "${source.name}"`);
      }
    } catch (error: any) {
      console.error(`❌ ${stateCode}: ${error.message}`);
    }
  }

  // Write SQL to file
  const allSql = sqlStatements.join('\n\n');
  writeFileSync('populate-data-sources.sql', allSql);
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✨ Processed: ${processed} sources`);
  console.log(`   📄 Generated: populate-data-sources.sql`);
  console.log(`\n🚀 Run: wrangler d1 execute civitracker-db --remote --file populate-data-sources.sql`);
}

populateDataSources().catch(console.error);
