import { WestVirginiaScraper } from './netlify/functions/utils/scrapers/states/west-virginia';

async function testWV() {
  console.log('Testing West Virginia scraper...\n');
  
  const scraper = new WestVirginiaScraper();
  
  // Test calendar sources
  console.log('Calendar Sources:');
  const sources = scraper.getCalendarSources();
  sources.forEach(source => {
    console.log(`  - ${source.name}: ${source.url}`);
  });
  
  console.log('\nScraping events...\n');
  
  try {
    const events = await scraper.scrape();
    console.log(`\n✓ Found ${events.length} events\n`);
    
    if (events.length > 0) {
      console.log('Sample events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Date: ${event.date} ${event.time || ''}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Committee: ${event.committeeName}`);
        if (event.agendaUrl) console.log(`   Agenda: ${event.agendaUrl}`);
      });
    }
  } catch (error: any) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

testWV();
