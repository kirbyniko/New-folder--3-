import { scrapeKentuckyEvents } from './netlify/functions/utils/scrapers/states/kentucky';

async function testKentuckyScraper() {
  console.log('=== Testing Kentucky State Scraper ===\n');

  try {
    const events = await scrapeKentuckyEvents();
    
    console.log(`\n✅ Found ${events.length} Kentucky events\n`);
    
    // Show first few events with details
    events.slice(0, 5).forEach((event, i) => {
      console.log(`${i + 1}. ${event.name}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Time: ${event.time}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   Committee: ${event.committee}`);
      console.log(`   URL: ${event.sourceUrl}`);
      if (event.description) {
        console.log(`   Description: ${event.description.substring(0, 100)}...`);
      }
      console.log('');
    });

    // Output JSON for static file
    const output = {
      count: events.length,
      billsCount: 0,
      lastUpdated: new Date().toISOString(),
      events
    };

    console.log('\n📄 JSON for static file:\n');
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Kentucky scraper:', error);
    throw error;
  }
}

testKentuckyScraper();
