import { loadEnvFile } from './lib/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from './lib/functions/utils/scrapers/index.js';

loadEnvFile();
await initializeScrapers();

const scraper = ScraperRegistry.get('AZ');
if (scraper) {
  const sources = scraper.getCalendarSources();
  console.log('\n🌵 Arizona Calendar Sources:');
  sources.forEach(s => {
    console.log(`\n  📅 ${s.name}`);
    console.log(`     URL: ${s.url}`);
    console.log(`     Description: ${s.description}`);
  });
} else {
  console.log('❌ No AZ scraper found');
}
