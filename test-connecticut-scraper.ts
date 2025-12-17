import { ConnecticutScraper } from './netlify/functions/utils/scrapers/states/connecticut';

async function testConnecticutScraper() {
  console.log('🧪 Testing Connecticut scraper...\n');
  
  const scraper = new ConnecticutScraper();
  const events = await scraper.scrape();
  
  console.log(`\n📊 Results: ${events.length} events found\n`);
  
  // Show first 5 events
  console.log('📋 Sample Events:\n');
  events.slice(0, 5).forEach((event, index) => {
    console.log(`${index + 1}. ${event.name}`);
    console.log(`   Date: ${new Date(event.date).toLocaleString()}`);
    console.log(`   Time: ${event.time}`);
    console.log(`   Location: ${event.location}`);
    console.log(`   Committee: ${event.committee}`);
    if (event.docketUrl) {
      console.log(`   📄 Agenda: ${event.docketUrl}`);
    }
    console.log('');
  });
  
  // Statistics
  const withAgenda = events.filter(e => e.docketUrl).length;
  const committees = new Set(events.map(e => e.committee)).size;
  
  console.log('📈 Statistics:');
  console.log(`   Total Events: ${events.length}`);
  console.log(`   With Agenda PDFs: ${withAgenda}`);
  console.log(`   Unique Committees: ${committees}`);
  console.log(`   Date Range: ${new Date(events[0]?.date).toLocaleDateString()} - ${new Date(events[events.length - 1]?.date).toLocaleDateString()}`);
}

testConnecticutScraper().catch(console.error);
