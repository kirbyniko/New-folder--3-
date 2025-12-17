import { scrapeBaronRougeMeetings } from './netlify/functions/utils/scrapers/local/baton-rouge';

async function testBatonRougeScraper() {
  console.log('🔍 Testing Baton Rouge scraper...\n');
  
  try {
    const events = await scrapeBaronRougeMeetings();
    
    console.log(`\n✅ Found ${events.length} Baton Rouge events\n`);
    
    if (events.length > 0) {
      console.log('Sample events:');
      events.slice(0, 10).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Time: ${event.time}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Committee: ${event.committee}`);
        console.log(`   URL: ${event.sourceUrl}`);
      });

      // Output JSON for verification
      console.log('\n\n📄 JSON output:\n');
      console.log(JSON.stringify(events, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testBatonRougeScraper();
