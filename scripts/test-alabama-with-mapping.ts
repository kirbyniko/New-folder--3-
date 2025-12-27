import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { AlabamaScraper } from '../lib/functions/utils/scrapers/states/alabama.js';

loadEnvFile();

console.log('🧪 Testing Alabama scraper with meeting ID mapping...\n');

const scraper = new AlabamaScraper();
const events = await scraper.scrape();

console.log(`\n✅ Found ${events.length} Alabama events:\n`);

events.forEach((event, i) => {
  console.log(`${i + 1}. ${event.name}`);
  console.log(`   📅 ${new Date(event.date).toLocaleDateString()} at ${event.time}`);
  console.log(`   📍 ${event.location}`);
  console.log(`   🔗 ${event.sourceUrl}`);
  if (event.externalId) {
    console.log(`   🆔 ${event.externalId}`);
  }
  console.log('');
});
