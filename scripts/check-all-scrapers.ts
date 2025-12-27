import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from '../lib/functions/utils/scrapers/index.js';

loadEnvFile();
initializeScrapers();

console.log('🔍 Checking all state scrapers...\n');

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const results = {
  working: [] as string[],
  missing: [] as string[],
  errors: [] as { state: string; error: string }[]
};

for (const state of states) {
  const scraper = ScraperRegistry.get(state);
  
  if (!scraper) {
    results.missing.push(state);
    continue;
  }
  
  try {
    console.log(`Testing ${state}...`);
    const events = await scraper.scrape();
    if (events && events.length > 0) {
      results.working.push(`${state} (${events.length} events)`);
      console.log(`  ✅ ${events.length} events`);
    } else {
      results.working.push(`${state} (0 events)`);
      console.log(`  ⚠️  0 events`);
    }
  } catch (error) {
    results.errors.push({ 
      state, 
      error: error instanceof Error ? error.message : String(error) 
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : error}`);
  }
}

console.log('\n\n=== SUMMARY ===\n');

console.log(`✅ Working scrapers (${results.working.length}):`);
results.working.forEach(s => console.log(`   ${s}`));

console.log(`\n❌ Missing scrapers (${results.missing.length}):`);
results.missing.forEach(s => console.log(`   ${s}`));

console.log(`\n⚠️  Scrapers with errors (${results.errors.length}):`);
results.errors.forEach(e => console.log(`   ${e.state}: ${e.error.substring(0, 100)}`));

console.log(`\n📊 Total: ${states.length} states`);
console.log(`   Working: ${results.working.length}`);
console.log(`   Missing: ${results.missing.length}`);
console.log(`   Errors: ${results.errors.length}`);
