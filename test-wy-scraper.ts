import { WyomingScraper } from './netlify/functions/utils/scrapers/states/wyoming';

async function testWY() {
  console.log('Testing Wyoming scraper...\n');
  
  const scraper = new WyomingScraper();
  
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
    } else {
      console.log('No events found - Wyoming legislature may not be in session or no meetings scheduled.');
    }
  } catch (error: any) {
    console.error('\n✗ Error:', error.message);
    console.log('\nNote: Wyoming uses Puppeteer which may not be available in this environment.');
  }
}

testWY();
