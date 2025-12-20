// Populate Nevada events JSON
import { NevadaScraper } from './netlify/functions/utils/scrapers/states/nevada';
import * as fs from 'fs';

async function populateNevadaEvents() {
  console.log('Running Nevada state scraper...\n');
  
  const scraper = new NevadaScraper();
  const events = await scraper.scrape();
  
  console.log(`\n✅ Found ${events.length} events`);
  
  // Count bills across all events
  const billsCount = events.reduce((sum, event) => sum + (event.bills?.length || 0), 0);
  
  // Create wrapper object matching other states' format
  const output = {
    count: events.length,
    billsCount,
    lastUpdated: new Date().toISOString(),
    events
  };
  
  // Save to JSON file
  fs.writeFileSync(
    'public/data/nevada-events.json', 
    JSON.stringify(output, null, 2)
  );
  
  console.log('💾 Saved to public/data/nevada-events.json');
  console.log(`📋 Bills: ${billsCount} total`);
  
  // Show sample
  if (events.length > 0) {
    console.log('\nFirst event:');
    console.log(`  ${events[0].name}`);
    console.log(`  📅 ${events[0].date}`);
    console.log(`  🔗 ${events[0].sourceUrl}`);
  }
}

populateNevadaEvents();
