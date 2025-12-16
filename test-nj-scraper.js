// Test rewritten NJ scraper
import('./netlify/functions/utils/scrapers/states/new-jersey.ts').then(async m => {
  const scraper = new m.NewJerseyScraper();
  const events = await scraper.scrapeCalendar();
  
  console.log('\n=== RESULTS ===');
  console.log('Total events found:', events.length);
  
  if (events.length > 0) {
    console.log('\nFirst 3 events:');
    events.slice(0, 3).forEach(e => {
      console.log(`- ${e.name}`);
      console.log(`  Date: ${e.date.substring(0,10)} at ${e.time}`);
      console.log(`  Location: ${e.location?.substring(0, 60)}`);
      if (e.bills) console.log(`  Bills: ${e.bills.length}`);
    });
    
    console.log('\n=== Sample event with bills ===');
    const withBills = events.find(e => e.bills && e.bills.length > 0);
    if (withBills) {
      console.log(JSON.stringify(withBills, null, 2));
    } else {
      console.log('No events with bills found');
    }
  }
}).catch(e => console.error('Error:', e.message));
