// Test Las Vegas PrimeGov scraper
import { scrapeLasVegasMeetings } from './netlify/functions/utils/scrapers/local/las-vegas';

async function testLasVegas() {
  console.log('Testing Las Vegas PrimeGov scraper...\n');
  
  try {
    const events = await scrapeLasVegasMeetings();
    
    console.log(`\n✅ Found ${events.length} upcoming meetings\n`);
    
    if (events.length > 0) {
      console.log('First 5 meetings:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.title}`);
        console.log(`   📅 ${event.date}`);
        console.log(`   ⏰ ${event.time}`);
        console.log(`   📍 ${event.location}`);
        console.log(`   🔗 Source: ${event.sourceUrl}`);
        if (event.docketUrl) {
          console.log(`   📄 Docket: ${event.docketUrl}`);
        }
      });
      
      // Stats
      const withDockets = events.filter(e => e.docketUrl).length;
      const uniqueTitles = new Set(events.map(e => e.title)).size;
      
      console.log(`\n📊 Statistics:`);
      console.log(`   Total events: ${events.length}`);
      console.log(`   With docket URLs: ${withDockets} (${Math.round(withDockets / events.length * 100)}%)`);
      console.log(`   Unique meeting types: ${uniqueTitles}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLasVegas();
