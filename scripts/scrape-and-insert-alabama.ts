import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { AlabamaScraper } from '../lib/functions/utils/scrapers/states/alabama.js';
import { insertEvent } from '../lib/functions/utils/db/events.js';

loadEnvFile();

console.log('🏛️ Scraping and inserting Alabama events...\n');

const scraper = new AlabamaScraper();
const events = await scraper.scrape();

console.log(`\n✅ Found ${events.length} AL events. Inserting into database...\n`);

let insertedCount = 0;
let errorCount = 0;

for (const event of events) {
  try {
    await insertEvent(event);
    insertedCount++;
    console.log(`✓ Inserted: ${event.name}`);
  } catch (error) {
    errorCount++;
    console.error(`✗ Failed to insert: ${event.name}`);
    console.error(`  Error: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`\n📊 Results:`);
console.log(`   Inserted: ${insertedCount}`);
console.log(`   Errors: ${errorCount}`);
console.log(`   Total: ${events.length}`);
