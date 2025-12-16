/**
 * Test NYC Council scraper in isolation
 */

import { scrapeNYCCouncil } from './utils/scrapers/local/nyc-council';

async function test() {
  console.log('Testing NYC Council scraper...');
  try {
    const events = await scrapeNYCCouncil();
    console.log(`Found ${events.length} events`);
    console.log('First 2 events:', JSON.stringify(events.slice(0, 2), null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
