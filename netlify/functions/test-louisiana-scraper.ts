import { LouisianaScraper } from './utils/scrapers/states/louisiana';

async function testLouisianaScraper() {
  console.log('🔍 Testing Louisiana scraper...\n');
  
  const scraper = new LouisianaScraper();
  
  try {
    const events = await scraper.scrapeCalendar();
    
    console.log(`\n✅ Found ${events.length} Louisiana events\n`);
    
    if (events.length > 0) {
      console.log('Sample events:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Time: ${event.time}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Committee: ${event.committee}`);
        console.log(`   URL: ${event.sourceUrl}`);
      });

      // Output JSON for static file
      console.log('\n\n📄 JSON for static file:\n');
      console.log(JSON.stringify({
        events,
        metadata: {
          count: events.length,
          lastUpdated: new Date().toISOString(),
          billsCount: events.reduce((sum, e) => sum + (e.bills?.length || 0), 0)
        }
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testLouisianaScraper();
