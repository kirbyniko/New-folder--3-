// Populate Nevada events JSON
import { NevadaScraper } from './netlify/functions/utils/scrapers/states/nevada';
import * as fs from 'fs';

async function populateNevadaEvents() {
  console.log('Running Nevada state scraper...\n');
  
  const scraper = new NevadaScraper();
  const events = await scraper.scrape();
  
  console.log(`\n✅ Found ${events.length} events`);
  
  // Save to JSON file
  fs.writeFileSync(
    'public/data/nevada-events.json', 
    JSON.stringify(events, null, 2)
  );
  
  console.log('💾 Saved to public/data/nevada-events.json');
  
  // Show sample
  if (events.length > 0) {
    console.log('\nFirst event:');
    console.log(`  ${events[0].name}`);
    console.log(`  📅 ${events[0].date}`);
    console.log(`  🔗 ${events[0].sourceUrl}`);
  }
}

populateNevadaEvents();
