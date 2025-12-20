import { scrapeLittleRockMeetings } from './netlify/functions/utils/scrapers/local/little-rock';

async function test() {
  try {
    console.log('Testing Little Rock scraper...');
    const events = await scrapeLittleRockMeetings();
    console.log(`Found ${events.length} events`);
    console.log('\nFirst 3 events:');
    events.slice(0, 3).forEach(event => {
      console.log(`\n- ${event.name}`);
      console.log(`  Date: ${event.date} at ${event.time}`);
      console.log(`  Location: ${event.location}`);
      console.log(`  Committee: ${event.committee}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
