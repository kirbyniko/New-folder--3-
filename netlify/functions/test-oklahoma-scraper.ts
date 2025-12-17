import { OklahomaScraper } from './utils/scrapers/states/oklahoma';

async function test() {
  console.log('Testing Oklahoma scraper...\n');
  
  const scraper = new OklahomaScraper();
  const events = await scraper.scrapeCalendar();
  
  console.log(`\nTotal events: ${events.length}`);
  
  if (events.length > 0) {
    console.log('\nFirst 3 events:');
    events.slice(0, 3).forEach((event, i) => {
      console.log(`\n${i + 1}. ${event.name}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Time: ${event.time}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   Committee: ${event.committee}`);
      console.log(`   Type: ${event.type}`);
    });
  }
}

test().catch(console.error);
