import { CaliforniaScraper } from './netlify/functions/utils/scrapers/states/california.js';

async function test() {
  const scraper = new CaliforniaScraper();
  const events = await scraper.scrapeCalendar();
  
  console.log(`\nTotal events: ${events.length}`);
  
  const eventWithBills = events.find(e => e.bills && e.bills.length > 0);
  
  if (eventWithBills) {
    console.log(`\n✓ Found event with bills:`);
    console.log(`  Name: ${eventWithBills.name}`);
    console.log(`  Bills: ${eventWithBills.bills!.length}`);
    eventWithBills.bills!.forEach(b => console.log(`    - ${b.id}: ${b.title}`));
  } else {
    console.log(`\n⚠ No events with bills found (may be informational hearings)`);
    console.log(`  Sample event has bills field:`, events[0].bills !== undefined);
    console.log(`  Bills value:`, events[0].bills);
  }
}

test();
