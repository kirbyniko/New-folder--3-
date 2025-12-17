import { scrapeBridgeportMeetings } from './netlify/functions/utils/scrapers/local/bridgeport';

async function test() {
  console.log('🧪 Testing Bridgeport scraper...\n');
  
  try {
    const events = await scrapeBridgeportMeetings();
    
    console.log(`\n✅ Successfully scraped ${events.length} events\n`);
    
    // Show first 5 events
    events.slice(0, 5).forEach((event, i) => {
      console.log(`\n--- Event ${i + 1} ---`);
      console.log(`Name: ${event.name}`);
      console.log(`Date: ${event.date}`);
      console.log(`Time: ${event.time}`);
      console.log(`Location: ${event.location}`);
      console.log(`Committee: ${event.committee}`);
      console.log(`Source: ${event.sourceUrl}`);
      if (event.docketUrl) console.log(`Docket: ${event.docketUrl}`);
    });
    
    // Show stats
    console.log('\n\n📊 Statistics:');
    console.log(`Total events: ${events.length}`);
    console.log(`With docket URLs: ${events.filter(e => e.docketUrl).length}`);
    console.log(`With virtual meeting URLs: ${events.filter(e => e.virtualMeetingUrl).length}`);
    
    // Unique committees
    const committees = new Set(events.map(e => e.committee));
    console.log(`\nUnique committees: ${committees.size}`);
    committees.forEach(c => console.log(`  - ${c}`));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
