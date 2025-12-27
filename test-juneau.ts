import { scrapeJuneauMeetings } from './lib/functions/utils/scrapers/local/juneau.js';

async function test() {
  console.log('Testing Juneau scraper...');
  try {
    const events = await scrapeJuneauMeetings();
    console.log(`Found ${events.length} Juneau events`);
    if (events.length > 0) {
      console.log('\nFirst 3 events:');
      events.slice(0, 3).forEach(e => {
        console.log(`- ${e.name} on ${e.date}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
