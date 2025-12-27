import { scrapeBostonMeetings } from './lib/functions/utils/scrapers/local/boston.js';

async function test() {
  console.log('🧪 Testing Boston scraper...\n');
  const events = await scrapeBostonMeetings();
  console.log(`📊 Found ${events.length} Boston events`);
  
  if (events.length > 0) {
    console.log('\nSample event:');
    console.log(`  Name: ${events[0].name}`);
    console.log(`  Date: ${events[0].date}`);
    console.log(`  Time: ${events[0].time || 'N/A'}`);
    console.log(`  PDF: ${events[0].docketUrl || 'N/A'}`);
  }
}

test().catch(console.error);
