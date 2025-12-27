import { scrapeHelenaMeetings } from './lib/functions/utils/scrapers/local/helena.js';

async function test() {
  console.log('Testing Helena scraper...');
  const events = await scrapeHelenaMeetings();
  console.log(`\nFound ${events.length} events`);
  if (events.length > 0) {
    console.log('\nFirst event:');
    console.log(`  Name: ${events[0].name}`);
    console.log(`  Level: ${events[0].level}`);
    console.log(`  Date: ${events[0].date}`);
  }
}

test().catch(console.error);
