import { IowaScraper } from './netlify/functions/utils/scrapers/states/iowa';

async function testIowaScraper() {
  console.log('🧪 Testing Iowa scraper...\n');
  
  const scraper = new IowaScraper();
  const events = await scraper.scrapeCalendar();
  
  console.log(`\n✅ Found ${events.length} events\n`);
  
  if (events.length === 0) {
    console.log('ℹ️  This is expected - Iowa Legislature is out of session.');
    console.log('    The 91st General Assembly concluded in spring 2025.');
    console.log('    Next session will begin in January 2026.\n');
  } else {
    console.log('Sample events:');
    events.slice(0, 3).forEach((e, idx) => {
      console.log(`\n${idx + 1}. ${e.name}`);
      console.log(`   Date: ${e.date} (${e.time})`);
      console.log(`   Location: ${e.location}`);
      console.log(`   Description: ${e.description}`);
      if (e.bills && e.bills.length > 0) {
        console.log(`   Bills: ${e.bills.map(b => b.number).join(', ')}`);
      }
    });
  }
}

testIowaScraper().catch(console.error);
