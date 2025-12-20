import { IowaScraper } from './netlify/functions/utils/scrapers/states/iowa';
import fs from 'fs';
import path from 'path';

async function populateIowaEvents() {
  console.log('Running Iowa state scraper...\n');
  
  const scraper = new IowaScraper();
  const rawEvents = await scraper.scrapeCalendar();
  const events = await scraper.scrape();
  
  console.log(`\n✅ Found ${events.length} events`);
  
  // Calculate stats
  const billsCount = events.reduce((sum, event) => sum + (event.bills?.length || 0), 0);
  
  // Create output structure
  const output = {
    count: events.length,
    billsCount,
    lastUpdated: new Date().toISOString(),
    events
  };
  
  // Write to file
  const outputPath = path.join(process.cwd(), 'public', 'data', 'iowa-events.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`💾 Saved to ${outputPath}`);
  console.log(`📋 Bills: ${billsCount} total`);
  
  if (events.length === 0) {
    console.log('\nℹ️  No events found - Iowa Legislature is out of session');
    console.log('   This is expected behavior. Next session begins January 2026.');
  } else {
    console.log('\nFirst event:');
    const first = events[0];
    console.log(`  ${first.name}`);
    console.log(`  📅 ${first.date}`);
    console.log(`  🔗 ${first.sourceUrl}`);
  }
}

populateIowaEvents().catch(console.error);
