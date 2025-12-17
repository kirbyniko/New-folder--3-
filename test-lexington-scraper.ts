import { scrapeLexingtonMeetings } from './netlify/functions/utils/scrapers/local/lexington';

async function testLexingtonScraper() {
  console.log('=== Testing Lexington Scraper ===\n');
  
  try {
    const events = await scrapeLexingtonMeetings();
    
    console.log(`\n✅ Found ${events.length} Lexington events\n`);
    
    // Show first 5 events
    events.slice(0, 5).forEach((event, i) => {
      console.log(`${i + 1}. ${event.name}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Time: ${event.time}`);
      console.log(`   Type: ${event.type}`);
      console.log(`   URL: ${event.sourceUrl}`);
      console.log('');
    });
    
    if (events.length > 5) {
      console.log(`... and ${events.length - 5} more events\n`);
    }
    
    // Show event type breakdown
    const types = events.reduce((acc, e) => {
      acc[e.type || 'Unknown'] = (acc[e.type || 'Unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Event types:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing Lexington scraper:', error);
    throw error;
  }
}

testLexingtonScraper();
