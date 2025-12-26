import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../netlify/functions/utils/scrapers/index.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

async function runArizonaScraper() {
  console.log('Loading environment...');
  loadEnvFile();
  
  console.log('Initializing scrapers...');
  await initializeScrapers();
  
  const scraper = ScraperRegistry.get('AZ');
  if (!scraper) {
    console.error('❌ Arizona scraper not found');
    process.exit(1);
  }

  console.log('🔄 Running Arizona scraper...');
  const events = await scraper.scrape();
  console.log(`✅ Found ${events.length} Arizona events`);
  
  if (events.length === 0) {
    console.log('⚠️  No events found to insert');
    return;
  }

  // Show sample events
  console.log('\n📋 Sample events:');
  events.slice(0, 3).forEach((event, i) => {
    console.log(`  ${i + 1}. ${event.name}`);
    console.log(`     Date: ${event.date}`);
    console.log(`     Type: ${event.type}`);
  });

  // Insert into D1 database using wrangler
  console.log('\n💾 Inserting events into D1 database...');
  
  const statements: string[] = [];

  for (const event of events) {
    const escapedName = event.name.replace(/'/g, "''");
    const escapedLocation = event.location ? event.location.replace(/'/g, "''") : null;
    const escapedDescription = event.description ? event.description.replace(/'/g, "''") : null;
    const escapedUrl = event.url.replace(/'/g, "''");
    const escapedRawData = JSON.stringify(event).replace(/'/g, "''");

    statements.push(`
INSERT OR REPLACE INTO events (
  id, name, date, time, location, type, 
  state_code, url, description, raw_data
) VALUES (
  '${event.id}',
  '${escapedName}',
  '${event.date}',
  ${event.time ? `'${event.time}'` : 'NULL'},
  ${escapedLocation ? `'${escapedLocation}'` : 'NULL'},
  '${event.type}',
  '${event.state}',
  '${escapedUrl}',
  ${escapedDescription ? `'${escapedDescription}'` : 'NULL'},
  '${escapedRawData}'
);`);
  }

  const sqlContent = statements.join('\n');
  const tempFile = 'temp-az-events.sql';
  
  writeFileSync(tempFile, sqlContent, 'utf-8');
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=${tempFile}`, { 
      stdio: 'inherit' 
    });
    console.log(`\n✅ Inserted ${events.length} events`);
  } catch (error: any) {
    console.error('❌ Error inserting events:', error.message);
  } finally {
    unlinkSync(tempFile);
  }

  // Verify insertion
  console.log('\n📊 Verifying database...');
  const result = execSync(
    'wrangler d1 execute civitracker-db --remote --json --command "SELECT COUNT(*) as count FROM events WHERE state_code = \'AZ\'"',
    { encoding: 'utf-8' }
  );
  
  const parsed = JSON.parse(result);
  const count = parsed[0]?.results?.[0]?.count || 0;
  console.log(`Total Arizona events in database: ${count}`);
}

runArizonaScraper().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
