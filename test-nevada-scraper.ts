import { NevadaScraper } from './netlify/functions/utils/scrapers/states/nevada';

async function test() {
  console.log('🧪 Testing Nevada scraper...\n');
  
  try {
    const scraper = new NevadaScraper();
    const events = await scraper.scrapeCalendar();
    
    console.log(`\n✅ Successfully scraped ${events.length} events\n`);
    
    // Show first 5 events
    events.slice(0, 5).forEach((event, i) => {
      console.log(`\n--- Event ${i + 1} ---`);
      console.log(`Name: ${event.name}`);
      console.log(`Date: ${event.date}`);
      console.log(`Time: ${event.time}`);
      console.log(`Location: ${event.location}`);
      console.log(`Committee: ${event.committee}`);
      console.log(`City: ${event.city}`);
      console.log(`Source: ${event.sourceUrl}`);
      if (event.docketUrl) console.log(`Docket: ${event.docketUrl}`);
      if (event.virtualMeetingUrl) console.log(`Video: ${event.virtualMeetingUrl}`);
    });
    
    // Show stats
    console.log('\n\n📊 Statistics:');
    console.log(`Total events: ${events.length}`);
    console.log(`With docket URLs: ${events.filter(e => e.docketUrl).length}`);
    console.log(`With virtual meeting URLs: ${events.filter(e => e.virtualMeetingUrl).length}`);
    console.log(`Carson City: ${events.filter(e => e.city === 'Carson City').length}`);
    console.log(`Las Vegas: ${events.filter(e => e.city === 'Las Vegas').length}`);
    
    // Unique committees
    const committees = new Set(events.map(e => e.committee));
    console.log(`\nUnique committees: ${committees.size}`);
    Array.from(committees).slice(0, 10).forEach(c => console.log(`  - ${c}`));
    if (committees.size > 10) console.log(`  ... and ${committees.size - 10} more`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
