import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { AlabamaScraper } from '../netlify/functions/utils/scrapers/states/alabama.js';

loadEnvFile();

console.log('Testing Alabama scraper...\n');

const scraper = new AlabamaScraper();
const events = await scraper.scrape();

console.log(`\n✅ Found ${events.length} AL events\n`);

events.forEach((event, i) => {
  console.log(`${i + 1}. ${event.name}`);
  console.log(`   Date: ${event.date}`);
  console.log(`   Time: ${event.time}`);
  console.log(`   Location: ${event.location}`);
  console.log(`   Committee: ${event.committee || 'N/A'}`);
  console.log(`   URL: ${event.sourceUrl}`);
  console.log('');
});
