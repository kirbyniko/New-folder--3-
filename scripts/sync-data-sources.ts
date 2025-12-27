// Auto-sync data_sources on deployment
// This ensures new scrapers automatically get their sources in the DB

import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

loadEnvFile();

const GENERATE_ONLY = process.argv.includes('--generate-only');

async function syncDataSources() {
  console.log('🔄 Syncing data sources...');
  
  await initializeScrapers();

  const stateCodes = [
    'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD',
    'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
    'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
  ];

  const statements: string[] = [];
  let count = 0;

  for (const stateCode of stateCodes) {
    const scraper = ScraperRegistry.get(stateCode);
    if (!scraper || typeof scraper.getCalendarSources !== 'function') continue;

    try {
      const sources = scraper.getCalendarSources();
      if (!sources || sources.length === 0) continue;

      for (const source of sources) {
        const id = createHash('sha256')
          .update(`${stateCode}-${source.name}-${source.url}`)
          .digest('hex')
          .substring(0, 16);

        const esc = (str: any) => {
          if (!str) return 'NULL';
          return `'${String(str).replace(/'/g, "''")}'`;
        };

        statements.push(`
INSERT OR REPLACE INTO data_sources (
  id, state_code, name, url, type, description, 
  notes, status, last_checked, update_frequency_hours, updated_at
) VALUES (
  ${esc(id)},
  ${esc(stateCode)},
  ${esc(source.name)},
  ${esc(source.url)},
  ${esc(source.type || 'primary')},
  ${esc(source.description || null)},
  ${esc(source.notes || null)},
  ${esc(source.status || 'active')},
  ${esc(source.lastChecked || new Date().toISOString())},
  ${scraper.config.updateFrequency || 24},
  datetime('now')
);`);
        count++;
      }
    } catch (err: any) {
      console.error(`❌ ${stateCode}: ${err.message}`);
    }
  }

  // Write to temp file and execute
  const { writeFileSync } = await import('fs');
  writeFileSync('temp-sync-sources.sql', statements.join('\n\n'));

  console.log(`📊 Generated ${count} source records`);
  
  if (GENERATE_ONLY) {
    console.log('✅ SQL file generated: temp-sync-sources.sql');
    console.log('📝 Run manually: wrangler d1 execute civitracker-db --remote --file temp-sync-sources.sql');
    return;
  }
  
  console.log('🚀 Executing D1 migration...');

  try {
    execSync('wrangler d1 execute civitracker-db --remote --file temp-sync-sources.sql', {
      stdio: 'inherit'
    });
    console.log('✅ Data sources synced successfully!');
  } catch (error: any) {
    console.error('❌ Failed to sync:', error.message);
    process.exit(1);
  }
}

syncDataSources();
