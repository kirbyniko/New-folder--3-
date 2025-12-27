import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';

loadEnvFile();
initializeScrapers();

console.log('🔍 Checking scraper registry...\n');

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const registered = [];
const missing = [];

for (const state of states) {
  const scraper = ScraperRegistry.get(state);
  if (scraper) {
    registered.push(state);
  } else {
    missing.push(state);
  }
}

console.log(`✅ Registered scrapers (${registered.length}):`);
console.log(registered.join(', '));

console.log(`\n❌ Missing scrapers (${missing.length}):`);
console.log(missing.join(', '));

console.log(`\n📊 Coverage: ${registered.length}/${states.length} states (${Math.round(registered.length/states.length*100)}%)`);
