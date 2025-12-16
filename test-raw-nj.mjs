const { NewJerseyScraper } = await import('./netlify/functions/utils/scrapers/states/new-jersey.ts');

const scraper = new NewJerseyScraper();

// Access the scrapeCalendar method directly to get raw events
const rawEvents = await scraper.scrapeCalendar();

console.log(`\n✅ Got ${rawEvents.length} raw events\n`);

// Find one with bills
const eventWithBills = rawEvents.find(e => e.bills && e.bills.length > 0);

if (eventWithBills) {
  console.log('📋 Raw Event (before transformation):');
  console.log(`  Name: ${eventWithBills.name}`);
  console.log(`  Committee: ${eventWithBills.committee}`);
  console.log(`  🔗 detailsUrl: ${eventWithBills.detailsUrl || 'MISSING'}`);
  console.log(`  📋 Bills: ${eventWithBills.bills ? eventWithBills.bills.length : 0}`);
  
  if (eventWithBills.bills && eventWithBills.bills.length > 0) {
    console.log('\n  Sample bills:');
    eventWithBills.bills.slice(0, 3).forEach(bill => {
      console.log(`    - ${bill.id}: ${bill.title}`);
      console.log(`      ${bill.url}`);
    });
  }
} else {
  console.log('No events with bills found');
}
