import { scrapeOklahomaCityMeetings } from './netlify/functions/utils/scrapers/local/oklahoma-city';

async function testDocketUrl() {
  console.log('Testing Oklahoma City scraper docketUrl field...\n');
  
  const events = await scrapeOklahomaCityMeetings();
  
  console.log(`Total events: ${events.length}\n`);
  
  // Check first 3 events
  for (let i = 0; i < Math.min(3, events.length); i++) {
    const evt = events[i];
    console.log(`Event ${i + 1}: ${evt.name}`);
    console.log(`  docketUrl: ${evt.docketUrl || 'NOT SET'}`);
    console.log(`  sourceUrl: ${evt.sourceUrl || 'NOT SET'}`);
    console.log(`  description: ${evt.description?.substring(0, 100)}...`);
    console.log('');
  }
  
  // Count events with docketUrl
  const withDocket = events.filter(e => e.docketUrl).length;
  console.log(`✅ Events with docketUrl: ${withDocket}/${events.length}`);
}

testDocketUrl();
