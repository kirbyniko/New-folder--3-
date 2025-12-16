import('./netlify/functions/utils/scrapers/states/new-jersey.ts').then(async module => {
  const scraper = new module.NewJerseyScraper();
  const events = await scraper.scrape();
  
  console.log(`✅ Scraped ${events.length} events\n`);
  
  if (events.length > 0) {
    // Find an event with bills
    const eventWithBills = events.find(e => e.bills && e.bills.length > 0) || events[0];
    
    console.log('📋 Sample Event:');
    console.log(`  Name: ${eventWithBills.name}`);
    console.log(`  Date: ${eventWithBills.date}`);
    console.log(`  Committee: ${eventWithBills.committee}`);
    console.log(`  🔗 Meeting URL: ${eventWithBills.url || 'MISSING'}`);
    console.log(`  🎥 Virtual URL: ${eventWithBills.virtualMeetingUrl || 'None'}`);
    console.log(`  📋 Bills: ${eventWithBills.bills ? eventWithBills.bills.length : 0}`);
    
    if (eventWithBills.bills && eventWithBills.bills.length > 0) {
      console.log('\n  Bills on agenda:');
      eventWithBills.bills.slice(0, 5).forEach(bill => {
        console.log(`    - ${bill.id}: ${bill.title}`);
        console.log(`      🔗 ${bill.url}`);
      });
      if (eventWithBills.bills.length > 5) {
        console.log(`    ... and ${eventWithBills.bills.length - 5} more bills`);
      }
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
